'use client';

import React, { useState, useEffect } from 'react';
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
  Plus,
  Users,
  Wallet,
  Coins,
  Check,
  Key,
  Copy,
  Eye,
  EyeOff,
  Terminal,
} from 'lucide-react';
import { formatNaira } from '@/lib/format';

interface AccountItem {
  id: string;
  loginNumber: string;
  planName: 'Rhino Rush' | 'Phoenix Rise';
  stage: 'Funded' | 'Challenge';
  status: 'Active' | 'Passed' | 'Failed' | 'Suspended';
  sizeNgn: number;
  balanceNgn: number;
  equityNgn: number;
  profitNgn: number;
  profitPercent: string;
  dailyLossNgn: number;
  dailyLossLimitNgn: number;
  maxLossNgn: number;
  maxLossLimitNgn: number;
  platform: string;
  leverage: string;
}

export default function TradingAccountsPage() {
  const [filter, setFilter] = useState<'ALL' | 'ACTIVE' | 'CHALLENGE' | 'PASSED' | 'FAILED' | 'SUSPENDED'>('ALL');

  // Marketing banners rotated every hour (matching main dashboard sidebar)
  const marketingBanners = [
    {
      id: 'eat-like-a-giant',
      src: '/banners/banner-eat-like-a-giant.jpg',
      alt: 'If You Can Trade You Eat Like a Giant',
    },
    {
      id: 'withdraw-today',
      src: '/banners/banner-withdraw-today.jpg',
      alt: 'Withdraw Today, again tomorrow, & the next',
    },
  ];

  const [bannerIndex, setBannerIndex] = useState(0);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [showPasswordMap, setShowPasswordMap] = useState<Record<string, boolean>>({});

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(id);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const togglePassword = (id: string) => {
    setShowPasswordMap((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

  useEffect(() => {
    const fetchAccounts = async () => {
      try {
        setLoading(true);
        const res = await fetch(`${apiUrl}/api/v1/challenges/my-accounts`, {
          credentials: 'include',
        });
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0) {
            setAccounts(
              data.map((item: any) => ({
                id: item.loginNumber || item.id,
                loginNumber: item.loginNumber || item.id,
                server: item.server || 'Velton-Demo',
                groupSlug: item.groupSlug || 'fg-rr-eval',
                masterPassword: item.masterPassword || null,
                investorPassword: item.investorPassword || null,
                planName: item.planName || 'Rhino Rush',
                stage: item.currentPhase || 'Challenge',
                status: item.status === 'Breached' ? 'Failed' : 'Active',
                sizeNgn: item.sizeNgn || 10000000,
                balanceNgn: item.currentBalanceNgn || item.sizeNgn,
                equityNgn: item.currentEquityNgn || item.sizeNgn,
                profitNgn: item.profitNgn || 0,
                profitPercent: item.profitPercent || '+0.00%',
                dailyLossNgn: item.dailyDrawdownNgn || 0,
                dailyLossLimitNgn: item.dailyDrawdownLimitNgn || (item.sizeNgn * 0.04),
                maxLossNgn: 0,
                maxLossLimitNgn: item.maxDrawdownLimitNgn || (item.sizeNgn * 0.10),
                platform: 'SteraTrader',
                leverage: item.leverage || '1:100',
              }))
            );
            return;
          }
        }
        setAccounts([]);
      } catch {
        setAccounts([]);
      } finally {
        setLoading(false);
      }
    };
    fetchAccounts();
  }, [apiUrl]);

  const filtered = accounts.filter((a) => {
    if (filter === 'ACTIVE') return a.status === 'Active';
    if (filter === 'CHALLENGE') return a.stage === 'Challenge';
    if (filter === 'PASSED') return a.status === 'Passed';
    if (filter === 'FAILED') return a.status === 'Failed';
    if (filter === 'SUSPENDED') return a.status === 'Suspended';
    return true;
  });

  const totalProfitSum = accounts.reduce((sum, a) => sum + Math.max(0, a.profitNgn), 0);
  const totalWithdrawableSum = accounts
    .filter((a) => a.stage === 'Funded' && a.profitNgn > 0)
    .reduce((sum, a) => sum + a.profitNgn * 0.8, 0);

  return (
    <div className="space-y-6 max-w-7xl mx-auto w-full pb-16">
      {/* 1. Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-heading font-extrabold text-white tracking-tight">
            Trading Accounts
          </h1>
          <p className="text-xs sm:text-sm text-fgText-secondary mt-1">
            Manage and monitor your FundedGiants trading accounts.
          </p>
        </div>

        <Link
          href="/dashboard/challenges/buy"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#f5a623] hover:bg-[#e0961f] text-black font-heading font-extrabold text-xs shadow-lg shadow-amber-500/20 active:scale-95 transition"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>Buy New Account</span>
        </Link>
      </div>

      {/* 2. Top 3 Summary Metrics in a Row (Compact & Sleek) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        {/* Metric 1: Active Accounts */}
        <div className="rounded-2xl bg-[#09120e] border border-white/[0.08] p-4 shadow-xl">
          <div className="flex items-center gap-2 mb-1.5">
            <div className="w-6 h-6 rounded-lg bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center text-emerald-400">
              <Users className="w-3 h-3" />
            </div>
            <span className="text-[11px] font-medium text-fgText-secondary">Active Accounts</span>
          </div>
          <div className="text-xl sm:text-2xl font-mono font-bold text-white tracking-tight">
            {accounts.filter((a) => a.status === 'Active').length}
          </div>
        </div>

        {/* Metric 2: Total Profit */}
        <div className="rounded-2xl bg-[#09120e] border border-white/[0.08] p-4 shadow-xl">
          <div className="flex items-center gap-2 mb-1.5">
            <div className="w-6 h-6 rounded-lg bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center text-emerald-400">
              <TrendingUp className="w-3 h-3" />
            </div>
            <span className="text-[11px] font-medium text-fgText-secondary">Total Profit</span>
          </div>
          <div className="text-xl sm:text-2xl font-mono font-bold text-[#00f59b] tracking-tight">
            +{formatNaira(totalProfitSum)}
          </div>
        </div>

        {/* Metric 3: Withdrawable */}
        <div className="rounded-2xl bg-[#09120e] border border-white/[0.08] p-4 shadow-xl">
          <div className="flex items-center gap-2 mb-1.5">
            <div className="w-6 h-6 rounded-lg bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center text-emerald-400">
              <Wallet className="w-3 h-3" />
            </div>
            <span className="text-[11px] font-medium text-fgText-secondary">Withdrawable</span>
          </div>
          <div className="text-xl sm:text-2xl font-mono font-bold text-white tracking-tight">
            {formatNaira(totalWithdrawableSum)}
          </div>
        </div>
      </div>

      {/* 3. Filter Tabs (All, Active, Challenge, Passed, Failed, Suspended) */}
      <div className="flex items-center gap-1.5 p-1 rounded-xl bg-black/40 border border-white/[0.06] text-xs font-semibold overflow-x-auto w-fit">
        {(['ALL', 'ACTIVE', 'CHALLENGE', 'PASSED', 'FAILED', 'SUSPENDED'] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setFilter(tab)}
            className={`px-3.5 py-1.5 rounded-lg transition-colors whitespace-nowrap capitalize ${
              filter === tab
                ? 'bg-[#00e575] text-black font-extrabold'
                : 'text-fgText-secondary hover:text-white'
            }`}
          >
            {tab.toLowerCase()}
          </button>
        ))}
      </div>

      {/* 4. Two-Column Layout (Main Full-Width Accounts 68% vs Sidebar 32%) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* ======================================================== */}
        {/* LEFT / MAIN COLUMN (lg:col-span-8)                      */}
        {/* ======================================================== */}
        <div className="lg:col-span-8 space-y-4">
          {filtered.length === 0 ? (
            <div className="p-8 rounded-2xl bg-[#09120e] border border-white/[0.08] text-center text-xs text-fgText-muted">
              No trading accounts match this filter.
            </div>
          ) : (
            filtered.map((acc) => (
              <div
                key={acc.id}
                className="rounded-2xl bg-[#09120e] border border-white/[0.08] p-4 sm:p-4.5 space-y-3 hover:border-emerald-500/30 transition-all shadow-xl"
              >
                {/* Top Row: Stage Badge + Login ID */}
                <div className="flex items-center justify-between border-b border-white/[0.04] pb-2.5">
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold flex items-center gap-1.5 ${
                        acc.stage === 'Funded'
                          ? 'bg-emerald-500/15 border border-emerald-500/30 text-[#00f59b]'
                          : 'bg-amber-500/15 border border-amber-500/30 text-amber-400'
                      }`}
                    >
                      <CheckCircle2 className="w-3 h-3" />
                      <span>{acc.stage.toUpperCase()}</span>
                    </span>
                    <span className="text-xs text-white font-semibold">{acc.planName}</span>
                  </div>

                  <span className="font-mono text-xs font-bold text-fgText-secondary tracking-wider">
                    #{acc.id}
                  </span>
                </div>

                {/* Middle Row: Current Balance + Total Profit (Compact Sleek Typography) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 py-0.5">
                  <div>
                    <div className="text-lg sm:text-xl font-mono font-bold text-white tracking-tight">
                      {formatNaira(acc.balanceNgn)}
                    </div>
                    <span className="text-[10px] text-fgText-secondary uppercase tracking-wider">
                      Current Balance
                    </span>
                  </div>

                  <div>
                    <div className="text-lg sm:text-xl font-mono font-bold text-[#00f59b] tracking-tight">
                      +{formatNaira(acc.profitNgn)}
                    </div>
                    <span className="text-[10px] text-fgText-secondary uppercase tracking-wider">
                      Total Profit
                    </span>
                  </div>
                </div>

                {/* SteraTrader Live Credentials Box */}
                <div className="p-3 rounded-xl bg-black/40 border border-white/[0.06] grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs font-mono">
                  <div>
                    <span className="text-[10px] text-fgText-muted uppercase block">Server</span>
                    <span className="text-emerald-400 font-bold text-[11px] truncate block">{acc.server || 'Velton-Demo'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-fgText-muted uppercase block">Login ID</span>
                    <div className="flex items-center gap-1">
                      <span className="text-white font-bold text-[11px]">{acc.loginNumber}</span>
                      <button
                        type="button"
                        onClick={() => handleCopy(acc.loginNumber, `login-${acc.id}`)}
                        className="text-slate-500 hover:text-white"
                        title="Copy Login"
                      >
                        {copiedKey === `login-${acc.id}` ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <span className="text-[10px] text-fgText-muted uppercase block">Master Password</span>
                    <div className="flex items-center gap-1">
                      <span className="text-white font-bold text-[11px]">
                        {acc.masterPassword
                          ? showPasswordMap[acc.id]
                            ? acc.masterPassword
                            : '••••••••'
                          : '••••••••'}
                      </span>
                      {acc.masterPassword && (
                        <>
                          <button
                            type="button"
                            onClick={() => togglePassword(acc.id)}
                            className="text-slate-500 hover:text-white"
                          >
                            {showPasswordMap[acc.id] ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleCopy(acc.masterPassword, `pwd-${acc.id}`)}
                            className="text-slate-500 hover:text-white"
                            title="Copy Password"
                          >
                            {copiedKey === `pwd-${acc.id}` ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Bottom Row: Profit % | Daily DD | Max DD | Platform | View -> */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-white/[0.04] text-xs">
                  {/* Metric Chips */}
                  <div className="flex flex-wrap items-center gap-3">
                    {/* Profit % */}
                    <div className="flex items-center gap-1 font-mono font-bold text-[#00f59b] text-[11px]">
                      <TrendingUp className="w-3.5 h-3.5" />
                      <span>Profit {acc.profitPercent}</span>
                    </div>

                    {/* Daily DD */}
                    <div className="flex items-center gap-1 text-fgText-secondary text-[11px]">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                      <span>
                        Daily DD {formatNaira(acc.dailyLossNgn)} / {formatNaira(acc.dailyLossLimitNgn)}
                      </span>
                    </div>

                    {/* Max DD */}
                    <div className="text-fgText-secondary text-[11px]">
                      Max DD <span className="font-mono text-white">{formatNaira(acc.maxLossNgn)}</span>
                    </div>

                    {/* Platform: SteraTrader */}
                    <div className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-black/40 border border-white/[0.08] text-[10px] font-mono text-fgText-secondary">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      <span>{acc.platform}</span>
                    </div>
                  </div>

                  {/* View Details Button */}
                  <Link
                    href={`/dashboard/trading-accounts/${acc.id}`}
                    className="px-4 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.12] text-white font-heading font-semibold text-xs active:scale-95 transition flex items-center gap-1 group"
                  >
                    <span>View</span>
                    <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition" />
                  </Link>
                </div>
              </div>
            ))
          )}
        </div>

        {/* ======================================================== */}
        {/* RIGHT / SIDEBAR COLUMN (lg:col-span-4)                  */}
        {/* ======================================================== */}
        <div className="lg:col-span-4 space-y-5">
          {/* Dynamic Marketing Banner Card (Exact Replica of Main Dashboard Sidebar) */}
          <div className="rounded-2xl bg-gradient-to-br from-[#0e1f17] via-[#091510] to-[#040806] border border-emerald-500/25 p-5 shadow-2xl relative overflow-hidden space-y-4">
            {/* Visual Marketing Banner (Full Portrait Height Respected, Clean Scaling) */}
            <div className="relative w-full rounded-xl overflow-hidden bg-black/40 border border-emerald-500/20 flex items-center justify-center group shadow-xl">
              <img
                src={marketingBanners[bannerIndex].src}
                alt={marketingBanners[bannerIndex].alt}
                className="w-full h-auto object-contain rounded-xl transition-transform duration-500 group-hover:scale-[1.01]"
              />
            </div>

            <div className="space-y-1">
              <span className="text-[10px] font-heading font-extrabold text-emerald-400 tracking-wider uppercase block">
                FundedGiants Spotlight
              </span>
              <h4 className="text-base sm:text-lg font-heading font-extrabold text-white tracking-tight leading-snug">
                Get Funded with FundedGiants
              </h4>
              <p className="text-sm font-bold text-[#00f59b] tracking-wide">
                Get Funded, Trade, Earn and Grow
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
        </div>
      </div>
    </div>
  );
}
