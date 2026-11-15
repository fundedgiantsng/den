import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { prisma } from '@fundedgiants/database';
import { WooCommerceService } from '../integrations/woocommerce/woocommerce.service';

@Injectable()
export class AffiliateService {
  private readonly logger = new Logger(AffiliateService.name);

  // Authoritative Compensation: Flat 10% CPA on challenge/account sales + 3% on recurring referral payouts
  public static readonly BASE_CPA_RATE = 10.0;
  public static readonly PAYOUT_COMMISSION_RATE = 3.0;

  constructor(private readonly woocommerceService: WooCommerceService) {}

  /**
   * Get or automatically generate affiliate profile for user using their username
   */
  async getOrCreateProfile(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Default username if not set on first profile fill
    const usernameHandle = user.username || user.email?.split('@')[0] || `trader${user.id.slice(0, 5)}`;

    let profile = await prisma.affiliateProfile.findUnique({
      where: { userId },
      include: {
        coupons: {
          orderBy: { createdAt: 'desc' },
        },
        referrals: {
          include: {
            referredUser: {
              select: {
                id: true,
                username: true,
                email: true,
                phone: true,
                firstName: true,
                lastName: true,
                createdAt: true,
              },
            },
          },
        },
        commissions: {
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
      },
    });

    if (!profile) {
      profile = await prisma.affiliateProfile.create({
        data: {
          userId,
          referralCode: usernameHandle,
          cpaCommissionRate: AffiliateService.BASE_CPA_RATE,
          payoutCommissionRate: AffiliateService.PAYOUT_COMMISSION_RATE,
          customDiscountPercent: 0,
          totalReferrals: 0,
          totalCommissions: 0,
          withdrawnCommissions: 0,
        },
        include: {
          coupons: true,
          referrals: {
            include: {
              referredUser: {
                select: {
                  id: true,
                  username: true,
                  email: true,
                  phone: true,
                  firstName: true,
                  lastName: true,
                  createdAt: true,
                },
              },
            },
          },
          commissions: true,
        },
      });
    }

    const availableCommission =
      Number(profile.totalCommissions) - Number(profile.withdrawnCommissions);

    const discountShare = Number(profile.customDiscountPercent);
    const netCpaRate = AffiliateService.BASE_CPA_RATE - discountShare;

    return {
      success: true,
      profile: {
        id: profile.id,
        username: profile.referralCode,
        referralCode: profile.referralCode,
        referralLink: `https://fundedgiants.com/ref/${profile.referralCode}`,
        cpaRatePercent: AffiliateService.BASE_CPA_RATE,
        netCpaRatePercent: netCpaRate > 0 ? netCpaRate : 0,
        payoutRatePercent: AffiliateService.PAYOUT_COMMISSION_RATE,
        discountSharedPercent: discountShare,
        totalReferrals: profile.totalReferrals,
        totalCommissionsNgn: Number(profile.totalCommissions),
        withdrawnCommissionsNgn: Number(profile.withdrawnCommissions),
        availableCommissionNgn: availableCommission > 0 ? availableCommission : 0,
      },
      coupons: profile.coupons.map((c) => ({
        id: c.id,
        code: c.code,
        discountPercent: Number(c.discountPercent),
        maxUsage: c.maxUsage || 0,
        usageCount: c.usageCount,
        remainingUses: Math.max(0, (c.maxUsage || 0) - c.usageCount),
        isActive: c.isActive && (!c.maxUsage || c.usageCount < c.maxUsage),
        netCpaPercent: Math.max(0, AffiliateService.BASE_CPA_RATE - Number(c.discountPercent)),
        createdAt: c.createdAt,
      })),
      referrals: profile.referrals.map((r) => ({
        id: r.id,
        date: r.createdAt,
        referredUser: r.referredUser.username || r.referredUser.email || 'Trader',
      })),
      recentCommissions: profile.commissions.map((c) => ({
        id: c.id,
        orderNumber: c.orderNumber,
        amountNgn: Number(c.amount),
        status: c.status,
        date: c.createdAt,
      })),
    };
  }

  /**
   * Create a sitewide unique custom discount code for this affiliate with usage limit
   */
  async createCustomDiscountCode(params: {
    userId: string;
    code: string;
    discountPercent: number;
    maxUsage: number;
  }) {
    const profile = await prisma.affiliateProfile.findUnique({
      where: { userId: params.userId },
    });

    if (!profile) {
      throw new NotFoundException('Affiliate profile not found');
    }

    const cleanCode = params.code.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '');

    if (!cleanCode || cleanCode.length < 3 || cleanCode.length > 20) {
      throw new BadRequestException('Discount code must be between 3 and 20 alphanumeric characters.');
    }

    const discount = Number(params.discountPercent);
    if (isNaN(discount) || discount < 1 || discount > 10) {
      throw new BadRequestException('Discount percentage must be between 1% and 10%.');
    }

    const usageLimit = parseInt(String(params.maxUsage), 10);
    if (isNaN(usageLimit) || usageLimit < 1 || usageLimit > 1000) {
      throw new BadRequestException('User usage limit must be between 1 and 1000 users.');
    }

    // Check sitewide uniqueness against existing Coupons
    const existingCoupon = await prisma.coupon.findUnique({
      where: { code: cleanCode },
    });

    if (existingCoupon) {
      throw new BadRequestException(`The code '${cleanCode}' is already taken. Please choose a different unique code.`);
    }

    // Also check against existing referral handles
    const existingHandle = await prisma.affiliateProfile.findFirst({
      where: { referralCode: { equals: cleanCode, mode: 'insensitive' } },
    });

    if (existingHandle && existingHandle.id !== profile.id) {
      throw new BadRequestException(`The code '${cleanCode}' matches an existing trader handle. Please choose another.`);
    }

    // Create the coupon
    const coupon = await prisma.coupon.create({
      data: {
        code: cleanCode,
        discountPercent: discount,
        maxUsage: usageLimit,
        usageCount: 0,
        isActive: true,
        affiliateProfileId: profile.id,
      },
    });

    // Auto-sync affiliate discount code to WooCommerce so it works on WordPress checkout
    try {
      await this.woocommerceService.syncCoupon({
        code: cleanCode,
        discountPercent: discount,
        maxUsage: usageLimit,
        description: `Affiliate Discount Coupon - ${profile.referralCode}`,
        isActive: true,
      });
    } catch (syncErr: any) {
      this.logger.warn(`WooCommerce sync for affiliate coupon deferred: ${syncErr.message}`);
    }

    const netCpa = AffiliateService.BASE_CPA_RATE - discount;

    this.logger.log(`Created custom discount code ${cleanCode} (${discount}% off, max ${usageLimit} users, net CPA ${netCpa}%) for affiliate ${profile.id}`);

    return {
      success: true,
      message: `Discount code '${cleanCode}' created successfully! You earn ${netCpa}% net CPA on each usage.`,
      coupon: {
        id: coupon.id,
        code: coupon.code,
        discountPercent: Number(coupon.discountPercent),
        maxUsage: coupon.maxUsage,
        usageCount: coupon.usageCount,
        remainingUses: coupon.maxUsage! - coupon.usageCount,
        isActive: coupon.isActive,
        netCpaPercent: netCpa,
        createdAt: coupon.createdAt,
      },
    };
  }

  /**
   * Return all discount codes created by this affiliate
   */
  async getMyDiscountCodes(userId: string) {
    const profile = await prisma.affiliateProfile.findUnique({
      where: { userId },
      include: {
        coupons: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!profile) return [];

    return profile.coupons.map((c) => ({
      id: c.id,
      code: c.code,
      discountPercent: Number(c.discountPercent),
      maxUsage: c.maxUsage || 0,
      usageCount: c.usageCount,
      remainingUses: Math.max(0, (c.maxUsage || 0) - c.usageCount),
      isActive: c.isActive && (!c.maxUsage || c.usageCount < c.maxUsage),
      netCpaPercent: Math.max(0, AffiliateService.BASE_CPA_RATE - Number(c.discountPercent)),
      createdAt: c.createdAt,
    }));
  }

  /**
   * Update affiliate default discount code share (0% to 10% deducted from their 10% CPA)
   */
  async updateDiscountShare(userId: string, discountPercent: number) {
    if (discountPercent < 0 || discountPercent > 10) {
      throw new BadRequestException('Discount shared must be between 0% and 10%.');
    }

    const profile = await prisma.affiliateProfile.update({
      where: { userId },
      data: {
        customDiscountPercent: discountPercent,
      },
    });

    const netCpa = AffiliateService.BASE_CPA_RATE - discountPercent;

    return {
      success: true,
      message: `Referral discount updated to ${discountPercent}%. Your net CPA is now ${netCpa}%.`,
      customDiscountPercent: discountPercent,
      netCpaRatePercent: netCpa,
    };
  }

  /**
   * Transfer earned affiliate commission directly to Giants Vault balance
   */
  async transferCommissionToVault(userId: string, amountNgn?: number) {
    const profile = await prisma.affiliateProfile.findUnique({
      where: { userId },
      include: {
        user: {
          include: { wallet: true },
        },
      },
    });

    if (!profile || !profile.user.wallet) {
      throw new NotFoundException('Affiliate profile or user wallet not found');
    }

    const available =
      Number(profile.totalCommissions) - Number(profile.withdrawnCommissions);

    const transferAmount = amountNgn || available;

    if (transferAmount <= 0 || transferAmount > available) {
      throw new BadRequestException('Invalid transfer amount or insufficient affiliate balance.');
    }

    // Atomic double-entry update
    await prisma.$transaction([
      prisma.affiliateProfile.update({
        where: { id: profile.id },
        data: {
          withdrawnCommissions: { increment: transferAmount },
        },
      }),

      prisma.deposit.create({
        data: {
          walletId: profile.user.wallet.id,
          reference: `AFF-TRANSFER-${Date.now()}`,
          amount: transferAmount,
          currency: 'NGN',
          status: 'SUCCESSFUL',
          senderName: 'FundedGiants Affiliate Earnings',
          reconciled: true,
        },
      }),
    ]);

    this.logger.log(`Transferred ₦${transferAmount.toLocaleString()} affiliate commission to Giants Vault for user ${userId}`);

    return {
      success: true,
      message: `₦${transferAmount.toLocaleString()} successfully credited to your Giants Vault!`,
      transferredAmountNgn: transferAmount,
    };
  }
}
