import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { prisma } from '@fundedgiants/database';

@Injectable()
export class AffiliateService {
  private readonly logger = new Logger(AffiliateService.name);

  // Authoritative Compensation: Flat 10% CPA on challenge/account sales + 3% on recurring referral payouts
  public static readonly BASE_CPA_RATE = 10.0;
  public static readonly PAYOUT_COMMISSION_RATE = 3.0;

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
   * Update affiliate discount code share (0% to 10% deducted from their 10% CPA)
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
