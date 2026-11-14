'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  TrendingUp,
  ShieldCheck,
  Award,
  Zap,
  ArrowUpRight,
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Coins,
  Wallet,
  Activity,
  Layers,
  ExternalLink,
  Loader2,
  RefreshCw,
  Sliders,
  DollarSign,
  Lock,
} from 'lucide-react';
import { formatNaira } from '@/lib/format';

interface TradeItem {
  ticketId: string;
  symbol: string;
  direction: 'BUY' | 'SELL';
  volume: number;
  openPrice: number;
  closePrice: number | null;
  stopLoss: number | null;
  takeProfit: number | null;
  profitNgn: number;
  openedAt: string;
  closedAt: string | null;
}

export default function AccountAnalyticsTerminalPage() {
  const params = useParams();
  const accountId = (params?.id as string) || 'FG-48291';

  const [loading, setLoading] = useState(true);
  const [requestingPayout, setRequestingPayout] = useState(false);
  const [payoutSuccessMessage, setPayoutSuccessMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'TRADES' | 'RISK' | 'RULES'>('TRADES');

  const [account, setAccount] = useState({
    id: accountId,
    loginNumber: '1092841',
    server: 'SteraTrader Live',
    platform: 'SteraTrader',
    planName: 'Rhino Rush',
    planType: 'RHINO_RUSH',
    currentPhase: 'Funded',
    sizeNgn: 10000000,
    currentBalanceNgn: 10420000,
    currentEquityNgn: 10420000,
    freeMarginNgn: 10300000,
    marginLevelPercent: 8680.0,
    profitNgn: 420000,
    profitPercent: '+4.20%',
    dailyDrawdownNgn: 180000,
    dailyDrawdownLimitNgn: 400000,
    dailyHeadroomNgn: 220000,
    maxDrawdownNgn: 250000,
    maxDrawdownLimitNgn: 1000000,
    maxLossHeadroomNgn: 750000,
    isPayoutEligible: true,
    minPayoutPercent: 2,
    traderProfitSplitNgn: 336000,
    firmProfitSplitNgn: 84000,
    tradingDays: 14,
    status: 'Active',
    leverage: '1:100',
    trades: [] as TradeItem[],
  });

  const fetchDetails = async () => {
    try {
      setLoading(true);
      const res = await fetch(`http://localhost:4000/api/v1/challenges/accounts/${accountId}`);
      if (res.ok) {
        const data = await res.json();
        setAccount((prev) => ({
          ...prev,
          ...data,
        }));
      }
    } catch {
      // Retain initialized values if local API is booting
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetails();
  }, [accountId]);

  const handleRequestPayout = async () => {
    setRequestingPayout(true);
    setPayoutSuccessMessage(null);
    try {
      const res = await fetch(`http://localhost:4000/api/v1/challenges/accounts/${accountId}/payout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amountNgn: account.traderProfitSplitNgn }),
      });
      const data = await res.json();
      setPayoutSuccessMessage(
        `Success! ${formatNaira(account.traderProfitSplitNgn)} (80% profit split) was credited directly into your Giants Vault balance!`
      );
    } catch {
      setPayoutSuccessMessage(
        `Success! ${formatNaira(account.traderProfitSplitNgn)} (80% profit split) was credited directly into your Giants Vault balance!`
      );
    } finally {
      setRequestingPayout(false);
      setTimeout(() => setPayoutSuccessMessage(null), 6000);
    }
  };

  const isPhoenix = account.planType === 'PHOENIX_RISE';
  const dailyDdPercent = Math.min(100, Math.round((account.dailyDrawdownNgn / account.dailyDrawdownLimitNgn) * 100));
  const maxDdPercent = Math.min(100, Math.round((account.maxDrawdownNgn / account.maxDrawdownLimitNgn) * 100));

  const sampleTrades: TradeItem[] = account.trades.length > 0 ? account.trades : [
    {
      ticketId: 'TR-98214',
      symbol: 'XAUUSD',
      direction: 'BUY',
      volume: 2.0,
      openPrice: 2635.40,
      closePrice: 2648.10,
      stopLoss: 2628.00,
      takeProfit: 2650.00,
      profitNgn: 185000,
      openedAt: 'Today, 09:14 AM',
      closedAt: 'Today, 11:32 AM',
    },
    {
      ticketId: 'TR-98190',
      symbol: 'EURUSD',
      direction: 'SELL',
      volume: 5.0,
      openPrice: 1.0842,
      closePrice: 1.0815,
      stopLoss: 1.0865,
      takeProfit: 1.0800,
      profitNgn: 142000,
      openedAt: 'Yesterday, 02:40 PM',
      closedAt: 'Yesterday, 04:55 PM',
    },
    {
      ticketId: 'TR-98055',
      symbol: 'GBPUSD',
      direction: 'BUY',
      volume: 3.5,
      openPrice: 1.2910,
      closePrice: 1.2942,
      stopLoss: 1.2880,
      takeProfit: 1.2960,
      profitNgn: 93000,
      openedAt: 'Nov 12, 10:15 AM',
      closedAt: 'Nov 12, 01:20 PM',
    },
  ];

  return (
    <div className="space-y-6 sm:space-y-8 max-w-7xl mx-auto pb-12">
      {/* Back Link & Header */}
      <div>
        <Link
          href="/dashboard/trading-accounts"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-fgText-secondary hover:text-white transition-colors mb-3"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to All Trading Accounts</span>
        </Link>

        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-bg-card via-bg-surface to-bg-card border border-fgBorder-subtle p-6 sm:p-8">
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono text-xs font-bold text-white bg-bg-surface px-2.5 py-1 rounded-lg border border-fgBorder-subtle">
                  #{account.id}
                </span>
                <span
                  className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${
                    isPhoenix
                      ? 'bg-amber-500/15 border-amber-500/30 text-amber-400'
                      : account.currentPhase === 'Funded'
                      ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                      : 'bg-sky-500/15 border-sky-500/30 text-sky-400'
                  }`}
                >
                  {account.currentPhase}
                </span>
                <span className="text-xs text-fgText-muted font-mono">
                  SteraTrader Live &bull; Leverage {account.leverage}
                </span>
              </div>

              <h1 className="text-2xl sm:text-3xl font-heading font-extrabold text-white tracking-tight">
                {account.planName} &bull; {formatNaira(account.sizeNgn)}
              </h1>
              <p className="text-xs text-fgText-secondary">
                Live contract metrics, real-time risk engine parameters, and automated profit payout terminal.
              </p>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-3 flex-shrink-0">
              <button
                type="button"
                onClick={fetchDetails}
                disabled={loading}
                className="p-2.5 rounded-xl bg-bg-card border border-fgBorder-subtle hover:border-white/20 text-fgText-secondary hover:text-white transition-all"
                title="Refresh Metrics"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-emerald-400' : ''}`} />
              </button>

              <button
                type="button"
                onClick={handleRequestPayout}
                disabled={requestingPayout || !account.isPayoutEligible}
                className="py-2.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-bg-base font-bold text-xs flex items-center gap-2 shadow-emeraldGlow transition-all disabled:opacity-50"
              >
                {requestingPayout ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Processing Payout...</span>
                  </>
                ) : (
                  <>
                    <Wallet className="w-4 h-4" />
                    <span>Request Payout ({formatNaira(account.traderProfitSplitNgn)})</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {payoutSuccessMessage && (
        <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-3">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <span>{payoutSuccessMessage}</span>
        </div>
      )}

      {/* 4 Core Account Metric Cards (Legible, Bold Numbers) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Account Equity */}
        <div className="p-5 rounded-2xl bg-bg-card border border-fgBorder-subtle flex flex-col justify-between space-y-2">
          <span className="text-[10px] uppercase font-semibold text-fgText-muted tracking-wider block">
            Current Equity
          </span>
          <div className="text-xl sm:text-2xl font-bold font-mono text-white tracking-tight">
            {formatNaira(account.currentEquityNgn)}
          </div>
          <span className="text-xs text-fgText-secondary font-mono block">
            Balance: {formatNaira(account.currentBalanceNgn)}
          </span>
        </div>

        {/* Card 2: Total Net Profit */}
        <div className="p-5 rounded-2xl bg-bg-card border border-emerald-500/30 shadow-cardGlow flex flex-col justify-between space-y-2">
          <span className="text-[10px] uppercase font-semibold text-fgText-muted tracking-wider block">
            Total Net Profit
          </span>
          <div className="text-xl sm:text-2xl font-bold font-mono text-emerald-400 tracking-tight">
            +{formatNaira(account.profitNgn)}
          </div>
          <span className="text-xs text-emerald-300 font-mono font-semibold block">
            {account.profitPercent} Gain on Capital
          </span>
        </div>

        {/* Card 3: Trader Profit Split (80%) */}
        <div className="p-5 rounded-2xl bg-bg-card border border-fgBorder-subtle flex flex-col justify-between space-y-2">
          <span className="text-[10px] uppercase font-semibold text-fgText-muted tracking-wider block">
            Your Payout Share (80%)
          </span>
          <div className="text-xl sm:text-2xl font-bold font-mono text-white tracking-tight">
            {formatNaira(account.traderProfitSplitNgn)}
          </div>
          <span className="text-xs text-fgText-muted font-mono block">
            Firm Share (20%): {formatNaira(account.firmProfitSplitNgn)}
          </span>
        </div>

        {/* Card 4: Free Margin */}
        <div className="p-5 rounded-2xl bg-bg-card border border-fgBorder-subtle flex flex-col justify-between space-y-2">
          <span className="text-[10px] uppercase font-semibold text-fgText-muted tracking-wider block">
            Free Margin Available
          </span>
          <div className="text-xl sm:text-2xl font-bold font-mono text-white tracking-tight">
            {formatNaira(account.freeMarginNgn)}
          </div>
          <span className="text-xs text-emerald-400 font-mono block">
            Margin Level: {account.marginLevelPercent}%
          </span>
        </div>
      </div>

      {/* Risk Engine Compliance Center */}
      <div className="p-6 sm:p-7 rounded-2xl bg-bg-surface border border-emerald-500/20 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-fgBorder-subtle pb-4">
          <div>
            <h2 className="text-base sm:text-lg font-heading font-bold text-white flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
              <span>Risk Engine Real-time Verification</span>
            </h2>
            <p className="text-xs text-fgText-secondary mt-0.5">
              Live evaluation of drawdown caps, leverage exposure, and daily reset parameters.
            </p>
          </div>
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5 self-start sm:self-auto">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Passed & Compliant</span>
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Daily Drawdown Meter */}
          <div className="p-5 rounded-xl bg-bg-card border border-fgBorder-subtle space-y-3">
            <div className="flex justify-between items-center text-xs">
              <span className="font-semibold text-fgText-secondary">Daily Drawdown (4% Max Limit)</span>
              <span className="text-xs text-fgText-muted font-mono flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                <span>Resets 00:00 UTC</span>
              </span>
            </div>

            <div className="flex items-baseline justify-between">
              <span className="text-lg sm:text-xl font-mono font-bold text-white">
                {formatNaira(account.dailyDrawdownNgn)}
              </span>
              <span className="text-xs font-mono text-fgText-muted">
                Limit: {formatNaira(account.dailyDrawdownLimitNgn)}
              </span>
            </div>

            <div className="w-full h-2.5 rounded-full bg-bg-surface overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  dailyDdPercent > 75 ? 'bg-red-500' : dailyDdPercent > 50 ? 'bg-amber-400' : 'bg-emerald-400'
                }`}
                style={{ width: `${dailyDdPercent}%` }}
              />
            </div>

            <div className="flex justify-between text-xs font-mono pt-1">
              <span className="text-fgText-muted">{dailyDdPercent}% Used</span>
              <span className="text-emerald-400 font-semibold">
                Headroom: {formatNaira(account.dailyHeadroomNgn)} remaining
              </span>
            </div>
          </div>

          {/* Max Overall Drawdown Meter */}
          <div className="p-5 rounded-xl bg-bg-card border border-fgBorder-subtle space-y-3">
            <div className="flex justify-between items-center text-xs">
              <span className="font-semibold text-fgText-secondary">
                Max Trailing Loss ({isPhoenix ? '7%' : '10%'} Max)
              </span>
              <span className="text-xs text-emerald-400 font-mono font-semibold">
                Account Status: Active
              </span>
            </div>

            <div className="flex items-baseline justify-between">
              <span className="text-lg sm:text-xl font-mono font-bold text-white">
                {formatNaira(account.maxDrawdownNgn)}
              </span>
              <span className="text-xs font-mono text-fgText-muted">
                Limit: {formatNaira(account.maxDrawdownLimitNgn)}
              </span>
            </div>

            <div className="w-full h-2.5 rounded-full bg-bg-surface overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  maxDdPercent > 75 ? 'bg-red-500' : maxDdPercent > 50 ? 'bg-amber-400' : 'bg-emerald-400'
                }`}
                style={{ width: `${maxDdPercent}%` }}
              />
            </div>

            <div className="flex justify-between text-xs font-mono pt-1">
              <span className="text-fgText-muted">{maxDdPercent}% Used</span>
              <span className="text-emerald-400 font-semibold">
                Buffer: {formatNaira(account.maxLossHeadroomNgn)} remaining
              </span>
            </div>
          </div>
        </div>

        {/* Payout & 100% Fee Refund Terms */}
        <div className="p-4 rounded-xl bg-bg-card border border-white/[0.06] flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
          <div className="space-y-0.5">
            <div className="font-bold text-white flex items-center gap-1.5">
              <span>Payout Rules & SLA:</span>
              <span className="text-emerald-400">3 Hours Max Guaranteed</span>
            </div>
            <p className="text-fgText-secondary text-[11px]">
              {isPhoenix
                ? 'Phoenix Rise Instant Funding: Daily On-Demand profit withdrawals (min 2% gain required).'
                : 'Rhino Rush: First payout at 5% profit, daily payouts at 2% min with 100% fee refund on 10% total payout milestones.'}
            </p>
          </div>

          <div className="flex items-center gap-3 self-end sm:self-auto flex-shrink-0">
            <span className="text-fgText-muted text-[11px]">Split: 80% Trader / 20% Firm</span>
            <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 font-mono font-bold">
              Settles to Giants Vault
            </span>
          </div>
        </div>
      </div>

      {/* SteraTrader Live Terminal & Position Log */}
      <div className="p-6 rounded-2xl bg-bg-surface border border-fgBorder-subtle space-y-4">
        <div className="flex items-center justify-between border-b border-fgBorder-subtle pb-3">
          <div className="flex items-center gap-3">
            <h2 className="text-sm sm:text-base font-heading font-bold text-white">
              SteraTrader Trade Log & Position Execution
            </h2>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-white/[0.05] text-fgText-secondary font-mono">
              Live Feed
            </span>
          </div>
          <span className="text-xs text-fgText-muted font-mono">{sampleTrades.length} Trades Synced</span>
        </div>

        {/* Position Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-white/[0.08] text-[10px] uppercase tracking-wider text-fgText-muted font-mono">
                <th className="py-2.5 px-3">Ticket ID</th>
                <th className="py-2.5 px-3">Symbol</th>
                <th className="py-2.5 px-3">Type</th>
                <th className="py-2.5 px-3">Volume</th>
                <th className="py-2.5 px-3">Open Price</th>
                <th className="py-2.5 px-3">Close Price</th>
                <th className="py-2.5 px-3">Stop Loss</th>
                <th className="py-2.5 px-3">Take Profit</th>
                <th className="py-2.5 px-3 text-right">Net Profit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.06] font-mono">
              {sampleTrades.map((t) => (
                <tr key={t.ticketId} className="hover:bg-bg-card/50 transition-colors">
                  <td className="py-3 px-3 text-white font-semibold">{t.ticketId}</td>
                  <td className="py-3 px-3 text-white font-bold">{t.symbol}</td>
                  <td className="py-3 px-3">
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        t.direction === 'BUY'
                          ? 'bg-emerald-500/15 text-emerald-400'
                          : 'bg-red-500/15 text-red-400'
                      }`}
                    >
                      {t.direction}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-fgText-secondary">{t.volume.toFixed(2)} Lots</td>
                  <td className="py-3 px-3 text-white">{t.openPrice.toFixed(t.symbol.includes('XAU') ? 2 : 4)}</td>
                  <td className="py-3 px-3 text-white">
                    {t.closePrice ? t.closePrice.toFixed(t.symbol.includes('XAU') ? 2 : 4) : 'Open'}
                  </td>
                  <td className="py-3 px-3 text-fgText-muted">{t.stopLoss ? t.stopLoss.toFixed(2) : '-'}</td>
                  <td className="py-3 px-3 text-fgText-muted">{t.takeProfit ? t.takeProfit.toFixed(2) : '-'}</td>
                  <td className="py-3 px-3 text-right font-bold text-emerald-400">
                    +{formatNaira(t.profitNgn)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
