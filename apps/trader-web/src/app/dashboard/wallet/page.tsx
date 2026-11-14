'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  Wallet,
  ArrowUpRight,
  ArrowDownLeft,
  ArrowDownToLine,
  ArrowUpFromLine,
  CreditCard,
  Building2,
  Copy,
  CheckCircle2,
  ShieldCheck,
  ChevronRight,
  TrendingUp,
  Receipt,
  Layers,
  Eye,
  EyeOff,
  Sparkles,
  ExternalLink,
  Plus,
  RefreshCw,
  Search,
  Check,
  X,
  AlertCircle,
  Coins,
} from 'lucide-react';
import { formatNaira } from '@/lib/format';

interface VaultData {
  availableBalanceNgn: number;
  totalDepositsNgn: number;
  totalWithdrawalsNgn: number;
  totalTransactionsCount: number;
  accountStatus: string;
  dedicatedAccount: {
    bankName: string;
    accountName: string;
    accountNumber: string;
    currency: string;
  };
  boundBankAccounts: Array<{
    id: string;
    bankName: string;
    accountNumber: string;
    accountName: string;
    isVerified: boolean;
    isPrimary: boolean;
  }>;
}

interface TransactionItem {
  id: string;
  type: 'Deposit' | 'Trading Payout' | 'Withdrawal (NGN)' | 'Commission' | 'Deposit (USDT)';
  amountNgn: number;
  isCredit: boolean;
  status: 'Completed' | 'Pending' | 'Processing';
  date: string;
  reference: string;
}

export default function GiantsVaultPage() {
  const [showBalance, setShowBalance] = useState<boolean>(true);
  const [copied, setCopied] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modals
  const [isDepositOpen, setIsDepositOpen] = useState(false);
  const [isWithdrawOpen, setIsWithdrawOpen] = useState(false);

  // Card Freeze State
  const [isCardFrozen, setIsCardFrozen] = useState(false);

  // Withdrawal form states
  const [withdrawAmount, setWithdrawAmount] = useState<string>('');
  const [selectedBankId, setSelectedBankId] = useState<string>('');
  const [withdrawLoading, setWithdrawLoading] = useState(false);
  const [withdrawSuccess, setWithdrawSuccess] = useState<string | null>(null);
  const [withdrawError, setWithdrawError] = useState<string | null>(null);

  const [vault, setVault] = useState<VaultData>({
    availableBalanceNgn: 12450000.0,
    totalDepositsNgn: 12450000.0,
    totalWithdrawalsNgn: 9000000.0,
    totalTransactionsCount: 24,
    accountStatus: 'Active',
    dedicatedAccount: {
      bankName: 'Wema Bank',
      accountName: 'FG / JOHN DOE',
      accountNumber: '7041289410',
      currency: 'NGN (₦)',
    },
    boundBankAccounts: [
      {
        id: 'ba-1',
        bankName: 'Access Bank',
        accountNumber: '0091823741',
        accountName: 'JOHN DOE',
        isVerified: true,
        isPrimary: true,
      },
    ],
  });

  const [transactions, setTransactions] = useState<TransactionItem[]>([
    {
      id: 'tx-1',
      type: 'Deposit',
      amountNgn: 2000000,
      isCredit: true,
      status: 'Completed',
      date: 'Apr 28, 2026 10:24 AM',
      reference: 'FG-TRX-78452',
    },
    {
      id: 'tx-2',
      type: 'Trading Payout',
      amountNgn: 680000,
      isCredit: true,
      status: 'Completed',
      date: 'Apr 27, 2026 08:15 PM',
      reference: 'FG-TRX-78451',
    },
    {
      id: 'tx-3',
      type: 'Withdrawal (NGN)',
      amountNgn: 500000,
      isCredit: false,
      status: 'Completed',
      date: 'Apr 26, 2026 02:43 PM',
      reference: 'FG-WTH-78450',
    },
    {
      id: 'tx-4',
      type: 'Commission',
      amountNgn: 120000,
      isCredit: true,
      status: 'Completed',
      date: 'Apr 24, 2026 11:12 AM',
      reference: 'FG-CMM-78449',
    },
    {
      id: 'tx-5',
      type: 'Deposit (USDT)',
      amountNgn: 750000,
      isCredit: true,
      status: 'Completed',
      date: 'Apr 22, 2026 09:30 AM',
      reference: 'FG-TRX-78448',
    },
  ]);

  const [loading, setLoading] = useState(false);

  const fetchWalletData = async () => {
    setLoading(true);
    try {
      const [resOverview, resTx] = await Promise.all([
        fetch('http://localhost:4000/api/v1/wallet/overview', { credentials: 'include' }),
        fetch('http://localhost:4000/api/v1/wallet/transactions', { credentials: 'include' }),
      ]);

      if (resOverview.ok) {
        const data = await resOverview.json();
        setVault((prev) => ({
          ...prev,
          availableBalanceNgn: data.availableBalanceNgn ?? prev.availableBalanceNgn,
          totalDepositsNgn: data.totalDepositsNgn ?? prev.totalDepositsNgn,
          totalWithdrawalsNgn: data.totalWithdrawalsNgn ?? prev.totalWithdrawalsNgn,
          dedicatedAccount: data.dedicatedAccount || prev.dedicatedAccount,
          boundBankAccounts: data.boundBankAccounts?.length ? data.boundBankAccounts : prev.boundBankAccounts,
        }));
        if (data.boundBankAccounts?.length > 0 && !selectedBankId) {
          setSelectedBankId(data.boundBankAccounts[0].id);
        }
      }

      if (resTx.ok) {
        const txData = await resTx.json();
        if (Array.isArray(txData) && txData.length > 0) {
          setTransactions(
            txData.map((t: any) => ({
              id: t.id,
              type: t.title?.includes('Payout')
                ? 'Trading Payout'
                : t.isCredit
                ? 'Deposit'
                : 'Withdrawal (NGN)',
              amountNgn: t.amountNgn,
              isCredit: t.isCredit,
              status: 'Completed',
              date: t.date || new Date().toLocaleString(),
              reference: t.ref || `FG-TRX-${Math.floor(10000 + Math.random() * 90000)}`,
            }))
          );
        }
      }
    } catch (err) {
      console.error('Wallet fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWalletData();
  }, []);

  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopied(field);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleWithdrawSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setWithdrawError(null);
    setWithdrawSuccess(null);

    const amount = parseFloat(withdrawAmount);
    if (!amount || amount < 5000) {
      setWithdrawError('Minimum withdrawal amount is ₦5,000');
      return;
    }

    if (amount > vault.availableBalanceNgn) {
      setWithdrawError('Requested amount exceeds available balance in Giants Vault');
      return;
    }

    setWithdrawLoading(true);
    try {
      const res = await fetch('http://localhost:4000/api/v1/wallet/withdraw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          bankAccountId: selectedBankId || vault.boundBankAccounts[0]?.id,
          amountNgn: amount,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Withdrawal request failed');
      }

      setWithdrawSuccess(`Withdrawal of ${formatNaira(amount)} initiated successfully. Reference: ${data.reference}`);
      setWithdrawAmount('');
      fetchWalletData();
      setTimeout(() => {
        setIsWithdrawOpen(false);
        setWithdrawSuccess(null);
      }, 2500);
    } catch (err: any) {
      setWithdrawError(err.message || 'Withdrawal could not be processed');
    } finally {
      setWithdrawLoading(false);
    }
  };

  const filteredTransactions = transactions.filter((tx) => {
    const matchesType = filterType === 'ALL' || tx.type.toLowerCase().includes(filterType.toLowerCase());
    const matchesSearch =
      tx.reference.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tx.type.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesType && matchesSearch;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto w-full pb-16">
      {/* 1. Header Title & Subtext */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-heading font-extrabold text-white tracking-tight">
          Wallet Overview
        </h1>
        <p className="text-xs sm:text-sm text-fgText-secondary mt-1">
          Track your balance and recent transactions
        </p>
      </div>

      {/* 2. Main Two-Column Modular Layout (Main 68% vs Sidebar 32%) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* ======================================================== */}
        {/* LEFT / MAIN COLUMN (lg:col-span-8)                      */}
        {/* ======================================================== */}
        <div className="lg:col-span-8 space-y-5">
          {/* Main Card: Total Wallet Balance */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#0a1812] via-[#07110d] to-[#040907] border border-emerald-500/25 p-6 sm:p-7 shadow-2xl">
            {/* Ambient Background Glow & Geometric Accents */}
            <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
            <div className="absolute bottom-0 left-1/3 w-60 h-60 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none" />

            {/* Subtle decorative circuit lines */}
            <svg
              className="absolute right-0 bottom-0 opacity-15 pointer-events-none w-64 h-64 text-emerald-400"
              viewBox="0 0 200 200"
              fill="none"
              stroke="currentColor"
            >
              <circle cx="160" cy="160" r="80" strokeWidth="1" strokeDasharray="4 4" />
              <circle cx="160" cy="160" r="50" strokeWidth="1" />
              <path d="M 80 160 L 160 160 L 160 80" strokeWidth="1.5" />
            </svg>

            <div className="relative z-10 space-y-5">
              {/* Top Row: Icon + Label + Eye Toggle */}
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-inner">
                  <Wallet className="w-5 h-5" />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs sm:text-sm font-semibold text-fgText-secondary tracking-wide">
                    Total Wallet Balance
                  </span>
                  <button
                    onClick={() => setShowBalance(!showBalance)}
                    className="text-fgText-muted hover:text-white transition p-1"
                    title={showBalance ? 'Hide balance' : 'Show balance'}
                  >
                    {showBalance ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Bottom Row: Amount + Action Buttons */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-1">
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl sm:text-4xl md:text-5xl font-mono font-extrabold tracking-tight text-[#00f59b]">
                    {showBalance ? formatNaira(vault.availableBalanceNgn) : '••••••••••••'}
                  </span>
                </div>

                {/* Deposit & Withdraw Buttons */}
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setIsDepositOpen(true)}
                    className="px-6 py-2.5 rounded-xl bg-[#00e575] hover:bg-[#00c966] text-black font-heading font-extrabold text-sm shadow-lg shadow-emerald-500/20 active:scale-95 transition-all flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4 stroke-[3]" />
                    <span>Deposit</span>
                  </button>
                  <button
                    onClick={() => setIsWithdrawOpen(true)}
                    className="px-6 py-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.12] text-white font-heading font-semibold text-sm active:scale-95 transition-all flex items-center gap-2"
                  >
                    <ArrowUpRight className="w-4 h-4" />
                    <span>Withdraw</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* 4 Sub-Metrics Cards in a Row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
            {/* Card 1: Total Deposits */}
            <div className="rounded-xl bg-[#09120e] border border-white/[0.08] p-3.5 sm:p-4 hover:border-emerald-500/30 transition-colors">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center text-emerald-400">
                  <ArrowDownToLine className="w-3.5 h-3.5" />
                </div>
                <span className="text-[11px] font-medium text-fgText-secondary">Total Deposits</span>
              </div>
              <div className="text-sm sm:text-base font-mono font-bold text-white tracking-tight">
                {showBalance ? formatNaira(vault.totalDepositsNgn) : '••••••'}
              </div>
            </div>

            {/* Card 2: Total Withdrawals */}
            <div className="rounded-xl bg-[#09120e] border border-white/[0.08] p-3.5 sm:p-4 hover:border-emerald-500/30 transition-colors">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center text-emerald-400">
                  <ArrowUpFromLine className="w-3.5 h-3.5" />
                </div>
                <span className="text-[11px] font-medium text-fgText-secondary">Total Withdrawals</span>
              </div>
              <div className="text-sm sm:text-base font-mono font-bold text-white tracking-tight">
                {showBalance ? formatNaira(vault.totalWithdrawalsNgn) : '••••••'}
              </div>
            </div>

            {/* Card 3: Total Transactions */}
            <div className="rounded-xl bg-[#09120e] border border-white/[0.08] p-3.5 sm:p-4 hover:border-emerald-500/30 transition-colors">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center text-emerald-400">
                  <Layers className="w-3.5 h-3.5" />
                </div>
                <span className="text-[11px] font-medium text-fgText-secondary">Total Transactions</span>
              </div>
              <div className="text-sm sm:text-base font-mono font-bold text-white tracking-tight">
                {vault.totalTransactionsCount}
              </div>
            </div>

            {/* Card 4: Account Status */}
            <div className="rounded-xl bg-[#09120e] border border-white/[0.08] p-3.5 sm:p-4 hover:border-emerald-500/30 transition-colors">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center text-emerald-400">
                  <ShieldCheck className="w-3.5 h-3.5" />
                </div>
                <span className="text-[11px] font-medium text-fgText-secondary">Account Status</span>
              </div>
              <div className="text-sm sm:text-base font-mono font-bold text-[#00f59b] tracking-tight flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>{vault.accountStatus}</span>
              </div>
            </div>
          </div>

          {/* Recent Transactions Table Card */}
          <div className="rounded-2xl bg-[#09120e] border border-white/[0.08] p-5 sm:p-6 space-y-4 shadow-xl">
            {/* Table Header Row */}
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
              <div className="flex items-center gap-3">
                <h3 className="text-base sm:text-lg font-heading font-bold text-white">
                  Recent Transactions
                </h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-mono">
                  Live Ledger
                </span>
              </div>
              <button
                onClick={() => setFilterType(filterType === 'ALL' ? 'Deposit' : 'ALL')}
                className="text-xs font-semibold text-[#00f59b] hover:text-emerald-300 transition flex items-center gap-1"
              >
                <span>View all</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Transactions Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-white/[0.06] text-fgText-muted font-semibold text-[11px] uppercase tracking-wider">
                    <th className="pb-3 pl-1">Type</th>
                    <th className="pb-3 px-3">Amount</th>
                    <th className="pb-3 px-3">Status</th>
                    <th className="pb-3 px-3">Date</th>
                    <th className="pb-3 pr-1 text-right">Reference</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {filteredTransactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-white/[0.02] transition-colors group">
                      {/* Type Column with Icon */}
                      <td className="py-3.5 pl-1 whitespace-nowrap">
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                              tx.isCredit
                                ? 'bg-emerald-500/10 border border-emerald-500/25 text-emerald-400'
                                : 'bg-rose-500/10 border border-rose-500/25 text-rose-400'
                            }`}
                          >
                            {tx.type === 'Trading Payout' ? (
                              <TrendingUp className="w-3.5 h-3.5" />
                            ) : tx.type === 'Commission' ? (
                              <Coins className="w-3.5 h-3.5" />
                            ) : tx.isCredit ? (
                              <ArrowDownLeft className="w-3.5 h-3.5" />
                            ) : (
                              <ArrowUpRight className="w-3.5 h-3.5" />
                            )}
                          </div>
                          <span className="font-semibold text-white group-hover:text-emerald-400 transition-colors">
                            {tx.type}
                          </span>
                        </div>
                      </td>

                      {/* Amount */}
                      <td className="py-3.5 px-3 whitespace-nowrap font-mono font-bold text-xs sm:text-sm">
                        <span className={tx.isCredit ? 'text-[#00f59b]' : 'text-rose-400'}>
                          {tx.isCredit ? '+ ' : '- '}
                          {formatNaira(tx.amountNgn)}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-3 whitespace-nowrap">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono font-medium bg-emerald-500/10 border border-emerald-500/25 text-emerald-400">
                          {tx.status}
                        </span>
                      </td>

                      {/* Date */}
                      <td className="py-3.5 px-3 whitespace-nowrap text-fgText-secondary text-[11px]">
                        {tx.date}
                      </td>

                      {/* Reference */}
                      <td className="py-3.5 pr-1 whitespace-nowrap text-right font-mono text-fgText-muted text-[11px]">
                        {tx.reference}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* ======================================================== */}
        {/* RIGHT / SIDEBAR COLUMN (lg:col-span-4)                  */}
        {/* ======================================================== */}
        <div className="lg:col-span-4 space-y-5">
          {/* 1. Dedicated Deposit Bank Details Card (Top of Sidebar) */}
          <div className="rounded-2xl bg-[#09120e] border border-white/[0.08] p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center text-emerald-400">
                  <Building2 className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h3 className="text-xs font-heading font-bold text-white uppercase tracking-wider">
                    Dedicated Deposit Account
                  </h3>
                  <p className="text-[10px] text-fgText-secondary">
                    Automated Inward Reconciliation
                  </p>
                </div>
              </div>
              <span className="text-[9px] px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-mono font-bold">
                Instant
              </span>
            </div>

            <div className="space-y-2.5 text-xs">
              {/* Bank Name */}
              <div className="p-2.5 rounded-xl bg-black/40 border border-white/[0.06] flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-fgText-muted uppercase block">Bank Name</span>
                  <span className="font-bold text-white font-mono">
                    {vault.dedicatedAccount?.bankName || 'Wema Bank'}
                  </span>
                </div>
                <button
                  onClick={() => handleCopy(vault.dedicatedAccount?.bankName || 'Wema Bank', 'bank')}
                  className="p-1.5 text-fgText-secondary hover:text-white transition"
                  title="Copy Bank Name"
                >
                  {copied === 'bank' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>

              {/* Account Number */}
              <div className="p-2.5 rounded-xl bg-black/40 border border-emerald-500/20 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-fgText-muted uppercase block">Account Number</span>
                  <span className="font-extrabold text-[#00f59b] font-mono text-sm tracking-wider">
                    {vault.dedicatedAccount?.accountNumber || '7041289410'}
                  </span>
                </div>
                <button
                  onClick={() => handleCopy(vault.dedicatedAccount?.accountNumber || '7041289410', 'acc')}
                  className="px-2.5 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold font-mono hover:bg-emerald-500/25 transition flex items-center gap-1"
                >
                  {copied === 'acc' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  <span>{copied === 'acc' ? 'Copied' : 'Copy'}</span>
                </button>
              </div>

              {/* Beneficiary Name */}
              <div className="p-2.5 rounded-xl bg-black/40 border border-white/[0.06] flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-fgText-muted uppercase block">Beneficiary</span>
                  <span className="font-semibold text-white font-mono text-[11px]">
                    {vault.dedicatedAccount?.accountName || 'FG / JOHN DOE'}
                  </span>
                </div>
                <button
                  onClick={() => handleCopy(vault.dedicatedAccount?.accountName || 'FG / JOHN DOE', 'name')}
                  className="p-1.5 text-fgText-secondary hover:text-white transition"
                  title="Copy Name"
                >
                  {copied === 'name' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            <p className="text-[10px] text-fgText-muted leading-relaxed">
              Transfer funds from any Nigerian banking app. Deposits are automatically detected and credited to your Giants Vault balance within seconds.
            </p>
          </div>

          {/* 2. Giants Spend Card (Middle of Sidebar) */}
          <div className="rounded-2xl bg-gradient-to-br from-[#0b1c14] via-[#07120d] to-[#040a07] border border-emerald-500/30 p-5 space-y-4 shadow-2xl relative overflow-hidden">
            {/* Visual Virtual Card */}
            <div className="relative rounded-xl p-4 bg-gradient-to-r from-emerald-900/40 via-emerald-800/20 to-black/60 border border-emerald-500/40 shadow-inner space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-heading font-extrabold text-white tracking-wider flex items-center gap-1.5">
                  <CreditCard className="w-3.5 h-3.5 text-emerald-400" />
                  <span>GIANTS SPEND CARD</span>
                </span>
                <span className="text-[9px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-mono font-bold">
                  {isCardFrozen ? 'FROZEN' : 'ACTIVE'}
                </span>
              </div>

              {/* Chip & Contactless */}
              <div className="flex items-center gap-2">
                <div className="w-7 h-5 rounded bg-amber-400/80 border border-amber-300 shadow-sm" />
                <svg className="w-4 h-4 text-emerald-400 opacity-80" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path d="M8.5 16.5a5 5 0 0 1 0-9" strokeWidth="2" strokeLinecap="round" />
                  <path d="M12 19a8.5 8.5 0 0 0 0-14" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </div>

              {/* Masked Card Number */}
              <div className="font-mono text-sm tracking-widest text-white font-bold pt-1">
                •••• •••• •••• 4912
              </div>

              <div className="flex items-end justify-between text-[10px] text-fgText-secondary font-mono pt-1">
                <div>
                  <span className="text-[8px] text-fgText-muted block uppercase">Cardholder</span>
                  <span className="text-white font-semibold">JOHN DOE</span>
                </div>
                <div>
                  <span className="text-[8px] text-fgText-muted block uppercase">Expires</span>
                  <span className="text-white font-semibold">11/29</span>
                </div>
                <div className="text-right">
                  <span className="text-[8px] text-fgText-muted block uppercase">Network</span>
                  <span className="text-emerald-400 font-bold">Mastercard</span>
                </div>
              </div>
            </div>

            {/* Quick Card Controls */}
            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={() => setIsCardFrozen(!isCardFrozen)}
                className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold border transition text-center ${
                  isCardFrozen
                    ? 'bg-rose-500/15 border-rose-500/30 text-rose-400 hover:bg-rose-500/25'
                    : 'bg-white/[0.04] border-white/[0.1] text-white hover:bg-white/[0.08]'
                }`}
              >
                {isCardFrozen ? 'Unfreeze Card' : 'Freeze Card'}
              </button>
              <Link
                href="/dashboard/wallet/cards"
                className="flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/25 transition text-center"
              >
                Card Settings
              </Link>
            </div>
          </div>

          {/* 3. List of Withdrawal Accounts (Bottom of Sidebar) */}
          <div className="rounded-2xl bg-[#09120e] border border-white/[0.08] p-5 space-y-3.5 shadow-xl">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
              <h3 className="text-xs font-heading font-bold text-white uppercase tracking-wider">
                Withdrawal Accounts
              </h3>
              <Link
                href="/dashboard/wallet/bank-accounts"
                className="text-[11px] font-semibold text-[#00f59b] hover:text-emerald-300 transition"
              >
                + Add Bank
              </Link>
            </div>

            <div className="space-y-2">
              {vault.boundBankAccounts.map((acc) => (
                <div
                  key={acc.id}
                  className="p-3 rounded-xl bg-black/40 border border-white/[0.06] flex items-center justify-between hover:border-emerald-500/30 transition-colors"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-white text-xs">{acc.bankName}</span>
                      {acc.isVerified && (
                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-500/15 text-emerald-400 font-mono font-medium">
                          Verified
                        </span>
                      )}
                      {acc.isPrimary && (
                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-white/[0.08] text-neutral-300 font-mono">
                          Primary
                        </span>
                      )}
                    </div>
                    <div className="font-mono text-fgText-secondary text-[11px] tracking-wide">
                      {acc.accountNumber} • {acc.accountName}
                    </div>
                  </div>
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                </div>
              ))}
            </div>
          </div>

          {/* 4. Bull Brand Card: Trade, Grow, Earn (Snapshot Feature) */}
          <div className="rounded-2xl bg-gradient-to-br from-[#0e1f17] via-[#091510] to-[#040806] border border-emerald-500/25 p-5 shadow-2xl relative overflow-hidden space-y-4">
            {/* Visual Bull Art / Graphic */}
            <div className="relative h-32 w-full rounded-xl overflow-hidden bg-black/60 border border-emerald-500/20 flex items-center justify-center">
              <div className="absolute inset-0 bg-gradient-to-t from-[#0e1f17] via-transparent to-transparent z-10" />
              {/* Bull Emblem Graphic */}
              <div className="relative z-0 flex flex-col items-center justify-center scale-90">
                <svg
                  className="w-24 h-24 text-emerald-400 opacity-90 drop-shadow-[0_0_15px_rgba(16,185,129,0.5)]"
                  viewBox="0 0 100 100"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                >
                  <path d="M 20 25 C 25 15, 35 15, 45 30 C 50 35, 50 40, 50 45 C 50 40, 50 35, 55 30 C 65 15, 75 15, 80 25 C 75 35, 70 45, 60 48 C 65 55, 68 65, 65 75 C 60 85, 40 85, 35 75 C 32 65, 35 55, 40 48 C 30 45, 25 35, 20 25 Z" />
                  <circle cx="38" cy="52" r="3" fill="currentColor" />
                  <circle cx="62" cy="52" r="3" fill="currentColor" />
                  <path d="M 42 68 Q 50 74 58 68" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </div>
            </div>

            <div className="space-y-1.5">
              <h4 className="text-base font-heading font-extrabold text-white tracking-tight">
                Trade, Grow, Earn.
              </h4>
              <p className="text-[11px] text-fgText-secondary leading-relaxed">
                FundedGiants gives you the tools, capital and support to trade like a pro.
              </p>
            </div>

            <Link
              href="/dashboard/challenges/buy"
              className="w-full py-2.5 px-4 rounded-xl bg-[#f5a623] hover:bg-[#e0961f] text-black font-heading font-extrabold text-xs transition shadow-lg shadow-amber-500/20 active:scale-95 flex items-center justify-center gap-1.5"
            >
              <span>Buy New Account</span>
              <ChevronRight className="w-3.5 h-3.5 stroke-[3]" />
            </Link>
          </div>

          {/* 5. Community Card (Snapshot Feature) */}
          <div className="rounded-2xl bg-[#09120e] border border-white/[0.08] p-5 space-y-3 shadow-xl">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-heading font-bold text-white">
                  Join the FundedGiants Community
                </h4>
                <p className="text-[10px] text-fgText-secondary mt-0.5">
                  Get the latest updates, trading tips and exclusive offers.
                </p>
              </div>
            </div>

            <a
              href="https://t.me/fundedgiants"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs font-bold text-[#00f59b] hover:text-emerald-300 transition pt-1"
            >
              <span>Join Now</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* INTERACTIVE MODALS                                       */}
      {/* ======================================================== */}

      {/* A. Deposit Modal */}
      {isDepositOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#0b1612] border border-emerald-500/30 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-5 relative">
            <button
              onClick={() => setIsDepositOpen(false)}
              className="absolute top-4 right-4 text-fgText-muted hover:text-white transition"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="space-y-1">
              <h3 className="text-lg font-heading font-bold text-white flex items-center gap-2">
                <Building2 className="w-5 h-5 text-emerald-400" />
                <span>Deposit to Giants Vault</span>
              </h3>
              <p className="text-xs text-fgText-secondary">
                Transfer any amount to your dedicated Nigerian Naira account below:
              </p>
            </div>

            <div className="p-4 rounded-xl bg-black/50 border border-emerald-500/25 space-y-3 font-mono text-xs">
              <div className="flex justify-between items-center border-b border-white/[0.06] pb-2">
                <span className="text-fgText-muted text-[10px] uppercase">Bank</span>
                <span className="font-bold text-white">{vault.dedicatedAccount?.bankName || 'Wema Bank'}</span>
              </div>
              <div className="flex justify-between items-center border-b border-white/[0.06] pb-2">
                <span className="text-fgText-muted text-[10px] uppercase">Account Number</span>
                <span className="font-extrabold text-[#00f59b] text-base tracking-widest">
                  {vault.dedicatedAccount?.accountNumber || '7041289410'}
                </span>
              </div>
              <div className="flex justify-between items-center border-b border-white/[0.06] pb-2">
                <span className="text-fgText-muted text-[10px] uppercase">Beneficiary</span>
                <span className="font-semibold text-white">{vault.dedicatedAccount?.accountName || 'FG / JOHN DOE'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-fgText-muted text-[10px] uppercase">Currency</span>
                <span className="font-bold text-emerald-400">NGN (₦)</span>
              </div>
            </div>

            <button
              onClick={() => handleCopy(vault.dedicatedAccount?.accountNumber || '7041289410', 'modal_acc')}
              className="w-full py-2.5 rounded-xl bg-[#00e575] hover:bg-[#00c966] text-black font-heading font-extrabold text-xs shadow-lg shadow-emerald-500/20 active:scale-95 transition flex items-center justify-center gap-1.5"
            >
              {copied === 'modal_acc' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              <span>{copied === 'modal_acc' ? 'Copied Account Number!' : 'Copy Account Number'}</span>
            </button>

            <p className="text-[11px] text-fgText-muted text-center leading-relaxed">
              Automated reconciliation: funds are credited to your vault immediately after your transfer completes.
            </p>
          </div>
        </div>
      )}

      {/* B. Withdraw Modal */}
      {isWithdrawOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#0b1612] border border-emerald-500/30 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-5 relative">
            <button
              onClick={() => setIsWithdrawOpen(false)}
              className="absolute top-4 right-4 text-fgText-muted hover:text-white transition"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="space-y-1">
              <h3 className="text-lg font-heading font-bold text-white flex items-center gap-2">
                <ArrowUpRight className="w-5 h-5 text-emerald-400" />
                <span>Withdraw from Giants Vault</span>
              </h3>
              <p className="text-xs text-fgText-secondary">
                Disburse funds directly to your verified Nigerian bank account:
              </p>
            </div>

            {withdrawSuccess && (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{withdrawSuccess}</span>
              </div>
            )}

            {withdrawError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{withdrawError}</span>
              </div>
            )}

            <form onSubmit={handleWithdrawSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-fgText-secondary font-medium mb-1">
                  Destination Bank Account
                </label>
                <select
                  value={selectedBankId}
                  onChange={(e) => setSelectedBankId(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-black/40 border border-white/[0.1] text-white focus:outline-none focus:border-emerald-500 text-xs"
                >
                  {vault.boundBankAccounts.map((b) => (
                    <option key={b.id} value={b.id} className="bg-neutral-900 text-white">
                      {b.bankName} - {b.accountNumber} ({b.accountName})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-fgText-secondary font-medium">Amount to Withdraw (₦)</label>
                  <span className="text-[10px] text-fgText-muted font-mono">
                    Avail: {formatNaira(vault.availableBalanceNgn)}
                  </span>
                </div>
                <input
                  type="number"
                  placeholder="e.g. 500000"
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  min="5000"
                  max={vault.availableBalanceNgn}
                  required
                  className="w-full p-2.5 rounded-xl bg-black/40 border border-white/[0.1] text-white font-mono text-sm focus:outline-none focus:border-emerald-500"
                />
                <span className="text-[10px] text-fgText-muted block mt-1">
                  Minimum withdrawal: ₦5,000. Processing SLA: within 3 hours.
                </span>
              </div>

              <button
                type="submit"
                disabled={withdrawLoading}
                className="w-full py-2.5 rounded-xl bg-[#00e575] hover:bg-[#00c966] disabled:opacity-50 text-black font-heading font-extrabold text-xs shadow-lg shadow-emerald-500/20 active:scale-95 transition flex items-center justify-center gap-1.5"
              >
                {withdrawLoading ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <ArrowUpRight className="w-4 h-4" />
                )}
                <span>{withdrawLoading ? 'Processing Withdrawal...' : 'Confirm Withdrawal'}</span>
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
