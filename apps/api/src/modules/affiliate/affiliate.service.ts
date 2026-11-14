import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { prisma } from '@fundedgiants/database';

@Injectable()
export class AffiliateService {
  private readonly logger = new Logger(AffiliateService.name);

  // Commission Tiers: Tier 1 (1-10 referrals: 10%), Tier 2 (11-50 referrals: 15%), Tier 3 (50+: 20%)
  private getCommissionRate(totalReferrals: number): number {
    if (totalReferrals >= 50) return 0.20;
    if (totalReferrals >= 11) return 0.15;
    return 0.10;
  }

  /**
   * Get or automatically generate affiliate profile for user
   */
  async getOrCreateProfile(userId: string) {
    let profile = await prisma.affiliateProfile.findUnique({
      where: { userId },
      include: {
        referrals: {
          include: {
            referredUser: {
              select: {
                id: true,
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
      // Generate clean unique referral code: e.g. FG-89214
      const randomSuffix = Math.floor(10000 + Math.random() * 90000).toString();
      const referralCode = `FG-${randomSuffix}`;

      profile = await prisma.affiliateProfile.create({
        data: {
          userId,
          referralCode,
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

    const commissionRate = this.getCommissionRate(profile.totalReferrals);

    return {
      success: true,
      profile: {
        id: profile.id,
        referralCode: profile.referralCode,
        referralLink: `https://fundedgiants.com/ref/${profile.referralCode}`,
        totalReferrals: profile.totalReferrals,
        totalCommissionsNgn: Number(profile.totalCommissions),
        withdrawnCommissionsNgn: Number(profile.withdrawnCommissions),
        availableCommissionNgn: availableCommission > 0 ? availableCommission : 0,
        currentTierRatePercent: Math.round(commissionRate * 100),
      },
      referrals: profile.referrals.map((r) => ({
        id: r.id,
        date: r.createdAt,
        referredUser: r.referredUser.email || r.referredUser.phone || 'Trader',
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
      // 1. Update affiliate profile withdrawn amounts
      prisma.affiliateProfile.update({
        where: { id: profile.id },
        data: {
          withdrawnCommissions: { increment: transferAmount },
        },
      }),

      // 2. Record Deposit entry into Giants Vault
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
