/**
 * FundedGiants Core Domain Types
 * STRICTLY NIGERIAN NAIRA (NGN / ₦)
 */

export type Currency = 'NGN';
export const PLATFORM_CURRENCY: Currency = 'NGN';
export const CURRENCY_SYMBOL = '₦';

export type UserRole =
  | 'CUSTOMER'
  | 'SUPPORT'
  | 'RISK_ANALYST'
  | 'FINANCE_OPERATOR'
  | 'FINANCE_APPROVER'
  | 'COMPLIANCE_OPERATOR'
  | 'AFFILIATE_MANAGER'
  | 'CARD_OPERATIONS'
  | 'ADMIN'
  | 'SUPER_ADMIN';

export interface UserProfile {
  id: string;
  email?: string;
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
  balanceNgn: number;
  equityNgn: number;
  initialBalanceNgn: number;
  totalProfitNgn: number;
  dailyDrawdownCurrentNgn: number;
  dailyDrawdownLimitNgn: number;
  maxDrawdownCurrentNgn: number;
  maxDrawdownLimitNgn: number;
  platform: 'SteraTrader';
  createdAt: string;
}

export interface WalletBalance {
  totalBalanceNgn: number;
  availableBalanceNgn: number;
  pendingBalanceNgn: number;
  totalDepositsNgn: number;
  totalWithdrawalsNgn: number;
  totalTransactionsCount: number;
}

export type TransactionType =
  | 'DEPOSIT_NOMBA_VIRTUAL'
  | 'DEPOSIT_LENCO_VIRTUAL'
  | 'CHALLENGE_PURCHASE'
  | 'TRADING_PAYOUT'
  | 'WITHDRAWAL_NGN'
  | 'AFFILIATE_COMMISSION'
  | 'CARD_ISSUANCE_FEE'
  | 'CARD_CUSTOMIZATION_FEE'
  | 'CARD_MAINTENANCE_FEE'
  | 'CARD_SPEND';

export type TransactionStatus = 'PENDING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';

export interface WalletTransaction {
  id: string;
  reference: string;
  type: TransactionType;
  amountNgn: number;
  currency: 'NGN';
  status: TransactionStatus;
  date: string;
  notes?: string;
}
