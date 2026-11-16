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

    // Ledger balance calculation: Sum of all completed deposits minus withdrawals & internal purchases
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

    // Dedicated Nomba Virtual Bank Account
    const customerFullName = `${user.firstName || 'Trader'} ${user.lastName || ''}`.trim();
    const dedicatedVirtualAccount = {
      bankName: user.wallet?.nombaVirtualBankName || user.wallet?.lencoVirtualBankName || 'Nomba Bank MFB',
      accountName: user.wallet?.nombaAccountName || user.wallet?.lencoAccountName || `Fundedgiants/${customerFullName}`,
      accountNumber: user.wallet?.nombaAccountNumber || user.wallet?.lencoAccountNumber || '7041289410',
      currency: 'NGN (₦)',
    };

    return {
      walletId: user.wallet?.id,
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

    const [deposits, withdrawals, orders] = await Promise.all([
      prisma.deposit.findMany({
        where: { walletId: user.wallet?.id },
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),
      prisma.withdrawal.findMany({
        where: { walletId: user.wallet?.id },
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

    // 1. Resolve account details via Nomba Bank Lookup API
    let resolveResult = await this.nombaService.resolveAccount(params.accountNumber, params.bankCode);
    if (!resolveResult.status || !resolveResult.data) {
      // Fallback to secondary resolution if Nomba is not yet configured with live credentials
      resolveResult = await this.lencoService.resolveAccount(params.accountNumber, params.bankCode);
    }

    if (!resolveResult.status || !resolveResult.data) {
      throw new BadRequestException(resolveResult.message || 'Could not verify bank account with banking network');
    }

    const resolvedName = resolveResult.data.accountName.toUpperCase().trim();
    const kycName = `${user.firstName || ''} ${user.lastName || ''}`.toUpperCase().trim();

    // 2. Strict name matching rule: Name on account MUST match KYC
    const kycParts = kycName.split(' ');
    const isMatching = kycParts.every((part) => resolvedName.includes(part));

    if (!isMatching) {
      throw new BadRequestException(
        `Account name '${resolvedName}' does not match your verified name '${kycName}'.`
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
    if (params.amountNgn < 5000) {
      throw new BadRequestException('Minimum withdrawal amount is ₦5,000');
    }

    const overview = await this.getWalletOverview(params.userId);

    if (overview.availableBalanceNgn < params.amountNgn) {
      throw new BadRequestException('Insufficient available wallet balance');
    }

    const bankAccount = await prisma.customerBankAccount.findFirst({
      where: { id: params.bankAccountId, userId: params.userId },
    });

    if (!bankAccount) {
      throw new BadRequestException('Selected bank account is not bound to this user');
    }

    const reference = `FG-WTH-${Date.now()}`;

    // Create withdrawal record in REQUESTED status awaiting manual admin approval
    const withdrawal = await prisma.withdrawal.create({
      data: {
        walletId: overview.walletId!,
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
      message: 'Withdrawal request submitted successfully. It is now awaiting compliance review and admin approval before disbursement.',
    };
  }

  /**
   * Return verified list of Nigerian Commercial Banks & Fintechs (CBN Licensed)
   */
  getNigerianBanks() {
    return [
      { code: '044', name: 'Access Bank' },
      { code: '023', name: 'Citibank Nigeria' },
      { code: '050', name: 'Ecobank Nigeria' },
      { code: '070', name: 'Fidelity Bank' },
      { code: '011', name: 'First Bank of Nigeria' },
      { code: '214', name: 'First City Monument Bank (FCMB)' },
      { code: '058', name: 'Guaranty Trust Bank (GTBank)' },
      { code: '030', name: 'Heritage Bank' },
      { code: '301', name: 'Jaiz Bank' },
      { code: '082', name: 'Keystone Bank' },
      { code: '50211', name: 'Kuda Bank' },
      { code: '50515', name: 'Moniepoint MFB' },
      { code: '999992', name: 'OPay Digital Services' },
      { code: '999991', name: 'PalmPay' },
      { code: '076', name: 'Polaris Bank' },
      { code: '101', name: 'Providus Bank' },
      { code: '221', name: 'Stanbic IBTC Bank' },
      { code: '068', name: 'Standard Chartered Bank' },
      { code: '232', name: 'Sterling Bank' },
      { code: '100', name: 'Suntrust Bank' },
      { code: '032', name: 'Union Bank of Nigeria' },
      { code: '033', name: 'United Bank for Africa (UBA)' },
      { code: '215', name: 'Unity Bank' },
      { code: '035', name: 'Wema Bank' },
      { code: '057', name: 'Zenith Bank' },
    ];
  }
}
