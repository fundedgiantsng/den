/**
 * FundedGiants Core Domain Types
 */

export type Currency = 'USD' | 'NGN' | 'USDT';

export type UserRole =
  | 'CUSTOMER'
  | 'SUPPORT'
  | 'RISK_ANALYST'
  | 'FINANCE_OPERATOR'
  | 'COMPLIANCE_OPERATOR'
  | 'ADMIN'
  | 'SUPER_ADMIN';

export interface UserProfile {
  id: string;
  email: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  isVerified: boolean;
  role: UserRole;
  createdAt: string;
}

export type ChallengePlanType = 'rhino-rush' | 'phoenix-rise';

export interface ChallengePlanMeta {
  type: ChallengePlanType;
  title: string;
  subtitle: string;
  dailyDrawdownPercent: number;
  maxDrawdownPercent: number;
  profitTargetPercent: number;
  profitSplit: string;
  leverage: string;
}

export interface TradingAccount {
  id: string;
  accountNumber: string;
  customerId: string;
  type: 'FUNDED' | 'CHALLENGE';
  planType: ChallengePlanType;
  status: 'ACTIVE' | 'PASSED' | 'FAILED' | 'SUSPENDED';
  balance: number;
  equity: number;
  initialBalance: number;
  totalProfit: number;
  dailyDrawdownCurrent: number;
  dailyDrawdownLimit: number;
  maxDrawdownCurrent: number;
  maxDrawdownLimit: number;
  platform: 'SteraTrader';
  createdAt: string;
}

export interface WalletBalance {
  totalBalanceUsd: number;
  availableBalanceUsd: number;
  pendingBalanceUsd: number;
  totalDepositsUsd: number;
  totalWithdrawalsUsd: number;
  totalTransactionsCount: number;
  exchangeRateUsdToNgn: number;
}

export type TransactionType =
  | 'DEPOSIT_BANK_NGN'
  | 'DEPOSIT_CRYPTO_USDT'
  | 'TRADING_PAYOUT'
  | 'WITHDRAWAL_NGN'
  | 'WITHDRAWAL_USDT'
  | 'COMMISSION'
  | 'CHALLENGE_PURCHASE';

export type TransactionStatus = 'PENDING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';

export interface WalletTransaction {
  id: string;
  reference: string;
  type: TransactionType;
  amount: number;
  currency: Currency;
  status: TransactionStatus;
  date: string;
  notes?: string;
}
