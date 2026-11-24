'use client';

import { API_BASE_URL } from '@/lib/api';
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
  Key,
  Copy,
  Check,
  Eye,
  EyeOff,
} from 'lucide-react';
import { formatNaira, formatSignedNaira } from '@/lib/format';

interface TradeItem {
  ticketId: string;
  symbol: string;
  direction: 'BUY' | 'SELL' | 'OUT' | 'WITHDRAWAL' | string;
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
  const [payoutErrorMessage, setPayoutErrorMessage] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [showMasterPass, setShowMasterPass] = useState(false);

  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const [account, setAccount] = useState({
    id: accountId,
    loginNumber: '',
    server: 'FundedGiants',
    groupSlug: '',
    masterPassword: null as string | null,
    investorPassword: null as string | null,
    platform: 'SteraTrader',
    planName: 'Trading Account',
    planType: 'RHINO_RUSH',
    currentPhase: 'Evaluation',
    sizeNgn: 0,
    currentBalanceNgn: 0,
    currentEquityNgn: 0,
    freeMarginNgn: 0,
    marginLevelPercent: 0,
    profitNgn: 0,
    profitPercent: '0.00%',
    dailyDrawdownNgn: 0,
    dailyDrawdownLimitNgn: 0,
    dailyHeadroomNgn: 0,
    maxDrawdownNgn: 0,
    maxDrawdownLimitNgn: 0,
    maxLossHeadroomNgn: 0,
    targetEvaluation: null as {
      profitTargetNgn: number;
      profitTargetPercent: number;
      dailyProfitCapNgn: number;
      dailyProfitCapPercent: number;
      bankedTargetProfitNgn: number;
      todayProfitTotalNgn: number;
      todayCreditedTowardsTargetNgn: number;
      todayExcessProfitClearedAtResetNgn: number;
      cumulativeQualifiedProfitNgn: number;
      progressPercent: number;
      tradingDays?: number;
      minTradingDaysRequired?: number;
      tradingDaysMet?: boolean;
      resetTime: string;
      excessNotice: string | null;
    } | null,
    queuedPayout: null as {
      reference: string;
      amountNgn: number;
      scheduledApprovalAt: string;
      delayMinutes: number;
      remainingMinutes: number;
      requestedAt: string;
    } | null,
    isPayoutEligible: false,
    payoutIneligibilityReason: undefined as string | undefined,
    minPayoutPercent: 2,
    payoutNumber: 1,
    traderSplitPercent: 50,
    profitSplitRatio: '50:50',
    traderProfitSplitNgn: 0,
    firmProfitSplitNgn: 0,
    tradingDays: 0,
    status: 'Active',
    leverage: '1:100',
    trades: [] as TradeItem[],
  });

  const fetchDetails = async (isSilent = false) => {
    try {
      if (!isSilent) setLoading(true);
      const [accRes, riskRes] = await Promise.allSettled([
        fetch(`${API_BASE_URL}/challenges/accounts/${accountId}`, { credentials: 'include' }),
        fetch(`${API_BASE_URL}/risk/status/${accountId}`, { credentials: 'include' }),
      ]);

      let accData: any = {};
      if (accRes.status === 'fulfilled' && accRes.value.ok) {
        accData = await accRes.value.json();
      }

      if (riskRes.status === 'fulfilled' && riskRes.value.ok) {
        const riskData = await riskRes.value.json();
        setAccount((prev) => {
          const sizeNgn = accData.sizeNgn || prev.sizeNgn;
          const dailyLimit = riskData.dailyDrawdown?.dailyLimitNgn ?? (sizeNgn ? sizeNgn * 0.04 : prev.dailyDrawdownLimitNgn);
          const maxLimit = riskData.maximumDrawdown?.limitNgn ?? (sizeNgn ? (prev.planType === 'PHOENIX_RISE' ? sizeNgn * 0.07 : sizeNgn * 0.10) : prev.maxDrawdownLimitNgn);
          const dailyLoss = riskData.dailyDrawdown?.currentLossNgn ?? accData.dailyDrawdownNgn ?? prev.dailyDrawdownNgn;
          const dailyHeadroom = riskData.dailyDrawdown?.headroomRemainingNgn ?? accData.dailyHeadroomNgn ?? Math.max(0, dailyLimit - dailyLoss);
          const maxLoss = riskData.maximumDrawdown?.currentLossNgn ?? accData.maxDrawdownNgn ?? prev.maxDrawdownNgn;
          const maxHeadroom = riskData.maximumDrawdown?.headroomRemainingNgn ?? accData.maxLossHeadroomNgn ?? Math.max(0, maxLimit - maxLoss);

          return {
            ...prev,
            ...accData,
            currentBalanceNgn: riskData.currentBalanceNgn ?? prev.currentBalanceNgn,
            currentEquityNgn: riskData.currentEquityNgn ?? prev.currentEquityNgn,
            profitNgn: (riskData.currentEquityNgn != null && sizeNgn > 0) ? (riskData.currentEquityNgn - sizeNgn) : (accData.profitNgn ?? prev.profitNgn),
            dailyDrawdownNgn: dailyLoss,
            dailyDrawdownLimitNgn: dailyLimit,
            dailyHeadroomNgn: dailyHeadroom,
            maxDrawdownNgn: maxLoss,
            maxDrawdownLimitNgn: maxLimit,
            maxLossHeadroomNgn: maxHeadroom,
            targetEvaluation: riskData.targetEvaluation ?? prev.targetEvaluation,
            isPayoutEligible: (riskData.payoutEligibility?.eligible ?? false) && !(accData.queuedPayout || riskData.payoutEligibility?.queuedPayout),
            payoutIneligibilityReason: riskData.payoutEligibility?.reason,
            queuedPayout: accData.queuedPayout ?? riskData.payoutEligibility?.queuedPayout ?? null,
            traderSplitPercent: riskData.payoutEligibility?.traderSplitPercent ?? accData.traderSplitPercent ?? prev.traderSplitPercent,
            traderProfitSplitNgn: riskData.payoutEligibility?.traderProfitSplitNgn ?? riskData.payoutEligibility?.traderProfitSplit ?? accData.traderProfitSplitNgn ?? prev.traderProfitSplitNgn,
            firmProfitSplitNgn: riskData.payoutEligibility?.firmProfitSplitNgn ?? riskData.payoutEligibility?.firmProfitSplit ?? accData.firmProfitSplitNgn ?? prev.firmProfitSplitNgn,
          };
        });
      } else if (Object.keys(accData).length > 0) {
        setAccount((prev) => ({
          ...prev,
          ...accData,
        }));
      }
    } catch (err: any) {
      console.warn('Could not fetch trading account analytics', err);
    } finally {
      if (!isSilent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetails(false);
    // Real-time metrics streaming: automatically updates equity and daily drawdown every 3 seconds
    const liveStream = setInterval(() => {
      fetchDetails(true);
    }, 3000);
    return () => clearInterval(liveStream);
  }, [accountId]);

  const handleRequestPayout = async () => {
    setRequestingPayout(true);
    setPayoutSuccessMessage(null);
    try {
      const res = await fetch(`${API_BASE_URL}/risk/request-payout/${accountId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });
      const data = await res.json();
      setPayoutSuccessMessage(
        data.message || `Success: ${formatNaira(account.traderProfitSplitNgn)} credited to your Giants Vault!`
      );
    } catch (err: any) {
      setPayoutErrorMessage(err.message || 'Payout request failed.');
    } finally {
      setRequestingPayout(false);
      setTimeout(() => {
        setPayoutSuccessMessage(null);
        setPayoutErrorMessage(null);
      }, 6000);
    }
  };

  const isPhoenix = account.planType === 'PHOENIX_RISE';
  const isFundedAccount = isPhoenix || account.currentPhase === 'Funded' || account.currentPhase === 'Instant Funding';
  const dailyDdPercent = account.dailyDrawdownLimitNgn > 0 ? Math.min(100, Math.round((account.dailyDrawdownNgn / account.dailyDrawdownLimitNgn) * 100)) : 0;
  const maxDdPercent = account.maxDrawdownLimitNgn > 0 ? Math.min(100, Math.round((account.maxDrawdownNgn / account.maxDrawdownLimitNgn) * 100)) : 0;

  const trades: TradeItem[] = account.trades;

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
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-[10px] font-mono text-emerald-400 font-bold">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  LIVE STREAM
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
                onClick={() => fetchDetails()}
                disabled={loading}
                className="p-2.5 rounded-xl bg-black/40 border border-white/[0.08] hover:border-emerald-500/30 text-fgText-secondary hover:text-white transition"
                title="Refresh Metrics"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-emerald-400' : ''}`} />
              </button>

              {isFundedAccount && (
                <div className="flex flex-col items-start sm:items-end gap-1">
                  <button
                    type="button"
                    onClick={handleRequestPayout}
                    disabled={requestingPayout || !account.isPayoutEligible || !!account.queuedPayout}
                    className="px-5 py-2.5 rounded-xl bg-[#00e575] hover:bg-[#00c966] text-black font-heading font-extrabold text-xs shadow-lg shadow-emerald-500/20 active:scale-95 transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
                  >
                    <Wallet className="w-3.5 h-3.5" />
                    <span>
                      {account.queuedPayout
                        ? `Payout Queued (~${account.queuedPayout.remainingMinutes}m)`
                        : `Request Payout (${formatNaira(account.traderProfitSplitNgn)})`}
                    </span>
                  </button>
                  {!account.isPayoutEligible && !account.queuedPayout && account.payoutIneligibilityReason && !account.payoutIneligibilityReason.toLowerCase().includes('identity verification') && !account.payoutIneligibilityReason.toLowerCase().includes('kyc') && (
                    <span className="text-[10px] text-amber-400/90 font-mono">
                      {account.payoutIneligibilityReason}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Queued Payout SLA Banner */}
      {account.queuedPayout && (
        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-amber-500/15 via-emerald-500/10 to-transparent border border-amber-500/30 text-white shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 shrink-0">
              <Clock className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-heading font-bold text-amber-400 uppercase tracking-wider">
                  Payout Review in Progress
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  Ref: {account.queuedPayout.reference}
                </span>
              </div>
              <p className="text-xs text-fgText-secondary mt-0.5">
                Profit disbursement of <strong className="text-white">{formatNaira(account.queuedPayout.amountNgn)}</strong> is queued. Automated approval is scheduled in approximately <strong className="text-emerald-400">~{account.queuedPayout.remainingMinutes} minutes</strong>.
              </p>
            </div>
          </div>
          <div className="text-right text-[11px] font-mono text-fgText-muted shrink-0">
            <span>Trading balance reset to initial baseline</span>
          </div>
        </div>
      )}

      {payoutSuccessMessage && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-[#00f59b] text-xs flex items-center gap-2.5">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{payoutSuccessMessage}</span>
        </div>
      )}

      {/* SteraTrader Live Terminal & Credentials Card */}
      <div className="rounded-2xl bg-[#09120e] border border-white/[0.08] p-5 space-y-4 shadow-xl">
        <div className="flex items-center justify-between border-b border-white/[0.04] pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
              <Key className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">SteraTrader Terminal Credentials</h3>
              <p className="text-[11px] text-fgText-secondary">
                Use these credentials to log in on SteraTrader Desktop, Web Terminal, or Mobile Apps
              </p>
            </div>
          </div>
          <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
            DEMO SERVER • NGN
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono">
          {/* Server */}
          <div className="p-3 rounded-xl bg-black/40 border border-white/5 space-y-1">
            <span className="text-[10px] text-fgText-muted uppercase block">Server</span>
            <div className="flex items-center justify-between">
              <span className="text-emerald-400 font-bold truncate">{account.server || 'FundedGiants'}</span>
              <button
                type="button"
                onClick={() => handleCopy(account.server || 'FundedGiants', 'srv')}
                className="text-slate-500 hover:text-white"
              >
                {copiedField === 'srv' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {/* Login Number */}
          <div className="p-3 rounded-xl bg-black/40 border border-white/5 space-y-1">
            <span className="text-[10px] text-fgText-muted uppercase block">Account Login</span>
            <div className="flex items-center justify-between">
              <span className="text-white font-bold tracking-wide">{account.loginNumber || account.id || accountId}</span>
              <button
                type="button"
                onClick={() => handleCopy(account.loginNumber || account.id || accountId, 'lgn')}
                className="p-1 rounded text-slate-400 hover:text-white transition"
                title="Copy Login"
              >
                {copiedField === 'lgn' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {/* Master Password */}
          <div className="p-3 rounded-xl bg-black/40 border border-white/5 space-y-1">
            <span className="text-[10px] text-fgText-muted uppercase block">Trading Password (Master)</span>
            <div className="flex items-center justify-between">
              <span className="text-white font-bold tracking-wider font-mono">
                {account.masterPassword
                  ? showMasterPass
                    ? account.masterPassword
                    : '••••••••'
                  : '••••••••'}
              </span>
              <div className="flex items-center gap-1.5">
                {account.masterPassword ? (
                  <>
                    <button
                      type="button"
                      onClick={() => setShowMasterPass(!showMasterPass)}
                      className="p-1 rounded text-slate-400 hover:text-white transition"
                      title={showMasterPass ? 'Hide Password' : 'Show Password'}
                    >
                      {showMasterPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleCopy(account.masterPassword || '', 'pwd')}
                      className="p-1 rounded text-slate-400 hover:text-white transition"
                      title="Copy Password"
                    >
                      {copiedField === 'pwd' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </>
                ) : (
                  <span className="text-[10px] text-fgText-muted font-sans">Synced on login</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

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
          <div className={`text-xl sm:text-2xl font-bold font-mono tracking-tight ${account.profitNgn >= 0 ? 'text-[#00f59b]' : 'text-rose-400'}`}>
            {formatSignedNaira(account.profitNgn)}
          </div>
          <span className="text-[11px] text-emerald-400 font-mono font-semibold block">
            {account.profitPercent} Gain on Capital
          </span>
        </div>

        {/* Card 3: Payout Split for Funded / Instant accounts OR Challenge Target for Evaluation accounts */}
        {isFundedAccount ? (
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
        ) : (
          <div className="p-5 rounded-2xl bg-[#09120e] border border-emerald-500/30 space-y-1.5 shadow-xl">
            <span className="text-[10px] uppercase font-semibold text-emerald-400 tracking-wider block flex items-center gap-1.5">
              <Award className="w-3.5 h-3.5 text-emerald-400" />
              Challenge Target (10%)
            </span>
            <div className="text-xl sm:text-2xl font-bold font-mono text-white tracking-tight">
              {formatNaira(account.targetEvaluation?.profitTargetNgn || (account.sizeNgn * 0.10))}
            </div>
            <span className="text-[11px] text-fgText-secondary font-mono block">
              Qualified: <strong className="text-emerald-400">{formatNaira(account.targetEvaluation?.cumulativeQualifiedProfitNgn || 0)}</strong> ({account.targetEvaluation?.progressPercent || 0}%)
            </span>
          </div>
        )}

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

      {/* 2b. Rhino Rush 10% Profit Target & 2% Daily Profit Cap Terminal */}
      {(!isPhoenix && account.currentPhase !== 'Funded') && (
        <div className="p-5 sm:p-6 rounded-2xl bg-gradient-to-br from-[#0c1a13] via-[#09140f] to-[#050b08] border border-emerald-500/30 space-y-4 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/[0.06] pb-3">
            <div className="flex items-center gap-2">
              <Award className="w-4 h-4 text-emerald-400" />
              <h3 className="text-sm font-heading font-bold text-white">
                Rhino Rush Evaluation Target &bull; 10% Profit Goal
              </h3>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-black/40 border border-white/10 text-white font-bold">
                Trading Days: {account.targetEvaluation?.tradingDays || 1}/5 Min Days
              </span>
              <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-bold">
                2% Max Daily Profit Cap
              </span>
              <span className="text-[10px] font-mono text-fgText-secondary">
                Session Reset: 23:00 GMT+1
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-fgText-secondary">
                Qualified Target Progress:{' '}
                <strong className="text-emerald-400">
                  {formatNaira(account.targetEvaluation?.cumulativeQualifiedProfitNgn ?? 0)}
                </strong>{' '}
                /{' '}
                {formatNaira(account.targetEvaluation?.profitTargetNgn ?? account.sizeNgn * 0.1)}
              </span>
              <span className="font-bold text-white">
                {account.targetEvaluation?.progressPercent ?? 0}%
              </span>
            </div>

            <div className="w-full bg-black/60 h-3 rounded-full overflow-hidden border border-white/[0.08]">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 to-[#00f59b] transition-all duration-500 rounded-full"
                style={{
                  width: `${account.targetEvaluation?.progressPercent ?? 0}%`,
                }}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 text-[11px] font-mono text-fgText-secondary">
            <div className="p-3 rounded-xl bg-black/40 border border-white/[0.04]">
              <span className="text-[10px] text-fgText-muted uppercase block">Today&apos;s Profit</span>
              <span className="text-sm font-bold text-white">
                +{formatNaira(account.targetEvaluation?.todayProfitTotalNgn ?? 0)}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-black/40 border border-white/[0.04]">
              <span className="text-[10px] text-fgText-muted uppercase block">Credited Towards Target (Max 2%)</span>
              <span className="text-sm font-bold text-emerald-400">
                +{formatNaira(account.targetEvaluation?.todayCreditedTowardsTargetNgn ?? 0)}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-black/40 border border-white/[0.04]">
              <span className="text-[10px] text-fgText-muted uppercase block">Cleared at 23:00 GMT+1 Reset</span>
              <span className={`text-sm font-bold ${
                (account.targetEvaluation?.todayExcessProfitClearedAtResetNgn ?? 0) > 0 ? 'text-amber-400' : 'text-fgText-muted'
              }`}>
                {formatNaira(account.targetEvaluation?.todayExcessProfitClearedAtResetNgn ?? 0)}
              </span>
            </div>
          </div>

          {(account.targetEvaluation?.todayExcessProfitClearedAtResetNgn ?? 0) > 0 && (
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-400 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>
                {formatNaira(account.targetEvaluation?.todayExcessProfitClearedAtResetNgn || 0)} generated above the 2% daily cap does not count towards the 10% target and is removed/cleared at 23:00 GMT+1 session reset.
              </span>
            </div>
          )}
        </div>
      )}

      {/* 3. Risk Engine Live Meters */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Daily Drawdown Meter */}
        <div className="p-5 rounded-2xl bg-[#09120e] border border-white/[0.08] space-y-3 shadow-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-heading font-bold text-white">
                Daily Drawdown (4% - Equity Based)
              </span>
            </div>
            <span className="text-[10px] font-mono text-emerald-400">
              23:00 GMT+1 Reset
            </span>
          </div>

          <div className="w-full bg-black/50 h-2.5 rounded-full overflow-hidden border border-white/[0.06]">
            <div
              className={`h-full transition-all duration-500 rounded-full ${
                dailyDdPercent > 75 ? 'bg-rose-500' : dailyDdPercent > 50 ? 'bg-amber-400' : 'bg-emerald-400'
              }`}
              style={{ width: `${dailyDdPercent}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-[11px] font-mono text-fgText-secondary">
            <span>
              Used:{' '}
              <strong className={account.dailyDrawdownNgn > 0 ? (dailyDdPercent > 75 ? 'text-rose-400 font-bold' : 'text-amber-400') : 'text-white'}>
                {formatNaira(account.dailyDrawdownNgn)}
              </strong>{' '}
              &bull; ({dailyDdPercent}%)
            </span>
            <span>
              Headroom:{' '}
              <strong className={account.dailyHeadroomNgn < (account.dailyDrawdownLimitNgn * 0.25) ? 'text-rose-400 font-bold' : 'text-emerald-400'}>
                {formatNaira(account.dailyHeadroomNgn)}
              </strong>
            </span>
            <span>
              Limit: <strong className="text-white">{formatNaira(account.dailyDrawdownLimitNgn || (account.sizeNgn * 0.04))}</strong>
            </span>
          </div>
        </div>

        {/* Max Drawdown Meter */}
        <div className="p-5 rounded-2xl bg-[#09120e] border border-white/[0.08] space-y-3 shadow-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <span className="text-xs font-heading font-bold text-white">
                Maximum Drawdown:
              </span>
            </div>
            <span className="text-[10px] font-mono text-amber-400">{isPhoenix ? '7% Static' : '10% Static'}</span>
          </div>

          <div className="w-full bg-black/50 h-2.5 rounded-full overflow-hidden border border-white/[0.06]">
            <div
              className={`h-full transition-all duration-500 rounded-full ${
                maxDdPercent > 75 ? 'bg-rose-500' : maxDdPercent > 50 ? 'bg-amber-400' : 'bg-emerald-400'
              }`}
              style={{ width: `${maxDdPercent}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-[11px] font-mono text-fgText-secondary">
            <span>
              Used:{' '}
              <strong className={account.maxDrawdownNgn > 0 ? (maxDdPercent > 75 ? 'text-rose-400 font-bold' : 'text-amber-400') : 'text-white'}>
                {formatNaira(account.maxDrawdownNgn)}
              </strong>{' '}
              &bull; ({maxDdPercent}%)
            </span>
            <span>
              Headroom:{' '}
              <strong className={account.maxLossHeadroomNgn < (account.maxDrawdownLimitNgn * 0.25) ? 'text-rose-400 font-bold' : 'text-emerald-400'}>
                {formatNaira(account.maxLossHeadroomNgn)}
              </strong>
            </span>
            <span>
              Limit: <strong className="text-white">{formatNaira(account.maxDrawdownLimitNgn || (account.sizeNgn * (isPhoenix ? 0.07 : 0.10)))}</strong>
            </span>
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
              {trades.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-xs text-fgText-muted">
                    No trades recorded on this account yet.
                  </td>
                </tr>
              ) : (
                trades.map((t) => (
                <tr key={t.ticketId} className="hover:bg-white/[0.02] transition-colors font-mono">
                  <td className="py-3 pl-1 font-bold text-white">{t.ticketId}</td>
                  <td className="py-3 px-3 text-white font-semibold">{t.symbol}</td>
                  <td className="py-3 px-3">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        t.direction === 'BUY'
                          ? 'bg-emerald-500/15 text-[#00f59b]'
                          : t.direction === 'OUT' || t.direction === 'WITHDRAWAL'
                          ? 'bg-amber-500/15 text-amber-400'
                          : 'bg-rose-500/15 text-rose-400'
                      }`}
                    >
                      {t.direction}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-fgText-secondary">{t.volume}</td>
                  <td className="py-3 px-3 text-fgText-secondary">{t.openPrice}</td>
                  <td className="py-3 px-3 text-fgText-secondary">{t.closePrice ?? 'OPEN'}</td>
                  <td className={`py-3 pr-1 text-right font-bold font-mono ${t.profitNgn >= 0 ? 'text-[#00f59b]' : 'text-rose-400'}`}>
                    {formatSignedNaira(t.profitNgn)}
                  </td>
                </tr>
              ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
