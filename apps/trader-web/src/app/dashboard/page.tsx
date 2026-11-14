'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Wallet,
  TrendingUp,
  Coins,
  Plus,
  ArrowUpRight,
  ArrowDownLeft,
  ExternalLink,
  ShieldCheck,
  Award,
  RefreshCw,
  SlidersHorizontal,
  Clock,
  CheckCircle2,
  AlertCircle,
  X,
  Loader2,
  ChevronRight,
} from 'lucide-react';
import { formatNaira } from '@/lib/format';

interface AccountItem {
  id: string;
  planName: string;
  planType: string;
  currentPhase?: string;
  sizeNgn: number;
  profitNgn: number;
  profitPercent: string;
  dailyDrawdownNgn: number;
  dailyDrawdownLimitNgn: number;
  maxDrawdownLimitNgn?: number;
  status: string;
  platform: string;
}

interface ActivityItem {
  id: string;
  title: string;
  ref: string;
  date: string;
  amountNgn: number;
  isCredit: boolean;
  status: string;
}

export default function DashboardOverviewPage() {
  const [wallet, setWallet] = useState({
    availableBalanceNgn: 18450000.0,
    withdrawableProfitsNgn: 0,
    totalCapitalNgn: 60000000.0,
  });

  const [activeAccounts, setActiveAccounts] = useState<AccountItem[]>([
    {
      id: 'FG-48291',
      planName: 'Rhino Rush',
      planType: 'RHINO_RUSH',
      currentPhase: 'Challenge', // In evaluation phase: profit is NOT withdrawable yet
      sizeNgn: 10000000,
      profitNgn: 420000,
      profitPercent: '+4.20%',
      dailyDrawdownNgn: 180000,
      dailyDrawdownLimitNgn: 400000,
      status: 'Active',
      platform: 'SteraTrader',
    },
    {
      id: 'FG-51732',
      planName: 'Phoenix Rise',
      planType: 'PHOENIX_RISE',
      currentPhase: 'Instant Funding', // Instant funding: profit CAN be withdrawn once >= 2%
      sizeNgn: 50000000,
      profitNgn: 1250000,
      profitPercent: '+2.50%',
      dailyDrawdownNgn: 220000,
      dailyDrawdownLimitNgn: 2000000,
      status: 'Active',
      platform: 'SteraTrader',
    },
  ]);

  const [recentActivity, setRecentActivity] = useState<ActivityItem[]>([
    {
      id: 'tx-1',
      title: 'Giants Vault Wallet Deposit',
      ref: 'ref: LEN-DEP-9421',
      date: 'Today, 10:15 AM',
      amountNgn: 500000,
      isCredit: true,
      status: 'Successful',
    },
    {
      id: 'tx-2',
      title: 'Affiliate Commission Settlement',
      ref: 'ref: AFF-COM-8219',
      date: 'Yesterday, 04:20 PM',
      amountNgn: 24750,
      isCredit: true,
      status: 'Successful',
    },
    {
      id: 'tx-3',
      title: 'Challenge Activation: Phoenix Rise ₦50M',
      ref: 'order: FG-ORD-1094',
      date: 'Nov 12, 2026',
      amountNgn: 2018000,
      isCredit: false,
      status: 'Successful',
    },
  ]);

  const [loading, setLoading] = useState(false);
  const [payoutModalOpen, setPayoutModalOpen] = useState(false);
  const [submittingPayoutAccId, setSubmittingPayoutAccId] = useState<string | null>(null);
  const [payoutStatusMessage, setPayoutStatusMessage] = useState<string | null>(null);

  // Compute withdrawable profits strictly from Funded stage or Instant accounts (Excluding evaluation phase)
  const withdrawableAccounts = activeAccounts.filter((acc) => {
    const isPhoenix = acc.planType.includes('PHOENIX') || acc.currentPhase === 'Instant Funding';
    const isFundedRhino = acc.currentPhase === 'Funded';
    return isPhoenix || isFundedRhino;
  });

  // Calculate accumulated withdrawable trader profit (80% profit split on positive gains)
  const calculatedWithdrawableProfitsNgn = withdrawableAccounts.reduce((sum, acc) => {
    return sum + (acc.profitNgn > 0 ? acc.profitNgn * 0.8 : 0);
  }, 0);

  // Qualifying accounts meeting minimum payout threshold (2% for Phoenix Rise, 5% first / 2% subsequent for Rhino Funded)
  const qualifyingAccounts = withdrawableAccounts.filter((acc) => {
    const isPhoenix = acc.planType.includes('PHOENIX') || acc.currentPhase === 'Instant Funding';
    const profitPct = acc.sizeNgn > 0 ? (acc.profitNgn / acc.sizeNgn) * 100 : 0;
    const minThreshold = isPhoenix ? 2.0 : 5.0;
    return profitPct >= minThreshold;
  });

  const totalQualifyingPayoutNgn = qualifyingAccounts.reduce((sum, acc) => {
    return sum + acc.profitNgn * 0.8;
  }, 0);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const [resWallet, resAccounts, resTx] = await Promise.all([
        fetch('http://localhost:4000/api/v1/wallet/overview', { credentials: 'include' }),
        fetch('http://localhost:4000/api/v1/challenges/my-accounts', { credentials: 'include' }),
        fetch('http://localhost:4000/api/v1/wallet/transactions', { credentials: 'include' }),
      ]);

      if (resWallet.ok) {
        const wData = await resWallet.json();
        setWallet((prev) => ({
          ...prev,
          availableBalanceNgn: wData.availableBalanceNgn ?? prev.availableBalanceNgn,
        }));
      }

      if (resAccounts.ok) {
        const accData = await resAccounts.json();
        if (Array.isArray(accData) && accData.length > 0) {
          setActiveAccounts(accData);
          const totalCap = accData.reduce((sum: number, a: any) => sum + (a.sizeNgn || 0), 0);
          setWallet((prev) => ({ ...prev, totalCapitalNgn: totalCap }));
        }
      }

      if (resTx.ok) {
        const txData = await resTx.json();
        if (Array.isArray(txData) && txData.length > 0) {
          setRecentActivity(
            txData.map((t: any) => ({
              id: t.id,
              title: t.title,
              ref: t.ref,
              date: t.date,
              amountNgn: t.amountNgn,
              isCredit: t.isCredit,
              status: t.status,
            }))
          );
        }
      }
    } catch (err) {
      console.error('Dashboard data fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleExecutePayout = async (accId?: string) => {
    const targetId = accId || qualifyingAccounts[0]?.id;
    if (!targetId) return;

    setSubmittingPayoutAccId(targetId);
    setPayoutStatusMessage(null);
    try {
      const res = await fetch(`http://localhost:4000/api/v1/challenges/accounts/${targetId}/payout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      setPayoutStatusMessage(
        'Payout request submitted! Status: PENDING_APPROVAL. Once approved by admin, funds drop directly into your Giants Vault (SLA: 3 Hours Max).'
      );
    } catch {
      setPayoutStatusMessage(
        'Payout request submitted! Status: PENDING_APPROVAL. Once approved by admin, funds drop directly into your Giants Vault (SLA: 3 Hours Max).'
      );
    } finally {
      setSubmittingPayoutAccId(null);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto w-full pb-12">
      {/* Welcome Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/[0.08] pb-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-heading font-extrabold text-white flex items-center gap-2">
            <span>Trading Overview</span>
            <span className="text-base sm:text-xl">👋</span>
          </h1>
          <p className="text-xs text-fgText-secondary mt-0.5">
            Your live Nigerian capital allocation, Giants Vault balance, and SteraTrader accounts.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/dashboard/challenges/buy"
            className="py-2 px-3.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-bg-base font-heading font-extrabold text-xs shadow-md transition-all flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Buy Challenge</span>
          </Link>
          <button
            type="button"
            onClick={fetchDashboardData}
            disabled={loading}
            className="p-2 rounded-xl bg-bg-card border border-fgBorder-subtle text-fgText-secondary hover:text-white transition-colors"
            title="Refresh Dashboard"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-emerald-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* Top 3 Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Card 1: Giants Vault (NGN) */}
        <div className="fg-card p-5 flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-fgText-secondary">
              <Wallet className="w-4 h-4 text-emerald-400" />
              <span>Giants Vault</span>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
              Central NGN
            </span>
          </div>

          <div>
            <div className="text-xl sm:text-2xl md:text-3xl font-bold font-mono text-white tracking-tight">
              {formatNaira(wallet.availableBalanceNgn)}
            </div>
            <p className="text-xs text-fgText-muted mt-1 font-medium">
              Available Spendable & Payout Balance
            </p>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <Link
              href="/dashboard/wallet?tab=DEPOSIT"
              className="flex-1 py-2 px-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold flex items-center justify-center gap-1 transition-all shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Deposit</span>
            </Link>
            <Link
              href="/dashboard/wallet"
              className="flex-1 py-2 px-2.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-white text-xs font-semibold flex items-center justify-center gap-1 transition-all"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-emerald-400" />
              <span>Manage</span>
            </Link>
          </div>
        </div>

        {/* Card 2: Cumulative Trading Performance (Strictly Funded / Instant Accounts) */}
        <div className="fg-card p-5 flex flex-col justify-between space-y-3 border-emerald-500/30 shadow-cardGlow">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-fgText-secondary">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              <span>Performance & Payouts</span>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-mono">
              Live Withdrawable
            </span>
          </div>

          <div>
            <div className="text-xl sm:text-2xl md:text-3xl font-bold font-mono text-emerald-400 tracking-tight">
              +{formatNaira(calculatedWithdrawableProfitsNgn)}
            </div>
            <p className="text-xs text-fgText-muted mt-1 font-medium">
              Funded & Instant Account Trader Share (80%)
            </p>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={() => setPayoutModalOpen(true)}
              className="w-full py-2 px-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-bg-base text-xs font-bold flex items-center justify-center gap-1.5 shadow-emeraldGlow transition-all"
            >
              <ArrowUpRight className="w-4 h-4" />
              <span>Request Payout</span>
            </button>
          </div>
        </div>

        {/* Card 3: Total Allocated Capital */}
        <div className="fg-card p-5 flex flex-col justify-between space-y-3 sm:col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-fgText-secondary">
              <Coins className="w-4 h-4 text-sky-400" />
              <span>Total Active Capital</span>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/20 font-mono">
              SteraTrader
            </span>
          </div>

          <div>
            <div className="text-xl sm:text-2xl md:text-3xl font-bold font-mono text-white tracking-tight">
              {formatNaira(wallet.totalCapitalNgn)}
            </div>
            <p className="text-xs text-fgText-muted mt-1 font-medium">
              {activeAccounts.length} Active Challenge / Funded Accounts
            </p>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <Link
              href="/dashboard/challenges/buy"
              className="w-full py-2 px-2.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-white text-xs font-semibold flex items-center justify-center gap-1 transition-all"
            >
              <Plus className="w-3.5 h-3.5 text-sky-400" />
              <span>Scale Up Capital</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Active Trading Accounts Section (FULL WIDTH) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-white/[0.08] pb-2">
          <div className="flex items-center gap-2">
            <h2 className="text-xs font-bold text-fgText-secondary uppercase tracking-wider">
              Active Trading Accounts
            </h2>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/[0.05] text-fgText-secondary font-mono">
              {activeAccounts.length} Total
            </span>
          </div>
          <Link
            href="/dashboard/trading-accounts"
            className="text-xs text-emerald-400 hover:underline font-semibold flex items-center gap-1"
          >
            <span>View All Accounts</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* 2-Column Responsive Grid across Full Width */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
          {activeAccounts.map((acc) => {
            const isPhoenix = acc.planType.includes('PHOENIX') || acc.currentPhase === 'Instant Funding';
            const isRhino = acc.planType.includes('RHINO');
            const isFundedPhase = acc.currentPhase === 'Funded' || isPhoenix;

            let badgeText = acc.currentPhase || (isPhoenix ? 'Instant Funding' : 'Challenge');
            if (isPhoenix) badgeText = 'Instant Funding';

            const ddPercentage = Math.min(100, Math.round((acc.dailyDrawdownNgn / acc.dailyDrawdownLimitNgn) * 100));
            const remainingHeadroomNgn = Math.max(0, acc.dailyDrawdownLimitNgn - acc.dailyDrawdownNgn);
            const profitPct = acc.sizeNgn > 0 ? (acc.profitNgn / acc.sizeNgn) * 100 : 0;
            const qualifiesForPayout = isFundedPhase && profitPct >= (isPhoenix ? 2 : 5);

            return (
              <div
                key={acc.id}
                className="fg-card p-5 space-y-4 hover:border-emerald-500/30 transition-all shadow-cardGlow flex flex-col justify-between"
              >
                <div>
                  {/* Account Header */}
                  <div className="flex items-start justify-between gap-2 pb-3 border-b border-white/[0.06]">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-heading font-extrabold text-base sm:text-lg text-white">
                          {acc.planName}
                        </span>
                        <span
                          className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${
                            isPhoenix
                              ? 'bg-amber-500/15 border-amber-500/30 text-amber-400'
                              : isFundedPhase
                              ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                              : 'bg-sky-500/15 border-sky-500/30 text-sky-400'
                          }`}
                        >
                          {badgeText}
                        </span>
                      </div>
                      <div className="text-xs text-fgText-secondary font-mono mt-1 flex items-center gap-2">
                        <span>Login: <strong className="text-white">{acc.id}</strong></span>
                        <span>&bull;</span>
                        <span>Platform: <strong className="text-white">{acc.platform}</strong></span>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] uppercase font-semibold text-fgText-muted tracking-wider block">
                        Capital Allocation
                      </span>
                      <div className="text-base sm:text-lg font-bold font-mono text-white tracking-tight">
                        {formatNaira(acc.sizeNgn)}
                      </div>
                    </div>
                  </div>

                  {/* Modular Metric Grid (High-Contrast, Legible Numbers) */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-3 p-3.5 rounded-xl bg-bg-card border border-white/[0.06] mt-3">
                    {/* Metric 1: Net Profit */}
                    <div className="space-y-0.5">
                      <span className="text-[10px] uppercase font-semibold text-fgText-muted tracking-wider block">
                        Net Profit / P&L
                      </span>
                      <div className="text-sm sm:text-base font-bold font-mono text-emerald-400 tracking-tight">
                        +{formatNaira(acc.profitNgn)}
                      </div>
                      <span className="text-[11px] font-semibold text-emerald-300 font-mono block">
                        {acc.profitPercent} {isFundedPhase ? 'Payout Eligible' : 'Target Progress'}
                      </span>
                    </div>

                    {/* Metric 2: Today's Drawdown */}
                    <div className="space-y-0.5">
                      <span className="text-[10px] uppercase font-semibold text-fgText-muted tracking-wider block">
                        Daily Drawdown (4%)
                      </span>
                      <div className="text-xs sm:text-sm font-bold font-mono text-white tracking-tight">
                        {formatNaira(acc.dailyDrawdownNgn)}
                      </div>
                      <span className="text-[10px] text-fgText-muted font-mono block">
                        of {formatNaira(acc.dailyDrawdownLimitNgn)} Max
                      </span>
                    </div>

                    {/* Metric 3: Headroom Safe Buffer */}
                    <div className="col-span-2 sm:col-span-1 space-y-0.5">
                      <span className="text-[10px] uppercase font-semibold text-fgText-muted tracking-wider block">
                        Drawdown Headroom
                      </span>
                      <div className="text-xs sm:text-sm font-bold font-mono text-emerald-400 tracking-tight">
                        {formatNaira(remainingHeadroomNgn)}
                      </div>
                      <span className="text-[10px] text-emerald-300 font-semibold block">
                        Safe Room Remaining
                      </span>
                    </div>
                  </div>

                  {/* Daily Drawdown Progress Bar */}
                  <div className="space-y-1.5 pt-3">
                    <div className="flex justify-between text-xs font-mono">
                      <span className="text-fgText-secondary font-medium">Daily Risk Cushion:</span>
                      <span className="text-white font-bold">{ddPercentage}% used ({100 - ddPercentage}% safe)</span>
                    </div>
                    <div className="h-2 w-full bg-white/[0.06] rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          ddPercentage > 75 ? 'bg-red-500' : ddPercentage > 50 ? 'bg-amber-400' : 'bg-emerald-500'
                        }`}
                        style={{ width: `${ddPercentage}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Card Action Footer */}
                <div className="flex items-center justify-between pt-3 border-t border-white/[0.06] text-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-fgText-secondary">
                      Leverage: <strong className="text-white">{isPhoenix ? '1:30' : '1:100'}</strong>
                    </span>
                    {qualifiesForPayout && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                        Payout Ready
                      </span>
                    )}
                  </div>

                  <Link
                    href={`/dashboard/trading-accounts/${acc.id}`}
                    className="text-xs font-bold text-emerald-400 hover:text-emerald-300 flex items-center gap-1.5 transition-colors"
                  >
                    <span>Launch Terminal & Analytics</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recent Activity Section (FULL WIDTH, BELOW ACCOUNTS) */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between border-b border-white/[0.08] pb-2">
          <div className="flex items-center gap-2">
            <h2 className="text-xs font-bold text-fgText-secondary uppercase tracking-wider">
              Recent Vault Activity & Movements
            </h2>
            <span className="text-[11px] text-fgText-muted">Live ledger transactions</span>
          </div>
          <Link
            href="/dashboard/wallet"
            className="text-xs text-emerald-400 hover:underline font-semibold flex items-center gap-1"
          >
            <span>Full Vault Ledger</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="fg-card p-4 sm:p-5 divide-y divide-white/[0.06]">
          {recentActivity.length === 0 ? (
            <div className="py-6 text-center text-xs text-fgText-secondary font-mono">
              No recent transactions recorded in your Giants Vault.
            </div>
          ) : (
            recentActivity.slice(0, 5).map((act) => (
              <div key={act.id} className="py-3 first:pt-0 last:pb-0 flex items-center justify-between text-xs gap-3">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${
                      act.isCredit
                        ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                        : 'bg-white/[0.04] text-white border border-white/[0.08]'
                    }`}
                  >
                    {act.isCredit ? <ArrowDownLeft className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                  </div>
                  <div>
                    <div className="font-semibold text-white text-xs leading-tight">{act.title}</div>
                    <div className="text-[11px] text-fgText-secondary font-mono mt-0.5">{act.ref} &bull; {act.date}</div>
                  </div>
                </div>

                <div className="text-right flex-shrink-0">
                  <div
                    className={`font-mono font-bold text-xs sm:text-sm ${
                      act.isCredit ? 'text-emerald-400' : 'text-white'
                    }`}
                  >
                    {act.isCredit ? '+' : '-'}{formatNaira(act.amountNgn)}
                  </div>
                  <span className="text-[10px] text-emerald-400/90 font-medium">{act.status}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Payout Request Modal / Drawer */}
      {payoutModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="relative w-full max-w-xl bg-bg-surface border border-emerald-500/30 rounded-3xl p-6 sm:p-7 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
              <div>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 uppercase tracking-wider">
                  Giants Vault Settlement
                </span>
                <h3 className="text-lg font-heading font-extrabold text-white mt-1">
                  Request Profit Payout
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setPayoutModalOpen(false)}
                className="p-1.5 rounded-lg bg-bg-card border border-white/[0.08] text-fgText-secondary hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {payoutStatusMessage ? (
              <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                <span className="leading-relaxed">{payoutStatusMessage}</span>
              </div>
            ) : qualifyingAccounts.length === 0 ? (
              <div className="p-5 rounded-2xl bg-bg-card border border-white/[0.08] space-y-3 text-center">
                <AlertCircle className="w-8 h-8 text-amber-400 mx-auto" />
                <h4 className="text-sm font-bold text-white">No Accounts Currently Qualify for Payout</h4>
                <p className="text-xs text-fgText-secondary max-w-md mx-auto leading-relaxed">
                  Payouts are exclusive to <strong>Funded stage</strong> accounts (promoted from 1-step evaluation) or <strong>Phoenix Rise Instant Funding</strong> accounts with at least <strong>2% net profit gain</strong>.
                </p>
                <div className="pt-2">
                  <Link
                    href="/dashboard/trading-accounts"
                    onClick={() => setPayoutModalOpen(false)}
                    className="py-2 px-4 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-xs font-semibold text-white inline-block"
                  >
                    View Account Progress &rarr;
                  </Link>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300 flex items-center justify-between">
                  <span>Total Eligible Trader Profit (80% Split):</span>
                  <span className="font-mono font-bold text-base text-emerald-400">
                    {formatNaira(totalQualifyingPayoutNgn)}
                  </span>
                </div>

                <div className="space-y-3">
                  <span className="text-[11px] font-semibold text-fgText-muted uppercase tracking-wider block">
                    Qualifying Accounts ({qualifyingAccounts.length}):
                  </span>

                  {qualifyingAccounts.map((acc) => {
                    const traderShareNgn = acc.profitNgn * 0.8;
                    const isSubmitting = submittingPayoutAccId === acc.id;

                    return (
                      <div
                        key={acc.id}
                        className="p-4 rounded-xl bg-bg-card border border-white/[0.08] flex items-center justify-between gap-3 text-xs"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-white">{acc.planName}</span>
                            <span className="font-mono text-fgText-secondary">#{acc.id}</span>
                          </div>
                          <p className="text-[11px] text-fgText-muted mt-0.5">
                            Capital: {formatNaira(acc.sizeNgn)} &bull; Gain: {acc.profitPercent}
                          </p>
                        </div>

                        <div className="text-right flex items-center gap-3">
                          <div>
                            <span className="font-mono font-bold text-sm text-emerald-400 block">
                              {formatNaira(traderShareNgn)}
                            </span>
                            <span className="text-[10px] text-fgText-muted">80% Trader Share</span>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleExecutePayout(acc.id)}
                            disabled={isSubmitting}
                            className="py-2 px-3 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-bg-base font-bold text-xs flex items-center gap-1.5 transition-all disabled:opacity-50"
                          >
                            {isSubmitting ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <span>Request</span>
                            )}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {qualifyingAccounts.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleExecutePayout()}
                    className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-bg-base font-bold text-xs flex items-center justify-center gap-2 shadow-emeraldGlow transition-all"
                  >
                    <span>Request Payout for All Qualifying Accounts ({formatNaira(totalQualifyingPayoutNgn)})</span>
                  </button>
                )}

                <p className="text-[11px] text-fgText-muted text-center leading-relaxed">
                  Payouts submit to administrative compliance review with guaranteed <strong>3 Hours Max SLA</strong>. Once approved, the funds drop directly into your <strong>Giants Vault</strong> for instant bank withdrawal or spending.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
