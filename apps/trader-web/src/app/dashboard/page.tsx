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
    <div className="space-y-4 md:space-y-6 max-w-7xl mx-auto w-full">
      {/* Welcome Header */}
      <div>
        <h1 className="text-xl sm:text-2xl md:text-3xl font-heading font-extrabold text-white flex items-center gap-2">
          <span>Good morning, John</span>
          <span className="text-lg sm:text-2xl">👋</span>
        </h1>
        <p className="text-[11px] sm:text-xs text-fgText-secondary mt-0.5">
          Here&apos;s your Naira trading platform overview and live balance metrics.
        </p>
      </div>

      {/* Top 3 Metric Cards Grid (Modular & Fluid Scaled) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-5">
        {/* Card 1: Giants Vault (NGN) */}
        <div className="fluid-card-padding rounded-xl sm:rounded-2xl bg-bg-card border border-fgBorder-emerald shadow-cardGlow relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2 sm:mb-3">
            <div className="flex items-center gap-1.5 sm:gap-2 text-[11px] sm:text-xs font-semibold text-fgText-secondary">
              <Wallet className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-400" />
              <span>Giants Vault</span>
            </div>
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              Primary
            </span>
          </div>

          <div>
            <span className="fluid-metric-amount font-heading font-extrabold text-white block">
              {formatNaira(wallet.availableBalanceNgn)}
            </span>
            <p className="text-[10px] text-fgText-muted mt-0.5">
              Available Spendable & Payout Balance
            </p>
          </div>

          <div className="flex items-center gap-2 mt-3 sm:mt-4">
            <Link
              href="/dashboard/wallet/fund"
              className="flex-1 py-1.5 sm:py-2 px-2.5 rounded-lg sm:rounded-xl bg-emerald-500 hover:bg-emerald-400 text-bg-base text-[11px] sm:text-xs font-bold flex items-center justify-center gap-1 transition-all shadow-emeraldGlow"
            >
              <Plus className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              <span>Deposit</span>
            </Link>
            <Link
              href="/dashboard/wallet"
              className="flex-1 py-1.5 sm:py-2 px-2.5 rounded-lg sm:rounded-xl bg-bg-surface border border-fgBorder-subtle hover:border-emerald-500 text-white text-[11px] sm:text-xs font-semibold flex items-center justify-center gap-1 transition-all"
            >
              <SlidersHorizontal className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-emerald-400" />
              <span>Manage</span>
            </Link>
          </div>
        </div>

        {/* Card 2: Trading Performance */}
        <div className="fluid-card-padding rounded-xl sm:rounded-2xl bg-bg-card border border-fgBorder-subtle shadow-cardGlow flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2 sm:mb-3">
            <div className="flex items-center gap-1.5 sm:gap-2 text-[11px] sm:text-xs font-semibold text-fgText-secondary">
              <TrendingUp className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-400" />
              <span>Trading Performance</span>
            </div>
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              Profitable
            </span>
          </div>

          <div>
            <span className="fluid-metric-amount font-heading font-extrabold text-emerald-400 block">
              +{formatNaira(wallet.withdrawableProfitsNgn)}
            </span>
            <p className="text-[10px] text-fgText-muted mt-0.5">
              Total Eligible Withdrawable Profits
            </p>
          </div>

          {/* Mini Sparkline Chart */}
          <div className="mt-3 pt-2.5 border-t border-fgBorder-subtle flex items-end justify-between h-7">
            <span className="text-[9px] text-fgText-muted">Equity Growth</span>
            <div className="flex items-end gap-1 h-5">
              <div className="w-1 h-1.5 bg-emerald-500/30 rounded-t" />
              <div className="w-1 h-2.5 bg-emerald-500/40 rounded-t" />
              <div className="w-1 h-2 bg-emerald-500/50 rounded-t" />
              <div className="w-1 h-3 bg-emerald-500/60 rounded-t" />
              <div className="w-1 h-2.5 bg-emerald-500/70 rounded-t" />
              <div className="w-1 h-4 bg-emerald-500/80 rounded-t" />
              <div className="w-1 h-5 bg-emerald-400 rounded-t" />
            </div>
          </div>
        </div>

        {/* Card 3: Total Capital */}
        <div className="fluid-card-padding rounded-xl sm:rounded-2xl bg-bg-card border border-fgBorder-subtle shadow-cardGlow flex flex-col justify-between sm:col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between mb-2 sm:mb-3">
            <div className="flex items-center gap-1.5 sm:gap-2 text-[11px] sm:text-xs font-semibold text-fgText-secondary">
              <Coins className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400" />
              <span>Total Active Capital</span>
            </div>
            <span className="text-[9px] text-fgText-muted">2 Accounts</span>
          </div>

          <div>
            <span className="fluid-metric-amount font-heading font-extrabold text-white block">
              {formatNaira(wallet.totalCapitalNgn)}
            </span>
            <p className="text-[10px] text-fgText-muted mt-0.5">
              Rhino Rush (1-Step) & Phoenix Rise (Instant)
            </p>
          </div>

          <div className="mt-3 pt-2.5 border-t border-fgBorder-subtle flex items-center justify-between text-[10px]">
            <span className="text-fgText-muted">SteraTrader</span>
            <span className="text-emerald-400 font-semibold">100% Operational</span>
          </div>
        </div>
      </div>

      {/* Main Grid: Left Column (Active Accounts & CTA) + Right Rail (Spend Card & Activity) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Left Column (Span 2) */}
        <div className="lg:col-span-2 space-y-4 sm:space-y-5">
          {/* Active Trading Accounts */}
          <div className="fluid-card-padding rounded-xl sm:rounded-2xl bg-bg-card border border-fgBorder-subtle">
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <div>
                <h2 className="text-xs sm:text-sm md:text-base font-heading font-bold text-white">Trading Accounts</h2>
                <p className="text-[10px] sm:text-xs text-fgText-secondary">Active accounts in Nigerian Naira</p>
              </div>
              <Link
                href="/dashboard/trading-accounts"
                className="text-[11px] sm:text-xs text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-0.5"
              >
                <span>View all</span>
                <ChevronRight className="w-3 h-3" />
              </Link>
            </div>

            <div className="space-y-2.5 sm:space-y-3">
              {activeAccounts.map((acc) => (
                <div
                  key={acc.id}
                  className="p-3 sm:p-3.5 rounded-xl bg-bg-surface border border-fgBorder-subtle hover:border-fgBorder-emerald transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-bg-card border border-fgBorder-subtle flex items-center justify-center flex-shrink-0">
                      <TrendingUp className="w-4 h-4 text-emerald-400" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs sm:text-sm font-heading font-bold text-white">{acc.id}</span>
                        <span
                          className={`px-1.5 py-0.2 rounded text-[8px] sm:text-[9px] font-bold tracking-tight uppercase ${
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
                      <p className="text-[10px] sm:text-[11px] text-fgText-muted mt-0.5">
                        {acc.planName} • Size: {formatNaira(acc.sizeNgn)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-5 pt-2 sm:pt-0 border-t sm:border-t-0 border-fgBorder-subtle">
                    <div>
                      <p className="text-[8px] sm:text-[9px] text-fgText-muted uppercase tracking-wider">Profit</p>
                      <p className="text-[11px] sm:text-xs font-heading font-bold text-emerald-400">
                        +{formatNaira(acc.profitNgn)}{' '}
                        <span className="text-[9px] text-emerald-300">({acc.profitPercent})</span>
                      </p>
                    </div>

                    <div>
                      <p className="text-[8px] sm:text-[9px] text-fgText-muted uppercase tracking-wider">Daily DD Used</p>
                      <p className="text-[10px] sm:text-[11px] font-semibold text-white">
                        {formatNaira(acc.dailyDrawdownNgn)} / {formatNaira(acc.dailyDrawdownLimitNgn)}
                      </p>
                    </div>

                    <Link
                      href={`/dashboard/trading-accounts/${acc.id}`}
                      className="px-2 py-1 rounded bg-bg-card border border-fgBorder-subtle hover:border-emerald-500 text-[10px] sm:text-xs font-semibold text-white transition-all flex-shrink-0"
                    >
                      View →
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* SteraTrader Action CTA Card */}
          <div className="fluid-card-padding rounded-xl sm:rounded-2xl bg-gradient-to-r from-bg-card via-bg-cardElevated to-bg-card border border-fgBorder-emerald flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
            <div className="space-y-0.5">
              <h3 className="text-xs sm:text-sm md:text-base font-heading font-bold text-white">
                Ready for a new Account?
              </h3>
              <p className="text-[10px] sm:text-xs text-fgText-secondary">
                Scale your capital up to ₦50,000,000 with Rhino Rush (1-Step) or Phoenix Rise (Instant).
              </p>
            </div>
            <Link
              href="/dashboard/challenges/buy"
              className="w-full sm:w-auto text-center px-4 py-2 rounded-lg sm:rounded-xl bg-amber-500 hover:bg-amber-400 text-bg-base font-heading font-extrabold text-[11px] sm:text-xs shadow-lg transition-all"
            >
              Explore Challenges →
            </Link>
          </div>
        </div>

        {/* Right Rail (Span 1) */}
        <div className="space-y-4 sm:space-y-5">
          {/* Giants Spend Card */}
          <div className="fluid-card-padding rounded-xl sm:rounded-2xl bg-bg-card border border-fgBorder-subtle relative overflow-hidden">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] sm:text-xs font-bold text-amber-400 uppercase tracking-widest font-heading">
                Giants Spend Card
              </span>
              <CreditCard className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400" />
            </div>
            <h3 className="text-xs sm:text-sm font-heading font-bold text-white mb-0.5">Custom NGN Card</h3>
            <p className="text-[10px] sm:text-xs text-fgText-secondary mb-3 leading-relaxed">
              Spend directly from Giants Vault online, POS, and ATMs anywhere Verve or Mastercard are accepted.
            </p>
            <Link
              href="/dashboard/wallet/cards"
              className="inline-flex items-center gap-1 text-[11px] sm:text-xs font-bold text-emerald-400 hover:text-emerald-300"
            >
              <span>Order Physical Card (Verve & Mastercard)</span>
              <ChevronRight className="w-3 h-3" />
            </Link>
          </div>

          {/* Referral Link Widget */}
          <div className="fluid-card-padding rounded-xl sm:rounded-2xl bg-bg-card border border-fgBorder-subtle">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] sm:text-xs font-bold text-emerald-400 uppercase tracking-widest font-heading">
                Affiliates
              </span>
              <Share2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-400" />
            </div>
            <h3 className="text-xs sm:text-sm font-heading font-bold text-white mb-0.5">Invite Traders & Earn</h3>
            <p className="text-[10px] sm:text-xs text-fgText-secondary mb-3">
              Get paid tier-based commission on every account purchased through your link.
            </p>
            <Link
              href="/dashboard/affiliate"
              className="w-full py-1.5 px-2.5 rounded-lg bg-bg-surface border border-fgBorder-subtle hover:border-emerald-500 text-[10px] sm:text-xs font-semibold text-white flex items-center justify-center gap-1 transition-all"
            >
              <span>Get Your Referral Link</span>
              <ChevronRight className="w-3 h-3 text-emerald-400" />
            </Link>
          </div>

          {/* Recent Activity List */}
          <div className="fluid-card-padding rounded-xl sm:rounded-2xl bg-bg-card border border-fgBorder-subtle">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs sm:text-sm font-heading font-bold text-white">Recent Activity</h3>
              <Link href="/dashboard/wallet/transactions" className="text-[9px] sm:text-[10px] text-emerald-400 hover:underline">
                View all
              </Link>
            </div>

            <div className="space-y-2.5">
              {recentActivity.map((act) => (
                <div key={act.id} className="flex items-center justify-between text-[11px] gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold text-white truncate text-[11px]">{act.title}</p>
                    <p className="text-[9px] text-fgText-muted truncate">
                      {act.ref} • {act.time}
                    </p>
                  </div>
                  <span
                    className={`font-mono font-bold flex-shrink-0 text-[11px] ${
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
