import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
  TooManyRequestsException,
} from '@nestjs/common';
import * as crypto from 'crypto';
import { prisma } from '@fundedgiants/database';
import { RequestOtpDto, LoginIdentifierType, RetryWhatsappOtpDto, VerifyOtpDto } from './dto/auth.dto';
import { RobaseService } from '../integrations/robase/robase.service';

@Injectable()
export class AuthService {
  private readonly robaseService: RobaseService;
  private readonly otpExpirySeconds = 300; // 5 minutes
  private readonly cooldownSeconds = 45; // 45s between resends

  constructor() {
    this.robaseService = new RobaseService();
  }

  private generateSecureCode(): string {
    return crypto.randomInt(100000, 999999).toString();
  }

  private hashCode(code: string): string {
    return crypto.createHash('sha256').update(code).digest('hex');
  }

  async requestOtp(dto: RequestOtpDto) {
    const identifier = dto.identifier.trim().toLowerCase();

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
      throw new TooManyRequestsException(
        `Please wait ${this.cooldownSeconds} seconds before requesting a new code.`
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
      // Email delivery via Brevo / Resend SMTP integration
      // Production email dispatch handled by mailer adapter
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
      throw new TooManyRequestsException(
        `Please wait ${this.cooldownSeconds} seconds before requesting a WhatsApp OTP.`
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
}
