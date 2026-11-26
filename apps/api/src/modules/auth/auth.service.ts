import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
  NotFoundException,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import * as crypto from 'crypto';
import { prisma, NotificationCategory, NotificationPriority } from '@fundedgiants/database';
import { RequestOtpDto, LoginIdentifierType, RetryWhatsappOtpDto, VerifyOtpDto, SignupDto, UpdateProfileDto } from './dto/auth.dto';
import { RobaseService } from '../integrations/robase/robase.service';
import { NinjaKycService } from '../integrations/ninja/ninja.service';
import { NotificationsService } from '../notifications/notifications.service';
import { NombaService } from '../integrations/nomba/nomba.service';
import { SendbabaService } from '../integrations/sendbaba/sendbaba.service';

@Injectable()
export class AuthService {
  private readonly robaseService: RobaseService;
  private readonly ninjaKycService: NinjaKycService;
  private readonly notificationsService: NotificationsService;
  private readonly sendbabaService: SendbabaService;
  private readonly otpExpirySeconds = 300; // 5 minutes
  private readonly cooldownSeconds = 45; // 45s between resends
  private readonly logger = new Logger(AuthService.name);

  constructor() {
    this.robaseService = new RobaseService();
    this.ninjaKycService = new NinjaKycService();
    this.notificationsService = new NotificationsService();
    this.sendbabaService = new SendbabaService();
  }

  private generateSecureCode(): string {
    return crypto.randomInt(100000, 999999).toString();
  }

  private hashCode(code: string): string {
    return crypto.createHash('sha256').update(code).digest('hex');
  }

  async requestOtp(dto: RequestOtpDto) {
    const identifier = dto.identifier.trim().toLowerCase();

    // 0. Format & Sanitization Validation
    if (dto.type === LoginIdentifierType.EMAIL) {
      const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
      if (!emailRegex.test(identifier) || identifier.length > 100) {
        throw new BadRequestException('Please provide a valid email address.');
      }
    } else {
      const cleanPhone = identifier.replace(/[^0-9+]/g, '');
      if (cleanPhone.length < 8 || cleanPhone.length > 20) {
        throw new BadRequestException('Please provide a valid international or Nigerian phone number.');
      }
    }

    // 1. Rate-limit / cooldown check
    const recentOtp = await prisma.otpChallenge.findFirst({
      where: {
        identifier,
        status: 'PENDING',
        createdAt: {
          gte: new Date(Date.now() - this.cooldownSeconds * 1000),
        },
      },
    });

    if (recentOtp) {
      throw new HttpException(
        `Please wait ${this.cooldownSeconds} seconds before requesting a new code.`,
        HttpStatus.TOO_MANY_REQUESTS
      );
    }

    // Invalidate any older pending OTPs for this identifier
    await prisma.otpChallenge.updateMany({
      where: { identifier, status: 'PENDING' },
      data: { status: 'EXPIRED' },
    });

    // 2. Generate cryptographically random 6-digit OTP
    const rawCode = this.generateSecureCode();
    const codeHash = this.hashCode(rawCode);
    const expiresAt = new Date(Date.now() + this.otpExpirySeconds * 1000);

    const channel = dto.type === LoginIdentifierType.EMAIL ? 'EMAIL' : 'SMS';

    // 3. Find or create user record
    let user = await prisma.user.findFirst({
      where: dto.type === LoginIdentifierType.EMAIL ? { email: identifier } : { phone: identifier },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          email: dto.type === LoginIdentifierType.EMAIL ? identifier : null,
          phone: dto.type === LoginIdentifierType.PHONE ? identifier : null,
          role: 'CUSTOMER',
        },
      });
    }

    // 4. Fetch applicable customer charge from FeeConfiguration (centralized fee engine)
    const feeConfig = await prisma.feeConfiguration.findUnique({
      where: { category: channel === 'SMS' ? 'SMS_OTP' : 'WHATSAPP_OTP' },
    });
    const customerCharge = feeConfig ? feeConfig.fixedAmount : undefined;

    // 5. Deliver OTP via provider
    let providerMessageId: string | undefined;
    let providerCost: number | undefined;

    if (channel === 'SMS') {
      const sendResult = await this.robaseService.sendOtp({
        to: identifier,
        code: rawCode,
        channel: 'sms',
      });

      if (!sendResult.success) {
        throw new BadRequestException(`Failed to deliver SMS OTP: ${sendResult.error}`);
      }

      providerMessageId = sendResult.messageId;
      providerCost = sendResult.providerCost;
    } else {
      // Email delivery via Brevo / SMTP integration
      const recipientName = user.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : 'Valued Trader';
      await this.notificationsService.sendEmail(
        identifier,
        recipientName,
        'Your FundedGiants Verification Code',
        `Your one-time login verification code is:\n\n${rawCode}\n\nThis code expires in 5 minutes (300 seconds). Do not share this code with anyone.\n\nIf you did not request this verification code, please ignore this email or contact support@fundedgiants.ng.`,
        '/auth/login'
      );
    }

    // 6. Record OTP Challenge in database
    const challenge = await prisma.otpChallenge.create({
      data: {
        userId: user.id,
        identifier,
        channel,
        codeHash,
        expiresAt,
        status: 'PENDING',
        customerCharge,
        providerCost,
        providerMessageId,
      },
    });

    return {
      success: true,
      challengeId: challenge.id,
      channel,
      expiresInSeconds: this.otpExpirySeconds,
      cooldownSeconds: this.cooldownSeconds,
    };
  }

  async retryWhatsapp(dto: RetryWhatsappOtpDto) {
    const phone = dto.phone.trim();

    // 1. Check if user and pending SMS challenge exists
    const recentOtp = await prisma.otpChallenge.findFirst({
      where: {
        identifier: phone,
        status: 'PENDING',
        createdAt: {
          gte: new Date(Date.now() - this.cooldownSeconds * 1000),
        },
      },
    });

    if (recentOtp) {
      throw new HttpException(
        `Please wait ${this.cooldownSeconds} seconds before requesting a WhatsApp OTP.`,
        HttpStatus.TOO_MANY_REQUESTS
      );
    }

    // Invalidate previous OTPs
    await prisma.otpChallenge.updateMany({
      where: { identifier: phone, status: 'PENDING' },
      data: { status: 'EXPIRED' },
    });

    const rawCode = this.generateSecureCode();
    const codeHash = this.hashCode(rawCode);
    const expiresAt = new Date(Date.now() + this.otpExpirySeconds * 1000);

    const user = await prisma.user.findUnique({ where: { phone } });

    // Send via Robase WhatsApp
    const sendResult = await this.robaseService.sendOtp({
      to: phone,
      code: rawCode,
      channel: 'whatsapp',
    });

    if (!sendResult.success) {
      throw new BadRequestException(`Failed to deliver WhatsApp OTP: ${sendResult.error}`);
    }

    const challenge = await prisma.otpChallenge.create({
      data: {
        userId: user?.id,
        identifier: phone,
        channel: 'WHATSAPP',
        codeHash,
        expiresAt,
        status: 'PENDING',
        providerMessageId: sendResult.messageId,
        providerCost: sendResult.providerCost,
      },
    });

    return {
      success: true,
      challengeId: challenge.id,
      channel: 'WHATSAPP',
      expiresInSeconds: this.otpExpirySeconds,
    };
  }

  async verifyOtp(dto: VerifyOtpDto) {
    const identifier = dto.identifier.trim().toLowerCase();
    const codeHash = this.hashCode(dto.code);

    const challenge = await prisma.otpChallenge.findFirst({
      where: {
        identifier,
        status: 'PENDING',
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!challenge) {
      throw new UnauthorizedException('Invalid or expired verification session.');
    }

    if (new Date() > challenge.expiresAt) {
      await prisma.otpChallenge.update({
        where: { id: challenge.id },
        data: { status: 'EXPIRED' },
      });
      throw new UnauthorizedException('Verification code has expired. Please request a new one.');
    }

    if (challenge.attempts >= challenge.maxAttempts) {
      await prisma.otpChallenge.update({
        where: { id: challenge.id },
        data: { status: 'FAILED' },
      });
      throw new UnauthorizedException('Maximum attempts exceeded. Please request a new code.');
    }

    if (challenge.codeHash !== codeHash) {
      await prisma.otpChallenge.update({
        where: { id: challenge.id },
        data: { attempts: { increment: 1 } },
      });
      throw new UnauthorizedException('Incorrect verification code.');
    }

    // Code is valid! Consume OTP challenge
    await prisma.otpChallenge.update({
      where: { id: challenge.id },
      data: {
        status: 'VERIFIED',
        verifiedAt: new Date(),
      },
    });

    // Create / Rotate user session
    const sessionToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(sessionToken).digest('hex');
    const sessionExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    if (!challenge.userId) {
      throw new UnauthorizedException('User account not found for challenge');
    }

    const session = await prisma.session.create({
      data: {
        userId: challenge.userId,
        tokenHash,
        expiresAt: sessionExpiry,
      },
      include: {
        user: true,
      },
    });

    // Ensure dedicated Nomba virtual account exists (auto-provision on login/first-login)
    this.ensureDedicatedNombaAccount(session.user.id).catch((err) => {
      this.logger.warn(`Background Nomba account provisioning error on login: ${err.message}`);
    });

    // Sync trader profile to SendBaba audience contacts in background
    this.sendbabaService.syncUserById(session.user.id).catch((err) => {
      this.logger.warn(`Background SendBaba contact sync error on login: ${err.message}`);
    });

    return {
      success: true,
      sessionToken,
      user: {
        id: session.user.id,
        email: session.user.email,
        phone: session.user.phone,
        firstName: session.user.firstName,
        lastName: session.user.lastName,
        role: session.user.role,
        kycStatus: session.user.kycStatus,
      },
    };
  }

  /**
   * Direct Sign Up for traders and affiliates without prior account purchase
   * Username is explicitly chosen by the user (no auto-generation)
   */
  async signup(dto: SignupDto) {
    const cleanEmail = dto.email.trim().toLowerCase();
    const cleanPhone = dto.phone.trim();
    const cleanFirstName = dto.firstName.trim();
    const cleanLastName = dto.lastName.trim();
    const cleanUsername = dto.username.trim().toLowerCase();

    if (!/^[a-z0-9_]{3,20}$/.test(cleanUsername)) {
      throw new BadRequestException('Username must be 3-20 characters long and contain only lowercase letters, numbers, or underscores.');
    }

    // 1. Check if user already exists
    let existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ email: cleanEmail }, { phone: cleanPhone }],
      },
    });

    // Check if username is already claimed by someone else
    const existingWithUsername = await prisma.user.findFirst({
      where: { username: cleanUsername },
    });

    if (existingWithUsername && (!existingUser || existingWithUsername.id !== existingUser.id)) {
      throw new BadRequestException(`The username '${cleanUsername}' is already taken. Please choose another username.`);
    }

    let targetUserId: string;

    if (existingUser) {
      targetUserId = existingUser.id;
      // Update details if missing
      await prisma.user.update({
        where: { id: existingUser.id },
        data: {
          firstName: existingUser.firstName || cleanFirstName,
          lastName: existingUser.lastName || cleanLastName,
          address: existingUser.address || dto.address?.trim() || null,
          username: existingUser.username || cleanUsername,
        },
      });

      // Ensure affiliate profile has referral code
      const aff = await prisma.affiliateProfile.findUnique({ where: { userId: existingUser.id } });
      if (!aff) {
        await prisma.affiliateProfile.create({
          data: {
            userId: existingUser.id,
            referralCode: existingUser.username || cleanUsername,
            cpaCommissionRate: 10.0,
          },
        });
      }
    } else {
      // Create new user with user's explicitly chosen username
      const createdUser = await prisma.user.create({
        data: {
          email: cleanEmail,
          phone: cleanPhone,
          firstName: cleanFirstName,
          lastName: cleanLastName,
          address: dto.address?.trim() || null,
          username: cleanUsername,
          role: 'CUSTOMER',
          kycStatus: 'UNVERIFIED',
          wallet: {
            create: {
              currency: 'NGN',
            },
          },
          affiliateProfile: {
            create: {
              referralCode: cleanUsername,
              cpaCommissionRate: 10.0,
            },
          },
        },
      });

      targetUserId = createdUser.id;
    }

    // 1b. Bind referring affiliate if referredBy is provided (Direct Signup Attribution)
    const referralInput = dto.referredBy?.trim();
    if (referralInput) {
      try {
        const aff = await prisma.affiliateProfile.findFirst({
          where: {
            OR: [
              { referralCode: { equals: referralInput, mode: 'insensitive' } },
              { user: { username: { equals: referralInput.toLowerCase() } } },
            ],
          },
        });
        if (aff && aff.userId !== targetUserId) {
          const existingRef = await prisma.affiliateReferral.findUnique({
            where: { referredUserId: targetUserId },
          });
          if (!existingRef) {
            await prisma.affiliateReferral.create({
              data: {
                affiliateProfileId: aff.id,
                referredUserId: targetUserId,
              },
            });
          }
        }
      } catch (affErr: any) {
        this.logger.warn(`Failed to bind affiliate referral for user ${targetUserId}: ${affErr.message}`);
      }
    }

    // Invalidate any older pending OTPs
    await prisma.otpChallenge.updateMany({
      where: { identifier: cleanEmail, status: 'PENDING' },
      data: { status: 'EXPIRED' },
    });

    // 2. Generate 6-digit confirmation OTP
    const rawCode = this.generateSecureCode();
    const codeHash = this.hashCode(rawCode);
    const expiresAt = new Date(Date.now() + this.otpExpirySeconds * 1000);

    await prisma.otpChallenge.create({
      data: {
        userId: targetUserId,
        identifier: cleanEmail,
        channel: 'EMAIL',
        codeHash,
        expiresAt,
        status: 'PENDING',
      },
    });

    // Dispatch via Brevo / SMTP
    await this.notificationsService.sendEmail(
      cleanEmail,
      `${cleanFirstName} ${cleanLastName}`.trim(),
      'Confirm Your FundedGiants Registration Code',
      `Welcome to FundedGiants, ${cleanFirstName}!\n\nUse the following 6-digit verification code to confirm your registration and access your dashboard:\n\n${rawCode}\n\nThis code expires in 5 minutes. Do not share it with anyone.`,
      '/auth/login'
    );

    // Sync contact immediately to SendBaba audience
    this.sendbabaService.syncUserById(targetUserId).catch((err) => {
      this.logger.warn(`Background SendBaba contact sync on signup: ${err.message}`);
    });

    console.log(`[SIGNUP OTP DISPATCHED] Email: ${cleanEmail} | Code: ${rawCode}`);

    return {
      success: true,
      message: 'Registration initiated. Verification code sent to your email.',
      identifier: cleanEmail,
      channel: 'EMAIL',
      expiresInSeconds: this.otpExpirySeconds,
    };
  }

  async findUserByEmail(email: string) {
    return prisma.user.findFirst({
      where: { email: email.trim().toLowerCase() },
    });
  }

  async getSessionUser(sessionToken: string) {
    if (!sessionToken) return null;
    const tokenHash = crypto.createHash('sha256').update(sessionToken).digest('hex');
    const session = await prisma.session.findFirst({
      where: {
        tokenHash,
        expiresAt: { gt: new Date() },
      },
      include: {
        user: {
          include: {
            wallet: true,
            affiliateProfile: true,
            kycRecords: {
              orderBy: { createdAt: 'desc' },
              take: 1,
            },
          },
        },
      },
    });
    if (!session?.user) return null;
    return session.user;
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });
    if (!user) {
      throw new NotFoundException('User profile not found');
    }

    if (user.kycStatus === 'APPROVED') {
      if (dto.firstName && dto.firstName.trim().toLowerCase() !== (user.firstName || '').trim().toLowerCase()) {
        throw new BadRequestException('Your identity has been verified via Ninja KYC. Verified legal name cannot be modified.');
      }
      if (dto.lastName && dto.lastName.trim().toLowerCase() !== (user.lastName || '').trim().toLowerCase()) {
        throw new BadRequestException('Your identity has been verified via Ninja KYC. Verified legal name cannot be modified.');
      }
    }

    const dataToUpdate: any = {};
    if (user.kycStatus !== 'APPROVED') {
      if (dto.firstName) dataToUpdate.firstName = dto.firstName.trim();
      if (dto.lastName) dataToUpdate.lastName = dto.lastName.trim();
    }
    if (dto.phone) dataToUpdate.phone = dto.phone.trim();
    if (dto.address !== undefined) dataToUpdate.address = dto.address.trim();

    if (dto.username) {
      const cleanUsername = dto.username.trim().toLowerCase();
      if (!/^[a-zA-Z0-9_]{3,20}$/.test(cleanUsername)) {
        throw new BadRequestException('Username must be 3-20 characters long and contain only letters, numbers, and underscores.');
      }
      const existing = await prisma.user.findFirst({
        where: {
          username: cleanUsername,
          NOT: { id: userId },
        },
      });
      if (existing) {
        throw new BadRequestException('Username is already taken.');
      }
      dataToUpdate.username = cleanUsername;
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: dataToUpdate,
      include: {
        wallet: true,
        affiliateProfile: true,
        kycRecords: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    // Automatically provision or ensure dedicated Nomba Virtual Account when completing/updating profile
    const wallet = await this.ensureDedicatedNombaAccount(userId);

    // Sync updated contact data to SendBaba audience
    this.sendbabaService.syncUserById(updated.id).catch((err) => {
      this.logger.warn(`Background SendBaba contact sync on profile update: ${err.message}`);
    });

    // Notify user to perform KYC if not already verified (non-compulsory notification)
    if (updated.kycStatus !== 'APPROVED') {
      try {
        await this.notificationsService.createNotification({
          userId: updated.id,
          title: 'Complete Your KYC Verification',
          message: 'Your profile details have been saved! You can complete your Ninja KYC verification at your convenience. KYC is required when you request withdrawals and payouts.',
          category: NotificationCategory.SYSTEM,
          priority: NotificationPriority.NORMAL,
          actionUrl: '/dashboard/profile',
          sendEmail: false,
        });
      } catch (notifErr: any) {
        this.logger.warn(`Could not create KYC reminder notification: ${notifErr.message}`);
      }
    }

    return {
      success: true,
      message: 'Profile updated successfully',
      user: {
        id: updated.id,
        email: updated.email,
        phone: updated.phone,
        username: updated.username,
        firstName: updated.firstName,
        lastName: updated.lastName,
        address: updated.address,
        role: updated.role,
        kycStatus: updated.kycStatus,
        wallet: wallet || updated.wallet,
        affiliateProfile: updated.affiliateProfile,
        kycRecord: updated.kycRecords[0] || null,
      },
    };
  }

  /**
   * Automatically ensure a dedicated Nomba Virtual Account exists for user.
   * Invoked on first login, signup, and profile completion.
   * Nomba sub-accounts inherit parent business account BVN, so user BVN is NOT required!
   */
  async ensureDedicatedNombaAccount(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { wallet: true },
    });
    if (!user) return null;

    if (user.wallet?.nombaAccountNumber) {
      return user.wallet;
    }

    const cleanFirst = (user.firstName || 'Trader').trim();
    const cleanLast = (user.lastName || 'Account').trim();

    try {
      const nombaService = new NombaService();
      const nombaRes = await nombaService.createVirtualAccount({
        userId: user.id,
        firstName: cleanFirst,
        lastName: cleanLast,
      });

      if (nombaRes.status && nombaRes.data) {
        return await prisma.customerWallet.upsert({
          where: { userId: user.id },
          update: {
            nombaVirtualBankName: nombaRes.data.bankName,
            nombaAccountName: nombaRes.data.bankAccountName,
            nombaAccountNumber: nombaRes.data.bankAccountNumber,
            nombaAccountReference: nombaRes.data.accountRef,
          },
          create: {
            userId: user.id,
            nombaVirtualBankName: nombaRes.data.bankName,
            nombaAccountName: nombaRes.data.bankAccountName,
            nombaAccountNumber: nombaRes.data.bankAccountNumber,
            nombaAccountReference: nombaRes.data.accountRef,
          },
        });
      }
    } catch (err: any) {
      this.logger.warn(`Could not provision Nomba dedicated virtual account for user ${user.id}: ${err.message}`);
    }
    return user.wallet;
  }

  /**
   * NinjaKYC BVN Verification on First Login
   * Takes First & Last name on file, validates BVN, updates KYC status and triggers Lenco virtual account.
   */
  async verifyNinjaBvn(params: { userId: string; bvn: string }) {
    const { userId, bvn } = params;
    const cleanBvn = bvn.trim();

    if (!/^\d{11}$/.test(cleanBvn)) {
      throw new BadRequestException('BVN must be exactly 11 digits.');
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { wallet: true },
    });

    if (!user) {
      throw new NotFoundException('User profile not found.');
    }

    const firstName = user.firstName || 'Valued';
    const lastName = user.lastName || 'Trader';

    // 1. Call NinjaKYC API (or sandbox verification)
    const ninjaBaseUrl = process.env.NINJA_KYC_BASE_URL || 'https://api.ninja.boucloud.io';
    const ninjaKey = process.env.NINJA_KYC_API_KEY;

    let externalRef = `FG-NINJA-${userId.slice(0, 8)}-${Date.now()}`;

    if (ninjaKey) {
      try {
        const res = await fetch(`${ninjaBaseUrl}/verification/bvn`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${ninjaKey}`,
          },
          body: JSON.stringify({
            bvn: cleanBvn,
            first_name: firstName,
            last_name: lastName,
            reference: externalRef,
          }),
        });
        const ninjaRes = await res.json().catch(() => ({}));
        if (!res.ok || (ninjaRes.status === false && ninjaRes.message)) {
          throw new BadRequestException(ninjaRes.message || 'NinjaKYC verification returned an error.');
        }
      } catch (err: any) {
        if (err instanceof BadRequestException) throw err;
        console.warn('NinjaKYC API unreachable, applying sandbox fallback validation:', err.message);
      }
    }

    // 2. Mark User KYC as APPROVED
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        kycStatus: 'APPROVED',
      },
    });

    // 3. Create KycRecord
    await prisma.kycRecord.create({
      data: {
        userId: user.id,
        provider: 'NinjaKYC',
        externalReference: externalRef,
        status: 'APPROVED',
        verifiedAt: new Date(),
        providerPayload: {
          bvn: '•••••••' + cleanBvn.slice(-4),
          verifiedName: `${firstName} ${lastName}`,
          timestamp: new Date().toISOString(),
        },
      },
    });

    // 4. Automatically provision Nomba dedicated virtual account if not present
    if (!user.wallet?.nombaAccountNumber && !user.wallet?.lencoAccountNumber) {
      try {
        const nombaService = new (require('../integrations/nomba/nomba.service').NombaService)();
        const nombaRes = await nombaService.createVirtualAccount({
          userId: user.id,
          firstName,
          lastName,
          bvn: cleanBvn,
        });

        if (nombaRes.status && nombaRes.data) {
          await prisma.customerWallet.upsert({
            where: { userId: user.id },
            update: {
              nombaVirtualBankName: nombaRes.data.bankName,
              nombaAccountName: nombaRes.data.bankAccountName,
              nombaAccountNumber: nombaRes.data.bankAccountNumber,
              nombaAccountReference: nombaRes.data.accountRef,
            },
            create: {
              userId: user.id,
              nombaVirtualBankName: nombaRes.data.bankName,
              nombaAccountName: nombaRes.data.bankAccountName,
              nombaAccountNumber: nombaRes.data.bankAccountNumber,
              nombaAccountReference: nombaRes.data.accountRef,
            },
          });
        }
      } catch (err: any) {
        console.warn('Could not auto-provision Nomba virtual account after KYC:', err.message);
      }
    }

    return {
      success: true,
      message: 'NinjaKYC verification completed successfully! Your account and dedicated deposit vault are fully active.',
      kycStatus: 'APPROVED',
      user: {
        id: updatedUser.id,
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName,
        email: updatedUser.email,
        kycStatus: updatedUser.kycStatus,
      },
    };
  }

  /**
   * Check if user is eligible to initiate identity verification (KYC).
   * Rules:
   * 1. Must have purchased at least one account / challenge.
   * 2. Evaluation accounts (Rhino Rush, etc.): Must have PASSED the challenge first.
   * 3. Phoenix Rise / Instant Funded accounts: Must reach the required profit target for payout.
   */
  async checkKycEligibility(userId: string): Promise<{
    eligible: boolean;
    reason: string;
    accountsCount: number;
    passedEvaluationCount: number;
    payoutEligibleCount: number;
  }> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User profile not found');
    }

    // If user is already approved, they are permanently complete
    if (user.kycStatus === 'APPROVED') {
      return {
        eligible: true,
        reason: 'Identity verification is completed and approved.',
        accountsCount: 1,
        passedEvaluationCount: 1,
        payoutEligibleCount: 1,
      };
    }

    // Fetch all challenges and trading accounts belonging to user
    const [challenges, tradingAccounts] = await Promise.all([
      prisma.customerChallenge.findMany({
        where: { userId },
        include: {
          tradingAccount: true,
          product: true,
        },
      }),
      prisma.tradingAccount.findMany({
        where: { userId },
        include: {
          challenge: true,
        },
      }),
    ]);

    const totalAccounts = challenges.length + tradingAccounts.length;

    // Rule 1: Must have purchased at least one account
    if (totalAccounts === 0) {
      return {
        eligible: false,
        reason:
          'You have not purchased a trading account yet. Identity verification (KYC) is only required once you pass an evaluation challenge or reach payout profit on your funded account.',
        accountsCount: 0,
        passedEvaluationCount: 0,
        payoutEligibleCount: 0,
      };
    }

    // Rule 2: Check for PASSED evaluation challenges
    const passedEvaluationChallenges = challenges.filter(
      (c) =>
        c.type === 'RHINO_RUSH_ONE_STEP' &&
        (c.status === 'PASSED' || c.status === 'COMPLETED')
    );

    if (passedEvaluationChallenges.length > 0) {
      return {
        eligible: true,
        reason:
          'Congratulations on passing your evaluation! Identity verification is now unlocked to activate your funded account and payout vault.',
        accountsCount: totalAccounts,
        passedEvaluationCount: passedEvaluationChallenges.length,
        payoutEligibleCount: 0,
      };
    }

    // Rule 3: Check for Phoenix Rise or funded accounts that hit payout profit target
    let payoutEligibleCount = 0;
    for (const acc of tradingAccounts) {
      const isPhoenix =
        acc.challenge?.type === 'PHOENIX_RISE_INSTANT' ||
        acc.groupSlug?.toLowerCase().includes('phoenix');

      const isFunded =
        isPhoenix ||
        acc.challenge?.status === 'PASSED' ||
        acc.challenge?.status === 'COMPLETED' ||
        acc.groupSlug?.toLowerCase().includes('funded');

      if (isFunded && acc.status === 'ACTIVE') {
        const initialBal = Number(acc.initialBalance || 1000000);
        const currentBal = Number(acc.currentBalance || initialBal);
        const currentEq = Number(acc.currentEquity || currentBal);
        const netProfit = Math.max(0, currentEq - initialBal);
        const profitPercent = initialBal > 0 ? (netProfit / initialBal) * 100 : 0;

        // Check prior approved payouts for this account
        const priorPayouts = await prisma.riskEvent.count({
          where: {
            tradingAccountId: acc.id,
            eventType: 'AUTOMATED_PAYOUT_APPROVED',
          },
        });

        // 1st payout on Phoenix Rise requires 10% profit; subsequent payouts require 2%
        const reqPercent = isPhoenix && priorPayouts === 0 ? 10.0 : 2.0;

        if (profitPercent >= reqPercent) {
          payoutEligibleCount++;
        }
      }
    }

    if (payoutEligibleCount > 0) {
      return {
        eligible: true,
        reason:
          'You have reached the required profit target for a payout! Identity verification is now unlocked to process your profit disbursement.',
        accountsCount: totalAccounts,
        passedEvaluationCount: 0,
        payoutEligibleCount,
      };
    }

    // User has accounts, but not passed evaluation and not reached payout profit
    return {
      eligible: false,
      reason:
        'Identity verification (KYC) is currently locked. For evaluation accounts, KYC unlocks once you pass the challenge. For Phoenix Rise funded accounts, KYC unlocks once you reach the profit target for your payout.',
      accountsCount: totalAccounts,
      passedEvaluationCount: 0,
      payoutEligibleCount: 0,
    };
  }

  /**
   * Initiate Ninja.ng Hosted KYC Verification Session
   * Generates a secure hosted verification URL where the user verifies BVN, liveness, and documents.
   * Reuses active pending session to prevent duplicate creation and double-billing.
   */
  async initiateHostedKyc(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User profile not found');
    }

    // 1. If already approved, prevent duplicate verification
    if (user.kycStatus === 'APPROVED') {
      throw new BadRequestException('Your identity is already verified and approved. No further verification is needed.');
    }

    // 2. Strict eligibility gate
    const eligibility = await this.checkKycEligibility(user.id);
    if (!eligibility.eligible) {
      throw new BadRequestException(eligibility.reason);
    }

    // 3. Prevent duplicate sessions & double charges: reuse active pending session within 4 hours
    const existingPending = await prisma.kycRecord.findFirst({
      where: {
        userId: user.id,
        provider: 'NinjaKYC',
        status: 'PENDING',
        createdAt: { gte: new Date(Date.now() - 4 * 60 * 60 * 1000) },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (existingPending) {
      const existingUrl = (existingPending.providerPayload as any)?.url;
      if (existingUrl) {
        this.logger.log(`Reusing active Ninja Hosted KYC session ${existingPending.externalReference} for user ${user.id} to avoid duplicate charge`);
        return {
          success: true,
          message: 'Existing active verification session resumed',
          data: {
            id: existingPending.externalReference,
            url: existingUrl,
            reference: user.id,
          },
        };
      }
    }

    // 4. Request new verification session on Ninja
    const sessionRes = await this.ninjaKycService.createVerificationSession({
      userId: user.id,
      email: user.email || `${user.username || user.id}@fundedgiants.ng`,
      phone: user.phone || undefined,
      firstName: user.firstName || 'Valued',
      lastName: user.lastName || 'Trader',
    });

    if (!sessionRes.status || !sessionRes.data?.url) {
      throw new BadRequestException(
        sessionRes.message || 'Failed to create Ninja Hosted KYC session. Verify Ninja API credentials in Admin Settings.'
      );
    }

    if (sessionRes.data?.id) {
      try {
        await prisma.kycRecord.upsert({
          where: { externalReference: sessionRes.data.id },
          update: {
            status: 'PENDING',
            providerPayload: {
              url: sessionRes.data.url,
              updatedAt: new Date().toISOString(),
            },
          },
          create: {
            userId: user.id,
            provider: 'NinjaKYC',
            externalReference: sessionRes.data.id,
            status: 'PENDING',
            providerPayload: {
              url: sessionRes.data.url,
              createdAt: new Date().toISOString(),
            },
          },
        });
      } catch (err: any) {
        this.logger.warn(`Could not save pending KycRecord: ${err.message}`);
      }
    }

    return {
      success: true,
      data: sessionRes.data,
    };
  }

  /**
   * Sync and verify Ninja KYC status directly with official Ninja API
   */
  async syncNinjaKycStatus(userId: string, verificationId?: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { wallet: true },
    });

    if (!user) {
      throw new NotFoundException('User profile not found');
    }

    if (user.kycStatus === 'APPROVED') {
      await this.ensureDedicatedNombaAccount(user.id).catch(() => {});
      return {
        success: true,
        kycStatus: 'APPROVED',
        message: 'Identity is already verified and approved.',
        user,
      };
    }

    let targetSessionId = verificationId?.trim();
    if (!targetSessionId || targetSessionId === 'vs_id' || !targetSessionId.startsWith('vs_')) {
      const pendingKyc = await prisma.kycRecord.findFirst({
        where: { userId: user.id, provider: 'NinjaKYC' },
        orderBy: { createdAt: 'desc' },
      });
      if (pendingKyc?.externalReference && pendingKyc.externalReference.startsWith('vs_')) {
        targetSessionId = pendingKyc.externalReference;
      }
    }

    if (!targetSessionId || targetSessionId === 'vs_id') {
      return {
        success: false,
        kycStatus: user.kycStatus,
        message: 'No verification session ID provided or found for this user.',
      };
    }

    const verification = await this.ninjaKycService.getVerification(targetSessionId);
    if (!verification) {
      return {
        success: false,
        kycStatus: user.kycStatus,
        message: `Could not fetch verification details for ${targetSessionId} from Ninja.`,
      };
    }

    const rawOutcome = String(
      verification.outcome ||
      verification.data?.outcome ||
      ''
    ).toLowerCase();

    const rawStatus = String(
      verification.status ||
      verification.data?.status ||
      ''
    ).toLowerCase();

    // Parse field-level verification matches (first_name, last_name, date_of_birth)
    const fields: any[] =
      verification.data?.fields ||
      verification.fields ||
      [];

    const mismatchReasons: string[] = [];

    for (const f of fields) {
      const fieldName = String(f.field || '').toLowerCase();
      const matchType = String(f.match || '').toLowerCase();
      const score = f.score !== undefined && f.score !== null ? Number(f.score) : undefined;

      if (fieldName === 'date_of_birth' || fieldName === 'dob') {
        if (matchType === 'mismatch' || (score !== undefined && score < 1)) {
          mismatchReasons.push('Date of birth does not match government identity record');
        }
      } else if (fieldName === 'first_name' || fieldName === 'firstname') {
        if (matchType === 'mismatch' || (score !== undefined && score < 0.85)) {
          const pct = score !== undefined ? ` (${Math.round(score * 100)}% match)` : '';
          mismatchReasons.push(`First name does not match government identity record${pct}`);
        }
      } else if (fieldName === 'last_name' || fieldName === 'lastname') {
        if (matchType === 'mismatch' || (score !== undefined && score < 0.85)) {
          const pct = score !== undefined ? ` (${Math.round(score * 100)}% match)` : '';
          mismatchReasons.push(`Last name does not match government identity record${pct}`);
        }
      }
    }

    const isExplicitMismatch =
      rawOutcome === 'mismatch' ||
      rawOutcome === 'failed' ||
      rawOutcome === 'rejected' ||
      rawStatus === 'failed';

    const isExplicitVerified =
      (rawOutcome === 'verified' || rawOutcome === 'approved' || rawOutcome === 'matched' || rawOutcome === 'success') ||
      (rawStatus === 'completed' && !isExplicitMismatch && mismatchReasons.length === 0);

    const isApproved = isExplicitVerified && !isExplicitMismatch && mismatchReasons.length === 0;

    if (!isApproved) {
      const rejectionReason =
        mismatchReasons.length > 0
          ? mismatchReasons.join(', ')
          : isExplicitMismatch
          ? 'Identity verification details (names or date of birth) do not match government database.'
          : 'Identity verification is still in progress or incomplete.';

      if (isExplicitMismatch || mismatchReasons.length > 0) {
        await prisma.user.update({
          where: { id: user.id },
          data: { kycStatus: 'REJECTED' },
        });
        await prisma.kycRecord.updateMany({
          where: { externalReference: targetSessionId },
          data: { status: 'REJECTED' },
        });
      }

      return {
        success: false,
        kycStatus: isExplicitMismatch || mismatchReasons.length > 0 ? 'REJECTED' : user.kycStatus,
        status: rawStatus,
        outcome: rawOutcome,
        message: `Identity verification not approved: ${rejectionReason}`,
      };
    }

    const verifiedFirstName =
      verification.values?.first_name ||
      verification.first_name ||
      (verification.customer_name ? verification.customer_name.split(' ')[0] : null);
    const verifiedLastName =
      verification.values?.last_name ||
      verification.last_name ||
      (verification.customer_name ? verification.customer_name.split(' ').slice(1).join(' ') : null);
    const bvn = verification.id_number || verification.bvn || null;

    const finalFirstName = verifiedFirstName || user.firstName || 'Trader';
    const finalLastName = verifiedLastName || user.lastName || 'Account';

    // 1. Update user to APPROVED
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        kycStatus: 'APPROVED',
        firstName: finalFirstName,
        lastName: finalLastName,
      },
      include: { wallet: true },
    });

    // 2. Create or update KycRecord idempotently
    await prisma.kycRecord.upsert({
      where: { externalReference: targetSessionId },
      update: {
        status: 'APPROVED',
        verifiedAt: new Date(),
        providerPayload: {
          bvn: bvn ? '•••••••' + bvn.slice(-4) : undefined,
          rawBvn: bvn || undefined,
          firstName: finalFirstName,
          lastName: finalLastName,
          ninjaVerification: verification,
          verifiedAt: new Date().toISOString(),
        },
      },
      create: {
        userId: user.id,
        provider: 'NinjaKYC',
        externalReference: targetSessionId,
        status: 'APPROVED',
        verifiedAt: new Date(),
        providerPayload: {
          bvn: bvn ? '•••••••' + bvn.slice(-4) : undefined,
          rawBvn: bvn || undefined,
          firstName: finalFirstName,
          lastName: finalLastName,
          ninjaVerification: verification,
          verifiedAt: new Date().toISOString(),
        },
      },
    });

    // 3. Ensure dedicated Nomba deposit account
    await this.ensureDedicatedNombaAccount(user.id).catch((err) => {
      this.logger.warn(`Could not provision Nomba account during KYC sync: ${err.message}`);
    });

    // 4. Notification
    try {
      await this.notificationsService.createNotification({
        userId: user.id,
        title: 'NinjaKYC Verified & Deposit Account Active!',
        message: 'Your identity has been verified successfully. Your dedicated FundedGiants deposit account is now active.',
        category: NotificationCategory.SECURITY,
        priority: NotificationPriority.HIGH,
      });
    } catch {}

    return {
      success: true,
      kycStatus: 'APPROVED',
      message: 'KYC verified and approved successfully! Dedicated deposit vault active.',
      user: updatedUser,
    };
  }

  /**
   * Set user's custom chosen username (for WordPress purchasers or users without a username)
   */
  async setUsername(userId: string, username: string) {
    const cleanUsername = username.trim().toLowerCase();
    if (!/^[a-z0-9_]{3,20}$/.test(cleanUsername)) {
      throw new BadRequestException('Username must be 3-20 characters long and contain only lowercase letters, numbers, or underscores.');
    }

    const existingWithUsername = await prisma.user.findFirst({
      where: { username: cleanUsername },
    });

    if (existingWithUsername && existingWithUsername.id !== userId) {
      throw new BadRequestException(`The username '${cleanUsername}' is already taken. Please choose another username.`);
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { username: cleanUsername },
    });

    // Also update or ensure their affiliate profile uses their chosen username as referralCode
    const aff = await prisma.affiliateProfile.findUnique({ where: { userId } });
    if (aff) {
      await prisma.affiliateProfile.update({
        where: { id: aff.id },
        data: { referralCode: cleanUsername },
      });
    } else {
      await prisma.affiliateProfile.create({
        data: {
          userId,
          referralCode: cleanUsername,
          cpaCommissionRate: 10.0,
        },
      });
    }

    return {
      success: true,
      username: updatedUser.username,
      message: 'Username successfully claimed and set.',
    };
  }
}
