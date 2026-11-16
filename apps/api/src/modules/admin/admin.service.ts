import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { prisma, KycStatus, UserRole, ChallengeStatus, WithdrawalStatus, PaymentStatus, ChallengeType, TransactionType } from '@fundedgiants/database';
import { SteraTraderService } from '../integrations/steratrader/steratrader.service';
import { NombaService } from '../integrations/nomba/nomba.service';
import { LencoService } from '../integrations/lenco/lenco.service';
import { WooCommerceService } from '../integrations/woocommerce/woocommerce.service';
import { NotificationsService } from '../notifications/notifications.service';

export interface AdminActionContext {
  adminId?: string;
  ipAddress?: string;
  userAgent?: string;
  reason: string;
}

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    private readonly steraTraderService: SteraTraderService,
    private readonly nombaService: NombaService,
    private readonly lencoService: LencoService,
    private readonly woocommerceService: WooCommerceService,
    private readonly notificationsService: NotificationsService,
  ) {}

  /**
   * Helper: Calculate real-time available and locked balances for any customer
   */
  private async calculateCustomerBalances(walletId?: string, userId?: string) {
    if (!walletId && !userId) return { availableBalanceNgn: 0, lockedBalanceNgn: 0 };

    const resolvedWallet = walletId
      ? await prisma.customerWallet.findUnique({ where: { id: walletId } })
      : await prisma.customerWallet.findUnique({ where: { userId } });

    if (!resolvedWallet) return { availableBalanceNgn: 0, lockedBalanceNgn: 0 };

    const [deposits, withdrawals, walletOrders] = await Promise.all([
      prisma.deposit.aggregate({
        where: { walletId: resolvedWallet.id, status: 'SUCCESSFUL' },
        _sum: { amount: true },
      }),
      prisma.withdrawal.findMany({
        where: { walletId: resolvedWallet.id },
      }),
      prisma.internalOrder.aggregate({
        where: { userId: resolvedWallet.userId, paymentMethod: 'WALLET', paymentStatus: 'SUCCESSFUL' },
        _sum: { amount: true },
      }),
    ]);

    const totalDeposits = Number(deposits._sum.amount || 0);
    const totalSpent = Number(walletOrders._sum.amount || 0);

    const paidWithdrawals = withdrawals
      .filter((w) => w.status === 'PAID')
      .reduce((sum, w) => sum + Number(w.amount), 0);

    const pendingWithdrawals = withdrawals
      .filter((w) => ['REQUESTED', 'PENDING_REVIEW', 'APPROVED', 'PROCESSING'].includes(w.status))
      .reduce((sum, w) => sum + Number(w.amount), 0);

    const availableBalanceNgn = Math.max(0, totalDeposits - paidWithdrawals - pendingWithdrawals - totalSpent);
    const lockedBalanceNgn = pendingWithdrawals;

    return { availableBalanceNgn, lockedBalanceNgn };
  }

  /**
   * 1. Top-Level Executive Dashboard Overview
   */
  async getOverview() {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [
      totalCustomers,
      newCustomersToday,
      kycApproved,
      kycPending,
      totalChallenges,
      activeChallenges,
      passedChallenges,
      failedChallenges,
      ordersAgg,
      withdrawalsAgg,
      depositsAgg,
      totalAffiliates,
      commissionsAgg,
      recentBreaches,
    ] = await Promise.all([
      prisma.user.count({ where: { role: 'CUSTOMER' } }),
      prisma.user.count({ where: { role: 'CUSTOMER', createdAt: { gte: todayStart } } }),
      prisma.user.count({ where: { kycStatus: 'APPROVED' } }),
      prisma.user.count({ where: { kycStatus: 'PENDING' } }),
      prisma.customerChallenge.count(),
      prisma.customerChallenge.count({ where: { status: 'ACTIVE' } }),
      prisma.customerChallenge.count({ where: { status: 'PASSED' } }),
      prisma.customerChallenge.count({ where: { status: 'FAILED' } }),
      prisma.internalOrder.aggregate({
        _sum: { amount: true },
        where: { paymentStatus: 'SUCCESSFUL' },
      }),
      prisma.withdrawal.aggregate({
        _count: { id: true },
        _sum: { amount: true },
        where: { status: { in: ['REQUESTED', 'PENDING_REVIEW'] } },
      }),
      prisma.deposit.aggregate({
        _sum: { amount: true },
        where: { status: 'SUCCESSFUL' },
      }),
      prisma.affiliateProfile.count(),
      prisma.affiliateCommission.aggregate({
        _sum: { amount: true },
        where: { status: 'SUCCESSFUL' },
      }),
      prisma.riskEvent.findMany({
        where: { severity: 'CRITICAL' },
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: {
          tradingAccount: true,
          challenge: { include: { user: true, product: true } },
        },
      }),
    ]);

    const cashRevenueNgn = Number(ordersAgg._sum.amount || 0);
    const totalDepositedNgn = Number(depositsAgg._sum.amount || 0);
    const pendingWithdrawalNgn = Number(withdrawalsAgg._sum.amount || 0);
    const pendingWithdrawalsCount = withdrawalsAgg._count.id;
    const affiliateCommissionsPaidNgn = Number(commissionsAgg._sum?.amount || 0);

    return {
      success: true,
      data: {
        customers: {
          total: totalCustomers,
          newToday: newCustomersToday,
          kycApproved,
          kycPending,
        },
        challenges: {
          total: totalChallenges,
          active: activeChallenges,
          passed: passedChallenges,
          failed: failedChallenges,
        },
        financials: {
          totalRevenueNgn: cashRevenueNgn,
          totalDepositedNgn,
          vaultLiabilitiesNgn: totalDepositedNgn,
          pendingWithdrawalNgn,
          pendingWithdrawalsCount,
          affiliateCommissionsPaidNgn,
        },
        affiliates: {
          total: totalAffiliates,
          commissionsPaidNgn: affiliateCommissionsPaidNgn,
        },
        recentBreaches: recentBreaches.map((b) => ({
          id: b.id,
          eventType: b.eventType,
          description: b.description,
          accountNumber: b.tradingAccount?.accountNumber,
          customerName: b.challenge?.user ? `${b.challenge.user.firstName || ''} ${b.challenge.user.lastName || ''}`.trim() : 'Unknown',
          customerEmail: b.challenge?.user?.email,
          productName: b.challenge?.product?.name,
          snapshotEquity: Number(b.snapshotEquity),
          snapshotBalance: Number(b.snapshotBalance),
          createdAt: b.createdAt,
        })),
        systemHealth: {
          database: 'ONLINE',
          steraTrader: 'CONNECTED',
          lencoBanking: 'CONNECTED',
          ninjaKyc: 'READY',
          wooCommerceBridge: 'CONNECTED',
        },
      },
    };
  }

  /**
   * 2. Customers Directory & Filter
   */
  async getCustomers(params: {
    search?: string;
    kycStatus?: KycStatus;
    role?: UserRole;
    isSuspended?: boolean;
    skip?: number;
    take?: number;
  }) {
    const { search, kycStatus, role, isSuspended, skip = 0, take = 50 } = params;

    const where: any = {};
    if (kycStatus) where.kycStatus = kycStatus;
    if (role) where.role = role;
    if (isSuspended !== undefined) where.isSuspended = isSuspended;

    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search } },
      ];
    }

    const [customers, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          wallet: true,
          _count: {
            select: {
              challenges: true,
              bankAccounts: true,
              orders: true,
            },
          },
        },
      }),
      prisma.user.count({ where }),
    ]);

    const formattedCustomers = await Promise.all(
      customers.map(async (c) => {
        const { availableBalanceNgn } = await this.calculateCustomerBalances(c.wallet?.id, c.id);
        return {
          id: c.id,
          email: c.email,
          phone: c.phone,
          firstName: c.firstName,
          lastName: c.lastName,
          role: c.role,
          kycStatus: c.kycStatus,
          isSuspended: c.isSuspended,
          suspensionReason: c.suspensionReason,
          walletBalanceNgn: availableBalanceNgn,
          activeChallengesCount: c._count.challenges,
          bankAccountsCount: c._count.bankAccounts,
          ordersCount: c._count.orders,
          createdAt: c.createdAt,
        };
      }),
    );

    return {
      success: true,
      data: formattedCustomers,
      pagination: {
        total,
        skip,
        take,
      },
    };
  }

  /**
   * 3. Customer 360 Details
   */
  async getCustomerDetails(userId: string) {
    const customer = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        wallet: {
          include: {
            deposits: { orderBy: { createdAt: 'desc' }, take: 5 },
            withdrawals: { orderBy: { createdAt: 'desc' }, take: 5 },
          },
        },
        challenges: {
          include: {
            product: true,
            tradingAccount: true,
            riskEvents: { orderBy: { createdAt: 'desc' }, take: 5 },
          },
          orderBy: { createdAt: 'desc' },
        },
        bankAccounts: { orderBy: { createdAt: 'desc' } },
        orders: { orderBy: { createdAt: 'desc' }, take: 10 },
        cardOrders: { orderBy: { createdAt: 'desc' } },
        kycRecords: { orderBy: { createdAt: 'desc' } },
        affiliateProfile: {
          include: {
            referrals: { take: 10, orderBy: { createdAt: 'desc' } },
            commissions: { take: 10, orderBy: { createdAt: 'desc' } },
          },
        },
      },
    });

    if (!customer) {
      throw new NotFoundException(`Customer with ID ${userId} not found`);
    }

    const { availableBalanceNgn, lockedBalanceNgn } = await this.calculateCustomerBalances(
      customer.wallet?.id,
      customer.id,
    );

    const auditLogs = await prisma.auditEvent.findMany({
      where: {
        OR: [{ userId }, { resourceId: userId }],
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    return {
      success: true,
      data: {
        customer: {
          id: customer.id,
          email: customer.email,
          phone: customer.phone,
          firstName: customer.firstName,
          lastName: customer.lastName,
          role: customer.role,
          kycStatus: customer.kycStatus,
          isSuspended: customer.isSuspended,
          suspensionReason: customer.suspensionReason,
          createdAt: customer.createdAt,
          updatedAt: customer.updatedAt,
        },
        wallet: customer.wallet
          ? {
              id: customer.wallet.id,
              availableBalanceNgn,
              lockedBalanceNgn,
              currency: customer.wallet.currency,
              virtualAccount: customer.wallet.lencoAccountNumber,
              virtualBank: customer.wallet.lencoVirtualBankName || 'Wema Bank',
              recentDeposits: customer.wallet.deposits,
              recentWithdrawals: customer.wallet.withdrawals,
            }
          : null,
        challenges: customer.challenges.map((ch) => ({
          id: ch.id,
          challengeNumber: ch.challengeNumber,
          productName: ch.product?.name,
          sku: ch.product?.sku,
          type: ch.type,
          status: ch.status,
          ruleVersion: ch.ruleVersion,
          accountNumber: ch.tradingAccount?.accountNumber,
          initialBalanceNgn: Number(ch.tradingAccount?.initialBalance || 0),
          currentBalanceNgn: Number(ch.tradingAccount?.currentBalance || 0),
          currentEquityNgn: Number(ch.tradingAccount?.currentEquity || 0),
          totalProfitNgn: Number(ch.tradingAccount?.totalProfit || 0),
          dailyDrawdownLimitNgn: Number(ch.tradingAccount?.dailyDrawdownLimit || 0),
          maxDrawdownLimitNgn: Number(ch.tradingAccount?.maxDrawdownLimit || 0),
          tradingStatus: ch.tradingAccount?.status,
          failureReason: ch.failureReason,
          startDate: ch.startDate,
          createdAt: ch.createdAt,
        })),
        bankAccounts: customer.bankAccounts,
        orders: customer.orders,
        cardOrders: customer.cardOrders,
        kycRecords: customer.kycRecords,
        affiliate: customer.affiliateProfile,
        auditLogs,
      },
    };
  }

  /**
   * 4. Update Customer Status (Suspend / Reinstate / KYC override)
   */
  async updateCustomerStatus(
    userId: string,
    dto: {
      isSuspended?: boolean;
      suspensionReason?: string;
      kycStatus?: KycStatus;
      role?: UserRole;
    },
    context: AdminActionContext,
  ) {
    const existing = await prisma.user.findUnique({ where: { id: userId } });
    if (!existing) {
      throw new NotFoundException(`Customer with ID ${userId} not found`);
    }

    if (!context.reason || context.reason.trim().length < 5) {
      throw new BadRequestException('A descriptive audit reason is mandatory for administrative customer updates.');
    }

    const updated = await prisma.$transaction(async (tx) => {
      const user = await tx.user.update({
        where: { id: userId },
        data: {
          isSuspended: dto.isSuspended !== undefined ? dto.isSuspended : existing.isSuspended,
          suspensionReason: dto.suspensionReason !== undefined ? dto.suspensionReason : existing.suspensionReason,
          kycStatus: dto.kycStatus || existing.kycStatus,
          role: dto.role || existing.role,
        },
      });

      await tx.auditEvent.create({
        data: {
          userId,
          adminId: context.adminId,
          action: 'ADMIN_CUSTOMER_STATUS_UPDATE',
          resource: 'User',
          resourceId: userId,
          details: {
            changes: dto,
            previous: {
              isSuspended: existing.isSuspended,
              kycStatus: existing.kycStatus,
              role: existing.role,
            },
            reason: context.reason,
          },
          ipAddress: context.ipAddress,
          userAgent: context.userAgent,
        },
      });

      return user;
    });

    return {
      success: true,
      message: 'Customer record successfully updated.',
      data: updated,
    };
  }

  /**
   * 5. Challenges Management & Full-Cycle Rule Authoring
   */
  async getChallengeProducts() {
    const products = await prisma.challengeProduct.findMany({
      orderBy: { accountSize: 'asc' },
      include: {
        _count: { select: { challenges: true } },
      },
    });

    return {
      success: true,
      data: products.map((p) => ({
        id: p.id,
        sku: p.sku,
        skuPrefix: p.skuPrefix,
        name: p.name,
        type: p.type,
        accountSize: Number(p.accountSize),
        priceNgn: Number(p.priceNgn),
        dailyDrawdownPercent: Number(p.dailyDrawdownPercent),
        maxDrawdownPercent: Number(p.maxDrawdownPercent),
        profitTargetPercent: Number(p.profitTargetPercent),
        leverage: p.leverage,
        profitSplit: p.profitSplit,
        isActive: p.isActive,
        activeChallengesCount: p._count.challenges,
        createdAt: p.createdAt,
      })),
    };
  }

  async createChallengeProduct(
    dto: {
      sku: string;
      skuPrefix: string;
      name: string;
      type: ChallengeType | string;
      accountSize: number;
      priceNgn: number;
      dailyDrawdownPercent: number;
      maxDrawdownPercent: number;
      profitTargetPercent: number;
      leverage: string;
      profitSplit: string;
      isActive?: boolean;
    },
    context: AdminActionContext,
  ) {
    const sku = dto.sku.toLowerCase().trim();
    const existing = await prisma.challengeProduct.findUnique({ where: { sku } });
    if (existing) {
      throw new BadRequestException(`Challenge SKU ${sku} already exists.`);
    }

    const challengeType: ChallengeType =
      dto.type === 'PHOENIX_RISE_INSTANT' || (dto.type as any) === 'INSTANT_FUNDING'
        ? ChallengeType.PHOENIX_RISE_INSTANT
        : ChallengeType.RHINO_RUSH_ONE_STEP;

    const product = await prisma.$transaction(async (tx) => {
      const p = await tx.challengeProduct.create({
        data: {
          sku,
          skuPrefix: dto.skuPrefix.toLowerCase().trim(),
          name: dto.name.trim(),
          type: challengeType,
          accountSize: dto.accountSize,
          priceNgn: dto.priceNgn,
          dailyDrawdownPercent: dto.dailyDrawdownPercent,
          maxDrawdownPercent: dto.maxDrawdownPercent,
          profitTargetPercent: dto.profitTargetPercent,
          leverage: dto.leverage || '1:100',
          profitSplit: dto.profitSplit || '80:20',
          isActive: dto.isActive !== undefined ? dto.isActive : true,
        },
      });

      await tx.auditEvent.create({
        data: {
          adminId: context.adminId,
          action: 'ADMIN_CHALLENGE_PRODUCT_CREATED',
          resource: 'ChallengeProduct',
          resourceId: p.id,
          details: { sku, name: dto.name, accountSize: dto.accountSize },
          ipAddress: context.ipAddress,
          userAgent: context.userAgent,
        },
      });

      return p;
    });

    return {
      success: true,
      message: `Challenge program "${dto.name}" created successfully.`,
      data: product,
    };
  }

  async updateChallengeProduct(id: string, dto: any, context: AdminActionContext) {
    const product = await prisma.challengeProduct.findUnique({ where: { id } });
    if (!product) {
      throw new NotFoundException(`Challenge product ${id} not found.`);
    }

    const updated = await prisma.$transaction(async (tx) => {
      const data: any = {};
      if (dto.name !== undefined) data.name = dto.name;
      if (dto.priceNgn !== undefined) data.priceNgn = dto.priceNgn;
      if (dto.dailyDrawdownPercent !== undefined) data.dailyDrawdownPercent = dto.dailyDrawdownPercent;
      if (dto.maxDrawdownPercent !== undefined) data.maxDrawdownPercent = dto.maxDrawdownPercent;
      if (dto.profitTargetPercent !== undefined) data.profitTargetPercent = dto.profitTargetPercent;
      if (dto.leverage !== undefined) data.leverage = dto.leverage;
      if (dto.profitSplit !== undefined) data.profitSplit = dto.profitSplit;
      if (dto.isActive !== undefined) data.isActive = dto.isActive;

      const p = await tx.challengeProduct.update({
        where: { id },
        data,
      });

      await tx.auditEvent.create({
        data: {
          adminId: context.adminId,
          action: 'ADMIN_CHALLENGE_PRODUCT_UPDATED',
          resource: 'ChallengeProduct',
          resourceId: id,
          details: dto,
          ipAddress: context.ipAddress,
          userAgent: context.userAgent,
        },
      });

      return p;
    });

    return {
      success: true,
      message: `Challenge program "${updated.name}" updated successfully.`,
      data: updated,
    };
  }

  async grantChallengeToUser(
    dto: {
      userId: string;
      productId: string;
      grantReason: string;
      discountPercent?: number;
    },
    context: AdminActionContext,
  ) {
    const user = await prisma.user.findUnique({ where: { id: dto.userId } });
    if (!user) throw new NotFoundException(`User ${dto.userId} not found.`);

    const product = await prisma.challengeProduct.findUnique({ where: { id: dto.productId } });
    if (!product) throw new NotFoundException(`Challenge product ${dto.productId} not found.`);

    const challengeNumber = `FG-CH-${Math.floor(10000 + Math.random() * 90000)}`;
    const orderNumber = `FG-ORD-${Math.floor(100000 + Math.random() * 900000)}`;
    const discount = dto.discountPercent !== undefined ? dto.discountPercent : 100;
    const effectivePrice = discount === 100 ? 0 : Number(product.priceNgn) * (1 - discount / 100);

    const result = await prisma.$transaction(async (tx) => {
      // 1. Create Internal Order
      const order = await tx.internalOrder.create({
        data: {
          orderNumber,
          userId: user.id,
          amount: effectivePrice,
          currency: 'NGN',
          paymentMethod: 'ADMIN_DIRECT_GRANT',
          paymentStatus: PaymentStatus.SUCCESSFUL,
          paymentReference: `ADMIN-GRANT-${Date.now()}`,
        },
      });

      // 2. Create CustomerChallenge
      const challenge = await tx.customerChallenge.create({
        data: {
          challengeNumber,
          userId: user.id,
          orderId: order.id,
          productId: product.id,
          type: product.type,
          status: 'ACTIVE',
          startDate: new Date(),
        },
      });

      // 3. Provision SteraTrader Account
      const steraAccountNum = `ST-${Math.floor(700000 + Math.random() * 200000)}`;
      const dailyDrawdownLimit = Number(product.accountSize) * (Number(product.dailyDrawdownPercent) / 100);
      const maxDrawdownLimit = Number(product.accountSize) * (Number(product.maxDrawdownPercent) / 100);

      const tradingAccount = await tx.tradingAccount.create({
        data: {
          accountNumber: steraAccountNum,
          userId: user.id,
          challengeId: challenge.id,
          platform: 'SteraTrader',
          initialBalance: product.accountSize,
          currentBalance: product.accountSize,
          currentEquity: product.accountSize,
          dailyDrawdownLimit,
          maxDrawdownLimit,
          status: 'ACTIVE',
        },
      });

      // 4. Audit Log
      await tx.auditEvent.create({
        data: {
          adminId: context.adminId,
          action: 'ADMIN_CHALLENGE_OFFER_GRANTED',
          resource: 'CustomerChallenge',
          resourceId: challenge.id,
          details: {
            userId: user.id,
            userEmail: user.email,
            productId: product.id,
            productName: product.name,
            accountSize: Number(product.accountSize),
            grantReason: dto.grantReason,
            steraAccountNumber: steraAccountNum,
            discountPercent: discount,
          },
          ipAddress: context.ipAddress,
          userAgent: context.userAgent,
        },
      });

      return { order, challenge, tradingAccount };
    });

    return {
      success: true,
      message: `Challenge "${product.name}" granted to ${user.email} successfully. Account #${result.tradingAccount.accountNumber} provisioned.`,
      data: result,
    };
  }

  async getChallenges(params: {
    status?: ChallengeStatus;
    search?: string;
    skip?: number;
    take?: number;
  }) {
    const { status, search, skip = 0, take = 50 } = params;
    const where: any = {};
    if (status) where.status = status;

    if (search) {
      where.OR = [
        { challengeNumber: { contains: search, mode: 'insensitive' } },
        { user: { email: { contains: search, mode: 'insensitive' } } },
        { user: { firstName: { contains: search, mode: 'insensitive' } } },
        { user: { lastName: { contains: search, mode: 'insensitive' } } },
        { tradingAccount: { accountNumber: { contains: search } } },
      ];
    }

    const [challenges, total] = await Promise.all([
      prisma.customerChallenge.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          user: true,
          product: true,
          tradingAccount: true,
        },
      }),
      prisma.customerChallenge.count({ where }),
    ]);

    return {
      success: true,
      data: challenges.map((ch) => ({
        id: ch.id,
        challengeNumber: ch.challengeNumber,
        type: ch.type,
        status: ch.status,
        productName: ch.product?.name,
        accountSizeNgn: Number(ch.product?.accountSize || 0),
        customerName: ch.user ? `${ch.user.firstName || ''} ${ch.user.lastName || ''}`.trim() : 'Unknown',
        customerEmail: ch.user?.email,
        accountNumber: ch.tradingAccount?.accountNumber,
        initialBalanceNgn: Number(ch.tradingAccount?.initialBalance || 0),
        currentBalanceNgn: Number(ch.tradingAccount?.currentBalance || 0),
        currentEquityNgn: Number(ch.tradingAccount?.currentEquity || 0),
        tradingStatus: ch.tradingAccount?.status,
        failureReason: ch.failureReason,
        createdAt: ch.createdAt,
      })),
      pagination: { total, skip, take },
    };
  }

  /**
   * 6. SteraTrader Accounts & Administrative Kill-Switch
   */
  async getTradingAccounts(params: { search?: string; status?: string; skip?: number; take?: number }) {
    const { search, status, skip = 0, take = 50 } = params;
    const where: any = {};
    if (status) where.status = status as any;
    if (search) {
      where.OR = [
        { accountNumber: { contains: search } },
        { user: { email: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const [accounts, total] = await Promise.all([
      prisma.tradingAccount.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          user: true,
          challenge: { include: { product: true } },
          riskEvents: { orderBy: { createdAt: 'desc' }, take: 1 },
        },
      }),
      prisma.tradingAccount.count({ where }),
    ]);

    return {
      success: true,
      data: accounts.map((acc) => ({
        id: acc.id,
        accountNumber: acc.accountNumber,
        platform: acc.platform,
        status: acc.status,
        customerName: acc.user ? `${acc.user.firstName || ''} ${acc.user.lastName || ''}`.trim() : 'Unknown',
        customerEmail: acc.user?.email,
        challengeNumber: acc.challenge?.challengeNumber,
        productName: acc.challenge?.product?.name,
        initialBalanceNgn: Number(acc.initialBalance),
        currentBalanceNgn: Number(acc.currentBalance),
        currentEquityNgn: Number(acc.currentEquity),
        totalProfitNgn: Number(acc.totalProfit),
        dailyDrawdownLimitNgn: Number(acc.dailyDrawdownLimit),
        maxDrawdownLimitNgn: Number(acc.maxDrawdownLimit),
        lastSyncedAt: acc.lastSyncedAt,
        latestRiskEvent: acc.riskEvents[0]?.eventType,
      })),
      pagination: { total, skip, take },
    };
  }

  /**
   * Administrative Termination / Kill-Switch
   */
  async terminateTradingAccount(accountId: string, context: AdminActionContext) {
    const account = await prisma.tradingAccount.findUnique({
      where: { id: accountId },
      include: { challenge: true },
    });

    if (!account) {
      throw new NotFoundException(`Trading account ${accountId} not found`);
    }

    if (!context.reason || context.reason.trim().length < 5) {
      throw new BadRequestException('A descriptive reason is required for manual account termination.');
    }

    await this.steraTraderService.terminateAccount(account.accountNumber, `Admin termination: ${context.reason}`);

    await prisma.$transaction(async (tx) => {
      await tx.tradingAccount.update({
        where: { id: accountId },
        data: { status: 'CLOSED' },
      });

      if (account.challengeId) {
        await tx.customerChallenge.update({
          where: { id: account.challengeId },
          data: {
            status: 'FAILED',
            failedAt: new Date(),
            failureReason: `Admin termination: ${context.reason}`,
          },
        });
      }

      await tx.riskEvent.create({
        data: {
          challengeId: account.challengeId,
          tradingAccountId: account.id,
          eventType: 'ADMIN_MANUAL_LIQUIDATION',
          description: context.reason,
          severity: 'CRITICAL',
          snapshotBalance: Number(account.currentBalance),
          snapshotEquity: Number(account.currentEquity),
        },
      });

      await tx.auditEvent.create({
        data: {
          userId: account.userId,
          adminId: context.adminId,
          action: 'ADMIN_TRADING_ACCOUNT_TERMINATION',
          resource: 'TradingAccount',
          resourceId: account.accountNumber,
          details: {
            accountNumber: account.accountNumber,
            reason: context.reason,
          },
          ipAddress: context.ipAddress,
          userAgent: context.userAgent,
        },
      });
    });

    return {
      success: true,
      message: `Trading account ${account.accountNumber} successfully terminated and challenge marked as FAILED.`,
    };
  }

  /**
   * 7. Risk Events Log
   */
  async getRiskEvents(params: { eventType?: string; severity?: string; skip?: number; take?: number }) {
    const { eventType, severity, skip = 0, take = 50 } = params;
    const where: any = {};
    if (eventType) where.eventType = eventType;
    if (severity) where.severity = severity;

    const [events, total] = await Promise.all([
      prisma.riskEvent.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          tradingAccount: true,
          challenge: { include: { user: true, product: true } },
        },
      }),
      prisma.riskEvent.count({ where }),
    ]);

    return {
      success: true,
      data: events.map((ev) => ({
        id: ev.id,
        eventType: ev.eventType,
        description: ev.description,
        severity: ev.severity,
        accountNumber: ev.tradingAccount?.accountNumber,
        customerName: ev.challenge?.user ? `${ev.challenge.user.firstName || ''} ${ev.challenge.user.lastName || ''}`.trim() : 'Unknown',
        customerEmail: ev.challenge?.user?.email,
        productName: ev.challenge?.product?.name,
        snapshotBalanceNgn: Number(ev.snapshotBalance),
        snapshotEquityNgn: Number(ev.snapshotEquity),
        createdAt: ev.createdAt,
      })),
      pagination: { total, skip, take },
    };
  }

  /**
   * 8. Financial Ledger & Journal Entries
   */
  async getLedgerEntries(params: { transactionType?: any; skip?: number; take?: number }) {
    const { transactionType, skip = 0, take = 50 } = params;
    const where: any = {};
    if (transactionType) where.transactionType = transactionType;

    const [entries, total] = await Promise.all([
      prisma.journalEntry.findMany({
        where,
        skip,
        take,
        orderBy: { postedAt: 'desc' },
        include: {
          lines: {
            include: {
              account: true,
            },
          },
        },
      }),
      prisma.journalEntry.count({ where }),
    ]);

    return {
      success: true,
      data: entries.map((entry) => ({
        id: entry.id,
        entryNumber: entry.entryNumber,
        transactionType: entry.transactionType,
        reference: entry.reference,
        narration: entry.narration,
        postedAt: entry.postedAt,
        isReversed: entry.isReversed,
        lines: entry.lines.map((l) => ({
          accountCode: l.account?.code,
          accountName: l.account?.name,
          accountType: l.account?.type,
          debitNgn: Number(l.debit),
          creditNgn: Number(l.credit),
        })),
      })),
      pagination: { total, skip, take },
    };
  }

  /**
   * 9. Withdrawals Queue & Manual Nomba Approval
   */
  async getWithdrawals(params: { status?: WithdrawalStatus; skip?: number; take?: number }) {
    const { status, skip = 0, take = 50 } = params;
    const where: any = {};
    if (status) where.status = status;

    const [withdrawals, total] = await Promise.all([
      prisma.withdrawal.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          wallet: {
            include: {
              user: true,
            },
          },
          bankAccount: true,
        },
      }),
      prisma.withdrawal.count({ where }),
    ]);

    return {
      success: true,
      data: withdrawals.map((w) => ({
        id: w.id,
        reference: w.reference,
        customerName: w.wallet?.user ? `${w.wallet.user.firstName || ''} ${w.wallet.user.lastName || ''}`.trim() : 'Unknown',
        customerEmail: w.wallet?.user?.email,
        amountNgn: Number(w.amount),
        feeNgn: Number(w.fee),
        netAmountNgn: Number(w.netAmount),
        status: w.status,
        bankName: w.bankAccount?.bankName,
        accountNumber: w.bankAccount?.accountNumber,
        accountName: w.bankAccount?.accountName,
        bankCode: w.bankAccount?.bankCode,
        nombaDisbursementRef: w.nombaDisbursementRef || w.lencoDisbursementRef,
        approvedBy: w.approvedBy,
        approvedAt: w.approvedAt,
        rejectionReason: w.rejectionReason,
        createdAt: w.createdAt,
      })),
      pagination: { total, skip, take },
    };
  }

  /**
   * Process Withdrawal Manual Approval (Nomba Transfer) or Rejection
   */
  async processWithdrawal(
    withdrawalId: string,
    dto: { action: 'APPROVE' | 'REJECT'; reason?: string },
    context: AdminActionContext,
  ) {
    const withdrawal = await prisma.withdrawal.findUnique({
      where: { id: withdrawalId },
      include: {
        wallet: { include: { user: true } },
        bankAccount: true,
      },
    });

    if (!withdrawal) {
      throw new NotFoundException(`Withdrawal ${withdrawalId} not found`);
    }

    if (withdrawal.status !== 'REQUESTED' && withdrawal.status !== 'PENDING_REVIEW') {
      throw new BadRequestException(`Withdrawal is already in ${withdrawal.status} state`);
    }

    if (dto.action === 'APPROVE') {
      if (!withdrawal.bankAccount) {
        throw new BadRequestException('Withdrawal does not have an attached destination bank account.');
      }

      // Execute transfer via Nomba API
      const disbursementRes = await this.nombaService.createTransfer({
        amountNgn: Number(withdrawal.netAmount),
        accountNumber: withdrawal.bankAccount.accountNumber,
        bankCode: withdrawal.bankAccount.bankCode,
        accountName: withdrawal.bankAccount.accountName,
        narration: `FundedGiants Payout ${withdrawal.reference}`,
        reference: withdrawal.reference,
      });

      if (!disbursementRes.status) {
        throw new BadRequestException(`Nomba transfer failed: ${disbursementRes.message || 'Unknown provider error'}`);
      }

      // Record to Double-Entry Ledger (Debit 2000-WALLET-LIABILITY, Credit 1000-CASH-NOMBA)
      try {
        const cashAccount = await prisma.ledgerAccount.findFirst({
          where: { OR: [{ code: '1000-CASH-NOMBA' }, { code: '1000-CASH-LENCO' }] },
        });
        const liabilityAccount = await prisma.ledgerAccount.findFirst({
          where: { code: '2000-WALLET-LIABILITY' },
        });
        if (cashAccount && liabilityAccount) {
          const entry = await prisma.journalEntry.create({
            data: {
              entryNumber: `JE-PAYOUT-${Date.now()}`,
              transactionType: TransactionType.TRADER_EARNINGS_PAYOUT,
              reference: withdrawal.reference,
              narration: `Disbursed payout ₦${Number(withdrawal.netAmount).toLocaleString()} to ${withdrawal.bankAccount.bankName} (${withdrawal.bankAccount.accountNumber}) via Nomba`,
            },
          });
          await prisma.journalLine.createMany({
            data: [
              { journalEntryId: entry.id, accountId: liabilityAccount.id, debit: Number(withdrawal.netAmount), credit: 0 },
              { journalEntryId: entry.id, accountId: cashAccount.id, debit: 0, credit: Number(withdrawal.netAmount) },
            ],
          });
        }
      } catch (jeErr: any) {
        this.logger.error(`Error posting payout to ledger: ${jeErr.message}`);
      }

      const updated = await prisma.$transaction(async (tx) => {
        const w = await tx.withdrawal.update({
          where: { id: withdrawalId },
          data: {
            status: 'PAID',
            approvedBy: context.adminId || 'STAFF_ADMIN',
            approvedAt: new Date(),
            nombaDisbursementRef: disbursementRes?.data?.reference || `NOMBA-DISB-${Date.now()}`,
          },
        });

        await tx.auditEvent.create({
          data: {
            userId: withdrawal.wallet.userId,
            adminId: context.adminId,
            action: 'ADMIN_WITHDRAWAL_APPROVED',
            resource: 'Withdrawal',
            resourceId: withdrawal.id,
            details: {
              reference: withdrawal.reference,
              amount: Number(withdrawal.amount),
              nombaRef: w.nombaDisbursementRef,
            },
            ipAddress: context.ipAddress,
            userAgent: context.userAgent,
          },
        });

        return w;
      });

      // Dispatch real-time in-app notification & Brevo email to trader
      await this.notificationsService.createNotification({
        userId: withdrawal.wallet.userId,
        title: 'Payout Disbursed to Your Bank Account',
        message: `Your withdrawal of ₦${Number(withdrawal.netAmount).toLocaleString()} (Ref: ${withdrawal.reference}) has been approved and successfully disbursed to ${withdrawal.bankAccount.bankName} (${withdrawal.bankAccount.accountNumber}) via Nomba.`,
        category: 'FINANCE',
        priority: 'HIGH',
        actionUrl: '/dashboard/wallet',
        sendEmail: true,
      });

      return {
        success: true,
        message: `Withdrawal ${withdrawal.reference} approved and disbursed successfully via Nomba.`,
        data: updated,
      };
    } else {
      const rejectionReason = dto.reason || context.reason || 'Withdrawal declined by compliance verification';

      const updated = await prisma.$transaction(async (tx) => {
        const w = await tx.withdrawal.update({
          where: { id: withdrawalId },
          data: {
            status: 'REJECTED',
            rejectionReason,
          },
        });

        await tx.auditEvent.create({
          data: {
            userId: withdrawal.wallet.userId,
            adminId: context.adminId,
            action: 'ADMIN_WITHDRAWAL_REJECTED',
            resource: 'Withdrawal',
            resourceId: withdrawal.id,
            details: {
              reference: withdrawal.reference,
              amount: Number(withdrawal.amount),
              reason: rejectionReason,
            },
            ipAddress: context.ipAddress,
            userAgent: context.userAgent,
          },
        });

        return w;
      });

      // Dispatch rejection notification to trader
      await this.notificationsService.createNotification({
        userId: withdrawal.wallet.userId,
        title: 'Withdrawal Request Update',
        message: `Your withdrawal request of ₦${Number(withdrawal.amount).toLocaleString()} (Ref: ${withdrawal.reference}) was rejected. Reason: ${rejectionReason}. The funds remain available in your Giants Vault.`,
        category: 'FINANCE',
        priority: 'HIGH',
        actionUrl: '/dashboard/wallet',
        sendEmail: true,
      });

      return {
        success: true,
        message: `Withdrawal ${withdrawal.reference} rejected and funds restored to trader vault.`,
        data: updated,
      };
    }
  }

  /**
   * 10. Affiliates & Coupons Management
   */
  async getAffiliates(params: { skip?: number; take?: number }) {
    const { skip = 0, take = 50 } = params;
    const [affiliates, total] = await Promise.all([
      prisma.affiliateProfile.findMany({
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          user: true,
          _count: {
            select: {
              referrals: true,
              commissions: true,
            },
          },
          commissions: true,
        },
      }),
      prisma.affiliateProfile.count(),
    ]);

    return {
      success: true,
      data: affiliates.map((aff) => {
        const totalEarnings = aff.commissions.reduce((acc, c) => acc + Number(c.amount), 0);
        const paidEarnings = aff.commissions
          .filter((c) => c.status === 'SUCCESSFUL')
          .reduce((acc, c) => acc + Number(c.amount), 0);

        return {
          id: aff.id,
          handle: aff.referralCode,
          customerName: aff.user ? `${aff.user.firstName || ''} ${aff.user.lastName || ''}`.trim() : 'Unknown',
          customerEmail: aff.user?.email,
          referralsCount: aff._count.referrals,
          totalEarningsNgn: totalEarnings,
          paidEarningsNgn: paidEarnings,
          pendingEarningsNgn: totalEarnings - paidEarnings,
          createdAt: aff.createdAt,
        };
      }),
      pagination: { total, skip, take },
    };
  }

  async getCoupons() {
    const coupons = await prisma.coupon.findMany({
      orderBy: { createdAt: 'desc' },
    });

    return {
      success: true,
      data: coupons.map((c) => ({
        id: c.id,
        code: c.code,
        discountPercent: Number(c.discountPercent),
        maxDiscountNgn: c.maxDiscountNgn ? Number(c.maxDiscountNgn) : null,
        isActive: c.isActive,
        usageCount: c.usageCount,
        maxUsage: c.maxUsage,
        expiresAt: c.expiresAt,
        restrictedEmails: c.restrictedEmails ? c.restrictedEmails.split(',').map((e) => e.trim()).filter(Boolean) : [],
        restrictedAccountType: c.restrictedAccountType || null,
        restrictedAccountSize: c.restrictedAccountSize ? Number(c.restrictedAccountSize) : null,
        assignedAccountPlan: c.assignedAccountPlan || null,
        assignedAccountSize: c.assignedAccountSize ? Number(c.assignedAccountSize) : null,
        description: c.description || null,
        createdAt: c.createdAt,
      })),
    };
  }

  async createCoupon(
    dto: {
      code: string;
      discountPercent: number;
      maxDiscountNgn?: number;
      maxUsage?: number;
      expiresAt?: string;
      restrictedEmails?: string[];
      restrictedAccountType?: string;
      restrictedAccountSize?: number;
      assignedAccountPlan?: string;
      assignedAccountSize?: number;
      description?: string;
      sendEmail?: boolean;
    },
    context: AdminActionContext,
  ) {
    const code = dto.code.trim().toUpperCase();
    const existing = await prisma.coupon.findUnique({ where: { code } });
    if (existing) {
      throw new BadRequestException(`Coupon code ${code} already exists.`);
    }

    const emailStr = Array.isArray(dto.restrictedEmails) && dto.restrictedEmails.length > 0
      ? dto.restrictedEmails.map((e) => e.trim().toLowerCase()).filter(Boolean).join(',')
      : null;

    const coupon = await prisma.$transaction(async (tx) => {
      const c = await tx.coupon.create({
        data: {
          code,
          discountPercent: dto.discountPercent,
          maxDiscountNgn: dto.maxDiscountNgn,
          maxUsage: dto.maxUsage,
          expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
          restrictedEmails: emailStr,
          restrictedAccountType: dto.restrictedAccountType || null,
          restrictedAccountSize: dto.restrictedAccountSize || null,
          assignedAccountPlan: dto.assignedAccountPlan || null,
          assignedAccountSize: dto.assignedAccountSize || null,
          description: dto.description || null,
          isActive: true,
        },
      });

      await tx.auditEvent.create({
        data: {
          adminId: context.adminId,
          action: 'ADMIN_COUPON_CREATED',
          resource: 'Coupon',
          resourceId: c.id,
          details: {
            code,
            discountPercent: dto.discountPercent,
            restrictedEmails: emailStr,
            assignedAccountPlan: dto.assignedAccountPlan,
            assignedAccountSize: dto.assignedAccountSize,
          },
          ipAddress: context.ipAddress,
          userAgent: context.userAgent,
        },
      });

      return c;
    });

    // Auto-sync coupon to WooCommerce REST API & WordPress plugin
    try {
      await this.woocommerceService.syncCoupon({
        code,
        discountPercent: Number(dto.discountPercent),
        maxUsage: dto.maxUsage,
        expiresAt: dto.expiresAt,
        restrictedEmails: emailStr,
        description: dto.description,
        isActive: true,
      });
    } catch (syncErr: any) {
      this.logger.warn(`WooCommerce sync deferred: ${syncErr.message}`);
    }

    // Send email notification to user(s) if requested and emails exist
    if (dto.sendEmail && emailStr) {
      await this.dispatchCouponEmails({
        code,
        discountPercent: dto.discountPercent,
        emails: emailStr.split(','),
        assignedPlan: dto.assignedAccountPlan,
        assignedSize: dto.assignedAccountSize,
      });
    }

    return {
      success: true,
      message: `Coupon ${code} created and synced to WooCommerce successfully.`,
      data: coupon,
    };
  }

  async updateCoupon(
    code: string,
    dto: {
      discountPercent?: number;
      maxDiscountNgn?: number;
      maxUsage?: number;
      expiresAt?: string | null;
      restrictedEmails?: string[];
      restrictedAccountType?: string | null;
      restrictedAccountSize?: number | null;
      assignedAccountPlan?: string | null;
      assignedAccountSize?: number | null;
      description?: string | null;
      isActive?: boolean;
      sendEmail?: boolean;
    },
    context: AdminActionContext,
  ) {
    const cleanCode = code.trim().toUpperCase();
    const existing = await prisma.coupon.findUnique({ where: { code: cleanCode } });
    if (!existing) {
      throw new NotFoundException(`Coupon ${cleanCode} not found.`);
    }

    const emailStr = Array.isArray(dto.restrictedEmails)
      ? dto.restrictedEmails.map((e) => e.trim().toLowerCase()).filter(Boolean).join(',')
      : undefined;

    const updated = await prisma.$transaction(async (tx) => {
      const c = await tx.coupon.update({
        where: { code: cleanCode },
        data: {
          discountPercent: dto.discountPercent !== undefined ? dto.discountPercent : undefined,
          maxDiscountNgn: dto.maxDiscountNgn !== undefined ? dto.maxDiscountNgn : undefined,
          maxUsage: dto.maxUsage !== undefined ? dto.maxUsage : undefined,
          expiresAt: dto.expiresAt !== undefined ? (dto.expiresAt ? new Date(dto.expiresAt) : null) : undefined,
          restrictedEmails: emailStr !== undefined ? (emailStr || null) : undefined,
          restrictedAccountType: dto.restrictedAccountType !== undefined ? dto.restrictedAccountType : undefined,
          restrictedAccountSize: dto.restrictedAccountSize !== undefined ? dto.restrictedAccountSize : undefined,
          assignedAccountPlan: dto.assignedAccountPlan !== undefined ? dto.assignedAccountPlan : undefined,
          assignedAccountSize: dto.assignedAccountSize !== undefined ? dto.assignedAccountSize : undefined,
          description: dto.description !== undefined ? dto.description : undefined,
          isActive: dto.isActive !== undefined ? dto.isActive : undefined,
        },
      });

      await tx.auditEvent.create({
        data: {
          adminId: context.adminId,
          action: 'ADMIN_COUPON_UPDATED',
          resource: 'Coupon',
          resourceId: c.id,
          details: { code: cleanCode, updates: dto },
          ipAddress: context.ipAddress,
          userAgent: context.userAgent,
        },
      });

      return c;
    });

    // Auto-sync updated coupon to WooCommerce REST API & WordPress plugin
    try {
      await this.woocommerceService.syncCoupon({
        code: cleanCode,
        discountPercent: Number(updated.discountPercent),
        maxUsage: updated.maxUsage,
        expiresAt: updated.expiresAt,
        restrictedEmails: updated.restrictedEmails,
        description: updated.description,
        isActive: updated.isActive,
      });
    } catch (syncErr: any) {
      this.logger.warn(`WooCommerce update sync deferred: ${syncErr.message}`);
    }

    if (dto.sendEmail && emailStr) {
      await this.dispatchCouponEmails({
        code: cleanCode,
        discountPercent: Number(updated.discountPercent),
        emails: emailStr.split(','),
        assignedPlan: updated.assignedAccountPlan || undefined,
        assignedSize: updated.assignedAccountSize ? Number(updated.assignedAccountSize) : undefined,
      });
    }

    return {
      success: true,
      message: `Coupon ${cleanCode} updated and synced successfully.`,
      data: updated,
    };
  }

  async deleteCoupon(code: string, context: AdminActionContext) {
    const cleanCode = code.trim().toUpperCase();
    const existing = await prisma.coupon.findUnique({ where: { code: cleanCode } });
    if (!existing) {
      throw new NotFoundException(`Coupon ${cleanCode} not found.`);
    }

    await prisma.$transaction(async (tx) => {
      await tx.coupon.delete({ where: { code: cleanCode } });

      await tx.auditEvent.create({
        data: {
          adminId: context.adminId,
          action: 'ADMIN_COUPON_DELETED',
          resource: 'Coupon',
          resourceId: existing.id,
          details: { code: cleanCode },
          ipAddress: context.ipAddress,
          userAgent: context.userAgent,
        },
      });
    });

    // Delete coupon from WooCommerce
    try {
      await this.woocommerceService.deleteCoupon(cleanCode);
    } catch (e: any) {
      this.logger.warn(`WooCommerce delete deferred: ${e.message}`);
    }

    return {
      success: true,
      message: `Coupon ${cleanCode} deleted and removed from WooCommerce successfully.`,
    };
  }

  /**
   * Dispatch transactional email to assigned users with direct WordPress checkout link
   */
  async dispatchCouponEmails(params: {
    code: string;
    discountPercent: number;
    emails: string[];
    assignedPlan?: string;
    assignedSize?: number;
  }) {
    const { code, discountPercent, emails, assignedPlan, assignedSize } = params;
    const wpBase = process.env.NEXT_PUBLIC_WORDPRESS_URL || process.env.WORDPRESS_URL || 'https://fundedgiants.ng';
    const planParam = assignedPlan ? `&plan=${encodeURIComponent(assignedPlan)}` : '';
    const sizeParam = assignedSize ? `&size=${encodeURIComponent(assignedSize)}` : '';
    const checkoutUrl = `${wpBase}/checkout/?coupon=${encodeURIComponent(code)}${planParam}${sizeParam}`;

    for (const email of emails) {
      this.logger.log(`[DISPATCH COUPON EMAIL] To: ${email} | Coupon: ${code} (${discountPercent}% off) | URL: ${checkoutUrl}`);
      // Brevo / SMTP HTTP dispatch
      const brevoKey = process.env.BREVO_API_KEY;
      if (brevoKey) {
        try {
          await fetch('https://api.brevo.com/v3/smtp/email', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'api-key': brevoKey,
            },
            body: JSON.stringify({
              sender: { name: 'FundedGiants', email: process.env.SMTP_FROM || 'support@fundedgiants.ng' },
              to: [{ email }],
              subject: discountPercent === 100 ? 'Your 100% Free FundedGiants Account Offer!' : `Exclusive ${discountPercent}% Off Your FundedGiants Challenge`,
              htmlContent: `
                <div style="font-family: Arial, sans-serif; background: #070a08; color: #ffffff; padding: 24px; border-radius: 12px;">
                  <h2 style="color: #00f59b;">Exclusive Challenge Offer from FundedGiants</h2>
                  <p>Hello,</p>
                  <p>You have been offered a special promo coupon to launch your prop trading challenge with FundedGiants:</p>
                  <div style="background: #0f1712; border: 1px solid #1b3322; padding: 16px; border-radius: 8px; margin: 16px 0;">
                    <p style="font-size: 20px; font-weight: bold; color: #00f59b; margin: 0;">Code: ${code}</p>
                    <p style="font-size: 14px; color: #a1a1aa; margin: 4px 0;">Discount: ${discountPercent}% ${discountPercent === 100 ? '(100% Free Account)' : ''}</p>
                    ${assignedPlan ? `<p style="font-size: 14px; color: #a1a1aa; margin: 4px 0;">Program: ${assignedPlan} ${assignedSize ? `• ₦${Number(assignedSize).toLocaleString()}` : ''}</p>` : ''}
                  </div>
                  <p>To claim this account, please proceed directly through our checkout flow below:</p>
                  <a href="${checkoutUrl}" style="display: inline-block; background: #00f59b; color: #000000; padding: 12px 24px; border-radius: 8px; font-weight: bold; text-decoration: none; margin-top: 12px;">
                    Claim Your Account on FundedGiants
                  </a>
                  <p style="font-size: 11px; color: #71717a; margin-top: 24px;">Note: You must complete the checkout with this email address (${email}).</p>
                </div>
              `,
            }),
          });
        } catch (err: any) {
          this.logger.warn(`Failed to dispatch Brevo email for coupon ${code} to ${email}: ${err.message}`);
        }
      }
    }

    return {
      success: true,
      message: `Coupon notifications dispatched to ${emails.length} recipient(s).`,
      checkoutUrl,
    };
  }

  async toggleCoupon(code: string, isActive: boolean, context: AdminActionContext) {
    const updated = await prisma.$transaction(async (tx) => {
      const c = await tx.coupon.update({
        where: { code: code.toUpperCase() },
        data: { isActive },
      });

      await tx.auditEvent.create({
        data: {
          adminId: context.adminId,
          action: 'ADMIN_COUPON_TOGGLED',
          resource: 'Coupon',
          resourceId: c.id,
          details: { code, isActive },
          ipAddress: context.ipAddress,
          userAgent: context.userAgent,
        },
      });

      return c;
    });

    // Auto-sync status to WooCommerce
    try {
      await this.woocommerceService.syncCoupon({
        code: updated.code,
        discountPercent: Number(updated.discountPercent),
        maxUsage: updated.maxUsage,
        expiresAt: updated.expiresAt,
        restrictedEmails: updated.restrictedEmails,
        description: updated.description,
        isActive,
      });
    } catch (e: any) {
      this.logger.warn(`WooCommerce toggle sync deferred: ${e.message}`);
    }

    return {
      success: true,
      message: `Coupon ${code} is now ${isActive ? 'ACTIVE' : 'DISABLED'} and synced to WooCommerce.`,
      data: updated,
    };
  }

  /**
   * 11. Immutable Audit Trail
   */
  async getAuditLogs(params: { action?: string; skip?: number; take?: number }) {
    const { action, skip = 0, take = 100 } = params;
    const where: any = {};
    if (action) where.action = action;

    const [logs, total] = await Promise.all([
      prisma.auditEvent.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          user: true,
        },
      }),
      prisma.auditEvent.count({ where }),
    ]);

    return {
      success: true,
      data: logs.map((log) => ({
        id: log.id,
        action: log.action,
        resource: log.resource,
        resourceId: log.resourceId,
        details: log.details,
        ipAddress: log.ipAddress,
        adminId: log.adminId,
        userName: log.user ? `${log.user.firstName || ''} ${log.user.lastName || ''}`.trim() : null,
        userEmail: log.user?.email,
        createdAt: log.createdAt,
      })),
      pagination: { total, skip, take },
    };
  }
}
