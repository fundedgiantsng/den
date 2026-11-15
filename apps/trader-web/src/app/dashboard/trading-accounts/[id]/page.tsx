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
  ChevronRight,
  Sparkles,
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

  const [loading, setLoading] = useState(false);
  const [requestingPayout, setRequestingPayout] = useState(false);
  const [payoutSuccessMessage, setPayoutSuccessMessage] = useState<string | null>(null);

  const [account, setAccount] = useState({
    id: accountId,
    loginNumber: '1092841',
    server: 'FundedGiants Live',
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
    payoutIneligibilityReason: undefined as string | undefined,
    minPayoutPercent: 2,
    payoutNumber: 1,
    traderSplitPercent: 50,
    profitSplitRatio: '50:50',
    traderProfitSplitNgn: 210000,
    firmProfitSplitNgn: 210000,
    tradingDays: 14,
    status: 'Active',
    leverage: '1:100',
    trades: [] as TradeItem[],
  });

  const fetchDetails = async () => {
    try {
      setLoading(true);
      const [accRes, riskRes] = await Promise.allSettled([
        fetch(`http://localhost:4000/api/v1/challenges/accounts/${accountId}`),
        fetch(`http://localhost:4000/api/v1/risk/status/${accountId}`),
      ]);

      let accData: any = {};
      if (accRes.status === 'fulfilled' && accRes.value.ok) {
        accData = await accRes.value.json();
      }

      if (riskRes.status === 'fulfilled' && riskRes.value.ok) {
        const riskData = await riskRes.value.json();
        setAccount((prev) => ({
          ...prev,
          ...accData,
          currentBalanceNgn: riskData.currentBalanceNgn ?? prev.currentBalanceNgn,
          currentEquityNgn: riskData.currentEquityNgn ?? prev.currentEquityNgn,
          dailyDrawdownNgn: riskData.dailyDrawdown?.currentLossNgn ?? prev.dailyDrawdownNgn,
          dailyDrawdownLimitNgn: riskData.dailyDrawdown?.dailyLimitNgn ?? prev.dailyDrawdownLimitNgn,
          dailyHeadroomNgn: riskData.dailyDrawdown?.headroomRemainingNgn ?? prev.dailyHeadroomNgn,
          maxDrawdownNgn: riskData.maximumDrawdown?.currentLossNgn ?? prev.maxDrawdownNgn,
          maxDrawdownLimitNgn: riskData.maximumDrawdown?.limitNgn ?? prev.maxDrawdownLimitNgn,
          maxLossHeadroomNgn: riskData.maximumDrawdown?.headroomRemainingNgn ?? prev.maxLossHeadroomNgn,
          isPayoutEligible: riskData.payoutEligibility?.eligible ?? false,
          payoutIneligibilityReason: riskData.payoutEligibility?.reason,
          traderSplitPercent: riskData.payoutEligibility?.traderSplitPercent ?? prev.traderSplitPercent,
          traderProfitSplitNgn: riskData.payoutEligibility?.traderProfitSplit ?? prev.traderProfitSplitNgn,
          firmProfitSplitNgn: riskData.payoutEligibility?.firmProfitSplit ?? prev.firmProfitSplitNgn,
        }));
      } else if (Object.keys(accData).length > 0) {
        setAccount((prev) => ({
          ...prev,
          ...accData,
        }));
      }
    } catch {
      // Fallback to static mock for local preview
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
      const res = await fetch(`http://localhost:4000/api/v1/risk/request-payout/${accountId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });
      const data = await res.json();
      setPayoutSuccessMessage(
        data.message || `Success: ${formatNaira(account.traderProfitSplitNgn)} credited to your Giants Vault!`
      );
    } catch (err: any) {
      setPayoutSuccessMessage(err.message || 'Payout processed.');
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
    <div className="space-y-6 max-w-7xl mx-auto w-full pb-16">
      {/* 1. Back Link */}
      <div>
        <Link
          href="/dashboard/trading-accounts"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-fgText-secondary hover:text-white transition-colors mb-3"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to All Trading Accounts</span>
        </Link>

        {/* Account Header Hero Card */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#0c1a13] via-[#08120d] to-[#040806] border border-emerald-500/25 p-6 sm:p-7 shadow-2xl">
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="font-mono text-xs font-bold text-white bg-black/40 px-2.5 py-1 rounded-lg border border-white/[0.08]">
                  #{account.id}
                </span>
                <span
                  className={`text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full ${
                    account.currentPhase === 'Funded'
                      ? 'bg-emerald-500/15 border border-emerald-500/30 text-[#00f59b]'
                      : 'bg-amber-500/15 border border-amber-500/30 text-amber-400'
                  }`}
                >
                  {account.currentPhase}
                </span>
                <span className="text-xs text-fgText-secondary font-mono">
                  {account.platform} &bull; Leverage {account.leverage}
                </span>
              </div>

              <h1 className="text-2xl sm:text-3xl font-heading font-extrabold text-white tracking-tight">
                {account.planName} &bull; {formatNaira(account.sizeNgn)}
              </h1>
              <p className="text-xs text-fgText-secondary">
                Live contract metrics, real-time risk engine compliance, and trade execution terminal.
              </p>
            </div>

            {/* Quick Actions */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <button
                type="button"
                onClick={fetchDetails}
                disabled={loading}
                className="p-2.5 rounded-xl bg-black/40 border border-white/[0.08] hover:border-emerald-500/30 text-fgText-secondary hover:text-white transition"
                title="Refresh Metrics"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-emerald-400' : ''}`} />
              </button>

              <div className="flex flex-col items-start sm:items-end gap-1">
                <button
                  type="button"
                  onClick={handleRequestPayout}
                  disabled={requestingPayout || !account.isPayoutEligible}
                  className="px-5 py-2.5 rounded-xl bg-[#00e575] hover:bg-[#00c966] text-black font-heading font-extrabold text-xs shadow-lg shadow-emerald-500/20 active:scale-95 transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
                >
                  <Wallet className="w-3.5 h-3.5" />
                  <span>
                    {account.isPayoutEligible
                      ? `Request Payout (${formatNaira(account.traderProfitSplitNgn)})`
                      : 'Payout Locked'}
                  </span>
                </button>
                {!account.isPayoutEligible && account.payoutIneligibilityReason && (
                  <span className="text-[10px] text-amber-400/90 font-mono">
                    {account.payoutIneligibilityReason}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {payoutSuccessMessage && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-[#00f59b] text-xs flex items-center gap-2.5">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{payoutSuccessMessage}</span>
        </div>
      )}

      {/* 2. Top 4 Account Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Equity */}
        <div className="p-5 rounded-2xl bg-[#09120e] border border-white/[0.08] space-y-1.5 shadow-xl">
          <span className="text-[10px] uppercase font-semibold text-fgText-muted tracking-wider block">
            Current Equity
          </span>
          <div className="text-xl sm:text-2xl font-bold font-mono text-white tracking-tight">
            {formatNaira(account.currentEquityNgn)}
          </div>
          <span className="text-[11px] text-fgText-secondary font-mono block">
            Balance: {formatNaira(account.currentBalanceNgn)}
          </span>
        </div>

        {/* Net Profit */}
        <div className="p-5 rounded-2xl bg-[#09120e] border border-emerald-500/30 space-y-1.5 shadow-xl">
          <span className="text-[10px] uppercase font-semibold text-fgText-muted tracking-wider block">
            Total Net Profit
          </span>
          <div className="text-xl sm:text-2xl font-bold font-mono text-[#00f59b] tracking-tight">
            +{formatNaira(account.profitNgn)}
          </div>
          <span className="text-[11px] text-emerald-400 font-mono font-semibold block">
            {account.profitPercent} Gain on Capital
          </span>
        </div>

        {/* Payout Split Tiered */}
        <div className="p-5 rounded-2xl bg-[#09120e] border border-white/[0.08] space-y-1.5 shadow-xl">
          <span className="text-[10px] uppercase font-semibold text-fgText-muted tracking-wider block">
            Your Payout Share ({account.traderSplitPercent || (isPhoenix ? 60 : 50)}%)
          </span>
          <div className="text-xl sm:text-2xl font-bold font-mono text-white tracking-tight">
            {formatNaira(account.traderProfitSplitNgn)}
          </div>
          <span className="text-[11px] text-fgText-muted font-mono block">
            Firm Split ({100 - (account.traderSplitPercent || (isPhoenix ? 60 : 50))}%): {formatNaira(account.firmProfitSplitNgn)}
          </span>
        </div>

        {/* Free Margin */}
        <div className="p-5 rounded-2xl bg-[#09120e] border border-white/[0.08] space-y-1.5 shadow-xl">
          <span className="text-[10px] uppercase font-semibold text-fgText-muted tracking-wider block">
            Free Margin
          </span>
          <div className="text-xl sm:text-2xl font-bold font-mono text-white tracking-tight">
            {formatNaira(account.freeMarginNgn)}
          </div>
          <span className="text-[11px] text-fgText-secondary font-mono block">
            Margin Level: {account.marginLevelPercent}%
          </span>
        </div>
      </div>

      {/* 3. Risk Engine Live Meters */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Daily Drawdown Meter */}
        <div className="p-5 rounded-2xl bg-[#09120e] border border-white/[0.08] space-y-3 shadow-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-heading font-bold text-white">Daily Drawdown (4% Limit)</span>
            </div>
            <span className="text-[10px] font-mono text-emerald-400">
              23:00 GMT+1 Reset
            </span>
          </div>

          <div className="w-full bg-black/50 h-2.5 rounded-full overflow-hidden border border-white/[0.06]">
            <div
              className={`h-full transition-all duration-500 rounded-full ${
                dailyDdPercent > 75 ? 'bg-rose-500' : 'bg-emerald-400'
              }`}
              style={{ width: `${dailyDdPercent}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-[11px] font-mono text-fgText-secondary">
            <span>Used: {formatNaira(account.dailyDrawdownNgn)} ({dailyDdPercent}%)</span>
            <span>Headroom: <strong className="text-emerald-400">{formatNaira(account.dailyHeadroomNgn)}</strong></span>
            <span>Limit: {formatNaira(account.dailyDrawdownLimitNgn)}</span>
          </div>
        </div>

        {/* Max Drawdown Meter */}
        <div className="p-5 rounded-2xl bg-[#09120e] border border-white/[0.08] space-y-3 shadow-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <span className="text-xs font-heading font-bold text-white">
                Maximum Drawdown ({isPhoenix ? '7%' : '10%'} Static Floor)
              </span>
            </div>
            <span className="text-[10px] font-mono text-amber-400">100% Static (Zero Trailing)</span>
          </div>

          <div className="w-full bg-black/50 h-2.5 rounded-full overflow-hidden border border-white/[0.06]">
            <div
              className={`h-full transition-all duration-500 rounded-full ${
                maxDdPercent > 75 ? 'bg-rose-500' : 'bg-emerald-400'
              }`}
              style={{ width: `${maxDdPercent}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-[11px] font-mono text-fgText-secondary">
            <span>Used: {formatNaira(account.maxDrawdownNgn)} ({maxDdPercent}%)</span>
            <span>Headroom: <strong className="text-amber-400">{formatNaira(account.maxLossHeadroomNgn)}</strong></span>
            <span>Limit: {formatNaira(account.maxDrawdownLimitNgn)}</span>
          </div>
        </div>
      </div>

      {/* 4. Trade Execution Log */}
      <div className="rounded-2xl bg-[#09120e] border border-white/[0.08] p-5 sm:p-6 space-y-4 shadow-xl">
        <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-heading font-bold text-white">Position Execution Log</h3>
          </div>
          <span className="text-[10px] font-mono text-fgText-muted">Live Stream</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-white/[0.04] text-fgText-muted font-semibold text-[10px] uppercase tracking-wider">
                <th className="pb-2.5 pl-1">Ticket</th>
                <th className="pb-2.5 px-3">Symbol</th>
                <th className="pb-2.5 px-3">Type</th>
                <th className="pb-2.5 px-3">Volume</th>
                <th className="pb-2.5 px-3">Open Price</th>
                <th className="pb-2.5 px-3">Close Price</th>
                <th className="pb-2.5 pr-1 text-right">Profit (₦)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.03]">
              {sampleTrades.map((t) => (
                <tr key={t.ticketId} className="hover:bg-white/[0.02] transition-colors font-mono">
                  <td className="py-3 pl-1 font-bold text-white">{t.ticketId}</td>
                  <td className="py-3 px-3 text-white font-semibold">{t.symbol}</td>
                  <td className="py-3 px-3">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        t.direction === 'BUY'
                          ? 'bg-emerald-500/15 text-[#00f59b]'
                          : 'bg-rose-500/15 text-rose-400'
                      }`}
                    >
                      {t.direction}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-fgText-secondary">{t.volume}</td>
                  <td className="py-3 px-3 text-fgText-secondary">{t.openPrice}</td>
                  <td className="py-3 px-3 text-fgText-secondary">{t.closePrice ?? 'OPEN'}</td>
                  <td className="py-3 pr-1 text-right font-bold text-[#00f59b]">
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
