import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { prisma } from '@fundedgiants/database';
import { SteraTraderService } from '../integrations/steratrader/steratrader.service';

export interface SteraTraderAccountMetrics {
  accountNumber: string;
  balance: number;
  equity: number;
  startingDayEquity: number;
  openTradesCount: number;
  openTradesProfit: number;
}

@Injectable()
export class RiskEngineService {
  private readonly logger = new Logger(RiskEngineService.name);
  private isProcessing = false;

  constructor(private readonly steraTraderService: SteraTraderService) {}

  /**
   * Evaluates active trading accounts on an ongoing automated schedule
   * Enforces 4% Daily Drawdown, Max Drawdown (10% Rhino / 7% Phoenix),
   * and 10% Profit Target for 1-Step promotion.
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async monitorActiveAccounts() {
    if (this.isProcessing) {
      return;
    }
    this.isProcessing = true;

    try {
      const activeAccounts = await prisma.tradingAccount.findMany({
        where: {
          status: 'ACTIVE',
        },
        include: {
          challenge: {
            include: {
              product: true,
            },
          },
        },
      });

      for (const account of activeAccounts) {
        await this.evaluateAccount(account);
      }
    } catch (err: any) {
      this.logger.error(`Risk Engine evaluation error: ${err.message}`);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Evaluate a single trading account against strict risk rules
   */
  async evaluateAccount(account: any) {
    const { challenge, initialBalance, dailyDrawdownLimit, maxDrawdownLimit } = account;
    const initialBal = Number(initialBalance);
    const dailyLimit = Number(dailyDrawdownLimit);
    const maxLimit = Number(maxDrawdownLimit);

    // Fetch real-time equity & metrics from SteraTrader
    const metrics = await this.steraTraderService.fetchAccountMetrics(account.accountNumber);
    if (!metrics) {
      // Missing or stale trading data must never silently produce a favorable decision
      return;
    }

    const currentEquity = metrics.equity;
    const currentBalance = metrics.balance;

    // 1. Calculate Daily Drawdown:
    // Daily loss is evaluated against starting day equity / balance
    const startingEquity = metrics.startingDayEquity || initialBal;
    const dailyLoss = startingEquity - currentEquity;

    // 2. Calculate Maximum Loss (Overall Drawdown from initial capital):
    const maxLoss = initialBal - currentEquity;

    // 3. Update account snapshot in database
    await prisma.tradingAccount.update({
      where: { id: account.id },
      data: {
        currentBalance: currentBalance,
        currentEquity: currentEquity,
        totalProfit: currentEquity - initialBal,
        lastSyncedAt: new Date(),
      },
    });

    // Check Rule A: 4% Daily Drawdown Breach
    if (dailyLoss >= dailyLimit) {
      await this.handleBreach(
        account,
        'DAILY_DD_BREACH',
        `Daily drawdown breach: ₦${dailyLoss.toLocaleString()} lost today exceeding 4% limit of ₦${dailyLimit.toLocaleString()}`,
        currentBalance,
        currentEquity
      );
      return;
    }

    // Check Rule B: Max Drawdown Breach (10% Rhino / 7% Phoenix)
    if (maxLoss >= maxLimit) {
      const percent = challenge.product.skuPrefix === 'phoenix-rise' ? '7%' : '10%';
      await this.handleBreach(
        account,
        'MAX_DD_BREACH',
        `Maximum total drawdown breach: ₦${maxLoss.toLocaleString()} overall loss exceeding ${percent} limit of ₦${maxLimit.toLocaleString()}`,
        currentBalance,
        currentEquity
      );
      return;
    }

    // Check Rule C: Profit Target Evaluation for Rhino Rush (1-Step Challenge)
    if (
      challenge.product.skuPrefix === 'rhino-rush' &&
      challenge.status === 'ACTIVE'
    ) {
      const profitTarget = initialBal * 0.10; // 10% Profit Target
      const currentProfit = currentEquity - initialBal;

      if (currentProfit >= profitTarget) {
        await this.handlePromotion(account, currentProfit, currentEquity);
      }
    }
  }

  /**
   * Action upon breach: record event, mark account closed/failed, and terminate on SteraTrader
   */
  private async handleBreach(
    account: any,
    eventType: string,
    reason: string,
    snapshotBalance: number,
    snapshotEquity: number
  ) {
    this.logger.warn(`BREACH on account ${account.accountNumber}: ${reason}`);

    await prisma.$transaction([
      prisma.riskEvent.create({
        data: {
          challengeId: account.challengeId,
          tradingAccountId: account.id,
          eventType,
          description: reason,
          severity: 'CRITICAL',
          snapshotBalance,
          snapshotEquity,
        },
      }),
      prisma.tradingAccount.update({
        where: { id: account.id },
        data: {
          status: 'CLOSED',
        },
      }),
      prisma.customerChallenge.update({
        where: { id: account.challengeId },
        data: {
          status: 'FAILED',
          failedAt: new Date(),
          failureReason: reason,
        },
      }),
    ]);

    // Instruct SteraTrader to terminate/archive the breached account
    await this.steraTraderService.terminateAccount(account.accountNumber, reason);
  }

  /**
   * Action upon passing 1-Step: promote account on SteraTrader and advance status to PASSED/FUNDED
   */
  private async handlePromotion(account: any, profit: number, equity: number) {
    this.logger.log(`TARGET REACHED on account ${account.accountNumber}: Profit ₦${profit.toLocaleString()}`);

    await prisma.$transaction([
      prisma.riskEvent.create({
        data: {
          challengeId: account.challengeId,
          tradingAccountId: account.id,
          eventType: 'TARGET_REACHED',
          description: `10% profit target reached with ₦${profit.toLocaleString()} net profit. Promoted to Funded phase.`,
          severity: 'INFO',
          snapshotBalance: account.currentBalance,
          snapshotEquity: equity,
        },
      }),
      prisma.customerChallenge.update({
        where: { id: account.challengeId },
        data: {
          status: 'PASSED',
          passedAt: new Date(),
        },
      }),
    ]);

    // Promote on SteraTrader
    await this.steraTraderService.promoteAccount(account.accountNumber);
  }
}
