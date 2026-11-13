'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Wallet,
  ArrowUpRight,
  Plus,
  CreditCard,
  Building2,
  Copy,
  CheckCircle2,
  ShieldCheck,
  ChevronRight,
  TrendingUp,
  ArrowDownLeft,
  Sparkles,
} from 'lucide-react';
import { formatNaira } from '@/lib/format';

export default function GiantsVaultPage() {
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'DEPOSIT' | 'WITHDRAW'>('OVERVIEW');
  const [copied, setCopied] = useState<string | null>(null);

  const vault = {
    availableBalanceNgn: 18450000.0,
    withdrawableProfitsNgn: 2480000.0,
    totalDepositsNgn: 25000000.0,
    totalWithdrawalsNgn: 6550000.0,
  };

  const dedicatedAccount = {
    bankName: 'Moniepoint MFB',
    accountName: 'FGT/JOHN DOE',
    accountNumber: '7041289410',
    currency: 'NGN (₦)',
  };

  const boundBankAccounts = [
    {
      id: 'ba-1',
      bankName: 'Access Bank PLC',
      accountNumber: '0091823741',
      accountName: 'JOHN DOE',
      isPrimary: true,
    },
    {
      id: 'ba-2',
      bankName: 'Zenith Bank PLC',
      accountNumber: '2104928172',
      accountName: 'JOHN DOE',
      isPrimary: false,
    },
  ];

  const recentTransactions = [
    {
      id: 'tx-1',
      type: 'PROFIT_PAYOUT',
      title: 'Trading Profit Payout Credited',
      ref: '#FG-51732 (Phoenix Rise)',
      date: 'Today, 2:45 PM',
      amountNgn: 1240000,
      isCredit: true,
    },
    {
      id: 'tx-2',
      type: 'BANK_DEPOSIT',
      title: 'Direct Bank Transfer Deposit',
      ref: 'Moniepoint •••• 9410',
      date: 'Yesterday, 11:20 AM',
      amountNgn: 2000000,
      isCredit: true,
    },
    {
      id: 'tx-3',
      type: 'CHALLENGE_PURCHASE',
      title: 'Rhino Rush ₦10M Activation',
      ref: 'Debited from Vault',
      date: 'Nov 11, 2026',
      amountNgn: 247500,
      isCredit: false,
    },
    {
      id: 'tx-4',
      type: 'INTERBANK_WITHDRAWAL',
      title: 'Disbursement to Access Bank',
      ref: 'Disbursed to •••• 3741',
      date: 'Nov 09, 2026',
      amountNgn: 1000000,
      isCredit: false,
    },
  ];

  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopied(field);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto w-full pb-12">
      {/* Vault Hero Header */}
      <div className="p-5 sm:p-6 lg:p-8 rounded-2xl sm:rounded-3xl bg-gradient-to-br from-[#0c1c14] via-bg-surface to-bg-card border border-fgBorder-emerald shadow-cardGlow relative overflow-hidden">
        {/* Ambient radial lighting */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/15 text-emerald-400 border border-emerald-500/25">
                Primary Capital Reservoir
              </span>
              <span className="text-[11px] text-fgText-muted">Instant Automated Settlement</span>
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-heading font-extrabold text-white tracking-tight">
              Giants Vault
            </h1>
            <p className="text-xs sm:text-sm text-fgText-secondary max-w-xl leading-relaxed">
              Your centralized Naira balance. Automatically receives all trading profit disbursements, funds new account evaluations, and powers your Giants Spend Card.
            </p>
          </div>

          {/* Primary Quick Actions */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setActiveTab('DEPOSIT')}
              className={`py-2.5 px-4 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-emeraldGlow ${
                activeTab === 'DEPOSIT'
                  ? 'bg-emerald-400 text-bg-base'
                  : 'bg-emerald-500 hover:bg-emerald-400 text-bg-base'
              }`}
            >
              <Plus className="w-4 h-4" />
              <span>Deposit NGN</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('WITHDRAW')}
              className={`py-2.5 px-4 rounded-xl text-xs font-semibold flex items-center gap-1.5 border transition-all ${
                activeTab === 'WITHDRAW'
                  ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                  : 'bg-bg-surface border-fgBorder-subtle hover:border-emerald-500 text-white'
              }`}
            >
              <ArrowUpRight className="w-4 h-4 text-emerald-400" />
              <span>Withdraw Profits</span>
            </button>
          </div>
        </div>

        {/* Vault Big Numbers Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-8 pt-6 border-t border-fgBorder-subtle/60">
          <div>
            <span className="text-[10px] sm:text-[11px] uppercase tracking-wider text-fgText-muted block font-semibold">
              Available Vault Balance
            </span>
            <span className="text-xl sm:text-2xl lg:text-3xl font-heading font-extrabold text-white tracking-tight mt-1 block">
              {formatNaira(vault.availableBalanceNgn)}
            </span>
            <span className="text-[10px] text-emerald-400 mt-0.5 block">100% Liquid & Ready</span>
          </div>

          <div>
            <span className="text-[10px] sm:text-[11px] uppercase tracking-wider text-fgText-muted block font-semibold">
              Withdrawable Profits
            </span>
            <span className="text-xl sm:text-2xl lg:text-3xl font-heading font-extrabold text-emerald-400 tracking-tight mt-1 block">
              +{formatNaira(vault.withdrawableProfitsNgn)}
            </span>
            <span className="text-[10px] text-fgText-muted mt-0.5 block">From Passed & Live Accounts</span>
          </div>

          <div>
            <span className="text-[10px] sm:text-[11px] uppercase tracking-wider text-fgText-muted block font-semibold">
              Lifetime Inflows
            </span>
            <span className="text-xl sm:text-2xl font-heading font-extrabold text-white tracking-tight mt-1 block">
              {formatNaira(vault.totalDepositsNgn)}
            </span>
            <span className="text-[10px] text-fgText-muted mt-0.5 block">Bank Deposits & Credits</span>
          </div>

          <div>
            <span className="text-[10px] sm:text-[11px] uppercase tracking-wider text-fgText-muted block font-semibold">
              Disbursed Outflows
            </span>
            <span className="text-xl sm:text-2xl font-heading font-extrabold text-fgText-secondary tracking-tight mt-1 block">
              {formatNaira(vault.totalWithdrawalsNgn)}
            </span>
            <span className="text-[10px] text-fgText-muted mt-0.5 block">Interbank Transfers Completed</span>
          </div>
        </div>
      </div>

      {/* Dynamic View Sections Based on Active Flow */}
      {activeTab === 'DEPOSIT' && (
        <div className="p-6 rounded-2xl bg-bg-surface border border-emerald-500/30 shadow-cardGlow space-y-4 animate-in fade-in duration-200">
          <div className="flex items-center justify-between pb-3 border-b border-fgBorder-subtle">
            <div>
              <h2 className="text-base font-heading font-bold text-white flex items-center gap-2">
                <span>Dedicated Bank Transfer Details</span>
                <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-emerald-500/20 text-emerald-400 uppercase">
                  Zero Transfer Fees
                </span>
              </h2>
              <p className="text-xs text-fgText-secondary mt-0.5">
                Transfer any amount in Naira from any Nigerian banking app or USSD code. Funds credit your Giants Vault automatically within seconds.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setActiveTab('OVERVIEW')}
              className="text-xs text-fgText-muted hover:text-white"
            >
              Close &times;
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            <div className="p-4 rounded-xl bg-bg-card border border-fgBorder-subtle">
              <span className="text-[10px] uppercase text-fgText-muted block font-semibold">Bank Name</span>
              <span className="text-sm font-bold text-white mt-1 block">{dedicatedAccount.bankName}</span>
            </div>

            <div className="p-4 rounded-xl bg-bg-card border border-fgBorder-subtle flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase text-fgText-muted block font-semibold">Account Number</span>
                <span className="text-base font-mono font-extrabold text-emerald-400 mt-1 block">
                  {dedicatedAccount.accountNumber}
                </span>
              </div>
              <button
                type="button"
                onClick={() => handleCopy(dedicatedAccount.accountNumber, 'accNumber')}
                className="p-2 rounded-lg bg-bg-surface border border-fgBorder-subtle text-fgText-secondary hover:text-white"
              >
                {copied === 'accNumber' ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>

            <div className="p-4 rounded-xl bg-bg-card border border-fgBorder-subtle">
              <span className="text-[10px] uppercase text-fgText-muted block font-semibold">Account Name</span>
              <span className="text-sm font-mono font-bold text-white mt-1 block">{dedicatedAccount.accountName}</span>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'WITHDRAW' && (
        <div className="p-6 rounded-2xl bg-bg-surface border border-emerald-500/30 shadow-cardGlow space-y-4 animate-in fade-in duration-200">
          <div className="flex items-center justify-between pb-3 border-b border-fgBorder-subtle">
            <div>
              <h2 className="text-base font-heading font-bold text-white flex items-center gap-2">
                <span>Withdraw Trading Profits</span>
                <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-amber-500/20 text-amber-300 uppercase">
                  Strict KYC Name Match
                </span>
              </h2>
              <p className="text-xs text-fgText-secondary mt-0.5">
                Disbursements are sent exclusively to bank accounts matching your verified KYC identity.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setActiveTab('OVERVIEW')}
              className="text-xs text-fgText-muted hover:text-white"
            >
              Close &times;
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
            <div className="space-y-3">
              <label className="block text-xs font-semibold text-fgText-secondary">Select Destination Account</label>
              <div className="space-y-2">
                {boundBankAccounts.map((b) => (
                  <div
                    key={b.id}
                    className="p-3.5 rounded-xl bg-bg-card border border-emerald-500/40 flex items-center justify-between"
                  >
                    <div>
                      <span className="text-xs font-bold text-white block">{b.bankName}</span>
                      <span className="text-xs font-mono text-fgText-muted">{b.accountNumber} &bull; {b.accountName}</span>
                    </div>
                    {b.isPrimary && (
                      <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-emerald-500/20 text-emerald-400">
                        Primary
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <label className="block text-xs font-semibold text-fgText-secondary">Withdrawal Amount (NGN)</label>
              <div className="relative">
                <span className="absolute left-3.5 top-3 text-sm text-fgText-muted font-bold">₦</span>
                <input
                  type="number"
                  placeholder="0.00"
                  max={vault.withdrawableProfitsNgn}
                  className="w-full pl-8 pr-4 py-2.5 bg-bg-card rounded-xl border border-fgBorder-subtle text-white text-sm focus:outline-none focus:border-emerald-500 font-mono"
                />
              </div>
              <p className="text-[10px] text-fgText-muted">
                Eligible Withdrawable Profit Balance: <span className="text-emerald-400 font-bold">{formatNaira(vault.withdrawableProfitsNgn)}</span>
              </p>
              <button
                type="button"
                className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-bg-base font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-emeraldGlow"
              >
                <span>Confirm & Disburse Funds</span>
                <ArrowUpRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modular 2-Column Grid: Left (Giants Spend Card Feature) & Right (Recent Activity Feed) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Giants Spend Card Feature Card (Subset of Vault) */}
        <div className="lg:col-span-5 p-6 rounded-2xl bg-bg-surface border border-fgBorder-subtle space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
                <CreditCard className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-heading font-bold text-white">Giants Spend Card</h3>
                <span className="text-[10px] text-fgText-muted">Verve &bull; Mastercard</span>
              </div>
            </div>
            <Link
              href="/dashboard/wallet/cards"
              className="text-[11px] font-bold text-amber-400 hover:text-amber-300 flex items-center gap-0.5"
            >
              <span>Manage Card</span>
              <ChevronRight className="w-3 h-3" />
            </Link>
          </div>

          {/* Miniature Card Graphic */}
          <div className="relative w-full aspect-[1.8/1] rounded-xl bg-gradient-to-tr from-[#0a0f0d] via-[#14231b] to-[#0d1612] border border-amber-500/30 p-4 shadow-xl flex flex-col justify-between overflow-hidden">
            <div className="flex items-center justify-between text-xs">
              <span className="font-heading font-extrabold text-white text-[11px] tracking-wider">
                FUNDEDGIANTS
              </span>
              <span className="font-mono text-[9px] text-amber-400 font-bold tracking-widest uppercase">
                Debit
              </span>
            </div>

            <div className="w-8 h-6 rounded bg-gradient-to-br from-amber-200 via-amber-400 to-amber-600 border border-amber-300" />

            <div className="flex items-end justify-between font-mono text-[10px]">
              <span className="text-white/90">•••• 8842</span>
              <span className="text-white font-bold">JOHN DOE</span>
            </div>
          </div>

          <p className="text-[11px] text-fgText-secondary leading-relaxed">
            Spend directly from your Giants Vault balance online, on POS terminals, and at ATMs anywhere Verve or Mastercard are accepted nationwide.
          </p>

          <Link
            href="/dashboard/wallet/cards"
            className="w-full py-2.5 px-3 rounded-xl bg-bg-card border border-fgBorder-subtle hover:border-amber-500/50 text-white text-xs font-semibold flex items-center justify-center gap-2 transition-all"
          >
            <span>Order Custom Laser-Engraved Card (₦100,000)</span>
            <ChevronRight className="w-3.5 h-3.5 text-amber-400" />
          </Link>
        </div>

        {/* Right Column: Ledger Activity Log */}
        <div className="lg:col-span-7 p-6 rounded-2xl bg-bg-surface border border-fgBorder-subtle space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-fgBorder-subtle">
            <h3 className="text-sm font-heading font-bold text-white">Vault Transaction History</h3>
            <span className="text-[10px] text-fgText-muted">Real-Time Double-Entry Ledger</span>
          </div>

          <div className="space-y-3">
            {recentTransactions.map((tx) => (
              <div
                key={tx.id}
                className="p-3.5 rounded-xl bg-bg-card border border-fgBorder-subtle/80 flex items-center justify-between gap-3 hover:border-fgBorder-emerald transition-all"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      tx.isCredit
                        ? 'bg-emerald-500/15 text-emerald-400'
                        : 'bg-fgBorder-subtle text-fgText-secondary'
                    }`}
                  >
                    {tx.isCredit ? <ArrowDownLeft className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-white truncate">{tx.title}</p>
                    <p className="text-[10px] text-fgText-muted truncate">
                      {tx.ref} &bull; {tx.date}
                    </p>
                  </div>
                </div>

                <span
                  className={`font-mono text-xs font-bold flex-shrink-0 ${
                    tx.isCredit ? 'text-emerald-400' : 'text-fgText-secondary'
                  }`}
                >
                  {tx.isCredit ? '+' : '-'}
                  {formatNaira(tx.amountNgn)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
