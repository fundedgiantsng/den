'use client';

import React from 'react';
import Link from 'next/link';
import {
  Wallet,
  ArrowUpRight,
  Plus,
  CreditCard,
  Building2,
  History,
  ShieldCheck,
  ChevronRight,
  TrendingUp,
} from 'lucide-react';
import { formatNaira } from '@/lib/format';

export default function GiantsVaultOverviewPage() {
  const vault = {
    availableBalanceNgn: 18450000.0,
    withdrawableProfitsNgn: 2480000.0,
    totalDepositsNgn: 25000000.0,
    totalWithdrawalsNgn: 6550000.0,
  };

  return (
    <div className="space-y-8 max-w-6xl pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              Primary Central Balance
            </span>
            <span className="text-xs text-fgText-muted">Lenco Auto-Reconciled</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-heading font-extrabold text-white tracking-tight">
            Giants Vault
          </h1>
          <p className="text-xs text-fgText-secondary mt-1">
            Your centralized Nigerian Naira balance. Holds deposited capital, receives all trading profit payouts, and powers challenge purchases and card spending.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/wallet/fund"
            className="py-2.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-bg-base font-bold text-xs flex items-center gap-2 shadow-emeraldGlow transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Deposit NGN</span>
          </Link>
          <Link
            href="/dashboard/wallet/withdraw"
            className="py-2.5 px-4 rounded-xl bg-bg-card border border-fgBorder-subtle hover:border-emerald-500 text-white font-semibold text-xs flex items-center gap-2 transition-all"
          >
            <ArrowUpRight className="w-4 h-4 text-emerald-400" />
            <span>Withdraw Profits</span>
          </Link>
        </div>
      </div>

      {/* Balance Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 rounded-2xl bg-bg-card border border-fgBorder-emerald shadow-cardGlow">
          <div className="flex items-center justify-between mb-3 text-xs text-fgText-muted">
            <span className="uppercase tracking-wider font-semibold">Total Available Balance</span>
            <Wallet className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-3xl font-heading font-extrabold text-white">
            {formatNaira(vault.availableBalanceNgn)}
          </div>
          <p className="text-[11px] text-fgText-secondary mt-2">
            Spendable for account purchases, physical card transactions, and disbursements.
          </p>
        </div>

        <div className="p-6 rounded-2xl bg-bg-card border border-fgBorder-subtle shadow-cardGlow">
          <div className="flex items-center justify-between mb-3 text-xs text-fgText-muted">
            <span className="uppercase tracking-wider font-semibold">Withdrawable Trading Profits</span>
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-3xl font-heading font-extrabold text-emerald-400">
            {formatNaira(vault.withdrawableProfitsNgn)}
          </div>
          <p className="text-[11px] text-fgText-secondary mt-2">
            Eligible payouts from Rhino Rush and Phoenix Rise accounts.
          </p>
        </div>

        <div className="p-6 rounded-2xl bg-bg-card border border-fgBorder-subtle shadow-cardGlow">
          <div className="flex items-center justify-between mb-3 text-xs text-fgText-muted">
            <span className="uppercase tracking-wider font-semibold">Connected Banking</span>
            <Building2 className="w-4 h-4 text-gold-400" />
          </div>
          <div className="text-lg font-heading font-bold text-white">
            Moniepoint Bank
          </div>
          <p className="text-[11px] text-fgText-secondary mt-2 font-mono">
            Acct: 7041289410 • FGT/JOHN DOE
          </p>
        </div>
      </div>

      {/* Vault Sub-Features Navigation */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Physical Cards Subset Feature */}
        <div className="p-6 rounded-2xl bg-gradient-to-br from-bg-card to-bg-surface border border-fgBorder-subtle hover:border-fgBorder-emerald transition-all space-y-4">
          <div className="flex items-center justify-between">
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400">
              <CreditCard className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/20">
              Verve & Mastercard
            </span>
          </div>
          <div>
            <h3 className="text-base font-heading font-bold text-white mb-1">
              Giants Spend Card
            </h3>
            <p className="text-xs text-fgText-secondary leading-relaxed">
              Order your custom laser-etched black stainless-steel card. Debits directly from your Giants Vault for online purchases, POS payments, and ATM cash withdrawals nationwide.
            </p>
          </div>
          <Link
            href="/dashboard/wallet/cards"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-400 hover:text-emerald-300"
          >
            <span>Manage & Order Card (₦100,000)</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Bound Withdrawal Bank Accounts */}
        <div className="p-6 rounded-2xl bg-gradient-to-br from-bg-card to-bg-surface border border-fgBorder-subtle hover:border-fgBorder-emerald transition-all space-y-4">
          <div className="flex items-center justify-between">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400">
              <Building2 className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              Strict KYC Name Match
            </span>
          </div>
          <div>
            <h3 className="text-base font-heading font-bold text-white mb-1">
              Bound Bank Accounts
            </h3>
            <p className="text-xs text-fgText-secondary leading-relaxed">
              Bind up to 3 verified bank accounts matching your Ninja KYC approved name. Automated disbursement via Lenco ensures swift settlement within seconds.
            </p>
          </div>
          <Link
            href="/dashboard/wallet/withdraw"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-400 hover:text-emerald-300"
          >
            <span>View Bound Accounts & Withdraw</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}
