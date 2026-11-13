import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { prisma } from '@fundedgiants/database';
import { SteraTraderService } from '../integrations/steratrader/steratrader.service';
import { PurchaseFromWalletDto } from './dto/purchase.dto';

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
export class ChallengesService {
  private readonly logger = new Logger(ChallengesService.name);

  constructor(private readonly steraTraderService: SteraTraderService) {}

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

    // 1. Validate pricing
    const planPrices = PLAN_PRICING_TABLE[dto.planType];
    if (!planPrices || !planPrices[dto.accountSizeNgn]) {
      throw new BadRequestException('Invalid plan type or account size requested');
    }

    const priceNgn = planPrices[dto.accountSizeNgn];

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

    if (availableBalanceNgn < priceNgn) {
      throw new BadRequestException(
        `Insufficient wallet balance. Price is ₦${priceNgn.toLocaleString()}, but your available balance is ₦${Math.max(0, availableBalanceNgn).toLocaleString()}. Please deposit funds first.`
      );
    }

    // 3. Atomic Debit & Internal Order Creation
    const orderNumber = `FG-ORD-WAL-${Date.now()}`;
    const challengeNumber = `FG-CH-${Date.now()}`;
    const leverage = dto.planType === 'phoenix-rise' ? '1:30' : '1:100';

    const result = await prisma.$transaction(async (tx) => {
      // Create Internal Order
      const order = await tx.internalOrder.create({
        data: {
          orderNumber,
          userId: user.id,
          amount: priceNgn,
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
          narration: `Wallet purchase of ${dto.planType} (₦${dto.accountSizeNgn.toLocaleString()}) for ₦${priceNgn.toLocaleString()}`,
        },
      });

      const walletLiability = await tx.ledgerAccount.findFirst({ where: { code: '2000-WALLET-LIABILITY' } });
      const revenueAccount = await tx.ledgerAccount.findFirst({ where: { code: '4000-CHALLENGE-REVENUE' } });

      if (walletLiability && revenueAccount) {
        await tx.journalLine.createMany({
          data: [
            { journalEntryId: entry.id, accountId: walletLiability.id, debit: priceNgn, credit: 0 },
            { journalEntryId: entry.id, accountId: revenueAccount.id, debit: 0, credit: priceNgn },
          ],
        });
      }

      // Create Challenge
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

    // 4. Instant SteraTrader Account Provisioning
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
      debitedAmountNgn: priceNgn,
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
}
