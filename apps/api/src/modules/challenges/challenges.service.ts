import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { prisma } from '@fundedgiants/database';
import { SteraTraderService } from '../integrations/steratrader/steratrader.service';
import { PurchaseFromWalletDto, ValidateCouponsDto } from './dto/purchase.dto';

// Official Pricing Table in NGN synced with WordPress FG_Admin_Settings
export const PLAN_PRICING_TABLE: Record<string, Record<number, number>> = {
  'rhino-rush': {
    1000000: 27500,
    2500000: 67500,
    5000000: 127500,
    10000000: 247500,
    25000000: 487500,
    50000000: 967500,
  },
  'phoenix-rise': {
    1000000: 43000,
    2500000: 106000,
    5000000: 209000,
    10000000: 412000,
    25000000: 1015000,
    50000000: 2018000,
  },
};

@Injectable()
export class ChallengesService implements OnModuleInit {
  private readonly logger = new Logger(ChallengesService.name);

  constructor(private readonly steraTraderService: SteraTraderService) {}

  async onModuleInit() {
    // Seed default administrative discount coupons if none exist
    try {
      const existing = await prisma.coupon.findFirst();
      if (!existing) {
        await prisma.coupon.createMany({
          data: [
            { code: 'WELCOME10', discountPercent: 10.0, isActive: true },
            { code: 'GIANTS20', discountPercent: 20.0, isActive: true },
            { code: 'LAUNCH5', discountPercent: 5.0, isActive: true },
          ],
          skipDuplicates: true,
        });
        this.logger.log('Default promo coupons seeded into database: WELCOME10, GIANTS20, LAUNCH5');
      }
    } catch (err: any) {
      this.logger.warn(`Could not seed default coupons: ${err.message}`);
    }
  }

  /**
   * Return available challenge plans and sizes
   */
  getAvailablePlans() {
    return {
      plans: [
        {
          id: 'rhino-rush',
          title: 'Rhino Rush',
          subtitle: '1 Step Challenge',
          accent: 'emerald',
          leverage: '1:100',
          dailyDrawdownPercent: 4,
          maxDrawdownPercent: 10,
          profitTarget: '10% (2% Daily Cap)',
          payouts: 'First Payout: 5% | Daily Payouts: 2% Min',
          refundNote: '100% Fee Refund at 10% total payouts',
          pricing: PLAN_PRICING_TABLE['rhino-rush'],
        },
        {
          id: 'phoenix-rise',
          title: 'Phoenix Rise',
          subtitle: 'Instant Funding',
          accent: 'gold',
          leverage: '1:30',
          dailyDrawdownPercent: 4,
          maxDrawdownPercent: 7,
          profitTarget: '10% On-Demand or 15 Days (Min 2%)',
          payouts: 'Daily On-Demand (Min 2%)',
          refundNote: 'No refund',
          pricing: PLAN_PRICING_TABLE['phoenix-rise'],
        },
      ],
    };
  }

  /**
   * Dual Coupon Validator:
   * Validates both Site Discount Coupon (admin) and Affiliate Partner Code (username).
   */
  async validateCoupons(dto: ValidateCouponsDto) {
    const planPrices = PLAN_PRICING_TABLE[dto.planType];
    if (!planPrices || !planPrices[dto.accountSizeNgn]) {
      throw new BadRequestException('Invalid plan type or account size requested');
    }

    const subtotalNgn = planPrices[dto.accountSizeNgn];

    let siteDiscountPercent = 0;
    let siteDiscountNgn = 0;
    let siteMessage = '';
    let isSiteValid = false;

    if (dto.siteCouponCode && dto.siteCouponCode.trim()) {
      const cleanSiteCode = dto.siteCouponCode.trim().toUpperCase();
      const coupon = await prisma.coupon.findUnique({
        where: { code: cleanSiteCode },
      });

      if (coupon && coupon.isActive) {
        if (coupon.expiresAt && new Date() > coupon.expiresAt) {
          siteMessage = 'Coupon has expired.';
        } else if (coupon.maxUsage && coupon.usageCount >= coupon.maxUsage) {
          siteMessage = 'Coupon usage limit reached.';
        } else {
          isSiteValid = true;
          siteDiscountPercent = Number(coupon.discountPercent);
          siteDiscountNgn = Math.round((subtotalNgn * siteDiscountPercent) / 100);
          siteMessage = `Site coupon applied (${siteDiscountPercent}% off)`;
        }
      } else {
        siteMessage = 'Invalid discount coupon.';
      }
    }

    let affiliateDiscountPercent = 0;
    let affiliateDiscountNgn = 0;
    let affiliateMessage = '';
    let isAffiliateValid = false;
    let affiliateUsername = '';

    if (dto.affiliateCode && dto.affiliateCode.trim()) {
      const cleanAffCode = dto.affiliateCode.trim().toLowerCase();

      // Check by referralCode on AffiliateProfile or username on User
      const profile = await prisma.affiliateProfile.findFirst({
        where: {
          OR: [
            { referralCode: { equals: cleanAffCode, mode: 'insensitive' } },
            { user: { username: { equals: cleanAffCode, mode: 'insensitive' } } },
          ],
        },
        include: { user: true },
      });

      if (profile) {
        isAffiliateValid = true;
        affiliateUsername = profile.referralCode || profile.user.username || cleanAffCode;
        affiliateDiscountPercent = Number(profile.customDiscountPercent || 0);

        if (affiliateDiscountPercent > 0) {
          affiliateDiscountNgn = Math.round((subtotalNgn * affiliateDiscountPercent) / 100);
          affiliateMessage = `Affiliate code applied (${affiliateDiscountPercent}% partner discount)`;
        } else {
          affiliateMessage = `Affiliate partner @${affiliateUsername} verified.`;
        }
      } else {
        affiliateMessage = 'Invalid affiliate code.';
      }
    }

    const totalDiscountNgn = siteDiscountNgn + affiliateDiscountNgn;
    const finalTotalNgn = Math.max(0, subtotalNgn - totalDiscountNgn);

    return {
      subtotalNgn,
      siteCoupon: {
        code: dto.siteCouponCode || '',
        isValid: isSiteValid,
        discountPercent: siteDiscountPercent,
        discountNgn: siteDiscountNgn,
        message: siteMessage,
      },
      affiliateCoupon: {
        code: dto.affiliateCode || '',
        username: affiliateUsername,
        isValid: isAffiliateValid,
        discountPercent: affiliateDiscountPercent,
        discountNgn: affiliateDiscountNgn,
        message: affiliateMessage,
      },
      totalDiscountNgn,
      finalTotalNgn,
    };
  }

  /**
   * Purchase challenge directly from user NGN wallet balance
   * Bypasses billing checkout and provisions instantly
   */
  async purchaseFromWallet(userId: string, dto: PurchaseFromWalletDto) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { wallet: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // 1. Calculate pricing with any active coupons
    const validation = await this.validateCoupons({
      planType: dto.planType,
      accountSizeNgn: dto.accountSizeNgn,
      siteCouponCode: dto.siteCouponCode,
      affiliateCode: dto.affiliateCode,
    });

    const netPriceNgn = validation.finalTotalNgn;
    const originalPriceNgn = validation.subtotalNgn;

    // 2. Check available wallet balance via double-entry ledger calculation
    const deposits = await prisma.deposit.aggregate({
      where: { walletId: user.wallet?.id, status: 'SUCCESSFUL' },
      _sum: { amount: true },
    });

    const withdrawals = await prisma.withdrawal.aggregate({
      where: {
        walletId: user.wallet?.id,
        status: { in: ['APPROVED', 'PROCESSING', 'PAID'] },
      },
      _sum: { amount: true },
    });

    // Also deduct previous internal orders paid from wallet
    const previousWalletOrders = await prisma.internalOrder.aggregate({
      where: {
        userId: user.id,
        paymentMethod: 'WALLET',
        paymentStatus: 'SUCCESSFUL',
      },
      _sum: { amount: true },
    });

    const totalDeposits = Number(deposits._sum.amount || 0);
    const totalWithdrawals = Number(withdrawals._sum.amount || 0);
    const totalSpent = Number(previousWalletOrders._sum.amount || 0);
    const availableBalanceNgn = totalDeposits - totalWithdrawals - totalSpent;

    if (availableBalanceNgn < netPriceNgn) {
      throw new BadRequestException(
        `Insufficient wallet balance. Total due is ₦${netPriceNgn.toLocaleString()}, but your available balance is ₦${Math.max(0, availableBalanceNgn).toLocaleString()}. Please deposit funds first.`
      );
    }

    // 3. Check Affiliate Partner attribution and Commission
    let referringAffiliateProfile: any = null;
    let affiliateCommissionAmount = 0;

    if (validation.affiliateCoupon.isValid && dto.affiliateCode) {
      const cleanAff = dto.affiliateCode.trim().toLowerCase();
      referringAffiliateProfile = await prisma.affiliateProfile.findFirst({
        where: {
          OR: [
            { referralCode: { equals: cleanAff, mode: 'insensitive' } },
            { user: { username: { equals: cleanAff, mode: 'insensitive' } } },
          ],
        },
      });

      // Self-referral prevention: affiliate cannot refer themselves
      if (referringAffiliateProfile && referringAffiliateProfile.userId === user.id) {
        this.logger.warn(`Self-referral detected for user ${user.id}. No commission awarded.`);
        referringAffiliateProfile = null;
      } else if (referringAffiliateProfile) {
        // Base CPA rate is 10%, minus any custom discount percent shared with the buyer
        const baseCpaRate = Number(referringAffiliateProfile.cpaCommissionRate || 10.0);
        const sharedDiscount = Number(referringAffiliateProfile.customDiscountPercent || 0.0);
        const effectiveCpaRate = Math.max(0, baseCpaRate - sharedDiscount);

        // Commission is calculated on original subtotal (or net sale price)
        affiliateCommissionAmount = Math.round((originalPriceNgn * effectiveCpaRate) / 100);
      }
    }

    // 4. Atomic Debit, Order, and Challenge Creation
    const orderNumber = `FG-ORD-WAL-${Date.now()}`;
    const challengeNumber = `FG-CH-${Date.now()}`;
    const leverage = dto.planType === 'phoenix-rise' ? '1:30' : '1:100';

    const result = await prisma.$transaction(async (tx) => {
      // Create Internal Order
      const order = await tx.internalOrder.create({
        data: {
          orderNumber,
          userId: user.id,
          amount: netPriceNgn,
          currency: 'NGN',
          paymentMethod: 'WALLET',
          paymentStatus: 'SUCCESSFUL',
          paymentReference: `WALLET-DEBIT-${orderNumber}`,
        },
      });

      // Post Debit to Double-Entry Ledger
      const entry = await tx.journalEntry.create({
        data: {
          entryNumber: `JE-PUR-${Date.now()}`,
          transactionType: 'CHALLENGE_PURCHASE',
          reference: orderNumber,
          narration: `Wallet purchase of ${dto.planType} (₦${dto.accountSizeNgn.toLocaleString()}) for net ₦${netPriceNgn.toLocaleString()}${validation.totalDiscountNgn > 0 ? ` (Discount: ₦${validation.totalDiscountNgn.toLocaleString()})` : ''}`,
        },
      });

      const walletLiability = await tx.ledgerAccount.findFirst({ where: { code: '2000-WALLET-LIABILITY' } });
      const revenueAccount = await tx.ledgerAccount.findFirst({ where: { code: '4000-CHALLENGE-REVENUE' } });

      if (walletLiability && revenueAccount) {
        await tx.journalLine.createMany({
          data: [
            { journalEntryId: entry.id, accountId: walletLiability.id, debit: netPriceNgn, credit: 0 },
            { journalEntryId: entry.id, accountId: revenueAccount.id, debit: 0, credit: netPriceNgn },
          ],
        });
      }

      // If site coupon was valid, increment usage count
      if (validation.siteCoupon.isValid && dto.siteCouponCode) {
        await tx.coupon.update({
          where: { code: dto.siteCouponCode.trim().toUpperCase() },
          data: { usageCount: { increment: 1 } },
        });
      }

      // Record Affiliate Attribution & Commission
      if (referringAffiliateProfile) {
        // Link referral relationship if not already recorded
        let referral = await tx.affiliateReferral.findUnique({
          where: { referredUserId: user.id },
        });

        if (!referral) {
          referral = await tx.affiliateReferral.create({
            data: {
              affiliateProfileId: referringAffiliateProfile.id,
              referredUserId: user.id,
            },
          });
          await tx.affiliateProfile.update({
            where: { id: referringAffiliateProfile.id },
            data: { totalReferrals: { increment: 1 } },
          });
        }

        // Create commission record if amount > 0
        if (affiliateCommissionAmount > 0) {
          await tx.affiliateCommission.create({
            data: {
              affiliateProfileId: referringAffiliateProfile.id,
              referralId: referral.id,
              orderNumber,
              amount: affiliateCommissionAmount,
              currency: 'NGN',
              status: 'SUCCESSFUL',
            },
          });

          await tx.affiliateProfile.update({
            where: { id: referringAffiliateProfile.id },
            data: { totalCommissions: { increment: affiliateCommissionAmount } },
          });

          this.logger.log(`Affiliate commission of ₦${affiliateCommissionAmount.toLocaleString()} credited to profile ${referringAffiliateProfile.id} for order ${orderNumber}`);
        }
      }

      // Create Challenge Record
      const challenge = await tx.customerChallenge.create({
        data: {
          challengeNumber,
          userId: user.id,
          orderId: order.id,
          productId: `prod-${dto.planType}-${dto.accountSizeNgn}`,
          type: dto.planType === 'phoenix-rise' ? 'PHOENIX_RISE_INSTANT' : 'RHINO_RUSH_ONE_STEP',
          status: 'PENDING_PROVISIONING',
        },
      });

      return { order, challenge };
    });

    // 5. Instant SteraTrader Account Provisioning
    let steraAccount = null;
    try {
      const steraRes = await this.steraTraderService.provisionAccount({
        userEmail: user.email || 'trader@fundedgiants.com',
        userFullName: `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Trader',
        userPhone: user.phone || undefined,
        accountSizeNgn: dto.accountSizeNgn,
        planType: dto.planType,
        leverage,
        reference: challengeNumber,
      });

      if (steraRes.success && steraRes.login) {
        const dailyLimit = dto.accountSizeNgn * 0.04;
        const maxLimit = dto.planType === 'phoenix-rise' ? dto.accountSizeNgn * 0.07 : dto.accountSizeNgn * 0.10;

        steraAccount = await prisma.tradingAccount.create({
          data: {
            accountNumber: steraRes.login,
            userId: user.id,
            challengeId: result.challenge.id,
            platform: 'SteraTrader',
            status: 'ACTIVE',
            initialBalance: dto.accountSizeNgn,
            currentBalance: dto.accountSizeNgn,
            currentEquity: dto.accountSizeNgn,
            dailyDrawdownLimit: dailyLimit,
            maxDrawdownLimit: maxLimit,
          },
        });

        await prisma.customerChallenge.update({
          where: { id: result.challenge.id },
          data: { status: 'ACTIVE', startDate: new Date() },
        });

        this.logger.log(`SteraTrader Account ${steraRes.login} provisioned via wallet debit for ${user.id}`);
      }
    } catch (err: any) {
      this.logger.error(`SteraTrader provisioning error: ${err.message}`);
    }

    return {
      success: true,
      orderNumber,
      challengeNumber,
      debitedAmountNgn: netPriceNgn,
      originalPriceNgn,
      totalDiscountNgn: validation.totalDiscountNgn,
      tradingAccount: steraAccount
        ? {
            accountNumber: steraAccount.accountNumber,
            platform: 'SteraTrader',
            status: steraAccount.status,
            sizeNgn: dto.accountSizeNgn,
          }
        : null,
    };
  }

  /**
   * Return all trading accounts and customer challenges for a user
   */
  async getUserAccounts(userId: string) {
    const challenges = await prisma.customerChallenge.findMany({
      where: { userId },
      include: {
        tradingAccount: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return challenges.map((ch: any) => {
      const isRhino = ch.type === 'RHINO_RUSH_ONE_STEP';
      const isPhoenix = ch.type === 'PHOENIX_RISE_INSTANT';
      const tradingAcc = ch.tradingAccount;

      // Parse account size from productId e.g. "prod-rhino-rush-10000000"
      const sizeMatch = ch.productId?.match(/-(\d+)$/);
      const sizeNgn = sizeMatch ? parseInt(sizeMatch[1], 10) : Number(tradingAcc?.initialBalance || 10000000);

      const balance = Number(tradingAcc?.currentBalance || sizeNgn);
      const profitNgn = balance - sizeNgn;
      const profitPercent = ((profitNgn / sizeNgn) * 100).toFixed(2);

      const dailyDrawdownLimitNgn = sizeNgn * 0.04;
      const maxDrawdownLimitNgn = isPhoenix ? sizeNgn * 0.07 : sizeNgn * 0.10;

      // Current Phase determination
      let currentPhase = 'Challenge';
      if (isPhoenix) {
        currentPhase = 'Instant Funding';
      } else if (isRhino) {
        currentPhase = ch.status === 'PASSED' || ch.status === 'FUNDED' ? 'Funded' : 'Challenge';
      }

      return {
        id: tradingAcc?.accountNumber || ch.challengeNumber,
        challengeNumber: ch.challengeNumber,
        planName: isPhoenix ? 'Phoenix Rise' : 'Rhino Rush',
        planType: isPhoenix ? 'PHOENIX_RISE' : 'RHINO_RUSH',
        currentPhase,
        sizeNgn,
        currentBalanceNgn: balance,
        currentEquityNgn: Number(tradingAcc?.currentEquity || balance),
        profitNgn,
        profitPercent: `${profitNgn >= 0 ? '+' : ''}${profitPercent}%`,
        dailyDrawdownNgn: 0,
        dailyDrawdownLimitNgn,
        maxDrawdownLimitNgn,
        status: ch.status === 'FAILED' ? 'Breached' : 'Active',
        platform: 'SteraTrader',
        createdAt: ch.createdAt,
      };
    });
  }
}
