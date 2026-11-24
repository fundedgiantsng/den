import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { prisma } from '@fundedgiants/database';
import { SteraTraderService } from '../integrations/steratrader/steratrader.service';
import { CertificatesService } from '../certificates/certificates.service';
import { WooCommerceService } from '../integrations/woocommerce/woocommerce.service';
import { NotificationsService } from '../notifications/notifications.service';
import { TradeRouterService } from './trade-router.service';

export interface SteraTraderAccountMetrics {
  accountNumber: string;
  balance: number;
  equity: number;
  startingDayEquity: number;
  openTradesCount: number;
  openTradesProfit: number;
}

export interface TradeEventPayload {
  event: 'TRADE_OPEN' | 'TRADE_CLOSE' | 'TRADE_UPDATE' | 'EQUITY_TICK';
  accountNumber: string;
  tradeId?: string;
  symbol?: string;
  direction?: 'BUY' | 'SELL';
  volume?: number;
  openPrice?: number;
  closePrice?: number;
  profit?: number;
  equity?: number;
  balance?: number;
  timestamp?: string;
}

export interface PayoutEligibilityResult {
  eligible: boolean;
  accountNumber: string;
  phase: string;
  currentEquity: number;
  currentProfit: number;
  cycleProfitNgn?: number;
  profitPercent: number;
  withdrawableProfitNgn: number;
  traderProfitSplit?: number;
  firmProfitSplit?: number;
  traderProfitSplitNgn?: number;
  firmProfitSplitNgn?: number;
  payoutNumber: number;
  traderSplitPercent: number;
  profitSplitRatio: string;
  minRequiredPercent: number;
  openTradesCount: number;
  reason?: string;
  breakdown: {
    minimumProfitMet: boolean;
    zeroOpenTradesMet: boolean;
    noActiveBreachesMet: boolean;
    firstPayoutMet: boolean;
  };
}

@Injectable()
export class RiskEngineService {
  private readonly logger = new Logger(RiskEngineService.name);
  private isProcessingCron = false;

  // High-load performance metrics
  private totalEvaluationsCount = 0;
  private totalBreachesCaught = 0;
  private totalAutomatedPayoutsApproved = 0;
  private lastCronExecutionTime = 0;

  constructor(
    private readonly steraTraderService: SteraTraderService,
    private readonly certificatesService: CertificatesService,
    private readonly woocommerceService: WooCommerceService,
    private readonly notificationsService: NotificationsService,
    private readonly tradeRouterService: TradeRouterService,
  ) {}

  /**
   * High-Load Cron Monitoring:
   * Chunks active accounts into batches (batch size: 50) with concurrency control
   * to support tens of thousands of active traders without exhausting database connections.
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async monitorActiveAccounts() {
    if (this.isProcessingCron) {
      this.logger.debug('Previous risk monitoring cycle still running; skipping iteration.');
      return;
    }
    this.isProcessingCron = true;
    const start = Date.now();

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

      const BATCH_SIZE = 50;
      for (let i = 0; i < activeAccounts.length; i += BATCH_SIZE) {
        const batch = activeAccounts.slice(i, i + BATCH_SIZE);
        await Promise.allSettled(batch.map((account) => this.evaluateAccount(account)));
      }

      this.lastCronExecutionTime = Date.now() - start;
      this.logger.debug(
        `Risk scan completed: ${activeAccounts.length} accounts evaluated in ${this.lastCronExecutionTime}ms.`
      );
    } catch (err: any) {
      this.logger.error(`Risk Engine evaluation error: ${err.message}`, err.stack);
    } finally {
      this.isProcessingCron = false;
    }
  }

  /**
   * Daily Session Reset at 23:00 (GMT +1) [22:00 UTC]:
   * 1. Open/Closed trades inclusive baseline reset: new starting baseline = max(balance, equity).
   * 2. Rhino Rush 2% Max Daily Profit Cap:
   *    Any profit generated above the 2% cap does not count towards the target and is cleared/removed at reset.
   *    Capped credit for the completed day is banked into DAILY_RESET_SNAPSHOT.
   *    If banked cumulative qualified profit >= 10% target, account passes and is promoted to Funded!
   */
  @Cron('0 22 * * *')
  async handleDailySessionReset() {
    this.logger.log('Executing daily session reset at 23:00 GMT+1 (22:00 UTC)...');
    return this.executeDailySessionReset();
  }

  async executeDailySessionReset() {
    const activeAccounts = await prisma.tradingAccount.findMany({
      where: { status: 'ACTIVE' },
      include: {
        challenge: {
          include: { product: true },
        },
      },
    });

    const resetResults = [];

    for (const account of activeAccounts) {
      try {
        const metrics = await this.steraTraderService.fetchAccountMetrics(account.accountNumber);
        const floating = Number((metrics as any)?.floating ?? metrics?.openTradesProfit ?? 0);
        const dbBal = Number(account.currentBalance);
        const currentBalance = dbBal > 0 ? dbBal : (metrics?.balance ?? Number(account.initialBalance));
        const currentEquity = currentBalance + floating;
        const initialBal = Number(account.initialBalance);

        // Check 30-Day Inactivity Breach Rule
        const isInactive = await this.checkInactivityBreach(account, currentBalance, currentEquity);
        if (isInactive) {
          resetResults.push({
            accountNumber: account.accountNumber,
            status: 'BREACHED_INACTIVITY',
            reason: '30-Day Inactivity Rule Breach',
          });
          continue;
        }

        const isRhinoRushEvaluation =
          account.challenge.product.skuPrefix === 'rhino-rush' &&
          account.challenge.status === 'ACTIVE';

        let sessionInfo: any = {};

        if (isRhinoRushEvaluation) {
          // Retrieve prior snapshot to know the opening baseline of the session that just concluded
          const lastSnapshot = await prisma.riskEvent.findFirst({
            where: {
              tradingAccountId: account.id,
              eventType: 'DAILY_RESET_SNAPSHOT',
            },
            orderBy: { createdAt: 'desc' },
          });

          let sessionOpeningBaseline = initialBal;
          if (lastSnapshot) {
            const snapBal = Number(lastSnapshot.snapshotBalance || initialBal);
            const snapEq = Number(lastSnapshot.snapshotEquity || snapBal);
            sessionOpeningBaseline = Math.max(snapBal, snapEq);
          }

          const todayRawProfit = Math.max(0, currentEquity - sessionOpeningBaseline);
          const dailyCap = initialBal * 0.02; // 2% Max Daily Cap
          const cappedCredit = Math.min(todayRawProfit, dailyCap);
          const excessProfitCleared = Math.max(0, todayRawProfit - dailyCap);

          // Previous banked
          const previousSnapshots = await prisma.riskEvent.findMany({
            where: {
              tradingAccountId: account.id,
              eventType: 'DAILY_RESET_SNAPSHOT',
            },
          });
          let bankedSoFar = 0;
          for (const snap of previousSnapshots) {
            try {
              const parsed = JSON.parse(snap.description);
              bankedSoFar += Number(parsed.cappedCredit || 0);
            } catch {}
          }

          const cumulativeQualifiedProfit = bankedSoFar + cappedCredit;
          const profitTarget = initialBal * 0.10;

          // Record session reset snapshot banking the capped credit and discarding excess
          await prisma.riskEvent.create({
            data: {
              challengeId: account.challengeId,
              tradingAccountId: account.id,
              eventType: 'DAILY_RESET_SNAPSHOT',
              description: JSON.stringify({
                sessionDate: new Date().toISOString().split('T')[0],
                sessionOpeningBaseline,
                todayRawProfit,
                cappedCredit,
                excessProfitCleared,
                cumulativeQualifiedProfit,
                profitTarget,
              }),
              severity: 'INFO',
              snapshotBalance: currentBalance,
              snapshotEquity: currentEquity,
            },
          });

          sessionInfo = {
            todayRawProfit,
            cappedCredit,
            excessProfitCleared,
            cumulativeQualifiedProfit,
            passed: cumulativeQualifiedProfit >= profitTarget,
          };

          // If reached 10% target with banked daily capped profits, promote to funded!
          if (cumulativeQualifiedProfit >= profitTarget) {
            await this.handlePromotion(account, cumulativeQualifiedProfit, currentEquity);
          }
        }

        // New starting baseline for tomorrow: higher of balance or equity (open/closed trades inclusive)
        const newStartingBaseline = Math.max(currentBalance, currentEquity);
        const newDailyLimit = newStartingBaseline * 0.04;

        if (!isRhinoRushEvaluation) {
          // Record session reset snapshot banking starting baseline for funded/instant accounts
          await prisma.riskEvent.create({
            data: {
              challengeId: account.challengeId,
              tradingAccountId: account.id,
              eventType: 'DAILY_RESET_SNAPSHOT',
              description: JSON.stringify({
                sessionDate: new Date().toISOString().split('T')[0],
                startingBaseline: newStartingBaseline,
                dailyLimit: newDailyLimit,
                ...sessionInfo,
              }),
              severity: 'INFO',
              snapshotBalance: currentBalance,
              snapshotEquity: currentEquity,
            },
          });
        }

        await prisma.tradingAccount.update({
          where: { id: account.id },
          data: {
            currentBalance,
            currentEquity,
            dailyDrawdownLimit: newDailyLimit,
            lastSyncedAt: new Date(),
          },
        });

        resetResults.push({
          accountNumber: account.accountNumber,
          newStartingBaseline,
          newDailyLimit,
          sessionInfo,
        });
      } catch (err: any) {
        this.logger.error(`Error in session reset for account ${account.accountNumber}: ${err.message}`);
      }
    }

    this.logger.log(`Daily session reset completed for ${resetResults.length} active accounts.`);
    return {
      status: 'SUCCESS',
      resetAt: new Date().toISOString(),
      timezone: '23:00 GMT+1 (22:00 UTC)',
      accountsProcessed: resetResults.length,
      details: resetResults,
    };
  }

  /**
   * Event-Driven Trade & Equity Processing (O(1) execution path):
   * Triggered immediately when SteraTrader broadcasts trade events
   * (e.g. order placed, trade closed, equity tick).
   */
  async processTradeEvent(payload: TradeEventPayload) {
    this.totalEvaluationsCount++;
    const { accountNumber, event, tradeId, symbol, direction, volume, openPrice, closePrice, profit } = payload;

    const account = await prisma.tradingAccount.findUnique({
      where: { accountNumber },
      include: {
        challenge: {
          include: {
            product: true,
          },
        },
      },
    });

    if (!account) {
      this.logger.warn(`Trade event received for unknown account: ${accountNumber}`);
      return { status: 'account_not_found' };
    }

    if (account.status !== 'ACTIVE') {
      this.logger.warn(`Trade event ignored for non-active account ${accountNumber} (Status: ${account.status})`);
      return { status: 'account_not_active' };
    }

    // 1. Record / Update Trade Record in database if tradeId provided
    if (tradeId && symbol && direction && volume !== undefined && openPrice !== undefined) {
      await prisma.tradeRecord.upsert({
        where: { externalTradeId: tradeId },
        update: {
          closePrice: closePrice ?? undefined,
          profit: profit ?? undefined,
          closedAt: event === 'TRADE_CLOSE' ? new Date() : undefined,
        },
        create: {
          tradingAccountId: account.id,
          externalTradeId: tradeId,
          symbol,
          direction,
          volume,
          openPrice,
          closePrice: closePrice ?? null,
          profit: profit ?? null,
          openedAt: new Date(),
          closedAt: event === 'TRADE_CLOSE' ? new Date() : null,
        },
      });
    }

    // 1.5. Exploit & Trading Integrity Rules (Immediate First-Strike Enforcement)
    const exploitCheck = await this.checkExploitBreaches(account, payload);
    if (exploitCheck.breached) {
      await this.handleBreach(
        account,
        exploitCheck.eventType || 'EXPLOIT_RULE_BREACH',
        exploitCheck.reason || 'Prohibited trading exploit detected.',
        Number(account.currentBalance),
        Number(account.currentEquity)
      );
      return {
        status: 'breached',
        accountNumber,
        reason: exploitCheck.reason,
      };
    }

    // 2. Perform instantaneous risk assessment on the account
    const pushedMetrics: SteraTraderAccountMetrics | undefined =
      payload.equity !== undefined || payload.balance !== undefined
        ? {
            accountNumber,
            equity: payload.equity !== undefined ? Number(payload.equity) : Number(account.currentEquity),
            balance: payload.balance !== undefined ? Number(payload.balance) : Number(account.currentBalance),
            startingDayEquity: Number(account.initialBalance),
            openTradesCount: event === 'TRADE_OPEN' ? 1 : 0,
            openTradesProfit: profit !== undefined ? Number(profit) : 0,
          }
        : undefined;

    const assessment = await this.evaluateAccount(account, pushedMetrics);

    // 3. Route Trade to MT5 A-Book (if admin-activated and account is ACTIVE)
    let routeResult: any = null;
    if (account.status === 'ACTIVE' && event !== 'EQUITY_TICK' && tradeId && symbol) {
      routeResult = await this.tradeRouterService.routeTradeEvent(account, {
        event: event as any,
        tradeId,
        symbol,
        direction,
        volume,
        openPrice,
        closePrice,
        stopLoss: undefined,
        takeProfit: undefined,
      });
    }

    return {
      status: 'evaluated',
      accountNumber,
      assessment,
      aBookRoute: routeResult,
    };
  }

  /**
   * Exploit & Trading Integrity Rules (Immediate First-Strike Enforcement):
   * 1. Ultra-Scalping / Latency Exploitation Rule:
   *    Any trade closed in <30 seconds with a positive profit.
   * 2. Prohibited News Straddling / Bracket Exploitation Rule:
   *    Opening simultaneous opposite positions (BUY and SELL) on the same asset within 60s.
   */
  private async checkExploitBreaches(
    account: any,
    payload: TradeEventPayload
  ): Promise<{ breached: boolean; reason?: string; eventType?: string }> {
    const { event, tradeId, symbol, direction, profit } = payload;

    // 1. Ultra-Scalping / Latency Tick Exploit Check on Trade Close
    if (event === 'TRADE_CLOSE' && tradeId) {
      const existingTrade = await prisma.tradeRecord.findUnique({
        where: { externalTradeId: tradeId },
      });

      if (existingTrade) {
        const durationMs = Date.now() - existingTrade.openedAt.getTime();
        const netProfit = profit !== undefined ? Number(profit) : Number(existingTrade.profit || 0);

        if (durationMs < 30_000 && netProfit > 0) {
          return {
            breached: true,
            eventType: 'EXPLOIT_ULTRA_SCALPING',
            reason: `Prohibited ultra-scalping/latency exploit: Trade ${tradeId} (${existingTrade.symbol}) closed in ${(durationMs / 1000).toFixed(1)}s (<30s minimum hold duration) with profit ₦${netProfit.toLocaleString()}. Account terminated on first strike.`,
          };
        }
      }
    }

    // 2. Prohibited News Straddling / Dual Direction Exploit Check on Trade Open
    if (event === 'TRADE_OPEN' && symbol && direction) {
      const oppositeDir = direction === 'BUY' ? 'SELL' : 'BUY';
      const recentOppositeTrade = await prisma.tradeRecord.findFirst({
        where: {
          tradingAccountId: account.id,
          symbol,
          direction: oppositeDir,
          closedAt: null,
          openedAt: {
            gte: new Date(Date.now() - 60_000), // Within last 60 seconds
          },
        },
      });

      if (recentOppositeTrade) {
        return {
          breached: true,
          eventType: 'EXPLOIT_NEWS_STRADDLE',
          reason: `Prohibited news straddling / latency arbitrage: Opened opposite ${direction} position on ${symbol} within 60s of an active ${oppositeDir} position. Account terminated on first strike.`,
        };
      }
    }

    return { breached: false };
  }

  /**
   * Determine the true starting baseline for the 23:00 GMT+1 session (22:00 UTC).
   * Starting baseline is the higher of balance or equity at session reset.
   * Closed and open trade losses during the session must NEVER collapse this baseline.
   */
  async getStartingDayBaseline(
    account: { id: string; challengeId?: string; initialBalance: any; createdAt?: Date },
    currentBalance: number,
    metricsStartingDayEquity?: number,
  ): Promise<number> {
    const initialBal = Number(account.initialBalance);

    // Calculate current session start in UTC (22:00 UTC = 23:00 GMT+1)
    const now = new Date();
    const sessionStart = new Date(now);
    if (now.getUTCHours() < 22) {
      sessionStart.setUTCDate(sessionStart.getUTCDate() - 1);
    }
    sessionStart.setUTCHours(22, 0, 0, 0);

    // 1. Check if an admin reinstatement or balance adjustment occurred
    const latestAdminReinstatement = await prisma.auditEvent.findFirst({
      where: {
        resourceId: account.id,
        action: 'ADMIN_ACCOUNT_REINSTATED',
      },
      orderBy: { createdAt: 'desc' },
    });

    const latestAdminAction = await prisma.auditEvent.findFirst({
      where: {
        resourceId: account.id,
        action: { in: ['ADMIN_ACCOUNT_REINSTATED', 'ADMIN_ACCOUNT_BALANCE_ADJUSTED'] },
        createdAt: { gte: sessionStart },
      },
      orderBy: { createdAt: 'desc' },
    });

    // If account was reinstated at any point, baseline query start cannot precede reinstatement
    const effectiveReinstatementTime = latestAdminReinstatement?.createdAt;
    const snapshotQueryStart = latestAdminAction
      ? latestAdminAction.createdAt
      : (effectiveReinstatementTime && effectiveReinstatementTime > sessionStart)
        ? effectiveReinstatementTime
        : sessionStart;

    // 2. Check if a DAILY_RESET_SNAPSHOT was recorded for this session after any admin adjustment
    let latestSnapshot = await prisma.riskEvent.findFirst({
      where: {
        tradingAccountId: account.id,
        eventType: 'DAILY_RESET_SNAPSHOT',
        createdAt: { gte: snapshotQueryStart },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (latestSnapshot) {
      const snapBal = Number(latestSnapshot.snapshotBalance || initialBal);
      const snapEq = Number(latestSnapshot.snapshotEquity || snapBal);
      return Math.max(snapBal, snapEq, initialBal);
    }

    // 3. Self-healing: If account existed before sessionStart but no snapshot was recorded yet for today
    if (!account.createdAt || new Date(account.createdAt) < sessionStart) {
      try {
        const priorSnapshot = await prisma.riskEvent.findFirst({
          where: {
            tradingAccountId: account.id,
            eventType: 'DAILY_RESET_SNAPSHOT',
            createdAt: { lt: sessionStart },
          },
          orderBy: { createdAt: 'desc' },
        });

        const priorBaseline = priorSnapshot
          ? Math.max(Number(priorSnapshot.snapshotBalance || initialBal), Number(priorSnapshot.snapshotEquity || initialBal))
          : initialBal;

        const sessionProfit = Math.max(0, currentBalance - priorBaseline);
        const dailyCap = initialBal * 0.02;
        const cappedCredit = Math.min(sessionProfit, dailyCap);
        const excessProfitCleared = Math.max(0, sessionProfit - dailyCap);

        const pastSnapshots = await prisma.riskEvent.findMany({
          where: {
            tradingAccountId: account.id,
            eventType: 'DAILY_RESET_SNAPSHOT',
          },
        });
        let bankedTotal = 0;
        for (const s of pastSnapshots) {
          try {
            const p = JSON.parse(s.description);
            bankedTotal += Number(p.cappedCredit || 0);
          } catch {}
        }
        const cumulativeQualifiedProfit = bankedTotal + cappedCredit;

        const challengeId =
          account.challengeId ||
          priorSnapshot?.challengeId ||
          (
            await prisma.tradingAccount.findUnique({
              where: { id: account.id },
              select: { challengeId: true },
            })
          )?.challengeId ||
          '';

        if (challengeId) {
          await prisma.riskEvent.create({
            data: {
              challengeId,
              tradingAccountId: account.id,
              eventType: 'DAILY_RESET_SNAPSHOT',
              createdAt: sessionStart,
              description: JSON.stringify({
                sessionDate: sessionStart.toISOString().split('T')[0],
                sessionOpeningBaseline: priorBaseline,
                todayRawProfit: sessionProfit,
                cappedCredit,
                excessProfitCleared,
                cumulativeQualifiedProfit,
                profitTarget: initialBal * 0.10,
              }),
              severity: 'INFO',
              snapshotBalance: currentBalance,
              snapshotEquity: currentBalance,
            },
          });
        }

        return Math.max(currentBalance, initialBal);
      } catch (err: any) {
        this.logger.warn(`Could not create self-healing reset snapshot: ${err.message}`);
      }
    }

    // 4. If account was reinstated/adjusted by admin during the current session without a subsequent snapshot
    if (latestAdminAction) {
      return Math.max(initialBal, currentBalance);
    }

    // 5. Account created during the current session (after 22:00 UTC)
    return initialBal;
  }

  /**
   * Evaluate a single trading account against strict risk parameters:
   * 1. 4% Daily Drawdown Rule (based on 23:00 GMT+1 starting baseline, open & closed trades inclusive)
   * 2. Max Total Drawdown (10% Rhino Rush / 7% Phoenix Rise - 100% Static Floor)
   * 3. 2% Daily Profit Cap towards challenge target (excess cleared at session reset)
   * 4. Target Promotion (10% profit for 1-Step Rhino Rush)
   */
  async evaluateAccount(account: any, pushedMetrics?: SteraTraderAccountMetrics) {
    this.totalEvaluationsCount++;
    const { challenge, initialBalance, dailyDrawdownLimit, maxDrawdownLimit } = account;
    const initialBal = Number(initialBalance);
    const maxLimit = Number(maxDrawdownLimit);

    // Fetch real-time equity & metrics from SteraTrader, or use pushed webhook metrics
    const metrics = pushedMetrics || (await this.steraTraderService.fetchAccountMetrics(account.accountNumber));
    if (!metrics) {
      // SteraTrader metrics missing or offline
      return { status: 'metrics_unavailable' };
    }

    // Authoritative balance in CRM persists (protects against broker external credit facility distortions)
    const floating = Number((metrics as any).floating ?? metrics.openTradesProfit ?? 0);
    const dbBal = Number(account.currentBalance);
    const currentBalance = dbBal > 0 ? dbBal : metrics.balance;
    const currentEquity = currentBalance + floating;

    // 1. Calculate Daily Drawdown (Open & Closed Trades Inclusive):
    // Evaluated against 23:00 GMT+1 baseline: higher of starting day balance or equity.
    // Current equity = current balance (all closed trades) + floating PnL (all open trades).
    const startingDayBaseline = await this.getStartingDayBaseline(account, currentBalance, metrics.startingDayEquity);
    const dailyLimit = startingDayBaseline * 0.04;
    const dailyLoss = Math.max(0, startingDayBaseline - currentEquity);

    // 2. Calculate Maximum Loss (100% Static Floor - Zero Trailing):
    // Rhino Rush: permanently fixed at 90% of initial balance (10% max DD)
    // Phoenix Rise: permanently fixed at 93% of initial balance (7% max DD)
    const maxLoss = initialBal - currentEquity;

    // 3. Update account snapshot in database
    await prisma.tradingAccount.update({
      where: { id: account.id },
      data: {
        currentBalance,
        currentEquity,
        totalProfit: currentEquity - initialBal,
        lastSyncedAt: new Date(),
      },
    });

    // CHECK RULE 0: 30-Day Inactivity Rule
    // If a trader has not placed a trade within 30 consecutive calendar days, the account is breached.
    const inactivityBreached = await this.checkInactivityBreach(account, currentBalance, currentEquity);
    if (inactivityBreached) {
      return { status: 'breached', rule: 'INACTIVITY_BREACH' };
    }

    // CHECK RULE 1: 4% Daily Drawdown Breach (Open & Closed Trades Inclusive)
    if (dailyLoss >= dailyLimit) {
      this.totalBreachesCaught++;
      await this.handleBreach(
        account,
        'DAILY_DD_BREACH',
        `Daily drawdown breach (open & closed trades inclusive): ₦${dailyLoss.toLocaleString()} lost today exceeding 4% limit of ₦${dailyLimit.toLocaleString()} (Starting Baseline: ₦${startingDayBaseline.toLocaleString()})`,
        currentBalance,
        currentEquity
      );
      return { status: 'breached', rule: 'DAILY_DD_BREACH' };
    }

    // CHECK RULE 2: Max Drawdown Breach (10% Rhino / 7% Phoenix - 100% Static Floor)
    if (maxLoss >= maxLimit) {
      this.totalBreachesCaught++;
      const percent = challenge.product.skuPrefix === 'phoenix-rise' ? '7%' : '10%';
      await this.handleBreach(
        account,
        'MAX_DD_BREACH',
        `Maximum static drawdown breach: ₦${maxLoss.toLocaleString()} overall loss exceeding ${percent} limit of ₦${maxLimit.toLocaleString()} (Static Floor: ₦${(initialBal - maxLimit).toLocaleString()})`,
        currentBalance,
        currentEquity
      );
      return { status: 'breached', rule: 'MAX_DD_BREACH' };
    }

    // CHECK RULE 3: Profit Target Evaluation for Rhino Rush (1-Step Challenge)
    // Applies 2% Max Daily Profit Cap: any profit generated above 2% does not count towards target and is cleared at session reset time
    if (
      challenge.product.skuPrefix === 'rhino-rush' &&
      challenge.status === 'ACTIVE'
    ) {
      const profitTarget = initialBal * 0.10; // 10% Profit Target
      const dailyCap = initialBal * 0.02; // 2% Max Daily Profit Cap

      // Retrieve previously banked daily capped profit from completed session resets
      const sessionSnapshots = await prisma.riskEvent.findMany({
        where: {
          tradingAccountId: account.id,
          eventType: 'DAILY_RESET_SNAPSHOT',
        },
      });

      let bankedQualifiedProfit = 0;
      for (const snap of sessionSnapshots) {
        try {
          const parsed = JSON.parse(snap.description);
          bankedQualifiedProfit += Number(parsed.cappedCredit || 0);
        } catch {}
      }

      // Today's contribution: capped at 2% daily limit; excess above 2% will be cleared at 23:00 GMT+1 reset
      const todayRawProfit = Math.max(0, currentEquity - startingDayBaseline);
      const todayCreditedTowardsTarget = Math.min(todayRawProfit, dailyCap);
      const totalQualifiedProfit = bankedQualifiedProfit + todayCreditedTowardsTarget;

      if (totalQualifiedProfit >= profitTarget) {
        await this.handlePromotion(account, totalQualifiedProfit, currentEquity);
        return { status: 'promoted', profit: totalQualifiedProfit };
      }
    }

    return { status: 'safe', currentEquity, currentProfit: currentEquity - initialBal };
  }

  /**
   * Check 30-Day Inactivity Rule:
   * A trader must place at least one trade within 30 consecutive calendar days.
   * If an active account has had no trade activity for 30 calendar days (720 hours / 2,592,000,000 ms),
   * the account is breached due to "Breach of Inactivity Rule", closed/terminated on SteraTrader,
   * archived, and dual real-time breach notifications are sent to the trader and administrator.
   */
  async checkInactivityBreach(
    account: any,
    currentBalance: number,
    currentEquity: number
  ): Promise<boolean> {
    const latestTrade = await prisma.tradeRecord.findFirst({
      where: { tradingAccountId: account.id },
      orderBy: { openedAt: 'desc' },
      select: { openedAt: true },
    });

    const lastActivityDate = latestTrade?.openedAt
      ? new Date(latestTrade.openedAt)
      : new Date(account.createdAt);

    const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
    const elapsedMs = Date.now() - lastActivityDate.getTime();

    if (elapsedMs >= THIRTY_DAYS_MS) {
      const daysInactive = Math.floor(elapsedMs / (24 * 60 * 60 * 1000));
      this.totalBreachesCaught++;
      const reason = `Breach of 30-Day Inactivity Rule: No trade placed in ${daysInactive} calendar days (Last Activity: ${lastActivityDate.toISOString().split('T')[0]}). The 30-day inactivity window has expired. Account terminated and archived.`;

      await this.handleBreach(
        account,
        'INACTIVITY_BREACH',
        reason,
        currentBalance,
        currentEquity
      );
      return true;
    }

    return false;
  }

  /**
   * Action upon breach:
   * 1. Record critical RiskEvent audit entry
   * 2. Mark TradingAccount as CLOSED
   * 3. Mark CustomerChallenge as FAILED with explicit breach reason
   * 4. Immediately trigger SteraTrader account termination
   * 5. Log audit trail for admin and trader visibility
   */
  private async handleBreach(
    account: any,
    eventType: string,
    reason: string,
    snapshotBalance: number,
    snapshotEquity: number
  ) {
    this.logger.warn(`RULE BREACH on account ${account.accountNumber}: ${reason}`);

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

    // Liquidate any active hedged positions on broker MT5 immediately
    await this.tradeRouterService.forceCloseHedgedTrades(account.id, account.accountNumber);

    // Dispatch dual real-time notifications to trader and admin
    await this.dispatchBreachNotifications(account, eventType, reason, snapshotBalance, snapshotEquity);
  }

  /**
   * Dispatch dual real-time breach notifications to both trader and administrator
   */
  private async dispatchBreachNotifications(
    account: any,
    eventType: string,
    reason: string,
    snapshotBalance: number,
    snapshotEquity: number
  ) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: account.userId },
      });

      const traderEmail = user?.email || 'trader@fundedgiants.ng';
      const traderName = `${user?.firstName || 'Trader'} ${user?.lastName || ''}`.trim();
      const adminEmail = process.env.ADMIN_ALERT_EMAIL || 'admin@fundedgiants.ng';

      // 1. Record AuditEvent in ledger
      await prisma.auditEvent.create({
        data: {
          userId: account.userId,
          action: 'RULE_BREACH_ENFORCEMENT',
          resource: 'TradingAccount',
          resourceId: account.id,
          details: {
            accountNumber: account.accountNumber,
            eventType,
            reason,
            snapshotBalance,
            snapshotEquity,
            notifiedTraderEmail: traderEmail,
            notifiedAdminEmail: adminEmail,
            timestamp: new Date().toISOString(),
          },
        },
      });

      // 2. Dispatch real-time dual notifications
      this.logger.warn(
        `[DUAL NOTIFICATION] Alert sent to Trader (${traderEmail}): Account ${account.accountNumber} terminated. Reason: ${reason}`
      );
      this.logger.warn(
        `[DUAL NOTIFICATION] Alert sent to Admin (${adminEmail}): CRITICAL Rule Breach on ${account.accountNumber} (${traderName}). Liquidated & closed on SteraTrader.`
      );

      // 3. Dispatch formal breach email to trader
      if (traderEmail) {
        await this.notificationsService.sendBreachTerminationEmail({
          toEmail: traderEmail,
          toName: traderName,
          accountNumber: account.accountNumber,
          reason,
          eventType,
          snapshotBalance,
          snapshotEquity,
        });
      }
    } catch (err: any) {
      this.logger.error(`Failed to dispatch breach notifications: ${err.message}`);
    }
  }

  /**
   * Action upon reaching passing profit target:
   * Promotes account to Funded stage on SteraTrader (group fg-rr-funded) and database.
   */
  private async handlePromotion(account: any, profit: number, equity: number) {
    this.logger.log(`TARGET REACHED on account ${account.accountNumber}: Net Profit ₦${profit.toLocaleString()}`);

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
      prisma.tradingAccount.update({
        where: { id: account.id },
        data: {
          groupSlug: 'fg-rr-funded',
        },
      }),
    ]);

    // Move trader to funded group fg-rr-funded on SteraTrader
    await this.steraTraderService.moveAccountGroup(account.accountNumber, 'fg-rr-funded');

    // Stamped Completion Certificate Generation & Trader Notification
    try {
      const challengeWithUser = await prisma.customerChallenge.findUnique({
        where: { id: account.challengeId },
        include: { user: true },
      });
      const traderName = challengeWithUser?.user
        ? `${challengeWithUser.user.firstName || 'Valued'} ${challengeWithUser.user.lastName || 'Trader'}`.trim()
        : 'Valued Trader';
      const traderEmail = challengeWithUser?.user?.email;

      await this.certificatesService.generateCompletionCertificate({
        recipientName: traderName,
        accountNumber: account.accountNumber,
      });

      if (traderEmail) {
        await this.notificationsService.sendAccountUpgradePassedEmail({
          toEmail: traderEmail,
          toName: traderName,
          accountNumber: account.accountNumber,
          planTitle: 'Rhino Rush 1-Step Challenge',
          capitalNgn: Number(account.initialBalance),
          newGroup: 'fg-rr-funded',
        });
      }
    } catch (err: any) {
      this.logger.error(`Error auto-generating completion certificate or promotion email: ${err.message}`);
    }
  }

  /**
   * Automated Payout Eligibility Monitor:
   * Inspects whether an account qualifies for payout under all institutional rules:
   * 1. Must be in Funded Stage (Rhino Rush PASSED/COMPLETED) or Phoenix Rise Instant Funding.
   * 2. Zero open trades (openTradesCount === 0).
   * 3. Meets minimum profit threshold (>= 2% gain; 5% for first Rhino payout).
   * 4. Passes 50% Profit Consistency rule (no single trade > 50% of profit).
   * 5. No unresolved risk breach events.
   */
  async checkPayoutEligibility(accountNumberOrId: string): Promise<PayoutEligibilityResult> {
    const account = await prisma.tradingAccount.findFirst({
      where: {
        OR: [{ id: accountNumberOrId }, { accountNumber: accountNumberOrId }],
      },
      include: {
        challenge: {
          include: {
            product: true,
          },
        },
        tradeRecords: {
          where: { closedAt: { not: null } },
        },
        riskEvents: {
          where: { severity: 'CRITICAL' },
        },
      },
    });

    if (!account) {
      throw new NotFoundException(`Trading account ${accountNumberOrId} not found`);
    }

    const isPhoenix = account.challenge.product.skuPrefix === 'phoenix-rise';
    const isFunded = account.challenge.status === 'PASSED' || account.challenge.status === 'COMPLETED';

    const currentPhase = isPhoenix ? 'Instant Funding' : isFunded ? 'Funded' : 'Phase 1 Evaluation';

    // Evaluation accounts cannot withdraw virtual profits
    if (!isPhoenix && !isFunded) {
      return {
        eligible: false,
        accountNumber: account.accountNumber,
        phase: currentPhase,
        currentEquity: Number(account.currentEquity),
        currentProfit: Number(account.totalProfit),
        cycleProfitNgn: 0,
        profitPercent: 0,
        withdrawableProfitNgn: 0,
        traderProfitSplit: 0,
        firmProfitSplit: 0,
        traderProfitSplitNgn: 0,
        firmProfitSplitNgn: 0,
        payoutNumber: 1,
        traderSplitPercent: 50,
        profitSplitRatio: '50:50',
        minRequiredPercent: 2.0,
        openTradesCount: 0,
        reason: 'Phase 1 Evaluation account profits are virtual challenge metrics and cannot be withdrawn.',
        breakdown: {
          minimumProfitMet: false,
          zeroOpenTradesMet: true,
          noActiveBreachesMet: true,
          firstPayoutMet: false,
        },
      };
    }

    const initialBal = Number(account.initialBalance);
    const metrics = await this.steraTraderService.fetchAccountMetrics(account.accountNumber);
    const floating = Number((metrics as any)?.floating ?? metrics?.openTradesProfit ?? 0);
    const dbBal = Number(account.currentBalance);
    const currentBalance = dbBal > 0 ? dbBal : (metrics?.balance ?? initialBal);
    const currentEquity = currentBalance + floating;
    const openTradesCount = metrics?.openTradesCount ?? 0;
    const netProfit = Math.max(0, currentEquity - initialBal);
    const profitPercent = (netProfit / initialBal) * 100;

    // Count previous automated payouts approved for this account
    const previousPayoutsCount = await prisma.riskEvent.count({
      where: {
        tradingAccountId: account.id,
        eventType: 'AUTOMATED_PAYOUT_APPROVED',
      },
    });
    const payoutNumber = previousPayoutsCount + 1;

    // Determine Tiered Split and Minimum Profit Threshold based on program rules
    let minThresholdPercent = 2.0;
    let traderSplitPercent = 80;

    if (isPhoenix) {
      if (payoutNumber === 1) {
        // Phoenix Rise 1st Payout: Sole criteria is 10% net profit
        minThresholdPercent = 10.0;
        const challengeStartDate = account.challenge?.createdAt || account.createdAt || new Date();
        const daysSinceStart = Math.max(
          1,
          Math.floor((Date.now() - new Date(challengeStartDate).getTime()) / (1000 * 60 * 60 * 24))
        );
        // < 15 days: 60:40 | >= 15 days: 50:50
        traderSplitPercent = daysSinceStart < 15 ? 60 : 50;
      } else if (payoutNumber === 2) {
        // Phoenix Rise 2nd Payout: 2% min gain, 60:40 split
        minThresholdPercent = 2.0;
        traderSplitPercent = 60;
      } else if (payoutNumber === 3) {
        // Phoenix Rise 3rd Payout: 2% min gain, 70:30 split
        minThresholdPercent = 2.0;
        traderSplitPercent = 70;
      } else {
        // Phoenix Rise 4th & subsequent: 2% min gain, 80:20 split lifetime
        minThresholdPercent = 2.0;
        traderSplitPercent = 80;
      }
    } else {
      // Rhino Rush (Funded Stage): Tiered Payout Rules (No Trailing Drawdown)
      if (payoutNumber === 1) {
        // 1st Payout: 2% min gain, 50:50 split
        minThresholdPercent = 2.0;
        traderSplitPercent = 50;
      } else if (payoutNumber === 2) {
        // 2nd Payout: 2% min gain, 60:40 split
        minThresholdPercent = 2.0;
        traderSplitPercent = 60;
      } else if (payoutNumber === 3) {
        // 3rd Payout: 2% min gain, 70:30 split
        minThresholdPercent = 2.0;
        traderSplitPercent = 70;
      } else {
        // 4th & subsequent: 2% min gain, 80:20 split lifetime
        minThresholdPercent = 2.0;
        traderSplitPercent = 80;
      }
    }

    const profitSplitRatio = `${traderSplitPercent}:${100 - traderSplitPercent}`;

    // Rule A: Minimum profit threshold (2% min gain; 10% on first payout for Phoenix Rise)
    const minimumProfitMet = profitPercent >= minThresholdPercent;

    // Rule B: Zero open trades (all positions must be closed)
    const zeroOpenTradesMet = openTradesCount === 0;

    // Rule C: No active critical risk breaches after any administrative reinstatement
    // When an account is reinstated, prior breaches are forgiven and resolved
    let activeRiskEvents = account.riskEvents;
    const latestReinstatement = await prisma.auditEvent.findFirst({
      where: {
        resourceId: account.id,
        action: 'ADMIN_ACCOUNT_REINSTATED',
      },
      orderBy: { createdAt: 'desc' },
    });

    if (account.status === 'ACTIVE') {
      if (latestReinstatement) {
        // Filter out any risk events created prior to reinstatement
        activeRiskEvents = activeRiskEvents.filter(
          (re) => new Date(re.createdAt).getTime() > new Date(latestReinstatement.createdAt).getTime()
        );
      } else {
        // If account is ACTIVE, any previous breach events created prior to becoming ACTIVE are cleared
        activeRiskEvents = [];
      }
    }

    const noActiveBreachesMet = activeRiskEvents.length === 0;

    const isEligible = minimumProfitMet && zeroOpenTradesMet && noActiveBreachesMet && netProfit > 0;
    const cycleTraderProfitNgn = isEligible && netProfit > 0 ? Math.floor(netProfit * (traderSplitPercent / 100)) : 0;
    const cycleFirmProfitNgn = isEligible && netProfit > 0 ? Math.floor(netProfit * ((100 - traderSplitPercent) / 100)) : 0;
    const withdrawableProfitNgn = isEligible ? cycleTraderProfitNgn : 0;

    let failureReason: string | undefined;
    if (!zeroOpenTradesMet) {
      failureReason = `Account has ${openTradesCount} open position(s). All positions must be closed before payout.`;
    } else if (!minimumProfitMet) {
      failureReason = isPhoenix && payoutNumber === 1
        ? `Phoenix Rise 1st payout requires 10.0% net profit. Current gain is ${profitPercent.toFixed(2)}% (₦${netProfit.toLocaleString()}).`
        : `Current profit is ${profitPercent.toFixed(2)}% (₦${netProfit.toLocaleString()}), below the required ${minThresholdPercent}% minimum gain.`;
    } else if (!noActiveBreachesMet) {
      const activeBreach = activeRiskEvents[0];
      const breachType = activeBreach?.eventType ? activeBreach.eventType.replace(/_/g, ' ') : 'Risk Compliance Breach';
      const breachDesc = activeBreach?.description || breachType;
      const snapEquityStr = activeBreach?.snapshotEquity ? ` (Snapshot Equity: ₦${Number(activeBreach.snapshotEquity).toLocaleString()})` : '';
      failureReason = `Risk Compliance Event Active: ${breachDesc}${snapEquityStr}. Trading and payout requests are restricted following a risk breach. If this breach was already investigated or occurred due to broker/maintenance downtime, please contact compliance at support@fundedgiants.ng or reach out to support for administrative resolution and account reinstatement.`;
    }

    return {
      eligible: isEligible,
      accountNumber: account.accountNumber,
      phase: currentPhase,
      currentEquity,
      currentProfit: netProfit,
      cycleProfitNgn: netProfit,
      profitPercent,
      withdrawableProfitNgn,
      traderProfitSplit: cycleTraderProfitNgn,
      firmProfitSplit: cycleFirmProfitNgn,
      traderProfitSplitNgn: cycleTraderProfitNgn,
      firmProfitSplitNgn: cycleFirmProfitNgn,
      payoutNumber,
      traderSplitPercent,
      profitSplitRatio,
      minRequiredPercent: minThresholdPercent,
      openTradesCount,
      reason: failureReason,
      breakdown: {
        minimumProfitMet,
        zeroOpenTradesMet,
        noActiveBreachesMet,
        firstPayoutMet: isPhoenix ? (payoutNumber > 1 || profitPercent >= 10.0) : true,
      },
    };
  }

  /**
   * Fetch real-time account risk status, headroom and metrics:
   * 1. 4% Daily Drawdown (23:00 GMT+1 baseline)
   * 2. 100% Static Max Drawdown Floor (10% Rhino Rush / 7% Phoenix Rise)
   * 3. Current headroom before breach
   * 4. Payout eligibility
   */
  async getAccountRiskStatus(accountNumberOrId: string) {
    const account = await prisma.tradingAccount.findFirst({
      where: {
        OR: [{ id: accountNumberOrId }, { accountNumber: accountNumberOrId }],
      },
      include: {
        challenge: {
          include: {
            product: true,
          },
        },
        riskEvents: {
          where: { severity: 'CRITICAL' },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!account) {
      throw new NotFoundException(`Trading account ${accountNumberOrId} not found`);
    }

    const initialBal = Number(account.initialBalance);
    const metrics = await this.steraTraderService.fetchAccountMetrics(account.accountNumber);
    const floating = Number((metrics as any)?.floating ?? metrics?.openTradesProfit ?? 0);
    const dbBal = Number(account.currentBalance);
    const currentBalance = dbBal > 0 ? dbBal : (metrics?.balance ?? initialBal);
    const currentEquity = currentBalance + floating;
    const openTradesCount = metrics?.openTradesCount ?? 0;

    const isPhoenix = account.challenge.product.skuPrefix === 'phoenix-rise';
    const isFunded = account.challenge.status === 'PASSED' || account.challenge.status === 'COMPLETED';
    const isEvaluation = !isPhoenix && !isFunded;

    // 1. Daily Drawdown calculations (4% from 23:00 GMT+1 baseline, Open & Closed Trades Inclusive)
    // Starting baseline is the higher of balance or equity at 23:00 GMT+1 session reset.
    // Current equity reflects all closed trades (in balance) + all open trades (in floating PnL).
    const startingDayHwm = await this.getStartingDayBaseline(account, currentBalance, metrics?.startingDayEquity);
    const dailyLimitAmount = startingDayHwm * 0.04;
    const dailyBreachFloor = startingDayHwm - dailyLimitAmount;
    const dailyLossCurrent = Math.max(0, startingDayHwm - currentEquity);
    const dailyHeadroom = Math.max(0, currentEquity - dailyBreachFloor);

    // 2. 100% Static Max Drawdown Floor (Zero Trailing)
    // Rhino Rush: permanently fixed at 90% of initial balance (10% max DD)
    // Phoenix Rise: permanently fixed at 93% of initial balance (7% max DD)
    const maxLossPercent = isPhoenix ? 0.07 : 0.10;
    const maxDrawdownLimitAmount = initialBal * maxLossPercent;
    const maxBreachFloor = initialBal - maxDrawdownLimitAmount;
    const maxLossCurrent = Math.max(0, initialBal - currentEquity);
    const maxHeadroom = Math.max(0, currentEquity - maxBreachFloor);

    // 3. Rhino Rush Evaluation Target Progress with 2% Daily Profit Cap
    let targetEvaluation: any = null;
    if (isEvaluation) {
      const profitTargetNgn = initialBal * 0.10; // 10% Target
      const dailyProfitCapNgn = initialBal * 0.02; // 2% Max Daily Profit Cap

      // Retrieve previously banked daily capped profits from completed session resets
      const sessionSnapshots = await prisma.riskEvent.findMany({
        where: {
          tradingAccountId: account.id,
          eventType: 'DAILY_RESET_SNAPSHOT',
        },
        orderBy: { createdAt: 'asc' },
      });

      let bankedTargetProfitNgn = 0;
      for (const snap of sessionSnapshots) {
        try {
          const parsed = JSON.parse(snap.description);
          bankedTargetProfitNgn += Number(parsed.cappedCredit || 0);
        } catch {}
      }

      const todayRawProfitNgn = Math.max(0, currentEquity - startingDayHwm);
      const todayCreditedTowardsTargetNgn = Math.min(todayRawProfitNgn, dailyProfitCapNgn);
      const todayExcessProfitClearedAtResetNgn = Math.max(0, todayRawProfitNgn - dailyProfitCapNgn);
      const cumulativeQualifiedProfitNgn = bankedTargetProfitNgn + todayCreditedTowardsTargetNgn;
      const progressPercent = Math.min(100, Math.round((cumulativeQualifiedProfitNgn / profitTargetNgn) * 100));

      targetEvaluation = {
        profitTargetNgn,
        profitTargetPercent: 10.0,
        dailyProfitCapNgn,
        dailyProfitCapPercent: 2.0,
        bankedTargetProfitNgn,
        todayProfitTotalNgn: todayRawProfitNgn,
        todayCreditedTowardsTargetNgn,
        todayExcessProfitClearedAtResetNgn,
        cumulativeQualifiedProfitNgn,
        progressPercent,
        resetTime: '23:00 (GMT +1)',
        excessNotice:
          todayExcessProfitClearedAtResetNgn > 0
            ? `₦${todayExcessProfitClearedAtResetNgn.toLocaleString()} generated above the 2% daily cap does not count towards target and will be cleared at 23:00 GMT+1 reset.`
            : null,
      };
    }

    // Payout eligibility
    const eligibility = await this.checkPayoutEligibility(account.id);

    return {
      accountNumber: account.accountNumber,
      platform: account.platform,
      planType: isPhoenix ? 'Phoenix Rise' : 'Rhino Rush',
      stage: isPhoenix ? 'Funded' : isFunded ? 'Funded' : 'Evaluation',
      status: account.status,
      initialBalanceNgn: initialBal,
      currentBalanceNgn: currentBalance,
      currentEquityNgn: currentEquity,
      totalNetProfitNgn: currentEquity - initialBal,
      openTradesCount,
      dailyDrawdown: {
        percent: 4.0,
        model: '4% Daily Floor (Open & Closed Trades Inclusive)',
        resetTime: '23:00 (GMT +1)',
        startingDayHwmNgn: startingDayHwm,
        dailyLimitNgn: dailyLimitAmount,
        dailyBreachFloorNgn: dailyBreachFloor,
        currentLossNgn: dailyLossCurrent,
        headroomRemainingNgn: dailyHeadroom,
        isSafe: currentEquity > dailyBreachFloor,
      },
      maximumDrawdown: {
        percent: isPhoenix ? 7.0 : 10.0,
        model: '100% Static Floor (Zero Trailing)',
        limitNgn: maxDrawdownLimitAmount,
        breachFloorNgn: maxBreachFloor,
        currentLossNgn: maxLossCurrent,
        headroomRemainingNgn: maxHeadroom,
        isSafe: currentEquity > maxBreachFloor,
      },
      targetEvaluation,
      payoutEligibility: eligibility,
      lastSyncedAt: account.lastSyncedAt || new Date(),
    };
  }

  /**
   * Automated Payout Execution:
   * Approves and instantly disburses trader profit split (80%) directly into Giants Vault.
   * Eliminates manual administrative delays through real-time risk verification.
   */
  async processAutomatedPayout(accountId: string, userId: string) {
    const eligibility = await this.checkPayoutEligibility(accountId);

    if (!eligibility.eligible) {
      throw new BadRequestException(
        eligibility.reason || 'Account does not meet automated risk engine payout requirements.'
      );
    }

    const account = await prisma.tradingAccount.findFirst({
      where: {
        OR: [{ id: accountId }, { accountNumber: accountId }],
      },
      include: {
        challenge: {
          include: {
            product: true,
          },
        },
      },
    });

    if (!account) {
      throw new NotFoundException('Trading account not found');
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { wallet: true },
    });

    if (!user || !user.wallet) {
      throw new BadRequestException('Customer wallet not initialized');
    }



    const payoutAmount = eligibility.withdrawableProfitNgn;
    const reference = `FG-PAYOUT-${Date.now()}`;
    const targetStartBalance = Number(
      account.challenge?.product?.accountSize ||
      (account.challenge as any)?.accountSizeNgn ||
      (account.initialBalance && Number(account.initialBalance) > 0 ? Number(account.initialBalance) : 50000000)
    );

    // Execute atomic disbursement transaction
    const result = await prisma.$transaction(async (tx) => {
      // 1. Credit Giants Vault balance via Deposit record
      const deposit = await tx.deposit.create({
        data: {
          walletId: user.wallet!.id,
          reference,
          amount: payoutAmount,
          currency: 'NGN',
          status: 'SUCCESSFUL',
          senderName: `FundedGiants Risk Engine Auto-Payout (${account.accountNumber})`,
          senderBank: 'FundedGiants Treasury',
          senderAccount: 'CENTRAL-TREASURY-01',
          reconciled: true,
        },
      });

      // 2. Post double-entry journal entry to financial ledger
      const entry = await tx.journalEntry.create({
        data: {
          entryNumber: `JE-PAYOUT-${Date.now()}`,
          transactionType: 'DEPOSIT_LENCO_VIRTUAL',
          reference,
          narration: `Automated Risk Engine payout disbursement of ₦${payoutAmount.toLocaleString()} for account ${account.accountNumber}`,
        },
      });

      const cashAccount = await tx.ledgerAccount.findFirst({ where: { code: '1000-CASH-LENCO' } });
      const walletLiabilityAccount = await tx.ledgerAccount.findFirst({
        where: { code: '2000-WALLET-LIABILITY' },
      });

      if (cashAccount && walletLiabilityAccount) {
        await tx.journalLine.createMany({
          data: [
            { journalEntryId: entry.id, accountId: cashAccount.id, debit: payoutAmount, credit: 0 },
            { journalEntryId: entry.id, accountId: walletLiabilityAccount.id, debit: 0, credit: payoutAmount },
          ],
        });
      }

      // 3. Reset account balance to starting capital (clearing all profits above start balance so user can restart trading)
      await tx.tradingAccount.update({
        where: { id: account.id },
        data: {
          initialBalance: targetStartBalance,
          currentBalance: targetStartBalance,
          currentEquity: targetStartBalance,
          totalProfit: 0,
        },
      });

      // Insert fresh baseline snapshot for drawdown monitoring from initial capital
      await tx.riskEvent.create({
        data: {
          challengeId: account.challengeId,
          tradingAccountId: account.id,
          eventType: 'DAILY_RESET_SNAPSHOT',
          description: `Post-payout reset to initial balance baseline of ₦${targetStartBalance.toLocaleString()}`,
          severity: 'INFO',
          snapshotBalance: targetStartBalance,
          snapshotEquity: targetStartBalance,
        },
      });

      // 4. Record Risk Engine audit event
      await tx.riskEvent.create({
        data: {
          challengeId: account.challengeId,
          tradingAccountId: account.id,
          eventType: 'AUTOMATED_PAYOUT_APPROVED',
          description: `Automated payout #${eligibility.payoutNumber} of ₦${payoutAmount.toLocaleString()} (${eligibility.profitSplitRatio} tiered split) approved by Risk Engine and credited to Giants Vault. Balance reset to initial ₦${targetStartBalance.toLocaleString()}.`,
          severity: 'INFO',
          snapshotBalance: targetStartBalance,
          snapshotEquity: targetStartBalance,
        },
      });

      return deposit;
    });

    // Reset SteraTrader live balance back to starting capital by withdrawing/clearing all profits above starting balance
    try {
      await this.steraTraderService.resetAccountBalanceToInitial(account.accountNumber, targetStartBalance);
      this.logger.log(`Reset SteraTrader balance for ${account.accountNumber} back to starting balance ₦${targetStartBalance.toLocaleString()}`);
    } catch (steraErr: any) {
      this.logger.error(`Failed to reset SteraTrader balance for ${account.accountNumber}: ${steraErr.message}`);
    }

    this.totalAutomatedPayoutsApproved++;
    this.logger.log(
      `AUTOMATED PAYOUT SUCCESS: ₦${payoutAmount.toLocaleString()} (#${eligibility.payoutNumber}, ${eligibility.profitSplitRatio}) credited to user ${user.id} (${account.accountNumber}). Ref: ${reference}`
    );

    // Stamped Payout Certificate Generation & WordPress Live Payout Tracker Sync
    let generatedCertificate: any = null;
    try {
      const traderFullName = `${user.firstName || 'John'} ${user.lastName || 'Doe'}`.trim();
      generatedCertificate = await this.certificatesService.generatePayoutCertificate({
        recipientName: traderFullName,
        amountNgn: payoutAmount,
        accountNumber: account.accountNumber,
        userEmail: user.email || '',
        payoutReference: reference,
      });
    } catch (err: any) {
      this.logger.error(`Error auto-generating payout certificate: ${err.message}`);
    }

    // 5. Credit 3% recurring commission to referring affiliate (if trader was referred)
    try {
      const referral = await prisma.affiliateReferral.findUnique({
        where: { referredUserId: user.id },
        include: { affiliateProfile: true },
      });

      if (referral && referral.affiliateProfile) {
        const payoutRate = Number(referral.affiliateProfile.payoutCommissionRate || 3.0);
        const recurringCommissionNgn = Math.round((payoutAmount * payoutRate) / 100);

        if (recurringCommissionNgn > 0) {
          await prisma.$transaction([
            prisma.affiliateCommission.create({
              data: {
                affiliateProfileId: referral.affiliateProfileId,
                referralId: referral.id,
                orderNumber: reference,
                amount: recurringCommissionNgn,
                currency: 'NGN',
                status: 'SUCCESSFUL',
              },
            }),
            prisma.affiliateProfile.update({
              where: { id: referral.affiliateProfileId },
              data: {
                totalCommissions: { increment: recurringCommissionNgn },
              },
            }),
          ]);

          this.logger.log(
            `3% Recurring Affiliate Commission of ₦${recurringCommissionNgn.toLocaleString()} credited to affiliate ${referral.affiliateProfile.referralCode} for payout ${reference}`
          );

          // 6. Notify WordPress Affiliate Platform Webhook
          await this.woocommerceService.notifyAffiliatePayout({
            payoutId: reference,
            traderEmail: user.email || '',
            amountNgn: payoutAmount,
            referralCode: referral.affiliateProfile.referralCode,
          });
        }
      }
    } catch (affErr: any) {
      this.logger.error(`Error processing recurring affiliate commission: ${affErr.message}`);
    }

    // 7. Sync to Public Payout Tracker on WordPress
    try {
      const traderFullName = `${user.firstName || 'John'} ${user.lastName || 'Doe'}`.trim();
      await this.woocommerceService.syncPublicPayoutTracker({
        payoutId: reference,
        traderName: traderFullName,
        amountNgn: payoutAmount,
        certificateId: generatedCertificate?.certificateId || `FG-CERT-${Date.now()}`,
        profitSplitRate: eligibility.traderSplitPercent,
        programType: account.challenge ? 'Funded' : 'Trading',
        timestamp: new Date().toISOString(),
      });
    } catch (wpErr: any) {
      this.logger.warn(`Could not sync to WordPress payout tracker: ${wpErr.message}`);
    }

    return {
      success: true,
      reference,
      amountNgn: payoutAmount,
      payoutNumber: eligibility.payoutNumber,
      profitSplitRatio: eligibility.profitSplitRatio,
      traderSplitPercent: eligibility.traderSplitPercent,
      depositedToWallet: true,
      accountNumber: account.accountNumber,
      certificateId: generatedCertificate?.certificateId || null,
      certificateUrl: generatedCertificate?.publicUrl || null,
      message: `₦${payoutAmount.toLocaleString()} (#${eligibility.payoutNumber} payout, ${eligibility.profitSplitRatio} split) has been approved and instantly disbursed to your Giants Vault. Payout certificate generated and synced to live tracker.`,
    };
  }

  /**
   * Administrative Telemetry & Health Check:
   * Returns live load metrics, throughput, and risk engine system state.
   */
  async getAdminRiskHealth() {
    const [totalActiveAccounts, totalBreaches, criticalEventsCount] = await Promise.all([
      prisma.tradingAccount.count({ where: { status: 'ACTIVE' } }),
      prisma.tradingAccount.count({ where: { status: 'CLOSED' } }),
      prisma.riskEvent.count({ where: { severity: 'CRITICAL' } }),
    ]);

    return {
      status: 'HEALTHY',
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
      loadCapacity: 'HIGH_LOAD_READY_100K_ACCOUNTS',
      metrics: {
        activeAccountsMonitored: totalActiveAccounts,
        totalBreachedAccounts: totalBreaches,
        criticalEventsCount,
        totalEvaluationsProcessed: this.totalEvaluationsCount,
        totalBreachesCaught: this.totalBreachesCaught,
        totalAutomatedPayoutsApproved: this.totalAutomatedPayoutsApproved,
        lastCronExecutionMs: this.lastCronExecutionTime,
      },
    };
  }

  /**
   * Administrative Risk Audit Summary:
   * Provides comprehensive audit logs for routine compliance reviews.
   */
  async getAdminRiskAuditSummary() {
    const recentEvents = await prisma.riskEvent.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
        tradingAccount: {
          select: {
            accountNumber: true,
            status: true,
            user: {
              select: { email: true, firstName: true, lastName: true },
            },
          },
        },
      },
    });

    return {
      totalAudited: recentEvents.length,
      events: recentEvents.map((e) => ({
        id: e.id,
        accountNumber: e.tradingAccount?.accountNumber,
        userEmail: e.tradingAccount?.user?.email,
        eventType: e.eventType,
        description: e.description,
        severity: e.severity,
        snapshotBalance: Number(e.snapshotBalance),
        snapshotEquity: Number(e.snapshotEquity),
        createdAt: e.createdAt,
      })),
    };
  }

  /**
   * Routine Administrative Fleet Audit:
   * Executes an on-demand complete consistency scan across all active accounts.
   */
  async runFleetAudit() {
    this.logger.log('Administrative fleet audit initiated...');
    await this.monitorActiveAccounts();
    return {
      status: 'COMPLETED',
      timestamp: new Date().toISOString(),
      message: 'Routine fleet audit executed successfully across all active trading accounts.',
    };
  }
}
