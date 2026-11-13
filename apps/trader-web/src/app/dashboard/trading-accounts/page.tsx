'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  TrendingUp,
  Award,
  Zap,
  ArrowUpRight,
  ShieldCheck,
  ChevronRight,
  AlertCircle,
  Clock,
  CheckCircle2,
  Lock,
} from 'lucide-react';
import { formatNaira } from '@/lib/format';

export default function TradingAccountsPage() {
  const [filter, setFilter] = useState<'ALL' | 'RHINO_RUSH' | 'PHOENIX_RISE'>('ALL');

  const accounts = [
    {
      id: 'FG-48291',
      loginNumber: '1092841',
      server: 'SteraTrader Live',
      planName: 'Rhino Rush',
      planType: 'RHINO_RUSH',
      currentPhase: 'Funded', // 'Challenge' or 'Funded'
      sizeNgn: 10000000,
      balanceNgn: 10420000,
      equityNgn: 10420000,
      profitNgn: 420000,
      profitPercent: '+4.20%',
      profitTargetNgn: 1000000,
      dailyLossNgn: 180000,
      dailyLossLimitNgn: 400000, // 4%
      maxLossNgn: 250000,
      maxLossLimitNgn: 1000000, // 10%
      tradingDays: 14,
      status: 'Active',
      leverage: '1:100',
    },
    {
      id: 'FG-51732',
      loginNumber: '1094519',
      server: 'SteraTrader Live',
      planName: 'Phoenix Rise',
      planType: 'PHOENIX_RISE',
      currentPhase: 'Instant Funding',
      sizeNgn: 50000000,
      balanceNgn: 50820000,
      equityNgn: 50820000,
      profitNgn: 820000,
      profitPercent: '+1.64%',
      dailyLossNgn: 220000,
      dailyLossLimitNgn: 2000000, // 4%
      maxLossNgn: 650000,
      maxLossLimitNgn: 3500000, // 7%
      tradingDays: 6,
      status: 'Active',
      leverage: '1:30',
    },
  ];

  const filtered = accounts.filter((a) => {
    if (filter === 'RHINO_RUSH') return a.planType === 'RHINO_RUSH';
    if (filter === 'PHOENIX_RISE') return a.planType === 'PHOENIX_RISE';
    return true;
  });

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              SteraTrader Provisioning
            </span>
            <span className="text-xs text-fgText-muted">Subset FG-NGN-Standard</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-heading font-extrabold text-white tracking-tight">
            Trading Accounts
          </h1>
          <p className="text-xs text-fgText-secondary mt-1">
            Manage your live funded accounts and 1-step evaluation challenges in Nigerian Naira.
          </p>
        </div>

        <Link
          href="/dashboard/challenges/buy"
          className="py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-bg-base font-heading font-bold text-xs flex items-center gap-2 shadow-lg transition-all"
        >
          <Award className="w-4 h-4" />
          <span>Get New Account</span>
        </Link>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-fgBorder-subtle pb-3">
        <button
          type="button"
          onClick={() => setFilter('ALL')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            filter === 'ALL'
              ? 'bg-bg-card text-white border border-fgBorder-subtle'
              : 'text-fgText-muted hover:text-white'
          }`}
        >
          All Accounts ({accounts.length})
        </button>
        <button
          type="button"
          onClick={() => setFilter('RHINO_RUSH')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            filter === 'RHINO_RUSH'
              ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
              : 'text-fgText-muted hover:text-white'
          }`}
        >
          Rhino Rush (1-Step)
        </button>
        <button
          type="button"
          onClick={() => setFilter('PHOENIX_RISE')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            filter === 'PHOENIX_RISE'
              ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
              : 'text-fgText-muted hover:text-white'
          }`}
        >
          Phoenix Rise (Instant Funding)
        </button>
      </div>

      {/* Account Cards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filtered.map((acc) => (
          <div
            key={acc.id}
            className="p-6 rounded-2xl bg-bg-surface border border-fgBorder-subtle hover:border-fgBorder-emerald shadow-cardGlow transition-all space-y-6"
          >
            {/* Header Row */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div
                  className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                    acc.planType === 'PHOENIX_RISE'
                      ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                      : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  }`}
                >
                  {acc.planType === 'PHOENIX_RISE' ? (
                    <Zap className="w-6 h-6" />
                  ) : (
                    <Award className="w-6 h-6" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-base font-heading font-extrabold text-white">
                      {acc.id}
                    </span>
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
                  <p className="text-xs text-fgText-muted mt-0.5">
                    {acc.planName} &bull; Leverage {acc.leverage} &bull; SteraTrader #{acc.loginNumber}
                  </p>
                </div>
              </div>

              <div className="text-right">
                <span className="text-xs text-fgText-muted block uppercase">Capital</span>
                <span className="text-lg font-heading font-extrabold text-white">
                  {formatNaira(acc.sizeNgn)}
                </span>
              </div>
            </div>

            {/* Metrics 3-Col Bar */}
            <div className="grid grid-cols-3 gap-3 p-3.5 rounded-xl bg-bg-card border border-fgBorder-subtle text-center text-xs">
              <div>
                <span className="text-[10px] text-fgText-muted block uppercase">Net Profit</span>
                <span className="font-heading font-bold text-emerald-400">
                  +{formatNaira(acc.profitNgn)}
                </span>
                <span className="text-[10px] text-emerald-300 block">({acc.profitPercent})</span>
              </div>

              <div>
                <span className="text-[10px] text-fgText-muted block uppercase">Equity</span>
                <span className="font-heading font-bold text-white">
                  {formatNaira(acc.equityNgn)}
                </span>
              </div>

              <div>
                <span className="text-[10px] text-fgText-muted block uppercase">Trading Days</span>
                <span className="font-heading font-bold text-white">{acc.tradingDays} Days</span>
              </div>
            </div>

            {/* Risk Engine Compliance Bars */}
            <div className="space-y-3 pt-2">
              {/* Daily Drawdown */}
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-fgText-secondary">Daily Drawdown (Max 4%)</span>
                  <span className="font-mono text-white">
                    {formatNaira(acc.dailyLossNgn)} / {formatNaira(acc.dailyLossLimitNgn)}
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-bg-base overflow-hidden">
                  <div
                    className="h-full bg-emerald-400 rounded-full"
                    style={{
                      width: `${(acc.dailyLossNgn / acc.dailyLossLimitNgn) * 100}%`,
                    }}
                  />
                </div>
              </div>

              {/* Max Drawdown */}
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-fgText-secondary">
                    Max Loss Limit ({acc.planType === 'PHOENIX_RISE' ? '7%' : '10%'})
                  </span>
                  <span className="font-mono text-white">
                    {formatNaira(acc.maxLossNgn)} / {formatNaira(acc.maxLossLimitNgn)}
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-bg-base overflow-hidden">
                  <div
                    className="h-full bg-amber-400 rounded-full"
                    style={{
                      width: `${(acc.maxLossNgn / acc.maxLossLimitNgn) * 100}%`,
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Footer Actions */}
            <div className="pt-4 border-t border-fgBorder-subtle flex items-center justify-between">
              <div className="flex items-center gap-2 text-[11px] text-emerald-400">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Risk Engine Passed</span>
              </div>

              <Link
                href={`/dashboard/trading-accounts/${acc.id}`}
                className="py-2 px-3.5 rounded-lg bg-bg-card border border-fgBorder-subtle hover:border-emerald-500 text-xs font-semibold text-white flex items-center gap-1.5 transition-all"
              >
                <span>Account Analytics</span>
                <ChevronRight className="w-3.5 h-3.5 text-emerald-400" />
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
