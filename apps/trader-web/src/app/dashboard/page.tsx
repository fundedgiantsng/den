'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Wallet,
  ArrowUpRight,
  Plus,
  Coins,
  ChevronRight,
  TrendingUp,
  CreditCard,
  Share2,
  SlidersHorizontal,
  ArrowDownLeft,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';
import { formatNaira } from '@/lib/format';

interface AccountItem {
  id: string;
  challengeNumber?: string;
  planName: string;
  planType: string;
  currentPhase: string;
  sizeNgn: number;
  currentBalanceNgn?: number;
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
    withdrawableProfitsNgn: 2480000.0,
    totalCapitalNgn: 60000000.0,
  });

  const [activeAccounts, setActiveAccounts] = useState<AccountItem[]>([
    {
      id: 'FG-48291',
      planName: 'Rhino Rush',
      planType: 'RHINO_RUSH',
      currentPhase: 'Funded',
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
      currentPhase: 'Instant Funding',
      sizeNgn: 50000000,
      profitNgn: 820000,
      profitPercent: '+1.64%',
      dailyDrawdownNgn: 220000,
      dailyDrawdownLimitNgn: 2000000,
      status: 'Active',
      platform: 'SteraTrader',
    },
  ]);

  const [recentActivity, setRecentActivity] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(false);

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
          withdrawableProfitsNgn: wData.withdrawableProfitsNgn ?? prev.withdrawableProfitsNgn,
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
        if (Array.isArray(txData)) {
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

  return (
    <div className="space-y-4 md:space-y-6 max-w-7xl mx-auto w-full pb-10">
      {/* Welcome Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/[0.08] pb-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-heading font-extrabold text-white flex items-center gap-2">
            <span>Trading Overview</span>
            <span className="text-base sm:text-xl">👋</span>
          </h1>
          <p className="text-[11px] sm:text-xs text-fgText-secondary mt-0.5">
            Your live Nigerian capital allocation, Giants Vault balance, and SteraTrader accounts.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/dashboard/challenges/buy"
            className="py-1.5 px-3 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs uppercase tracking-wider transition-colors flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Buy Challenge</span>
          </Link>
          <button
            onClick={fetchDashboardData}
            disabled={loading}
            className="p-1.5 rounded-lg bg-white/[0.04] text-fgText-secondary hover:text-white transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Top 3 Metric Cards Grid (Modular & Disciplined Font Sizing) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {/* Card 1: Giants Vault (NGN) */}
        <div className="fg-card p-4 sm:p-5 flex flex-col justify-between space-y-3">
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

          {/* Deposit and Manage Buttons */}
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

        {/* Card 2: Cumulative Trading Performance */}
        <div className="fg-card p-4 sm:p-5 flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-fgText-secondary">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              <span>Performance & Payouts</span>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
              +6.84% Total
            </span>
          </div>

          <div>
            <div className="text-xl sm:text-2xl md:text-3xl font-bold font-mono text-emerald-400 tracking-tight">
              +{formatNaira(wallet.withdrawableProfitsNgn)}
            </div>
            <p className="text-xs text-fgText-muted mt-1 font-medium">
              Accumulated Withdrawable Trader Share
            </p>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <Link
              href="/dashboard/wallet?tab=WITHDRAW"
              className="w-full py-2 px-2.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-white text-xs font-semibold flex items-center justify-center gap-1 transition-all"
            >
              <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400" />
              <span>Request Payout</span>
            </Link>
          </div>
        </div>

        {/* Card 3: Total Allocated Capital */}
        <div className="fg-card p-4 sm:p-5 flex flex-col justify-between space-y-3 sm:col-span-2 lg:col-span-1">
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

      {/* Main Content Grid: Accounts & Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Column: Active Trading Accounts */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between border-b border-white/[0.08] pb-2">
            <h2 className="text-xs font-bold text-fgText-secondary uppercase tracking-wider">
              Active Trading Accounts
            </h2>
            <Link
              href="/dashboard/trading-accounts"
              className="text-xs text-emerald-400 hover:underline font-semibold"
            >
              View All ({activeAccounts.length}) &rarr;
            </Link>
          </div>

          <div className="space-y-4">
            {activeAccounts.map((acc) => {
              const isPhoenix = acc.planType.includes('PHOENIX');
              const isRhino = acc.planType.includes('RHINO');

              let badgeText = acc.currentPhase || (isPhoenix ? 'Instant Funding' : 'Challenge');
              if (isPhoenix) badgeText = 'Instant Funding';

              const isFundedPhase = badgeText === 'Funded' || isPhoenix;
              const ddPercentage = Math.min(100, Math.round((acc.dailyDrawdownNgn / acc.dailyDrawdownLimitNgn) * 100));
              const remainingHeadroomNgn = Math.max(0, acc.dailyDrawdownLimitNgn - acc.dailyDrawdownNgn);

              return (
                <div
                  key={acc.id}
                  className="fg-card p-4 sm:p-5 space-y-4 hover:border-emerald-500/30 transition-all shadow-cardGlow"
                >
                  {/* Account Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-white/[0.06]">
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

                    <div className="sm:text-right">
                      <span className="text-[10px] uppercase font-semibold text-fgText-muted tracking-wider block">
                        Capital Allocation
                      </span>
                      <div className="text-base sm:text-lg md:text-xl font-bold font-mono text-white tracking-tight">
                        {formatNaira(acc.sizeNgn)}
                      </div>
                    </div>
                  </div>

                  {/* Modular Metric Grid (Legible, High-Contrast Typography) */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-3 p-3 sm:p-3.5 rounded-xl bg-bg-card border border-white/[0.06]">
                    {/* Metric 1: Net Profit */}
                    <div className="space-y-0.5">
                      <span className="text-[10px] uppercase font-semibold text-fgText-muted tracking-wider block">
                        Net Profit / P&L
                      </span>
                      <div className="text-sm sm:text-base font-bold font-mono text-emerald-400 tracking-tight">
                        +{formatNaira(acc.profitNgn)}
                      </div>
                      <span className="text-[11px] font-semibold text-emerald-300 font-mono block">
                        {acc.profitPercent} Gain
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
                  <div className="space-y-1.5 pt-1">
                    <div className="flex justify-between text-xs font-mono">
                      <span className="text-fgText-secondary font-medium">Daily Risk Cushion:</span>
                      <span className="text-white font-bold">{ddPercentage}% used ({100 - ddPercentage}% remaining)</span>
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

                  {/* Card Action Footer */}
                  <div className="flex items-center justify-between pt-2 border-t border-white/[0.06] text-xs">
                    <span className="text-fgText-secondary">
                      Leverage: <strong className="text-white">{isPhoenix ? '1:30' : '1:100'}</strong>
                    </span>
                    <Link
                      href={`/dashboard/trading-accounts/${acc.id}`}
                      className="text-xs font-bold text-emerald-400 hover:text-emerald-300 flex items-center gap-1.5 transition-colors"
                    >
                      <span>Launch SteraTrader Terminal</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Giants Spend Card Banner */}
          <div className="fg-card p-4 bg-gradient-to-r from-[#0e1a12] to-[#0a1210] border border-emerald-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 flex-shrink-0">
                <CreditCard className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-bold text-white">Giants Spend Card (Custom NGN Card)</div>
                <div className="text-[10px] text-fgText-secondary">
                  Spends directly from Giants Vault. Accepted online, POS & ATM nationwide.
                </div>
              </div>
            </div>
            <Link
              href="/dashboard/wallet?tab=SPEND_CARD"
              className="py-1.5 px-3 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] text-white text-xs font-semibold whitespace-nowrap text-center transition-colors"
            >
              Configure Card &rarr;
            </Link>
          </div>
        </div>

        {/* Right Column: Ledger Activity Log */}
        <div className="lg:col-span-5 space-y-4">
          <div className="flex items-center justify-between border-b border-white/[0.08] pb-2">
            <h2 className="text-xs font-bold text-fgText-secondary uppercase tracking-wider">
              Recent Activity
            </h2>
            <Link
              href="/dashboard/wallet"
              className="text-[11px] text-emerald-400 hover:underline font-semibold"
            >
              Vault Ledger &rarr;
            </Link>
          </div>

          <div className="fg-card p-4 divide-y divide-white/[0.06]">
            {recentActivity.length === 0 ? (
              <div className="py-6 text-center text-xs text-fgText-secondary font-mono">
                No recent activity recorded.
              </div>
            ) : (
              recentActivity.slice(0, 5).map((act) => (
                <div key={act.id} className="py-2.5 first:pt-0 last:pb-0 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                        act.isCredit
                          ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                          : 'bg-white/[0.04] text-white border border-white/[0.08]'
                      }`}
                    >
                      {act.isCredit ? <ArrowDownLeft className="w-3.5 h-3.5" /> : <ArrowUpRight className="w-3.5 h-3.5" />}
                    </div>
                    <div>
                      <div className="font-semibold text-white text-[11px] leading-tight">{act.title}</div>
                      <div className="text-[10px] text-fgText-secondary font-mono mt-0.5">{act.ref}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div
                      className={`font-mono font-bold text-[11px] ${
                        act.isCredit ? 'text-emerald-400' : 'text-white'
                      }`}
                    >
                      {act.isCredit ? '+' : '-'}{formatNaira(act.amountNgn)}
                    </div>
                    <span className="text-[9px] text-fgText-secondary uppercase font-mono">{act.status}</span>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Quick Support & Documentation */}
          <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] text-[11px] text-fgText-secondary space-y-1">
            <div className="font-semibold text-white flex items-center gap-1.5">
              <span>Trading Rules Reminder</span>
            </div>
            <p className="leading-relaxed">
              4% Maximum Daily Drawdown resets daily at 00:00 UTC. Minimum 2% required for on-demand profit disbursements.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
