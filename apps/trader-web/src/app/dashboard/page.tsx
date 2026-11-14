'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Wallet,
  TrendingUp,
  Coins,
  Plus,
  ArrowUpRight,
  ShieldCheck,
  Award,
  RefreshCw,
  Clock,
  CheckCircle2,
  AlertCircle,
  X,
  ChevronRight,
  Users,
  Copy,
  Check,
  Sparkles,
  Flame,
  ArrowRight,
} from 'lucide-react';
import { formatNaira } from '@/lib/format';

interface AccountItem {
  id: string;
  loginId: string;
  planName: 'Rhino Rush' | 'Phoenix Rise';
  stage: 'Challenge' | 'Funded';
  sizeNgn: number;
  status: 'Active' | 'Suspended' | 'Closed';
  platform: string;
  leverage: string;
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
    availableBalanceNgn: 12450000.0,
    withdrawableProfitsNgn: 2480000.0,
    totalCapitalNgn: 60000000.0,
  });

  const [activeAccounts, setActiveAccounts] = useState<AccountItem[]>([
    {
      id: 'FG-48291',
      loginId: '#FG-48291',
      planName: 'Rhino Rush',
      stage: 'Funded',
      sizeNgn: 10000000,
      status: 'Active',
      platform: 'SteraTrader',
      leverage: '1:100',
    },
    {
      id: 'FG-51732',
      loginId: '#FG-51732',
      planName: 'Rhino Rush',
      stage: 'Challenge',
      sizeNgn: 50000000,
      status: 'Active',
      platform: 'SteraTrader',
      leverage: '1:100',
    },
    {
      id: 'FG-60194',
      loginId: '#FG-60194',
      planName: 'Phoenix Rise',
      stage: 'Funded',
      sizeNgn: 25000000,
      status: 'Active',
      platform: 'SteraTrader',
      leverage: '1:30',
    },
  ]);

  const [recentActivity, setRecentActivity] = useState<ActivityItem[]>([
    {
      id: 'tx-1',
      title: 'Trading Payout',
      ref: 'FG-48291 • 2h ago',
      date: 'Today, 10:15 AM',
      amountNgn: 1240000,
      isCredit: true,
      status: 'Successful',
    },
    {
      id: 'tx-2',
      title: 'IB Commission',
      ref: 'Referral #FG2B47 • 3h ago',
      date: 'Yesterday, 04:20 PM',
      amountNgn: 500000,
      isCredit: true,
      status: 'Successful',
    },
    {
      id: 'tx-3',
      title: 'Prop Account Purchase',
      ref: '100K Challenge • 5h ago',
      date: 'Nov 12, 2026',
      amountNgn: 250000,
      isCredit: false,
      status: 'Successful',
    },
    {
      id: 'tx-4',
      title: 'Withdrawal Processed',
      ref: 'Bank Transfer • 1d ago',
      date: 'Nov 11, 2026',
      amountNgn: 1000000,
      isCredit: false,
      status: 'Successful',
    },
  ]);

  // Affiliate link copy
  const [copiedLink, setCopiedLink] = useState(false);
  const affiliateLink = 'https://fundedgiants.com/?ref=giantstrader';

  const handleCopyLink = () => {
    navigator.clipboard.writeText(affiliateLink);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto w-full pb-16">
      {/* 1. Header Greeting & Context */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-heading font-extrabold text-white tracking-tight flex items-center gap-2">
          <span>Good morning, John</span>
          <span className="text-2xl sm:text-3xl animate-bounce">👋</span>
        </h1>
        <p className="text-xs sm:text-sm text-fgText-secondary mt-1">
          Here's your platform overview
        </p>
      </div>

      {/* 2. Top 3 Primary Metric Cards in a Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: Giants Vault (Renamed, withdraw button removed, only Deposit button retained) */}
        <div className="relative overflow-hidden rounded-2xl bg-[#09120e] border border-white/[0.08] p-5 sm:p-6 hover:border-emerald-500/30 transition-all shadow-xl group">
          <div className="flex items-center justify-between mb-3">
            <Link href="/dashboard/wallet" className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center text-emerald-400">
                <Wallet className="w-4 h-4" />
              </div>
              <span className="text-xs font-semibold text-fgText-secondary group-hover:text-white transition-colors">
                Giants Vault
              </span>
            </Link>
            <ChevronRight className="w-4 h-4 text-fgText-muted group-hover:text-white group-hover:translate-x-0.5 transition" />
          </div>

          <div className="space-y-1">
            <div className="text-2xl sm:text-3xl font-bold font-mono text-white tracking-tight">
              {formatNaira(wallet.availableBalanceNgn)}
            </div>
            <div className="text-[11px] text-fgText-secondary font-medium">Available Balance</div>
          </div>

          <div className="pt-4">
            <Link
              href="/dashboard/wallet"
              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-[#00e575] hover:bg-[#00c966] text-black font-heading font-extrabold text-xs shadow-md shadow-emerald-500/20 active:scale-95 transition"
            >
              <Plus className="w-3.5 h-3.5 stroke-[3]" />
              <span>Deposit</span>
            </Link>
          </div>
        </div>

        {/* Card 2: Trading Performance (Request payout button removed) */}
        <div className="relative overflow-hidden rounded-2xl bg-[#09120e] border border-white/[0.08] p-5 sm:p-6 hover:border-emerald-500/30 transition-all shadow-xl group">
          {/* Sparkline Graphic */}
          <svg
            className="absolute right-4 bottom-4 w-28 h-14 text-emerald-400 opacity-50 pointer-events-none group-hover:scale-105 transition-transform"
            viewBox="0 0 100 40"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
          >
            <path d="M 0 35 Q 20 28 35 30 T 60 15 T 85 10 T 100 5" strokeLinecap="round" />
          </svg>

          <div className="flex items-center justify-between mb-3 relative z-10">
            <Link href="/dashboard/trading-accounts" className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center text-emerald-400">
                <TrendingUp className="w-4 h-4" />
              </div>
              <span className="text-xs font-semibold text-fgText-secondary group-hover:text-white transition-colors">
                Trading Performance
              </span>
            </Link>
            <ChevronRight className="w-4 h-4 text-fgText-muted group-hover:text-white group-hover:translate-x-0.5 transition" />
          </div>

          <div className="space-y-1 relative z-10">
            <div className="text-2xl sm:text-3xl font-bold font-mono text-[#00f59b] tracking-tight">
              +{formatNaira(wallet.withdrawableProfitsNgn)}
            </div>
            <div className="text-[11px] text-fgText-secondary font-medium">Total Withdrawable Profits</div>
          </div>

          <div className="pt-4 text-[11px] text-fgText-muted relative z-10">
            Automated Daily Profit Accrual
          </div>
        </div>

        {/* Card 3: Total Capital (Provider labeling removed) */}
        <div className="relative overflow-hidden rounded-2xl bg-[#09120e] border border-white/[0.08] p-5 sm:p-6 hover:border-emerald-500/30 transition-all shadow-xl group">
          <div className="absolute right-4 bottom-4 w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 opacity-80 pointer-events-none group-hover:scale-110 transition-transform">
            <Coins className="w-6 h-6" />
          </div>

          <div className="flex items-center justify-between mb-3">
            <Link href="/dashboard/trading-accounts" className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center text-emerald-400">
                <Coins className="w-4 h-4" />
              </div>
              <span className="text-xs font-semibold text-fgText-secondary group-hover:text-white transition-colors">
                Total Capital
              </span>
            </Link>
            <ChevronRight className="w-4 h-4 text-fgText-muted group-hover:text-white group-hover:translate-x-0.5 transition" />
          </div>

          <div className="space-y-1">
            <div className="text-2xl sm:text-3xl font-bold font-mono text-white tracking-tight">
              {formatNaira(wallet.totalCapitalNgn)}
            </div>
            <div className="text-[11px] text-fgText-secondary font-medium">Across All Accounts</div>
          </div>

          <div className="pt-4 text-[11px] text-fgText-muted">
            Combined Active Evaluation & Funded Capital
          </div>
        </div>
      </div>

      {/* 3. Main Dashboard Grid (Main 68% vs Sidebar 32%) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* ======================================================== */}
        {/* LEFT / MAIN COLUMN (lg:col-span-8)                      */}
        {/* ======================================================== */}
        <div className="lg:col-span-8 space-y-6">
          {/* A. Trading Accounts Section: FULL WIDTH LAYERED ROWS */}
          <div className="rounded-2xl bg-[#09120e] border border-white/[0.08] p-5 sm:p-6 space-y-4 shadow-xl">
            {/* Header Row */}
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center text-emerald-400">
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-heading font-bold text-white">Trading Accounts</h3>
                  <p className="text-xs text-fgText-secondary">Your active trading accounts</p>
                </div>
              </div>
              <Link
                href="/dashboard/trading-accounts"
                className="text-xs font-semibold text-[#00f59b] hover:text-emerald-300 transition flex items-center gap-1"
              >
                <span>View all</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {/* Stacked Full-Width Account Rows */}
            <div className="space-y-3">
              {activeAccounts.map((acc) => (
                <Link
                  key={acc.id}
                  href={`/dashboard/trading-accounts/${acc.id}`}
                  className="block rounded-xl bg-black/40 border border-white/[0.06] p-4 hover:border-emerald-500/40 hover:bg-white/[0.02] transition-all group"
                >
                  {/* Top Row: Type with Stage Badge + Login ID | Middle: Account Size | Edge: Status Active */}
                  <div className="flex items-center justify-between gap-2 border-b border-white/[0.04] pb-2.5 mb-2.5">
                    {/* Left: Type + Stage Badge + Login ID */}
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <div className="flex items-center gap-1.5">
                        <span className="font-heading font-extrabold text-white text-sm sm:text-base tracking-tight group-hover:text-emerald-400 transition-colors">
                          {acc.planName}
                        </span>
                        {/* Stage Badge on Type */}
                        <span
                          className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded-full ${
                            acc.stage === 'Funded'
                              ? 'bg-emerald-500/15 text-[#00f59b] border border-emerald-500/30'
                              : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                          }`}
                        >
                          {acc.stage}
                        </span>
                      </div>

                      {/* Login ID beside Type/Stage */}
                      <span className="font-mono text-xs text-fgText-muted font-bold">
                        {acc.loginId}
                      </span>
                    </div>

                    {/* Middle: Account Size */}
                    <div className="text-center hidden sm:block">
                      <span className="text-xs sm:text-sm font-mono font-bold text-white">
                        {formatNaira(acc.sizeNgn)}
                      </span>
                      <span className="text-[9px] text-fgText-muted uppercase tracking-wider block">
                        Account Size
                      </span>
                    </div>

                    {/* Right Edge: Status Active + Chevron */}
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/25 text-[#00f59b] font-semibold flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        <span>{acc.status}</span>
                      </span>
                      <ChevronRight className="w-4 h-4 text-fgText-muted group-hover:text-white group-hover:translate-x-0.5 transition" />
                    </div>
                  </div>

                  {/* Second Row: Platform SteraTrader below Type | Towards middle: Leverage */}
                  <div className="flex items-center justify-between text-xs text-fgText-secondary">
                    {/* Platform: SteraTrader */}
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-fgText-muted uppercase">Platform:</span>
                      <span className="font-semibold text-white font-mono text-[11px]">{acc.platform}</span>
                    </div>

                    {/* Mobile visible Account Size */}
                    <div className="sm:hidden text-right">
                      <span className="font-mono text-xs text-white font-bold">{formatNaira(acc.sizeNgn)}</span>
                    </div>

                    {/* Towards Middle: Leverage */}
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-fgText-muted uppercase">Leverage:</span>
                      <span className="font-bold text-emerald-400 font-mono text-[11px]">{acc.leverage}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* B. Recent Activity: DIRECTLY BELOW TRADING ACCOUNTS */}
          <div className="rounded-2xl bg-[#09120e] border border-white/[0.08] p-5 sm:p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-emerald-400" />
                <h4 className="text-sm font-heading font-bold text-white">Recent Activity</h4>
              </div>
              <Link
                href="/dashboard/wallet"
                className="text-[11px] text-[#00f59b] hover:text-emerald-300 font-semibold transition"
              >
                View all →
              </Link>
            </div>

            <div className="space-y-2.5">
              {recentActivity.map((tx) => (
                <div
                  key={tx.id}
                  className="p-3 rounded-xl bg-black/40 border border-white/[0.04] flex items-center justify-between text-xs hover:border-emerald-500/30 transition-colors"
                >
                  <div className="space-y-0.5">
                    <span className="font-semibold text-white block text-xs">{tx.title}</span>
                    <span className="text-[10px] text-fgText-muted font-mono">{tx.ref}</span>
                  </div>
                  <span
                    className={`font-mono font-bold text-xs sm:text-sm ${
                      tx.isCredit ? 'text-[#00f59b]' : 'text-rose-400'
                    }`}
                  >
                    {tx.isCredit ? '+ ' : '- '}
                    {formatNaira(tx.amountNgn)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ======================================================== */}
        {/* RIGHT / SIDEBAR COLUMN (lg:col-span-4)                  */}
        {/* ======================================================== */}
        <div className="lg:col-span-4 space-y-5">
          {/* 1. Top Ad Placement: Explore Trading Accounts */}
          <div className="rounded-2xl bg-gradient-to-br from-[#0e1f17] via-[#091510] to-[#040806] border border-emerald-500/25 p-5 shadow-2xl relative overflow-hidden space-y-4">
            {/* Bull art with neon candles */}
            <div className="relative h-28 w-full rounded-xl overflow-hidden bg-black/60 border border-emerald-500/20 flex items-center justify-center">
              <div className="absolute inset-0 bg-gradient-to-t from-[#0e1f17] via-transparent to-transparent z-10" />
              <div className="relative z-0 flex items-center justify-center gap-3 scale-90">
                <svg
                  className="w-16 h-16 text-emerald-400 drop-shadow-[0_0_12px_rgba(16,185,129,0.5)]"
                  viewBox="0 0 100 100"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                >
                  <path d="M 20 25 C 25 15, 35 15, 45 30 C 50 35, 50 40, 50 45 C 50 40, 50 35, 55 30 C 65 15, 75 15, 80 25 C 75 35, 70 45, 60 48 C 65 55, 68 65, 65 75 C 60 85, 40 85, 35 75 C 32 65, 35 55, 40 48 C 30 45, 25 35, 20 25 Z" />
                </svg>
                {/* Candlestick graphics */}
                <div className="flex items-end gap-1.5 h-12">
                  <div className="w-1.5 h-8 bg-emerald-400 rounded-sm" />
                  <div className="w-1.5 h-12 bg-emerald-400 rounded-sm" />
                  <div className="w-1.5 h-6 bg-rose-400 rounded-sm" />
                  <div className="w-1.5 h-10 bg-emerald-400 rounded-sm" />
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <span className="text-[10px] font-heading font-extrabold text-[#00f59b] tracking-wider uppercase block">
                FundedGiants
              </span>
              <h4 className="text-base font-heading font-extrabold text-white tracking-tight leading-snug">
                Trade Smarter. Grow Faster.
              </h4>
              <p className="text-[11px] text-fgText-secondary">
                Get funded. Trade. Earn.
              </p>
            </div>

            <Link
              href="/dashboard/challenges/buy"
              className="w-full py-2.5 px-4 rounded-xl bg-[#f5a623] hover:bg-[#e0961f] text-black font-heading font-extrabold text-xs transition shadow-lg shadow-amber-500/20 active:scale-95 flex items-center justify-center gap-1.5"
            >
              <span>Explore Trading Accounts</span>
              <ChevronRight className="w-3.5 h-3.5 stroke-[3]" />
            </Link>
          </div>

          {/* 2. Small Referral Card (Below Ad Spot) */}
          <div className="rounded-2xl bg-[#09120e] border border-white/[0.08] p-4 sm:p-5 space-y-3 shadow-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center text-emerald-400">
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-heading font-bold text-white">
                    Invite Friends. Earn More.
                  </h4>
                  <p className="text-[10px] text-fgText-secondary">
                    Get rewarded for every successful referral.
                  </p>
                </div>
              </div>
              <Sparkles className="w-4 h-4 text-emerald-400" />
            </div>

            <button
              onClick={handleCopyLink}
              className="w-full py-2 px-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-[#00f59b] hover:bg-emerald-500/25 transition text-xs font-semibold flex items-center justify-center gap-1.5 active:scale-95"
            >
              {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedLink ? 'Link Copied to Clipboard!' : 'Get Your Referral Link →'}</span>
            </button>
          </div>

          {/* 3. Best Trader of the Month Ad (Copy Investments) */}
          <div className="rounded-2xl bg-[#09120e] border border-white/[0.08] p-4 sm:p-5 space-y-3.5 shadow-xl">
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-2.5">
              <div className="flex items-center gap-2">
                <Flame className="w-4 h-4 text-amber-400" />
                <span className="text-[10px] font-heading font-bold uppercase tracking-wider text-amber-400">
                  Trader of the Month
                </span>
              </div>
              <span className="text-[9px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 font-mono font-bold">
                +184.5% ROI
              </span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-full bg-amber-500/20 border border-amber-400/30 text-amber-400 font-bold flex items-center justify-center text-xs">
                  AF
                </div>
                <div>
                  <h5 className="text-xs font-bold text-white">Alpha FX Master</h5>
                  <p className="text-[10px] text-fgText-muted">94.2% Win Rate • 1,420 Followers</p>
                </div>
              </div>
              <Link
                href="/dashboard/copytrading"
                className="px-3 py-1.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-[#00f59b] hover:bg-emerald-500/25 transition text-[11px] font-bold"
              >
                Copy Trader →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
