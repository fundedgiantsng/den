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
   * Get user wallet balances derived from double-entry ledger & virtual account details
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

    // Ledger balance calculation: Sum of all completed deposits minus withdrawals & fees
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

    const totalDepositsNgn = Number(deposits._sum.amount || 0);
    const totalWithdrawalsNgn = Number(withdrawals._sum.amount || 0);
    const availableBalanceNgn = Math.max(0, totalDepositsNgn - totalWithdrawalsNgn);

    return {
      walletId: user.wallet?.id,
      currency: 'NGN',
      availableBalanceNgn,
      totalDepositsNgn,
      totalWithdrawalsNgn,
      lencoVirtualAccount: user.wallet?.lencoAccountNumber
        ? {
            bankName: user.wallet.lencoVirtualBankName,
            accountName: user.wallet.lencoAccountName,
            accountNumber: user.wallet.lencoAccountNumber,
            reference: user.wallet.lencoAccountReference,
          }
        : null,
      boundBankAccounts: user.bankAccounts.map((acc: any) => ({
        id: acc.id,
        bankName: acc.bankName,
        accountNumber: acc.accountNumber,
        accountName: acc.accountName,
        isVerified: acc.isVerified,
      })),
    };
  }

  /**
   * Bind a bank account for withdrawals (Max 3 accounts, name MUST match Ninja KYC)
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
      throw new BadRequestException('You must complete Ninja KYC verification before binding a withdrawal account.');
    }

    if (user.bankAccounts.length >= 3) {
      throw new BadRequestException('You can bind a maximum of 3 withdrawal bank accounts.');
    }

    // 1. Resolve account details via Lenco API
    const resolveResult = await this.lencoService.resolveAccount(params.accountNumber, params.bankCode);

    if (!resolveResult.status || !resolveResult.data) {
      throw new BadRequestException(resolveResult.message || 'Could not verify bank account with Lenco');
    }

    const resolvedName = resolveResult.data.accountName.toUpperCase().trim();
    const kycName = `${user.firstName || ''} ${user.lastName || ''}`.toUpperCase().trim();

    // 2. Strict name matching rule: Name on account MUST match Ninja KYC
    const kycParts = kycName.split(' ');
    const isMatching = kycParts.every((part) => resolvedName.includes(part));

    if (!isMatching) {
      throw new BadRequestException(
        `Account name '${resolvedName}' does not match your verified KYC name '${kycName}'.`
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
