'use client';

import React from 'react';
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
} from 'lucide-react';
import { formatNaira } from '@/lib/format';

export default function DashboardOverviewPage() {
  const wallet = {
    availableBalanceNgn: 18450000.0,
    withdrawableProfitsNgn: 2480000.0,
    totalCapitalNgn: 60000000.0,
  };

  const activeAccounts = [
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
  ];

  const recentActivity = [
    {
      id: 'act-1',
      title: 'Trading Payout Processed',
      ref: '#FG-51732 (Phoenix Rise)',
      time: '2h ago',
      amountNgn: 1240000,
      isPositive: true,
    },
    {
      id: 'act-2',
      title: 'Affiliate Commission Credited',
      ref: 'Referral #FG2B47',
      time: '3h ago',
      amountNgn: 500000,
      isPositive: true,
    },
    {
      id: 'act-3',
      title: 'Rhino Rush ₦10M Challenge Purchase',
      ref: 'Order #FG-ORD-9182',
      time: '5h ago',
      amountNgn: 247500,
      isPositive: false,
    },
    {
      id: 'act-4',
      title: 'Lenco Bank Withdrawal Processed',
      ref: 'Moniepoint •••• 5678',
      time: '1d ago',
      amountNgn: 1000000,
      isPositive: false,
    },
  ];

  return (
    <div className="space-y-6 sm:space-y-8 max-w-7xl mx-auto">
      {/* Welcome Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-heading font-extrabold text-white flex items-center gap-2">
          <span>Good morning, John</span>
          <span className="text-xl sm:text-2xl">👋</span>
        </h1>
        <p className="text-xs text-fgText-secondary mt-1">
          Here&apos;s your Naira trading platform overview and live balance metrics.
        </p>
      </div>

      {/* Top 3 Metric Cards Grid (Mobile-First responsive, reduced font sizes) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Card 1: Giants Vault (NGN) */}
        <div className="p-4 sm:p-5 lg:p-6 rounded-2xl bg-bg-card border border-fgBorder-emerald shadow-cardGlow relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-fgText-secondary">
              <Wallet className="w-4 h-4 text-emerald-400" />
              <span>Giants Vault</span>
            </div>
            <span className="text-[9px] sm:text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              Primary Wallet
            </span>
          </div>

          <div>
            <span className="text-xl sm:text-2xl lg:text-3xl font-heading font-extrabold text-white tracking-tight break-words">
              {formatNaira(wallet.availableBalanceNgn)}
            </span>
            <p className="text-[10px] sm:text-[11px] text-fgText-muted mt-1">
              Available Spendable & Payout Balance
            </p>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 mt-4 sm:mt-6">
            <Link
              href="/dashboard/wallet/fund"
              className="flex-1 py-2 px-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-bg-base text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-emeraldGlow"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Deposit</span>
            </Link>
            <Link
              href="/dashboard/wallet"
              className="flex-1 py-2 px-3 rounded-xl bg-bg-surface border border-fgBorder-subtle hover:border-emerald-500 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-all"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-emerald-400" />
              <span>Manage</span>
            </Link>
          </div>
        </div>

        {/* Card 2: Trading Performance */}
        <div className="p-4 sm:p-5 lg:p-6 rounded-2xl bg-bg-card border border-fgBorder-subtle shadow-cardGlow flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-fgText-secondary">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              <span>Trading Performance</span>
            </div>
            <span className="text-[9px] sm:text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              Profitable
            </span>
          </div>

          <div>
            <span className="text-xl sm:text-2xl lg:text-3xl font-heading font-extrabold text-emerald-400 tracking-tight break-words">
              +{formatNaira(wallet.withdrawableProfitsNgn)}
            </span>
            <p className="text-[10px] sm:text-[11px] text-fgText-muted mt-1">
              Total Eligible Withdrawable Profits
            </p>
          </div>

          {/* Mini Sparkline Chart representation */}
          <div className="mt-4 pt-3 border-t border-fgBorder-subtle flex items-end justify-between h-8">
            <span className="text-[10px] text-fgText-muted">Live Equity Growth</span>
            <div className="flex items-end gap-1 h-6">
              <div className="w-1.5 h-2 bg-emerald-500/30 rounded-t" />
              <div className="w-1.5 h-3 bg-emerald-500/40 rounded-t" />
              <div className="w-1.5 h-2.5 bg-emerald-500/50 rounded-t" />
              <div className="w-1.5 h-4 bg-emerald-500/60 rounded-t" />
              <div className="w-1.5 h-3.5 bg-emerald-500/70 rounded-t" />
              <div className="w-1.5 h-5 bg-emerald-500/80 rounded-t" />
              <div className="w-1.5 h-6 bg-emerald-400 rounded-t" />
            </div>
          </div>
        </div>

        {/* Card 3: Total Capital */}
        <div className="p-4 sm:p-5 lg:p-6 rounded-2xl bg-bg-card border border-fgBorder-subtle shadow-cardGlow flex flex-col justify-between sm:col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-fgText-secondary">
              <Coins className="w-4 h-4 text-amber-400" />
              <span>Total Active Capital</span>
            </div>
            <span className="text-[10px] text-fgText-muted">2 Accounts</span>
          </div>

          <div>
            <span className="text-xl sm:text-2xl lg:text-3xl font-heading font-extrabold text-white tracking-tight break-words">
              {formatNaira(wallet.totalCapitalNgn)}
            </span>
            <p className="text-[10px] sm:text-[11px] text-fgText-muted mt-1">
              Rhino Rush (1-Step) & Phoenix Rise (Instant)
            </p>
          </div>

          <div className="mt-4 pt-3 border-t border-fgBorder-subtle flex items-center justify-between text-[11px]">
            <span className="text-fgText-muted">Platform: SteraTrader</span>
            <span className="text-emerald-400 font-semibold">100% Operational</span>
          </div>
        </div>
      </div>

      {/* Main Grid: Left Column (Active Accounts & CTA) + Right Rail (Spend Card & Activity) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
        {/* Left Column (Span 2) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Active Trading Accounts */}
          <div className="p-4 sm:p-6 rounded-2xl bg-bg-card border border-fgBorder-subtle">
            <div className="flex items-center justify-between mb-4 sm:mb-6">
              <div>
                <h2 className="text-sm sm:text-base font-heading font-bold text-white">Trading Accounts</h2>
                <p className="text-xs text-fgText-secondary">Your active SteraTrader accounts in Nigerian Naira</p>
              </div>
              <Link
                href="/dashboard/trading-accounts"
                className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1"
              >
                <span>View all</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="space-y-3 sm:space-y-4">
              {activeAccounts.map((acc) => (
                <div
                  key={acc.id}
                  className="p-3.5 sm:p-4 rounded-xl bg-bg-surface border border-fgBorder-subtle hover:border-fgBorder-emerald transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 sm:w-10 h-10 rounded-xl bg-bg-card border border-fgBorder-subtle flex items-center justify-center flex-shrink-0">
                      <TrendingUp className="w-4 sm:w-5 h-4 sm:h-5 text-emerald-400" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-heading font-bold text-white">{acc.id}</span>
                        <span
                          className={`px-1.5 py-0.5 rounded text-[9px] font-bold tracking-tight uppercase ${
                            acc.planName === 'Phoenix Rise'
                              ? 'bg-amber-500/15 text-amber-300 border border-amber-500/25'
                              : acc.currentPhase === 'Funded'
                              ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/25'
                              : 'bg-blue-500/15 text-blue-300 border border-blue-500/25'
                          }`}
                        >
                          {acc.currentPhase}
                        </span>
                      </div>
                      <p className="text-[11px] sm:text-xs text-fgText-muted mt-0.5">
                        {acc.planName} • Size: {formatNaira(acc.sizeNgn)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-4 sm:gap-6 pt-2 sm:pt-0 border-t sm:border-t-0 border-fgBorder-subtle">
                    <div>
                      <p className="text-[9px] sm:text-[10px] text-fgText-muted uppercase tracking-wider">Profit</p>
                      <p className="text-xs sm:text-sm font-heading font-bold text-emerald-400">
                        +{formatNaira(acc.profitNgn)}{' '}
                        <span className="text-[9px] sm:text-[10px] text-emerald-300">({acc.profitPercent})</span>
                      </p>
                    </div>

                    <div>
                      <p className="text-[9px] sm:text-[10px] text-fgText-muted uppercase tracking-wider">Daily DD Used</p>
                      <p className="text-[11px] sm:text-xs font-semibold text-white">
                        {formatNaira(acc.dailyDrawdownNgn)} / {formatNaira(acc.dailyDrawdownLimitNgn)}
                      </p>
                    </div>

                    <Link
                      href={`/dashboard/trading-accounts/${acc.id}`}
                      className="px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg bg-bg-card border border-fgBorder-subtle hover:border-emerald-500 text-xs font-semibold text-white transition-all flex-shrink-0"
                    >
                      View →
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* SteraTrader Action CTA Card */}
          <div className="p-4 sm:p-6 rounded-2xl bg-gradient-to-r from-bg-card via-bg-cardElevated to-bg-card border border-fgBorder-emerald flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <h3 className="text-base sm:text-lg font-heading font-bold text-white">Ready for a new Account?</h3>
              <p className="text-xs text-fgText-secondary">
                Scale your capital up to ₦50,000,000 with Rhino Rush (1-Step Challenge) or Phoenix Rise (Instant Funding).
              </p>
            </div>
            <Link
              href="/dashboard/challenges/buy"
              className="w-full sm:w-auto text-center px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-bg-base font-heading font-extrabold text-xs shadow-lg transition-all"
            >
              Explore Challenges →
            </Link>
          </div>
        </div>

        {/* Right Rail (Span 1) */}
        <div className="space-y-6">
          {/* Giants Spend Card (Custom NGN Card) */}
          <div className="p-4 sm:p-6 rounded-2xl bg-bg-card border border-fgBorder-subtle relative overflow-hidden">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-amber-400 uppercase tracking-widest font-heading">
                Giants Spend Card
              </span>
              <CreditCard className="w-4 h-4 text-amber-400" />
            </div>
            <h3 className="text-sm sm:text-base font-heading font-bold text-white mb-1">Custom NGN Card</h3>
            <p className="text-xs text-fgText-secondary mb-4 leading-relaxed">
              Spend directly from your Giants Vault online, at POS terminals, and ATMs anywhere Verve or Mastercard are accepted nationwide.
            </p>
            <Link
              href="/dashboard/wallet/cards"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-400 hover:text-emerald-300"
            >
              <span>Order Physical Card (Verve & Mastercard)</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Referral Link Widget */}
          <div className="p-4 sm:p-6 rounded-2xl bg-bg-card border border-fgBorder-subtle">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-emerald-400 uppercase tracking-widest font-heading">
                Affiliates
              </span>
              <Share2 className="w-4 h-4 text-emerald-400" />
            </div>
            <h3 className="text-sm sm:text-base font-heading font-bold text-white mb-1">Invite Traders & Earn</h3>
            <p className="text-xs text-fgText-secondary mb-4">
              Get paid tier-based commission on every account purchased through your link.
            </p>
            <Link
              href="/dashboard/affiliate"
              className="w-full py-2 px-3 rounded-xl bg-bg-surface border border-fgBorder-subtle hover:border-emerald-500 text-xs font-semibold text-white flex items-center justify-center gap-1.5 transition-all"
            >
              <span>Get Your Referral Link</span>
              <ChevronRight className="w-3.5 h-3.5 text-emerald-400" />
            </Link>
          </div>

          {/* Recent Activity List (Strict NGN) */}
          <div className="p-4 sm:p-6 rounded-2xl bg-bg-card border border-fgBorder-subtle">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-heading font-bold text-white">Recent Activity</h3>
              <Link href="/dashboard/wallet/transactions" className="text-[10px] text-emerald-400 hover:underline">
                View all
              </Link>
            </div>

            <div className="space-y-3.5">
              {recentActivity.map((act) => (
                <div key={act.id} className="flex items-center justify-between text-xs gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold text-white truncate">{act.title}</p>
                    <p className="text-[10px] text-fgText-muted truncate">
                      {act.ref} • {act.time}
                    </p>
                  </div>
                  <span
                    className={`font-mono font-bold flex-shrink-0 ${
                      act.isPositive ? 'text-emerald-400' : 'text-fgText-secondary'
                    }`}
                  >
                    {act.isPositive ? '+' : '-'}
                    {formatNaira(act.amountNgn)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
