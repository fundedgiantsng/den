import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { prisma } from '@fundedgiants/database';
import { LencoService } from '../integrations/lenco/lenco.service';

@Injectable()
export class WalletService {
  private readonly logger = new Logger(WalletService.name);

  constructor(private readonly lencoService: LencoService) {}

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

    // Provide dedicated NGN account without exposing external provider branding
    const dedicatedVirtualAccount = user.wallet?.lencoAccountNumber
      ? {
          bankName: user.wallet.lencoVirtualBankName || 'Wema Bank',
          accountName: user.wallet.lencoAccountName || `FG / ${user.firstName || 'TRADER'} ${user.lastName || ''}`.trim(),
          accountNumber: user.wallet.lencoAccountNumber,
          currency: 'NGN (₦)',
        }
      : {
          bankName: 'Wema Bank',
          accountName: `FG / ${user.firstName || 'TRADER'} ${user.lastName || ''}`.trim(),
          accountNumber: '7041289410',
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

    // 1. Resolve account details via Lenco API
    const resolveResult = await this.lencoService.resolveAccount(params.accountNumber, params.bankCode);

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

    // Create withdrawal record
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

    // Execute transfer via Lenco
    const transferResult = await this.lencoService.createTransfer({
      amountNgn: params.amountNgn,
      accountNumber: bankAccount.accountNumber,
      bankCode: bankAccount.bankCode,
      narration: `FundedGiants Withdrawal ${reference}`,
      reference,
    });

    if (transferResult.status) {
      await prisma.withdrawal.update({
        where: { id: withdrawal.id },
        data: {
          status: 'PROCESSING',
          lencoDisbursementRef: transferResult.data?.reference,
        },
      });
    }

    return {
      success: true,
      withdrawalId: withdrawal.id,
      reference,
      status: transferResult.status ? 'PROCESSING' : 'PENDING_APPROVAL',
    };
  }
}
