import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { prisma } from '@fundedgiants/database';
import { NombaService } from '../integrations/nomba/nomba.service';
import { LencoService } from '../integrations/lenco/lenco.service';

@Injectable()
export class WalletService {
  private readonly logger = new Logger(WalletService.name);

  constructor(
    private readonly nombaService: NombaService,
    private readonly lencoService: LencoService,
  ) {}

  /**
   * Get user wallet balances derived from double-entry ledger & dedicated virtual account details
   */
  async getWalletOverview(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        wallet: true,
        bankAccounts: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Ensure customer wallet always exists and is scoped strictly to this user
    let userWallet = user.wallet;
    if (!userWallet) {
      userWallet = await prisma.customerWallet.upsert({
        where: { userId: user.id },
        update: {},
        create: {
          userId: user.id,
          currency: 'NGN',
        },
      });
    }

    // Ledger balance calculation: Sum of all completed deposits minus withdrawals & internal purchases
    const deposits = await prisma.deposit.aggregate({
      where: { walletId: userWallet.id, status: 'SUCCESSFUL' },
      _sum: { amount: true },
    });

    const withdrawals = await prisma.withdrawal.aggregate({
      where: {
        walletId: userWallet.id,
        status: { in: ['REQUESTED', 'PENDING_REVIEW', 'APPROVED', 'PROCESSING', 'PAID'] },
      },
      _sum: { amount: true },
    });

    const previousWalletOrders = await prisma.internalOrder.aggregate({
      where: {
        userId: user.id,
        paymentMethod: 'WALLET',
        paymentStatus: 'SUCCESSFUL',
      },
      _sum: { amount: true },
    });

    const totalDepositsNgn = Number(deposits._sum.amount || 0);
    const totalWithdrawalsNgn = Number(withdrawals._sum.amount || 0);
    const totalSpentNgn = Number(previousWalletOrders._sum.amount || 0);
    const availableBalanceNgn = Math.max(0, totalDepositsNgn - totalWithdrawalsNgn - totalSpentNgn);

    // Auto-provision dedicated Nomba Virtual Account if not present yet
    if (!userWallet?.nombaAccountNumber && !userWallet?.lencoAccountNumber) {
      try {
        const nombaService = new (require('../integrations/nomba/nomba.service').NombaService)();
        const nombaRes = await nombaService.createVirtualAccount({
          userId: user.id,
          firstName: user.firstName || 'Trader',
          lastName: user.lastName || 'Account',
        });
        if (nombaRes.status && nombaRes.data) {
          userWallet = await prisma.customerWallet.upsert({
            where: { userId: user.id },
            update: {
              nombaVirtualBankName: nombaRes.data.bankName,
              nombaAccountName: nombaRes.data.bankAccountName,
              nombaAccountNumber: nombaRes.data.bankAccountNumber,
              nombaAccountReference: nombaRes.data.accountRef,
            },
            create: {
              userId: user.id,
              nombaVirtualBankName: nombaRes.data.bankName,
              nombaAccountName: nombaRes.data.bankAccountName,
              nombaAccountNumber: nombaRes.data.bankAccountNumber,
              nombaAccountReference: nombaRes.data.accountRef,
            },
          });
        }
      } catch (err: any) {
        this.logger.warn(`Could not on-demand provision Nomba virtual account for ${user.id}: ${err.message}`);
      }
    }

    // Dedicated Nomba Virtual Bank Account
    const customerFullName = `${user.firstName || 'Trader'} ${user.lastName || ''}`.trim();
    const dedicatedVirtualAccount = {
      bankName: userWallet?.nombaVirtualBankName || userWallet?.lencoVirtualBankName || 'Nomba Bank MFB',
      accountName: userWallet?.nombaAccountName || userWallet?.lencoAccountName || `Fundedgiants/${customerFullName}`,
      accountNumber: userWallet?.nombaAccountNumber || userWallet?.lencoAccountNumber || '',
      currency: 'NGN (₦)',
    };

    return {
      walletId: userWallet.id,
      currency: 'NGN',
      availableBalanceNgn,
      withdrawableProfitsNgn: availableBalanceNgn,
      totalDepositsNgn,
      totalWithdrawalsNgn: totalWithdrawalsNgn + totalSpentNgn,
      dedicatedAccount: dedicatedVirtualAccount,
      boundBankAccounts: user.bankAccounts.map((acc: any) => ({
        id: acc.id,
        bankName: acc.bankName,
        accountNumber: acc.accountNumber,
        accountName: acc.accountName,
        isVerified: acc.isVerified,
        isPrimary: true,
      })),
    };
  }

  /**
   * Get all live transactions for the user from database
   */
  async getTransactions(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { wallet: true },
    });

    if (!user) return [];

    let userWallet = user.wallet;
    if (!userWallet) {
      userWallet = await prisma.customerWallet.upsert({
        where: { userId: user.id },
        update: {},
        create: {
          userId: user.id,
          currency: 'NGN',
        },
      });
    }

    const [deposits, withdrawals, orders] = await Promise.all([
      prisma.deposit.findMany({
        where: { walletId: userWallet.id },
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),
      prisma.withdrawal.findMany({
        where: { walletId: userWallet.id },
        include: { bankAccount: true },
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),
      prisma.internalOrder.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),
    ]);

    const txList: any[] = [];

    deposits.forEach((d: any) => {
      txList.push({
        id: d.id,
        type: 'BANK_DEPOSIT',
        title: 'Direct Bank Transfer Deposit',
        ref: d.paymentReference || 'Direct Bank Deposit',
        date: d.createdAt,
        amountNgn: Number(d.amount),
        isCredit: true,
        status: d.status,
      });
    });

    withdrawals.forEach((w: any) => {
      txList.push({
        id: w.id,
        type: 'INTERBANK_WITHDRAWAL',
        title: 'Disbursement to Bank Account',
        ref: w.bankAccount ? `${w.bankAccount.bankName} •••• ${w.bankAccount.accountNumber.slice(-4)}` : w.reference,
        date: w.createdAt,
        amountNgn: Number(w.amount),
        isCredit: false,
        status: w.status,
      });
    });

    orders.forEach((o: any) => {
      txList.push({
        id: o.id,
        type: 'CHALLENGE_PURCHASE',
        title: 'Challenge Activation Order',
        ref: o.orderNumber,
        date: o.createdAt,
        amountNgn: Number(o.amount),
        isCredit: false,
        status: o.paymentStatus,
      });
    });

    // Sort combined by date desc
    txList.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return txList;
  }

  /**
   * Helper to verify if the resolved bank account name matches the user's verified legal KYC name.
   * Tolerates middle name omission, name order inversions (e.g. LastName FirstName vs FirstName LastName),
   * and character truncations common in Nigerian core banking switches (e.g. GTBank 15-char limits).
   */
  public verifyNameMatch(kycName: string, resolvedName: string): boolean {
    const cleanKyc = kycName.toUpperCase().replace(/[^A-Z\s]/g, ' ').trim();
    const cleanResolved = resolvedName.toUpperCase().replace(/[^A-Z\s]/g, ' ').trim();

    if (!cleanKyc || !cleanResolved) return false;
    if (cleanKyc === cleanResolved) return true;

    const kycTokens = cleanKyc.split(/\s+/).filter(t => t.length >= 2);
    const resolvedTokens = cleanResolved.split(/\s+/).filter(t => t.length >= 2);

    if (kycTokens.length === 0 || resolvedTokens.length === 0) return false;

    // Check how many KYC tokens appear in the resolved bank account name (or match by prefix for truncation)
    let matchedTokens = 0;
    for (const kt of kycTokens) {
      const match = resolvedTokens.some(rt => {
        if (kt === rt) return true;
        // Truncation check (e.g. FAVOURABL vs FAVOURABLE, minimum 4 chars)
        if (kt.length >= 4 && rt.length >= 4 && (kt.startsWith(rt) || rt.startsWith(kt))) {
          return true;
        }
        return false;
      });
      if (match) matchedTokens++;
    }

    // If at least 2 significant tokens match, or 100% of KYC tokens match, it's valid
    if (matchedTokens >= 2) return true;
    if (kycTokens.length === 1 && matchedTokens === 1) return true;

    return false;
  }

  /**
   * Automatically resolve Nigerian bank account name via Nomba & verify KYC name match
   */
  async resolveBankAccount(params: {
    userId: string;
    accountNumber: string;
    bankCode: string;
  }) {
    if (!params.accountNumber || params.accountNumber.length !== 10) {
      throw new BadRequestException('Account number must be exactly 10 digits.');
    }
    if (!params.bankCode) {
      throw new BadRequestException('Please select a valid bank.');
    }

    const user = await prisma.user.findUnique({
      where: { id: params.userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // 1. Resolve account details via Nomba Bank Lookup API
    let resolveResult: { status: boolean; message?: string; data?: { accountName: string; accountNumber: string; bankCode: string } } = { status: false };
    try {
      resolveResult = await this.nombaService.resolveAccount(params.accountNumber, params.bankCode);
    } catch (err: any) {
      this.logger.warn(`Nomba resolution attempt failed: ${err.message}`);
    }

    if (!resolveResult.status || !resolveResult.data) {
      try {
        const lencoRes = await this.lencoService.resolveAccount(params.accountNumber, params.bankCode);
        if (lencoRes && lencoRes.status && lencoRes.data) {
          resolveResult = lencoRes;
        }
      } catch (err: any) {
        this.logger.warn(`Lenco fallback resolution failed: ${err.message}`);
      }
    }

    if (!resolveResult.status || !resolveResult.data) {
      const errMsg = resolveResult.message || '';
      if (errMsg.toLowerCase().includes('authentication') || errMsg.toLowerCase().includes('403') || errMsg.toLowerCase().includes('credential')) {
        this.logger.error(`Banking gateway auth error during account lookup: ${errMsg}`);
        throw new BadRequestException('Banking network verification service is currently synchronizing. Please check the account number and bank, or try again shortly.');
      }
      throw new BadRequestException(resolveResult.message || 'Could not verify bank account with banking network. Please check the account number and bank selected.');
    }

    const resolvedName = (resolveResult.data.accountName || '').toUpperCase().trim();
    const kycName = `${user.firstName || ''} ${user.lastName || ''}`.toUpperCase().trim();

    // 2. Strict name matching rule: Name on account MUST match KYC
    const isMatching = this.verifyNameMatch(kycName, resolvedName);

    return {
      status: true,
      accountName: resolvedName,
      accountNumber: params.accountNumber,
      bankCode: params.bankCode,
      kycName,
      isKycApproved: user.kycStatus === 'APPROVED',
      isNameMatch: isMatching,
      matchWarning: isMatching
        ? undefined
        : `Account name '${resolvedName}' does not match your verified legal name '${kycName}'. Under regulatory AML guidelines, withdrawals can only be bound to an account registered in your own name.`,
    };
  }

  /**
   * Bind a bank account for withdrawals (Max 3 accounts, name MUST match KYC)
   */
  async bindBankAccount(params: {
    userId: string;
    bankCode: string;
    bankName: string;
    accountNumber: string;
  }) {
    const user = await prisma.user.findUnique({
      where: { id: params.userId },
      include: { bankAccounts: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.kycStatus !== 'APPROVED') {
      throw new BadRequestException('You must complete KYC verification before binding a withdrawal account.');
    }

    if (user.bankAccounts.length >= 3) {
      throw new BadRequestException('You can bind a maximum of 3 withdrawal bank accounts.');
    }

    const existingAccount = await prisma.customerBankAccount.findFirst({
      where: {
        userId: user.id,
        accountNumber: params.accountNumber,
        bankCode: params.bankCode,
      },
    });

    if (existingAccount) {
      throw new BadRequestException('This bank account is already bound to your profile.');
    }

    // 1. Resolve account details via Nomba Bank Lookup API
    let resolveResult: { status: boolean; message?: string; data?: { accountName: string; accountNumber: string; bankCode: string } } = { status: false };
    try {
      resolveResult = await this.nombaService.resolveAccount(params.accountNumber, params.bankCode);
    } catch (err: any) {
      this.logger.warn(`Nomba resolution attempt failed: ${err.message}`);
    }

    if (!resolveResult.status || !resolveResult.data) {
      // Fallback to secondary resolution if Nomba could not resolve
      try {
        const lencoRes = await this.lencoService.resolveAccount(params.accountNumber, params.bankCode);
        if (lencoRes && lencoRes.status && lencoRes.data) {
          resolveResult = lencoRes;
        }
      } catch (err: any) {
        this.logger.warn(`Lenco resolution attempt failed: ${err.message}`);
      }
    }

    if (!resolveResult.status || !resolveResult.data) {
      const errMsg = resolveResult.message || '';
      if (errMsg.toLowerCase().includes('authentication') || errMsg.toLowerCase().includes('403') || errMsg.toLowerCase().includes('credential')) {
        this.logger.error(`Banking gateway auth error during account binding: ${errMsg}`);
        throw new BadRequestException('Banking network verification service is currently synchronizing. Please check the account number and bank, or try again shortly.');
      }
      throw new BadRequestException(resolveResult.message || 'Could not verify bank account with banking network. Please check the account number and bank selected.');
    }

    const resolvedName = (resolveResult.data.accountName || '').toUpperCase().trim();
    const kycName = `${user.firstName || ''} ${user.lastName || ''}`.toUpperCase().trim();

    // 2. Strict name matching rule: Name on account MUST match KYC
    const isMatching = this.verifyNameMatch(kycName, resolvedName);

    if (!isMatching) {
      throw new BadRequestException(
        `Account name '${resolvedName}' does not match your verified legal name '${kycName}'. Under regulatory AML guidelines, withdrawals can only be sent to an account registered in your own name.`
      );
    }

    // 3. Bind account
    const bound = await prisma.customerBankAccount.create({
      data: {
        userId: user.id,
        bankName: params.bankName,
        bankCode: params.bankCode,
        accountNumber: params.accountNumber,
        accountName: resolvedName,
        isVerified: true,
      },
    });

    return {
      success: true,
      account: bound,
    };
  }

  /**
   * Request withdrawal to bound bank account
   */
  async requestWithdrawal(params: {
    userId: string;
    bankAccountId: string;
    amountNgn: number;
  }) {
    if (!Number.isFinite(params.amountNgn) || params.amountNgn < 5000 || params.amountNgn > 50000000) {
      throw new BadRequestException('Withdrawal amount must be a valid amount between ₦5,000 and ₦50,000,000');
    }

    return prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { id: params.userId },
        include: { wallet: true },
      });

      if (!user || !user.wallet) {
        throw new NotFoundException('User wallet not found');
      }

      if (user.kycStatus !== 'APPROVED') {
        throw new BadRequestException('Identity verification (KYC) is required before requesting withdrawals. Please complete KYC in your profile.');
      }

      const deposits = await tx.deposit.aggregate({
        where: { walletId: user.wallet.id, status: 'SUCCESSFUL' },
        _sum: { amount: true },
      });

      const withdrawals = await tx.withdrawal.aggregate({
        where: {
          walletId: user.wallet.id,
          status: { in: ['REQUESTED', 'PENDING_REVIEW', 'APPROVED', 'PROCESSING', 'PAID'] },
        },
        _sum: { amount: true },
      });

      const walletOrders = await tx.internalOrder.aggregate({
        where: {
          userId: user.id,
          paymentMethod: 'WALLET',
          paymentStatus: 'SUCCESSFUL',
        },
        _sum: { amount: true },
      });

      const totalDeposits = Number(deposits._sum.amount || 0);
      const totalWithdrawals = Number(withdrawals._sum.amount || 0);
      const totalSpent = Number(walletOrders._sum.amount || 0);
      const availableBalance = Math.max(0, totalDeposits - totalWithdrawals - totalSpent);

      if (availableBalance < params.amountNgn) {
        throw new BadRequestException(
          `Insufficient available balance. Available: ₦${availableBalance.toLocaleString()}, Requested: ₦${params.amountNgn.toLocaleString()}`
        );
      }

      const bankAccount = await tx.customerBankAccount.findFirst({
        where: { id: params.bankAccountId, userId: params.userId },
      });

      if (!bankAccount) {
        throw new BadRequestException('Selected bank account is not bound to this user');
      }

      // Enforce strict name matching: Name on destination withdrawal account MUST match verified profile name
      const profileName = `${user.firstName || ''} ${user.lastName || ''}`.toUpperCase().trim();
      const isNameMatching = this.verifyNameMatch(profileName, bankAccount.accountName);

      if (!isNameMatching) {
        throw new BadRequestException(
          `Withdrawal rejected: Destination account name '${bankAccount.accountName}' does not match your verified legal name '${profileName}'. Third-party withdrawals are strictly prohibited under AML regulations.`
        );
      }

      const reference = `FG-WTH-${Date.now()}`;

      // Create withdrawal record in REQUESTED status awaiting manual admin approval
      const withdrawal = await tx.withdrawal.create({
        data: {
          walletId: user.wallet.id,
          bankAccountId: bankAccount.id,
          reference,
          amount: params.amountNgn,
          fee: 0,
          netAmount: params.amountNgn,
          currency: 'NGN',
          status: 'REQUESTED',
        },
      });

      this.logger.log(
        `Withdrawal ${reference} for ₦${params.amountNgn.toLocaleString()} submitted by user ${params.userId} — queued for manual admin approval.`
      );

      return {
        success: true,
        withdrawalId: withdrawal.id,
        reference,
        status: 'PENDING_APPROVAL',
        message:
          'Withdrawal request submitted successfully. It is now awaiting compliance review and admin approval before disbursement.',
      };
    });
  }

  /**
   * Return verified list of Nigerian Commercial Banks & Fintechs (CBN Licensed)
   * Dynamically synced with Nomba API (630+ banks/MFBs/fintechs) with popular institutions pinned at top
   */
  async getNigerianBanks() {
    const TOP_PINNED_BANKS = [
      { code: '044', name: 'Access Bank' },
      { code: '058', name: 'Guaranty Trust Bank (GTBank)' },
      { code: '057', name: 'Zenith Bank' },
      { code: '033', name: 'United Bank for Africa (UBA)' },
      { code: '011', name: 'First Bank of Nigeria' },
      { code: '305', name: 'Paycom (OPay)' },
      { code: '090405', name: 'Moniepoint Bank' },
      { code: '100033', name: 'PalmPay' },
      { code: '090267', name: 'Kuda Microfinance Bank' },
      { code: '090645', name: 'Nombank (Nomba MFB)' },
      { code: '221', name: 'Stanbic IBTC Bank' },
      { code: '214', name: 'First City Monument Bank (FCMB)' },
      { code: '070', name: 'Fidelity Bank' },
      { code: '035', name: 'Wema Bank' },
      { code: '232', name: 'Sterling Bank' },
      { code: '032', name: 'Union Bank of Nigeria' },
      { code: '101', name: 'Providus Bank' },
      { code: '076', name: 'Polaris Bank' },
      { code: '082', name: 'Keystone Bank' },
      { code: '301', name: 'Jaiz Bank' },
      { code: '566', name: 'VFD Microfinance Bank' },
      { code: '100', name: 'Suntrust Bank' },
      { code: '023', name: 'Citibank Nigeria' },
      { code: '050', name: 'Ecobank Nigeria' },
      { code: '215', name: 'Unity Bank' },
    ];

    try {
      const dynamicBanks = await this.nombaService.getBanks();
      if (dynamicBanks && dynamicBanks.length > 0) {
        // Collect existing pinned bank codes
        const pinnedCodes = new Set(TOP_PINNED_BANKS.map((b) => b.code));

        // Map dynamic banks, excluding any already in pinned list
        const remainingBanks = dynamicBanks
          .filter((b) => !pinnedCodes.has(b.code))
          .map((b) => ({
            code: b.code,
            name: b.name.trim(),
          }))
          .sort((a, b) => a.name.localeCompare(b.name));

        return [...TOP_PINNED_BANKS, ...remainingBanks];
      }
    } catch (err: any) {
      this.logger.warn(`Failed to fetch dynamic banks from Nomba, using default list: ${err.message}`);
    }

    return TOP_PINNED_BANKS;
  }
}
