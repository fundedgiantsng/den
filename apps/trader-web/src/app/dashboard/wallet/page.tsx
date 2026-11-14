'use client';

import React, { useState, useEffect } from 'react';
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
  RefreshCw,
  SlidersHorizontal,
  Lock,
} from 'lucide-react';
import { formatNaira } from '@/lib/format';

interface VaultData {
  availableBalanceNgn: number;
  withdrawableProfitsNgn: number;
  totalDepositsNgn: number;
  totalWithdrawalsNgn: number;
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
  type: string;
  title: string;
  ref: string;
  date: string;
  amountNgn: number;
  isCredit: boolean;
  status: string;
}

export default function GiantsVaultPage() {
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'DEPOSIT' | 'WITHDRAW' | 'SPEND_CARD'>('OVERVIEW');
  const [copied, setCopied] = useState<string | null>(null);
  const [selectedCardType, setSelectedCardType] = useState<'MASTERCARD' | 'VERVE'>('MASTERCARD');

  const [vault, setVault] = useState<VaultData>({
    availableBalanceNgn: 18450000.0,
    withdrawableProfitsNgn: 2480000.0,
    totalDepositsNgn: 25000000.0,
    totalWithdrawalsNgn: 6550000.0,
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

  const [transactions, setTransactions] = useState<TransactionItem[]>([]);
  const [loading, setLoading] = useState(false);

  // Withdrawal form states
  const [withdrawAmount, setWithdrawAmount] = useState<string>('');
  const [selectedBankId, setSelectedBankId] = useState<string>('');
  const [withdrawLoading, setWithdrawLoading] = useState(false);
  const [withdrawSuccess, setWithdrawSuccess] = useState<string | null>(null);
  const [withdrawError, setWithdrawError] = useState<string | null>(null);

  const fetchWalletData = async () => {
    setLoading(true);
    try {
      const [resOverview, resTx] = await Promise.all([
        fetch('http://localhost:4000/api/v1/wallet/overview', { credentials: 'include' }),
        fetch('http://localhost:4000/api/v1/wallet/transactions', { credentials: 'include' }),
      ]);

      if (resOverview.ok) {
        const data = await resOverview.json();
        setVault(data);
        if (data.boundBankAccounts?.length > 0 && !selectedBankId) {
          setSelectedBankId(data.boundBankAccounts[0].id);
        }
      }

      if (resTx.ok) {
        const txData = await resTx.json();
        if (Array.isArray(txData)) {
          setTransactions(txData);
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

  const handleRequestWithdrawal = async (e: React.FormEvent) => {
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
          bankAccountId: selectedBankId,
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
    } catch (err: any) {
      setWithdrawError(err.message || 'Withdrawal could not be processed');
    } finally {
      setWithdrawLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto w-full pb-12">
      {/* Header & Sub-navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.08] pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-heading font-extrabold text-white flex items-center gap-2">
            <span>Giants Vault</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-mono font-medium">
              Central NGN Ledger
            </span>
          </h1>
          <p className="text-xs text-fgText-secondary mt-0.5">
            Your centralized institutional Naira treasury, profit disbursements, and linked spend card.
          </p>
        </div>

        {/* Tab Selector */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[#0a1210] border border-white/[0.08] text-xs font-semibold overflow-x-auto">
          <button
            onClick={() => setActiveTab('OVERVIEW')}
            className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap ${
              activeTab === 'OVERVIEW' ? 'bg-emerald-500 text-black font-bold' : 'text-fgText-secondary hover:text-white'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('DEPOSIT')}
            className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap ${
              activeTab === 'DEPOSIT' ? 'bg-emerald-500 text-black font-bold' : 'text-fgText-secondary hover:text-white'
            }`}
          >
            Deposit
          </button>
          <button
            onClick={() => setActiveTab('WITHDRAW')}
            className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap ${
              activeTab === 'WITHDRAW' ? 'bg-emerald-500 text-black font-bold' : 'text-fgText-secondary hover:text-white'
            }`}
          >
            Withdraw
          </button>
          <button
            onClick={() => setActiveTab('SPEND_CARD')}
            className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap flex items-center gap-1 ${
              activeTab === 'SPEND_CARD' ? 'bg-emerald-500 text-black font-bold' : 'text-fgText-secondary hover:text-white'
            }`}
          >
            <CreditCard className="w-3.5 h-3.5" />
            <span>Giants Spend Card</span>
          </button>
        </div>
      </div>

      {/* Primary 3-Metric Summary Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <div className="fg-card p-4">
          <div className="flex items-center justify-between text-fgText-secondary mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Available Balance</span>
            <Wallet className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-lg sm:text-xl md:text-2xl font-bold font-mono text-white tracking-tight">
            {formatNaira(vault.availableBalanceNgn)}
          </div>
          <div className="text-[10px] text-emerald-400 font-semibold mt-1">Ready for challenge activation & card spend</div>
        </div>

        <div className="fg-card p-4">
          <div className="flex items-center justify-between text-fgText-secondary mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Withdrawable Profits</span>
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-lg sm:text-xl md:text-2xl font-bold font-mono text-white tracking-tight">
            {formatNaira(vault.withdrawableProfitsNgn)}
          </div>
          <div className="text-[10px] text-fgText-secondary font-medium mt-1">Disbursements processed within 3 hours</div>
        </div>

        <div className="fg-card p-4">
          <div className="flex items-center justify-between text-fgText-secondary mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Total Vault Inflow</span>
            <ArrowDownLeft className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-lg sm:text-xl md:text-2xl font-bold font-mono text-white tracking-tight">
            {formatNaira(vault.totalDepositsNgn)}
          </div>
          <div className="text-[10px] text-fgText-secondary font-medium mt-1">Cumulative deposits & trading payouts</div>
        </div>
      </div>

      {/* TAB CONTENT */}

      {/* 1. OVERVIEW TAB */}
      {activeTab === 'OVERVIEW' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Column: Dedicated Virtual Account & Actions */}
            <div className="lg:col-span-7 space-y-5">
              {/* Dedicated Account Box */}
              <div className="fg-card p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
                  <div>
                    <h3 className="text-sm font-heading font-extrabold text-white flex items-center gap-1.5">
                      <Building2 className="w-4 h-4 text-emerald-400" />
                      <span>Dedicated Inward Bank Account</span>
                    </h3>
                    <p className="text-[11px] text-fgText-secondary mt-0.5">
                      Direct automated reconciliation. Transfer any amount to credit your Giants Vault instantly.
                    </p>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-mono">
                    Instant Credit
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded-lg bg-[#0e1a12] border border-white/[0.08] flex justify-between items-center">
                    <div>
                      <span className="text-[10px] text-fgText-secondary uppercase block">Bank Name</span>
                      <span className="font-bold text-white font-mono">{vault.dedicatedAccount?.bankName || 'Wema Bank'}</span>
                    </div>
                    <button
                      onClick={() => handleCopy(vault.dedicatedAccount?.bankName || 'Wema Bank', 'bank')}
                      className="p-1.5 text-fgText-secondary hover:text-white"
                    >
                      {copied === 'bank' ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>

                  <div className="p-3 rounded-lg bg-[#0e1a12] border border-white/[0.08] flex justify-between items-center">
                    <div>
                      <span className="text-[10px] text-fgText-secondary uppercase block">Account Number</span>
                      <span className="font-bold text-emerald-400 font-mono text-sm tracking-wider">
                        {vault.dedicatedAccount?.accountNumber || '7041289410'}
                      </span>
                    </div>
                    <button
                      onClick={() => handleCopy(vault.dedicatedAccount?.accountNumber || '7041289410', 'acc')}
                      className="p-1.5 text-fgText-secondary hover:text-white"
                    >
                      {copied === 'acc' ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>

                  <div className="p-3 rounded-lg bg-[#0e1a12] border border-white/[0.08] sm:col-span-2 flex justify-between items-center">
                    <div>
                      <span className="text-[10px] text-fgText-secondary uppercase block">Account Name</span>
                      <span className="font-bold text-white font-mono">{vault.dedicatedAccount?.accountName || 'FG / TRADER'}</span>
                    </div>
                    <button
                      onClick={() => handleCopy(vault.dedicatedAccount?.accountName || 'FG / TRADER', 'name')}
                      className="p-1.5 text-fgText-secondary hover:text-white"
                    >
                      {copied === 'name' ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div className="flex gap-2.5 pt-1">
                  <button
                    onClick={() => setActiveTab('DEPOSIT')}
                    className="flex-1 py-2 px-3 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold uppercase tracking-wider text-center transition-colors"
                  >
                    Deposit Funds
                  </button>
                  <button
                    onClick={() => setActiveTab('WITHDRAW')}
                    className="py-2 px-4 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] text-white text-xs font-semibold transition-colors"
                  >
                    Withdraw Funds
                  </button>
                </div>
              </div>

              {/* Linked Bank Accounts */}
              <div className="fg-card p-5 space-y-3">
                <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
                  <div>
                    <h3 className="text-sm font-heading font-extrabold text-white">Verified Withdrawal Accounts</h3>
                    <p className="text-[11px] text-fgText-secondary mt-0.5">
                      Bank accounts verified to receive profit disbursements.
                    </p>
                  </div>
                  <span className="text-[10px] text-fgText-secondary">
                    {vault.boundBankAccounts?.length || 0}/3 linked
                  </span>
                </div>

                <div className="space-y-2">
                  {vault.boundBankAccounts?.map((acc) => (
                    <div
                      key={acc.id}
                      className="p-3 rounded-lg bg-[#0e1a12] border border-white/[0.08] flex items-center justify-between text-xs"
                    >
                      <div>
                        <div className="font-bold text-white font-mono">{acc.bankName}</div>
                        <div className="text-[11px] text-fgText-secondary font-mono">
                          •••• {acc.accountNumber.slice(-4)} • {acc.accountName}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {acc.isPrimary && (
                          <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-medium">
                            Primary
                          </span>
                        )}
                        <span className="text-[10px] text-emerald-400 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Verified
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Column: Giants Spend Card Feature Preview */}
            <div className="lg:col-span-5 space-y-5">
              <div className="fg-card p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
                  <div>
                    <h3 className="text-sm font-heading font-extrabold text-white flex items-center gap-1.5">
                      <CreditCard className="w-4 h-4 text-emerald-400" />
                      <span>Giants Spend Card</span>
                    </h3>
                    <p className="text-[10px] text-fgText-secondary">Custom NGN Card • Spends directly from Vault</p>
                  </div>
                  <button
                    onClick={() => setActiveTab('SPEND_CARD')}
                    className="text-[11px] text-emerald-400 hover:underline font-semibold"
                  >
                    Manage Card &rarr;
                  </button>
                </div>

                {/* Sleek Custom Card Preview */}
                <div className="relative w-full aspect-[1.58/1] rounded-2xl p-5 bg-gradient-to-br from-[#12281a] via-[#09150e] to-[#040806] border border-emerald-500/30 shadow-[0_10px_30px_rgba(0,0,0,0.5)] flex flex-col justify-between overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

                  <div className="flex items-center justify-between">
                    <span className="font-heading font-extrabold text-xs tracking-wider text-white">FUNDEDGIANTS</span>
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-black/40 text-emerald-400 border border-emerald-500/20">
                      VAULT LINKED
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="w-8 h-6 rounded bg-amber-400/80 border border-amber-300" />
                    <span className="text-[10px] text-fgText-secondary font-mono tracking-widest">NGN METALLIC</span>
                  </div>

                  <div>
                    <div className="font-mono text-sm tracking-widest text-white/90">•••• •••• •••• 8291</div>
                    <div className="flex items-center justify-between mt-2 text-[10px] text-fgText-secondary font-mono">
                      <span>{vault.dedicatedAccount?.accountName || 'JOHN DOE'}</span>
                      <span className="font-bold text-white">VERVE & MASTERCARD</span>
                    </div>
                  </div>
                </div>

                <p className="text-[11px] text-fgText-secondary leading-relaxed">
                  Use online, POS, and ATM anywhere Verve or Mastercard are accepted nationwide. All spends deduct automatically from your Giants Vault balance in real-time.
                </p>

                <button
                  onClick={() => setActiveTab('SPEND_CARD')}
                  className="w-full py-2.5 px-3 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-white text-xs font-semibold transition-colors flex items-center justify-center gap-1.5"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Configure Card Settings & Limits</span>
                </button>
              </div>
            </div>
          </div>

          {/* Ledger Transaction History */}
          <div className="fg-card p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
              <div>
                <h3 className="text-sm font-heading font-extrabold text-white">Live Vault Transactions</h3>
                <p className="text-[11px] text-fgText-secondary mt-0.5">
                  Official double-entry financial ledger records.
                </p>
              </div>
              <button
                onClick={fetchWalletData}
                disabled={loading}
                className="p-1.5 rounded-lg bg-white/[0.04] text-fgText-secondary hover:text-white text-xs flex items-center gap-1"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">Refresh</span>
              </button>
            </div>

            {transactions.length === 0 ? (
              <div className="p-8 text-center text-xs text-fgText-secondary font-mono">
                No recent transactions recorded yet in Giants Vault.
              </div>
            ) : (
              <div className="divide-y divide-white/[0.06]">
                {transactions.map((tx) => (
                  <div key={tx.id} className="py-3 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                          tx.isCredit
                            ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                            : 'bg-white/[0.04] text-white border border-white/[0.08]'
                        }`}
                      >
                        {tx.isCredit ? <ArrowDownLeft className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                      </div>
                      <div>
                        <div className="font-bold text-white">{tx.title}</div>
                        <div className="text-[11px] text-fgText-secondary font-mono">
                          {tx.ref} • {new Date(tx.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div
                        className={`font-mono font-bold ${
                          tx.isCredit ? 'text-emerald-400' : 'text-white'
                        }`}
                      >
                        {tx.isCredit ? '+' : '-'}{formatNaira(tx.amountNgn)}
                      </div>
                      <span className="text-[10px] text-fgText-secondary uppercase font-mono">{tx.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 2. DEPOSIT TAB */}
      {activeTab === 'DEPOSIT' && (
        <div className="fg-card p-6 max-w-2xl mx-auto space-y-6">
          <div className="border-b border-white/[0.08] pb-4">
            <h2 className="text-lg font-heading font-extrabold text-white">Deposit Funds into Giants Vault</h2>
            <p className="text-xs text-fgText-secondary mt-1">
              Top up your central Naira balance instantly via dedicated dynamic virtual bank transfer.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-[#0e1a12] border border-emerald-500/30 space-y-3">
            <div className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
              Transfer to Dedicated Virtual Account
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
              <div className="p-3 bg-black/40 rounded-lg border border-white/[0.08]">
                <span className="text-[10px] text-fgText-secondary uppercase block">Bank Name</span>
                <span className="font-bold text-white">{vault.dedicatedAccount?.bankName || 'Wema Bank'}</span>
              </div>
              <div className="p-3 bg-black/40 rounded-lg border border-white/[0.08] flex justify-between items-center">
                <div>
                  <span className="text-[10px] text-fgText-secondary uppercase block">Account Number</span>
                  <span className="font-bold text-emerald-400 text-sm tracking-wider">
                    {vault.dedicatedAccount?.accountNumber || '7041289410'}
                  </span>
                </div>
                <button
                  onClick={() => handleCopy(vault.dedicatedAccount?.accountNumber || '7041289410', 'deposit-acc')}
                  className="p-1.5 text-fgText-secondary hover:text-white"
                >
                  {copied === 'deposit-acc' ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
              <div className="p-3 bg-black/40 rounded-lg border border-white/[0.08] sm:col-span-2">
                <span className="text-[10px] text-fgText-secondary uppercase block">Beneficiary Name</span>
                <span className="font-bold text-white">{vault.dedicatedAccount?.accountName || 'FG / TRADER'}</span>
              </div>
            </div>
            <p className="text-[11px] text-fgText-secondary leading-relaxed">
              Deposits are recognized automatically via instant webhook notification and posted straight into your Giants Vault balance without manual intervention.
            </p>
          </div>

          <div className="flex justify-between items-center pt-2">
            <button
              onClick={() => setActiveTab('OVERVIEW')}
              className="text-xs text-fgText-secondary hover:text-white"
            >
              &larr; Back to Overview
            </button>
            <Link
              href="/dashboard/challenges/buy"
              className="py-2.5 px-4 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs uppercase tracking-wider transition-colors"
            >
              Ready to Buy Challenge &rarr;
            </Link>
          </div>
        </div>
      )}

      {/* 3. WITHDRAW TAB */}
      {activeTab === 'WITHDRAW' && (
        <div className="fg-card p-6 max-w-2xl mx-auto space-y-6">
          <div className="border-b border-white/[0.08] pb-4">
            <h2 className="text-lg font-heading font-extrabold text-white">Withdraw Profits & Vault Capital</h2>
            <p className="text-xs text-fgText-secondary mt-1">
              Disburse funds from Giants Vault directly to your bound Nigerian bank account.
            </p>
          </div>

          <form onSubmit={handleRequestWithdrawal} className="space-y-4">
            <div>
              <label className="block text-[11px] font-bold text-fgText-secondary uppercase tracking-wider mb-1.5">
                Select Destination Bank Account
              </label>
              <select
                value={selectedBankId}
                onChange={(e) => setSelectedBankId(e.target.value)}
                className="fg-input font-mono"
              >
                {vault.boundBankAccounts?.map((b) => (
                  <option key={b.id} value={b.id} className="bg-neutral-900 text-white">
                    {b.bankName} — •••• {b.accountNumber.slice(-4)} ({b.accountName})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-fgText-secondary uppercase tracking-wider mb-1.5">
                Withdrawal Amount in NGN (₦)
              </label>
              <input
                type="number"
                min="5000"
                step="1000"
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
                placeholder="e.g. 500000"
                className="fg-input font-mono text-sm"
              />
              <div className="flex justify-between text-[11px] text-fgText-secondary mt-1">
                <span>Available in Vault: {formatNaira(vault.availableBalanceNgn)}</span>
                <button
                  type="button"
                  onClick={() => setWithdrawAmount(vault.availableBalanceNgn.toString())}
                  className="text-emerald-400 hover:underline font-semibold"
                >
                  Withdraw All
                </button>
              </div>
            </div>

            {withdrawError && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
                {withdrawError}
              </div>
            )}

            {withdrawSuccess && (
              <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs">
                {withdrawSuccess}
              </div>
            )}

            <button
              type="submit"
              disabled={withdrawLoading || vault.availableBalanceNgn < 5000}
              className="w-full py-3 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-black font-heading font-extrabold text-xs uppercase tracking-wider transition-all"
            >
              {withdrawLoading ? 'Processing Disbursement...' : 'Confirm & Disburse Funds'}
            </button>
          </form>

          <div className="text-center pt-2">
            <button
              onClick={() => setActiveTab('OVERVIEW')}
              className="text-xs text-fgText-secondary hover:text-white"
            >
              &larr; Back to Overview
            </button>
          </div>
        </div>
      )}

      {/* 4. GIANTS SPEND CARD TAB */}
      {activeTab === 'SPEND_CARD' && (
        <div className="fg-card p-6 max-w-3xl mx-auto space-y-6">
          <div className="border-b border-white/[0.08] pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-heading font-extrabold text-white flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-emerald-400" />
                <span>Giants Spend Card (Custom NGN Card)</span>
              </h2>
              <p className="text-xs text-fgText-secondary mt-0.5">
                Debit card spending straight from your Giants Vault balance. Accepted everywhere Verve or Mastercard are accepted.
              </p>
            </div>
            {/* Card Variant Picker */}
            <div className="flex items-center gap-1 p-1 bg-black/40 rounded-lg border border-white/[0.08] text-xs font-semibold">
              <button
                onClick={() => setSelectedCardType('MASTERCARD')}
                className={`px-3 py-1 rounded-md transition-colors ${
                  selectedCardType === 'MASTERCARD' ? 'bg-emerald-500 text-black font-bold' : 'text-fgText-secondary hover:text-white'
                }`}
              >
                Mastercard
              </button>
              <button
                onClick={() => setSelectedCardType('VERVE')}
                className={`px-3 py-1 rounded-md transition-colors ${
                  selectedCardType === 'VERVE' ? 'bg-emerald-500 text-black font-bold' : 'text-fgText-secondary hover:text-white'
                }`}
              >
                Verve
              </button>
            </div>
          </div>

          {/* Interactive Card Presentation */}
          <div className="max-w-md mx-auto">
            <div className="relative w-full aspect-[1.58/1] rounded-2xl p-6 bg-gradient-to-br from-[#12281a] via-[#09150e] to-[#040806] border border-emerald-500/40 shadow-[0_15px_40px_rgba(0,0,0,0.6)] flex flex-col justify-between overflow-hidden">
              <div className="absolute top-0 right-0 w-40 h-40 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none" />

              <div className="flex items-center justify-between">
                <span className="font-heading font-extrabold text-sm tracking-widest text-white">FUNDEDGIANTS</span>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-black/50 text-emerald-400 border border-emerald-500/30">
                  {selectedCardType}
                </span>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-10 h-7 rounded bg-amber-400/90 border border-amber-300 shadow-inner" />
                <span className="text-[10px] text-fgText-secondary font-mono tracking-widest">DEBIT • NIGERIA</span>
              </div>

              <div>
                <div className="font-mono text-base tracking-widest text-white font-semibold">5399 •••• •••• 8291</div>
                <div className="flex items-center justify-between mt-3 text-xs text-fgText-secondary font-mono">
                  <span className="uppercase text-white font-bold">{vault.dedicatedAccount?.accountName || 'JOHN DOE'}</span>
                  <span>EXP 11/29</span>
                </div>
              </div>
            </div>
          </div>

          {/* Card Features & Controls */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="p-3.5 rounded-xl bg-[#0e1a12] border border-white/[0.08] space-y-1">
              <span className="text-[10px] text-fgText-secondary uppercase font-bold block">Online Channels</span>
              <span className="text-white font-medium">Web checkout, subscriptions & digital payments</span>
            </div>
            <div className="p-3.5 rounded-xl bg-[#0e1a12] border border-white/[0.08] space-y-1">
              <span className="text-[10px] text-fgText-secondary uppercase font-bold block">POS Terminals</span>
              <span className="text-white font-medium">In-store merchant purchases across Nigeria</span>
            </div>
            <div className="p-3.5 rounded-xl bg-[#0e1a12] border border-white/[0.08] space-y-1">
              <span className="text-[10px] text-fgText-secondary uppercase font-bold block">ATM Cash Dispense</span>
              <span className="text-white font-medium">Nationwide local currency ATM withdrawals</span>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-[#0e1a12] border border-white/[0.08] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Lock className="w-5 h-5 text-emerald-400" />
              <div>
                <div className="text-xs font-bold text-white">Card Security & Spending Limit</div>
                <div className="text-[11px] text-fgText-secondary">Daily limit linked to available Vault balance</div>
              </div>
            </div>
            <span className="text-xs font-mono font-bold text-emerald-400">ACTIVE</span>
          </div>

          <div className="text-center pt-2">
            <button
              onClick={() => setActiveTab('OVERVIEW')}
              className="text-xs text-fgText-secondary hover:text-white"
            >
              &larr; Back to Overview
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
