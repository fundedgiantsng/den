import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import {
  prisma,
  Prisma,
  CopyTradingStatus,
  CopyMode,
} from '@fundedgiants/database';
import { SubscribeToMasterDto, UpdateCopySettingsDto } from './copytrading.dto';

@Injectable()
export class CopyTradingService implements OnModuleInit {
  private readonly logger = new Logger(CopyTradingService.name);

  async onModuleInit() {
    await this.seedDefaultMasterTraders();
  }

  /**
   * Seed verified Master Traders if table is empty
   */
  async seedDefaultMasterTraders() {
    try {
      const count = await prisma.masterTrader.count();
      if (count > 0) return;

      this.logger.log('Seeding verified Master Traders into database...');

      const defaultMasters = [
        {
          name: 'Titan Alpha FX',
          handle: 'titan_alpha',
          avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&h=200&fit=crop&crop=faces',
          strategyType: 'Swing FX & Breakout',
          description: 'Disciplined multi-day swing trading focusing on EUR/USD, GBP/USD and USD/JPY with strict 1:3 risk-to-reward ratios and no overnight weekend exposure.',
          accountNumber: 'FG-STR-90412',
          platform: 'SteraTrader',
          server: 'FundedGiants Live',
          accountSizeNgn: new Prisma.Decimal(50000000),
          winRatePercent: new Prisma.Decimal(68.5),
          roiPercent: new Prisma.Decimal(142.8),
          maxDrawdownPercent: new Prisma.Decimal(4.2),
          profitFactor: new Prisma.Decimal(2.85),
          sharpeRatio: new Prisma.Decimal(2.1),
          totalTradesCount: 428,
          winningTradesCount: 293,
          losingTradesCount: 135,
          copiersCount: 342,
          totalAumNgn: new Prisma.Decimal(184500000),
          minCopyCapitalNgn: new Prisma.Decimal(500000),
          performanceFeePercent: new Prisma.Decimal(15.0),
          status: CopyTradingStatus.ACTIVE,
          isFeatured: true,
        },
        {
          name: 'Rhino Momentum Pro',
          handle: 'rhino_momentum',
          avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop&crop=faces',
          strategyType: 'London / NY Scalping',
          description: 'High-frequency momentum execution during London and New York overlaps. Fast execution, tight 5-pip stop losses, daily profit preservation.',
          accountNumber: 'FG-STR-77291',
          platform: 'SteraTrader',
          server: 'FundedGiants Live',
          accountSizeNgn: new Prisma.Decimal(25000000),
          winRatePercent: new Prisma.Decimal(74.2),
          roiPercent: new Prisma.Decimal(98.4),
          maxDrawdownPercent: new Prisma.Decimal(3.6),
          profitFactor: new Prisma.Decimal(3.10),
          sharpeRatio: new Prisma.Decimal(2.4),
          totalTradesCount: 890,
          winningTradesCount: 660,
          losingTradesCount: 230,
          copiersCount: 518,
          totalAumNgn: new Prisma.Decimal(246000000),
          minCopyCapitalNgn: new Prisma.Decimal(1000000),
          performanceFeePercent: new Prisma.Decimal(20.0),
          status: CopyTradingStatus.ACTIVE,
          isFeatured: true,
        },
        {
          name: 'Gold Vanguard Global',
          handle: 'gold_vanguard',
          avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&h=200&fit=crop&crop=faces',
          strategyType: 'XAUUSD Volatility Reversion',
          description: 'Specialist quantitative algorithm trading Gold (XAUUSD) based on mean-reversion, session volume profiles and central bank liquidity levels.',
          accountNumber: 'FG-STR-84013',
          platform: 'SteraTrader',
          server: 'FundedGiants Live',
          accountSizeNgn: new Prisma.Decimal(100000000),
          winRatePercent: new Prisma.Decimal(64.0),
          roiPercent: new Prisma.Decimal(112.5),
          maxDrawdownPercent: new Prisma.Decimal(5.1),
          profitFactor: new Prisma.Decimal(2.45),
          sharpeRatio: new Prisma.Decimal(1.9),
          totalTradesCount: 312,
          winningTradesCount: 200,
          losingTradesCount: 112,
          copiersCount: 289,
          totalAumNgn: new Prisma.Decimal(135200000),
          minCopyCapitalNgn: new Prisma.Decimal(500000),
          performanceFeePercent: new Prisma.Decimal(15.0),
          status: CopyTradingStatus.ACTIVE,
          isFeatured: false,
        },
        {
          name: 'Apex Institutional SMC',
          handle: 'apex_institutional',
          avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&h=200&fit=crop&crop=faces',
          strategyType: 'Smart Money Concepts',
          description: 'Institutional order-block mapping, liquidity pool sweeps and fair value gap entries across major currency pairs and NASDAQ indices.',
          accountNumber: 'FG-STR-91884',
          platform: 'SteraTrader',
          server: 'FundedGiants Live',
          accountSizeNgn: new Prisma.Decimal(50000000),
          winRatePercent: new Prisma.Decimal(71.0),
          roiPercent: new Prisma.Decimal(165.2),
          maxDrawdownPercent: new Prisma.Decimal(4.5),
          profitFactor: new Prisma.Decimal(3.40),
          sharpeRatio: new Prisma.Decimal(2.6),
          totalTradesCount: 540,
          winningTradesCount: 383,
          losingTradesCount: 157,
          copiersCount: 620,
          totalAumNgn: new Prisma.Decimal(310000000),
          minCopyCapitalNgn: new Prisma.Decimal(2000000),
          performanceFeePercent: new Prisma.Decimal(20.0),
          status: CopyTradingStatus.ACTIVE,
          isFeatured: true,
        },
        {
          name: 'Phoenix Intraday',
          handle: 'phoenix_intraday',
          avatarUrl: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=200&h=200&fit=crop&crop=faces',
          strategyType: 'Indices & Major FX',
          description: 'Adaptive trend-following engine for US30, GER40 and EUR/USD with automated volatility-based position sizing and trailing take profits.',
          accountNumber: 'FG-STR-61204',
          platform: 'SteraTrader',
          server: 'FundedGiants Live',
          accountSizeNgn: new Prisma.Decimal(10000000),
          winRatePercent: new Prisma.Decimal(66.4),
          roiPercent: new Prisma.Decimal(84.5),
          maxDrawdownPercent: new Prisma.Decimal(3.9),
          profitFactor: new Prisma.Decimal(2.20),
          sharpeRatio: new Prisma.Decimal(1.7),
          totalTradesCount: 275,
          winningTradesCount: 183,
          losingTradesCount: 92,
          copiersCount: 195,
          totalAumNgn: new Prisma.Decimal(82000000),
          minCopyCapitalNgn: new Prisma.Decimal(250000),
          performanceFeePercent: new Prisma.Decimal(15.0),
          status: CopyTradingStatus.ACTIVE,
          isFeatured: false,
        },
      ];

      for (const master of defaultMasters) {
        const createdMaster = await prisma.masterTrader.create({
          data: master,
        });

        const trades = [
          {
            masterTraderId: createdMaster.id,
            ticketId: `TK-${Math.floor(100000 + Math.random() * 900000)}`,
            symbol: 'EURUSD',
            direction: 'BUY',
            volume: new Prisma.Decimal(2.5),
            openPrice: new Prisma.Decimal(1.0824),
            closePrice: new Prisma.Decimal(1.0879),
            stopLoss: new Prisma.Decimal(1.0795),
            takeProfit: new Prisma.Decimal(1.089),
            profitNgn: new Prisma.Decimal(412500),
            openedAt: new Date(Date.now() - 86400000 * 2),
            closedAt: new Date(Date.now() - 86400000 * 1),
          },
          {
            masterTraderId: createdMaster.id,
            ticketId: `TK-${Math.floor(100000 + Math.random() * 900000)}`,
            symbol: 'GBPUSD',
            direction: 'SELL',
            volume: new Prisma.Decimal(2.0),
            openPrice: new Prisma.Decimal(1.2945),
            closePrice: new Prisma.Decimal(1.2882),
            stopLoss: new Prisma.Decimal(1.298),
            takeProfit: new Prisma.Decimal(1.285),
            profitNgn: new Prisma.Decimal(378000),
            openedAt: new Date(Date.now() - 86400000 * 3),
            closedAt: new Date(Date.now() - 86400000 * 2),
          },
          {
            masterTraderId: createdMaster.id,
            ticketId: `TK-${Math.floor(100000 + Math.random() * 900000)}`,
            symbol: 'XAUUSD',
            direction: 'BUY',
            volume: new Prisma.Decimal(1.5),
            openPrice: new Prisma.Decimal(2735.4),
            closePrice: new Prisma.Decimal(2758.9),
            stopLoss: new Prisma.Decimal(2722.0),
            takeProfit: new Prisma.Decimal(2765.0),
            profitNgn: new Prisma.Decimal(528750),
            openedAt: new Date(Date.now() - 86400000 * 4),
            closedAt: new Date(Date.now() - 86400000 * 3),
          },
        ];

        for (const trade of trades) {
          await prisma.masterTradeRecord.create({ data: trade });
        }
      }

      this.logger.log('Default verified Master Traders successfully seeded.');
    } catch (error) {
      this.logger.error('Failed to seed master traders', error);
    }
  }

  /**
   * Helper to calculate available balance in Giants Vault from the double-entry ledger
   */
  async getVaultAvailableBalance(userId: string): Promise<{
    walletId: string;
    availableBalance: number;
  }> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { wallet: true },
    });

    if (!user || !user.wallet) {
      throw new NotFoundException('Customer wallet not found');
    }

    const deposits = await prisma.deposit.aggregate({
      where: { walletId: user.wallet.id, status: 'SUCCESSFUL' },
      _sum: { amount: true },
    });

    const withdrawals = await prisma.withdrawal.aggregate({
      where: {
        walletId: user.wallet.id,
        status: { in: ['APPROVED', 'PROCESSING', 'PAID'] },
      },
      _sum: { amount: true },
    });

    const previousOrders = await prisma.internalOrder.aggregate({
      where: {
        userId: user.id,
        paymentMethod: 'WALLET',
        paymentStatus: 'SUCCESSFUL',
      },
      _sum: { amount: true },
    });

    const totalDeposited = Number(deposits._sum.amount || 0);
    const totalWithdrawn = Number(withdrawals._sum.amount || 0);
    const totalSpent = Number(previousOrders._sum.amount || 0);
    const availableBalance = Math.max(0, totalDeposited - totalWithdrawn - totalSpent);

    return {
      walletId: user.wallet.id,
      availableBalance,
    };
  }

  /**
   * Get all active Master Traders with filters and sorting
   */
  async getMasterTraders(query: {
    search?: string;
    strategy?: string;
    sortBy?: 'roi' | 'winRate' | 'copiers' | 'drawdown' | 'aum';
  }) {
    const where: Prisma.MasterTraderWhereInput = {
      status: CopyTradingStatus.ACTIVE,
    };

    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { handle: { contains: query.search, mode: 'insensitive' } },
        { strategyType: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    if (query.strategy && query.strategy !== 'ALL') {
      where.strategyType = { contains: query.strategy, mode: 'insensitive' };
    }

    let orderBy: Prisma.MasterTraderOrderByWithRelationInput = { copiersCount: 'desc' };

    switch (query.sortBy) {
      case 'roi':
        orderBy = { roiPercent: 'desc' };
        break;
      case 'winRate':
        orderBy = { winRatePercent: 'desc' };
        break;
      case 'copiers':
        orderBy = { copiersCount: 'desc' };
        break;
      case 'drawdown':
        orderBy = { maxDrawdownPercent: 'asc' };
        break;
      case 'aum':
        orderBy = { totalAumNgn: 'desc' };
        break;
    }

    const masters = await prisma.masterTrader.findMany({
      where,
      orderBy,
      include: {
        _count: {
          select: { subscriptions: true, trades: true },
        },
      },
    });

    return masters.map((m) => ({
      id: m.id,
      name: m.name,
      handle: m.handle,
      avatarUrl: m.avatarUrl,
      strategyType: m.strategyType,
      description: m.description,
      accountNumber: m.accountNumber,
      platform: m.platform,
      server: m.server,
      accountSizeNgn: Number(m.accountSizeNgn),
      winRatePercent: Number(m.winRatePercent),
      roiPercent: Number(m.roiPercent),
      maxDrawdownPercent: Number(m.maxDrawdownPercent),
      profitFactor: Number(m.profitFactor),
      sharpeRatio: Number(m.sharpeRatio),
      copiersCount: m.copiersCount,
      totalAumNgn: Number(m.totalAumNgn),
      minCopyCapitalNgn: Number(m.minCopyCapitalNgn),
      performanceFeePercent: Number(m.performanceFeePercent),
      isFeatured: m.isFeatured,
      totalTradesCount: m.totalTradesCount,
    }));
  }

  /**
   * Get Master Trader strategy details & recent closed trades
   */
  async getMasterTraderById(id: string) {
    const master = await prisma.masterTrader.findUnique({
      where: { id },
      include: {
        trades: {
          orderBy: { openedAt: 'desc' },
          take: 20,
        },
      },
    });

    if (!master) {
      throw new NotFoundException(`Master Trader with ID ${id} not found`);
    }

    return {
      id: master.id,
      name: master.name,
      handle: master.handle,
      avatarUrl: master.avatarUrl,
      strategyType: master.strategyType,
      description: master.description,
      accountNumber: master.accountNumber,
      platform: master.platform,
      server: master.server,
      accountSizeNgn: Number(master.accountSizeNgn),
      winRatePercent: Number(master.winRatePercent),
      roiPercent: Number(master.roiPercent),
      maxDrawdownPercent: Number(master.maxDrawdownPercent),
      profitFactor: Number(master.profitFactor),
      sharpeRatio: Number(master.sharpeRatio),
      totalTradesCount: master.totalTradesCount,
      winningTradesCount: master.winningTradesCount,
      losingTradesCount: master.losingTradesCount,
      copiersCount: master.copiersCount,
      totalAumNgn: Number(master.totalAumNgn),
      minCopyCapitalNgn: Number(master.minCopyCapitalNgn),
      performanceFeePercent: Number(master.performanceFeePercent),
      trades: master.trades.map((t) => ({
        id: t.id,
        ticketId: t.ticketId,
        symbol: t.symbol,
        direction: t.direction,
        volume: Number(t.volume),
        openPrice: Number(t.openPrice),
        closePrice: t.closePrice ? Number(t.closePrice) : null,
        stopLoss: t.stopLoss ? Number(t.stopLoss) : null,
        takeProfit: t.takeProfit ? Number(t.takeProfit) : null,
        profitNgn: t.profitNgn ? Number(t.profitNgn) : 0,
        openedAt: t.openedAt,
        closedAt: t.closedAt,
      })),
    };
  }

  /**
   * Subscribe and allocate capital to copy a Master Trader
   */
  async subscribeToMaster(userId: string, dto: SubscribeToMasterDto) {
    const master = await prisma.masterTrader.findUnique({
      where: { id: dto.masterTraderId },
    });

    if (!master || master.status !== CopyTradingStatus.ACTIVE) {
      throw new BadRequestException('Master Trader is not currently active for copying');
    }

    if (dto.allocatedCapitalNgn < Number(master.minCopyCapitalNgn)) {
      throw new BadRequestException(
        `Minimum capital allocation for ${master.name} is ₦${Number(master.minCopyCapitalNgn).toLocaleString()}`
      );
    }

    const { availableBalance } = await this.getVaultAvailableBalance(userId);
    if (availableBalance < dto.allocatedCapitalNgn) {
      throw new BadRequestException(
        `Insufficient balance in Giants Vault. Available: ₦${availableBalance.toLocaleString()}, Required: ₦${dto.allocatedCapitalNgn.toLocaleString()}`
      );
    }

    const existing = await prisma.copySubscription.findFirst({
      where: {
        userId,
        masterTraderId: dto.masterTraderId,
        status: { in: [CopyTradingStatus.ACTIVE, CopyTradingStatus.PAUSED] },
      },
    });

    if (existing) {
      throw new BadRequestException(
        'You already have an active copy subscription to this Master Trader. Stop or adjust your existing subscription first.'
      );
    }

    return prisma.$transaction(async (tx) => {
      // 1. Create subscription
      const subscription = await tx.copySubscription.create({
        data: {
          userId,
          masterTraderId: dto.masterTraderId,
          allocatedCapitalNgn: new Prisma.Decimal(dto.allocatedCapitalNgn),
          copyMode: dto.copyMode || CopyMode.PROPORTIONAL_EQUITY,
          fixedLotSize: dto.fixedLotSize ? new Prisma.Decimal(dto.fixedLotSize) : null,
          multiplier: dto.multiplier ? new Prisma.Decimal(dto.multiplier) : new Prisma.Decimal(1.0),
          stopLossEquityNgn: dto.stopLossEquityNgn ? new Prisma.Decimal(dto.stopLossEquityNgn) : null,
          maxDailyLossNgn: dto.maxDailyLossNgn ? new Prisma.Decimal(dto.maxDailyLossNgn) : null,
          status: CopyTradingStatus.ACTIVE,
        },
      });

      // 2. Record internal ledger debit order against user wallet
      await tx.internalOrder.create({
        data: {
          orderNumber: `FG-CPY-${Date.now()}`,
          userId,
          amount: new Prisma.Decimal(dto.allocatedCapitalNgn),
          paymentMethod: 'WALLET',
          paymentStatus: 'SUCCESSFUL',
          paymentReference: `COPY_ALLOCATION_${subscription.id}`,
        },
      });

      // 3. Increment Master Trader copiers and AUM
      await tx.masterTrader.update({
        where: { id: dto.masterTraderId },
        data: {
          copiersCount: { increment: 1 },
          totalAumNgn: { increment: dto.allocatedCapitalNgn },
        },
      });

      // 4. Record audit event
      await tx.auditEvent.create({
        data: {
          userId,
          action: 'COPY_STRATEGY_ACTIVATED',
          resource: 'CopySubscription',
          resourceId: subscription.id,
          details: {
            masterName: master.name,
            allocatedCapitalNgn: dto.allocatedCapitalNgn,
            copyMode: dto.copyMode || 'PROPORTIONAL_EQUITY',
          },
        },
      });

      this.logger.log(`User ${userId} subscribed to Master ${master.name} with ₦${dto.allocatedCapitalNgn}`);

      return {
        success: true,
        message: `Successfully allocated ₦${dto.allocatedCapitalNgn.toLocaleString()} to copy ${master.name}`,
        subscriptionId: subscription.id,
        masterName: master.name,
        allocatedCapitalNgn: Number(subscription.allocatedCapitalNgn),
        remainingVaultBalanceNgn: availableBalance - dto.allocatedCapitalNgn,
      };
    });
  }

  /**
   * Pause an active copy subscription
   */
  async pauseSubscription(userId: string, subscriptionId: string) {
    const sub = await prisma.copySubscription.findFirst({
      where: { id: subscriptionId, userId },
      include: { masterTrader: true },
    });

    if (!sub) {
      throw new NotFoundException('Copy subscription not found');
    }

    if (sub.status !== CopyTradingStatus.ACTIVE) {
      throw new BadRequestException('Subscription is not currently active');
    }

    const updated = await prisma.copySubscription.update({
      where: { id: subscriptionId },
      data: { status: CopyTradingStatus.PAUSED },
    });

    return {
      success: true,
      message: `Copying for ${sub.masterTrader.name} is now paused. No new trades will be opened.`,
      status: updated.status,
    };
  }

  /**
   * Resume a paused copy subscription
   */
  async resumeSubscription(userId: string, subscriptionId: string) {
    const sub = await prisma.copySubscription.findFirst({
      where: { id: subscriptionId, userId },
      include: { masterTrader: true },
    });

    if (!sub) {
      throw new NotFoundException('Copy subscription not found');
    }

    if (sub.status !== CopyTradingStatus.PAUSED) {
      throw new BadRequestException('Subscription is not currently paused');
    }

    const updated = await prisma.copySubscription.update({
      where: { id: subscriptionId },
      data: { status: CopyTradingStatus.ACTIVE },
    });

    return {
      success: true,
      message: `Copying for ${sub.masterTrader.name} resumed. Trade replication is active.`,
      status: updated.status,
    };
  }

  /**
   * Stop subscription and settle remaining capital + profits back to Giants Vault
   */
  async stopSubscription(userId: string, subscriptionId: string) {
    const sub = await prisma.copySubscription.findFirst({
      where: { id: subscriptionId, userId },
      include: { masterTrader: true, user: { include: { wallet: true } } },
    });

    if (!sub) {
      throw new NotFoundException('Copy subscription not found');
    }

    if (sub.status === CopyTradingStatus.STOPPED) {
      throw new BadRequestException('Subscription has already been stopped and settled');
    }

    const allocated = Number(sub.allocatedCapitalNgn);
    const profit = Number(sub.totalProfitNgn);
    const feePercent = Number(sub.masterTrader.performanceFeePercent);

    let netReturnToVault = allocated;
    let feeDeducted = 0;

    if (profit > 0) {
      feeDeducted = (profit * feePercent) / 100;
      const netProfit = profit - feeDeducted;
      netReturnToVault = allocated + netProfit;
    } else if (profit < 0) {
      netReturnToVault = Math.max(0, allocated + profit);
    }

    return prisma.$transaction(async (tx) => {
      // 1. Credit Giants Vault via a deposit record
      if (netReturnToVault > 0 && sub.user.wallet) {
        await tx.deposit.create({
          data: {
            walletId: sub.user.wallet.id,
            reference: `COPY_SETTLE_${subscriptionId.slice(0, 8)}_${Date.now()}`,
            amount: new Prisma.Decimal(netReturnToVault),
            status: 'SUCCESSFUL',
            reconciled: true,
            senderName: `CopyTrading Settlement (${sub.masterTrader.name})`,
          },
        });
      }

      // 2. Mark subscription STOPPED
      const stopped = await tx.copySubscription.update({
        where: { id: subscriptionId },
        data: {
          status: CopyTradingStatus.STOPPED,
          stoppedAt: new Date(),
        },
      });

      // 3. Decrement Master stats
      await tx.masterTrader.update({
        where: { id: sub.masterTraderId },
        data: {
          copiersCount: { decrement: 1 },
          totalAumNgn: { decrement: allocated },
        },
      });

      // 4. Audit Event
      await tx.auditEvent.create({
        data: {
          userId,
          action: 'COPY_STRATEGY_STOPPED_SETTLED',
          resource: 'CopySubscription',
          resourceId: subscriptionId,
          details: {
            masterName: sub.masterTrader.name,
            settledAmountNgn: netReturnToVault,
            feeDeductedNgn: feeDeducted,
          },
        },
      });

      return {
        success: true,
        message: `Copy subscription ended. ₦${netReturnToVault.toLocaleString()} credited back to your Giants Vault.`,
        settledAmountNgn: netReturnToVault,
        performanceFeeDeductedNgn: feeDeducted,
        status: stopped.status,
      };
    });
  }

  /**
   * Get user's copy trading portfolio overview
   */
  async getMyPortfolio(userId: string) {
    const subscriptions = await prisma.copySubscription.findMany({
      where: { userId },
      include: {
        masterTrader: true,
        copiedTrades: {
          orderBy: { openedAt: 'desc' },
          take: 10,
        },
      },
      orderBy: { startedAt: 'desc' },
    });

    const activeSubs = subscriptions.filter(
      (s) => s.status === CopyTradingStatus.ACTIVE || s.status === CopyTradingStatus.PAUSED
    );

    const totalAllocated = activeSubs.reduce(
      (sum, s) => sum + Number(s.allocatedCapitalNgn),
      0
    );

    const totalProfit = activeSubs.reduce(
      (sum, s) => sum + Number(s.totalProfitNgn),
      0
    );

    const netRoi = totalAllocated > 0 ? (totalProfit / totalAllocated) * 100 : 0;

    return {
      summary: {
        activeStrategiesCount: activeSubs.length,
        totalAllocatedNgn: totalAllocated,
        totalProfitNgn: totalProfit,
        netRoiPercent: Number(netRoi.toFixed(2)),
      },
      activeSubscriptions: activeSubs.map((s) => ({
        id: s.id,
        masterTraderId: s.masterTraderId,
        masterName: s.masterTrader.name,
        masterHandle: s.masterTrader.handle,
        masterAvatar: s.masterTrader.avatarUrl,
        strategyType: s.masterTrader.strategyType,
        allocatedCapitalNgn: Number(s.allocatedCapitalNgn),
        copyMode: s.copyMode,
        multiplier: Number(s.multiplier),
        totalProfitNgn: Number(s.totalProfitNgn),
        netRoiPercent: Number(s.netRoiPercent),
        status: s.status,
        startedAt: s.startedAt,
        recentTrades: s.copiedTrades.map((t) => ({
          id: t.id,
          symbol: t.symbol,
          direction: t.direction,
          volume: Number(t.volume),
          openPrice: Number(t.openPrice),
          closePrice: t.closePrice ? Number(t.closePrice) : null,
          profitNgn: t.profitNgn ? Number(t.profitNgn) : 0,
          status: t.status,
          openedAt: t.openedAt,
        })),
      })),
      history: subscriptions
        .filter((s) => s.status === CopyTradingStatus.STOPPED)
        .map((s) => ({
          id: s.id,
          masterName: s.masterTrader.name,
          allocatedCapitalNgn: Number(s.allocatedCapitalNgn),
          totalProfitNgn: Number(s.totalProfitNgn),
          status: s.status,
          startedAt: s.startedAt,
          stoppedAt: s.stoppedAt,
        })),
    };
  }
}
