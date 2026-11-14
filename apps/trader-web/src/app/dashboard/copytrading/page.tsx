'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  Copy,
  TrendingUp,
  ShieldCheck,
  Award,
  Users,
  Search,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Sparkles,
  ArrowUpRight,
  ArrowDownRight,
  Pause,
  Play,
  StopCircle,
  ChevronRight,
  Sliders,
  DollarSign,
  Layers,
  Flame,
  Check,
  X,
  RefreshCw,
  BarChart3,
  HelpCircle,
  Clock,
} from 'lucide-react';
import { formatNaira } from '@/lib/format';

interface MasterTrader {
  id: string;
  name: string;
  handle: string;
  avatarUrl: string;
  strategyType: string;
  description: string;
  accountNumber: string;
  platform: string;
  server: string;
  accountSizeNgn: number;
  winRatePercent: number;
  roiPercent: number;
  maxDrawdownPercent: number;
  profitFactor: number;
  sharpeRatio: number;
  copiersCount: number;
  totalAumNgn: number;
  minCopyCapitalNgn: number;
  performanceFeePercent: number;
  isFeatured: boolean;
  totalTradesCount: number;
}

interface MasterTradeRecord {
  id: string;
  ticketId: string;
  symbol: string;
  direction: string;
  volume: number;
  openPrice: number;
  closePrice: number | null;
  profitNgn: number;
  openedAt: string;
  closedAt: string | null;
}

interface PortfolioSummary {
  activeStrategiesCount: number;
  totalAllocatedNgn: number;
  totalProfitNgn: number;
  netRoiPercent: number;
}

interface ActiveSubscription {
  id: string;
  masterTraderId: string;
  masterName: string;
  masterHandle: string;
  masterAvatar: string;
  strategyType: string;
  allocatedCapitalNgn: number;
  copyMode: string;
  multiplier: number;
  totalProfitNgn: number;
  netRoiPercent: number;
  status: 'ACTIVE' | 'PAUSED' | 'STOPPED';
  startedAt: string;
  recentTrades: Array<{
    id: string;
    symbol: string;
    direction: string;
    volume: number;
    openPrice: number;
    closePrice: number | null;
    profitNgn: number;
    status: string;
    openedAt: string;
  }>;
}

export default function CopyTradingPage() {
  const [activeTab, setActiveTab] = useState<'marketplace' | 'portfolio'>('marketplace');
  const [showBalance, setShowBalance] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [strategyFilter, setStrategyFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState<'copiers' | 'roi' | 'winRate' | 'drawdown' | 'aum'>('copiers');

  // Master traders & Portfolio state
  const [masters, setMasters] = useState<MasterTrader[]>([]);
  const [portfolioSummary, setPortfolioSummary] = useState<PortfolioSummary>({
    activeStrategiesCount: 0,
    totalAllocatedNgn: 0,
    totalProfitNgn: 0,
    netRoiPercent: 0,
  });
  const [activeSubscriptions, setActiveSubscriptions] = useState<ActiveSubscription[]>([]);
  const [historySubscriptions, setHistorySubscriptions] = useState<any[]>([]);
  const [vaultBalanceNgn, setVaultBalanceNgn] = useState<number>(12450000);
  const [loading, setLoading] = useState(true);

  // Selected Master for Modal
  const [selectedMaster, setSelectedMaster] = useState<MasterTrader | null>(null);
  const [isCopyModalOpen, setIsCopyModalOpen] = useState(false);
  const [isIntelModalOpen, setIsIntelModalOpen] = useState(false);
  const [masterIntelDetails, setMasterIntelDetails] = useState<any | null>(null);
  const [intelLoading, setIntelLoading] = useState(false);

  // Copy modal form
  const [allocatedAmount, setAllocatedAmount] = useState<string>('1000000');
  const [copyMode, setCopyMode] = useState<'PROPORTIONAL_EQUITY' | 'FIXED_LOT' | 'MULTIPLIER'>('PROPORTIONAL_EQUITY');
  const [stopLossFloor, setStopLossFloor] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Fetch Master Traders and Portfolio
  const loadData = async () => {
    try {
      const [resMasters, resPort, resVault] = await Promise.all([
        fetch('http://localhost:4000/api/v1/copytrading/masters', { credentials: 'include' }),
        fetch('http://localhost:4000/api/v1/copytrading/portfolio', { credentials: 'include' }),
        fetch('http://localhost:4000/api/v1/wallet/overview', { credentials: 'include' }),
      ]);

      if (resMasters.ok) {
        const mastersData = await resMasters.json();
        setMasters(mastersData);
      }

      if (resPort.ok) {
        const portData = await resPort.json();
        if (portData.summary) setPortfolioSummary(portData.summary);
        if (portData.activeSubscriptions) setActiveSubscriptions(portData.activeSubscriptions);
        if (portData.history) setHistorySubscriptions(portData.history);
      }

      if (resVault.ok) {
        const vaultData = await resVault.json();
        if (vaultData.availableBalanceNgn !== undefined) {
          setVaultBalanceNgn(vaultData.availableBalanceNgn);
        }
      }
    } catch (e) {
      console.error('Failed to load copy trading data', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filter and sort masters
  const filteredMasters = masters.filter((m) => {
    const matchesSearch =
      m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.handle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.strategyType.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.description.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStrategy =
      strategyFilter === 'ALL' || m.strategyType.toLowerCase().includes(strategyFilter.toLowerCase());

    return matchesSearch && matchesStrategy;
  }).sort((a, b) => {
    if (sortBy === 'roi') return b.roiPercent - a.roiPercent;
    if (sortBy === 'winRate') return b.winRatePercent - a.winRatePercent;
    if (sortBy === 'drawdown') return a.maxDrawdownPercent - b.maxDrawdownPercent;
    if (sortBy === 'aum') return b.totalAumNgn - a.totalAumNgn;
    return b.copiersCount - a.copiersCount;
  });

  // Open Copy Modal
  const openCopyModal = (master: MasterTrader) => {
    setSelectedMaster(master);
    setAllocatedAmount(String(master.minCopyCapitalNgn || 1000000));
    setCopyMode('PROPORTIONAL_EQUITY');
    setActionSuccess(null);
    setActionError(null);
    setIsCopyModalOpen(true);
  };

  // Open Intel Modal
  const openIntelModal = async (master: MasterTrader) => {
    setSelectedMaster(master);
    setIsIntelModalOpen(true);
    setIntelLoading(true);
    try {
      const res = await fetch(`http://localhost:4000/api/v1/copytrading/masters/${master.id}`, {
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        setMasterIntelDetails(data);
      }
    } catch (err) {
      console.error('Error fetching master intel', err);
    } finally {
      setIntelLoading(false);
    }
  };

  // Submit Copy Strategy
  const handleCopySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMaster) return;

    const amount = Number(allocatedAmount);
    if (isNaN(amount) || amount < selectedMaster.minCopyCapitalNgn) {
      setActionError(`Minimum allocation for this master is ${formatNaira(selectedMaster.minCopyCapitalNgn)}`);
      return;
    }

    if (amount > vaultBalanceNgn) {
      setActionError(`Insufficient balance in Giants Vault (${formatNaira(vaultBalanceNgn)} available)`);
      return;
    }

    setIsSubmitting(true);
    setActionError(null);

    try {
      const res = await fetch('http://localhost:4000/api/v1/copytrading/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          masterTraderId: selectedMaster.id,
          allocatedCapitalNgn: amount,
          copyMode,
          stopLossEquityNgn: stopLossFloor ? Number(stopLossFloor) : undefined,
        }),
      });

      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.message || 'Failed to start copying');
      }

      setActionSuccess(`Successfully allocated ${formatNaira(amount)} to copy ${selectedMaster.name}!`);
      setTimeout(() => {
        setIsCopyModalOpen(false);
        setActiveTab('portfolio');
        loadData();
      }, 1500);
    } catch (err: any) {
      setActionError(err.message || 'An error occurred while subscribing');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Pause / Resume Subscription
  const handleTogglePause = async (sub: ActiveSubscription) => {
    const endpoint = sub.status === 'ACTIVE' ? 'pause' : 'resume';
    try {
      const res = await fetch(`http://localhost:4000/api/v1/copytrading/subscriptions/${sub.id}/${endpoint}`, {
        method: 'POST',
        credentials: 'include',
      });
      if (res.ok) {
        loadData();
      }
    } catch (e) {
      console.error('Failed to toggle status', e);
    }
  };

  // Stop & Settle to Giants Vault
  const handleStopSubscription = async (sub: ActiveSubscription) => {
    if (
      !confirm(
        `Are you sure you want to stop copying ${sub.masterName}? Your principal and any net profits will be settled back to your Giants Vault immediately.`
      )
    ) {
      return;
    }

    try {
      const res = await fetch(`http://localhost:4000/api/v1/copytrading/subscriptions/${sub.id}/stop`, {
        method: 'POST',
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        alert(data.message || 'Copy strategy stopped and settled to Giants Vault.');
        loadData();
      }
    } catch (e) {
      console.error('Failed to stop subscription', e);
    }
  };

  return (
    <div className="min-h-screen bg-[#040806] text-[#e8f5e9] p-4 md:p-8 space-y-8 relative overflow-hidden">
      {/* Dynamic Geometric Emerald Glow Backdrops */}
      <div className="absolute top-0 right-1/4 w-[700px] h-[700px] bg-gradient-to-br from-[#00f59b]/10 via-[#00f59b]/[0.02] to-transparent rounded-full blur-3xl pointer-events-none -z-10" />
      <div className="absolute bottom-10 left-10 w-[500px] h-[500px] bg-gradient-to-tr from-[#00693e]/15 to-transparent rounded-full blur-3xl pointer-events-none -z-10" />

      {/* Page Title & Navigation Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#00f59b]/20 to-[#00f59b]/5 border border-[#00f59b]/30 flex items-center justify-center shadow-lg shadow-[#00f59b]/10">
              <Copy className="w-5 h-5 text-[#00f59b]" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2">
                CopyTrading Marketplace
                <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-[#00f59b]/15 text-[#00f59b] border border-[#00f59b]/30">
                  Institutional
                </span>
              </h1>
              <p className="text-sm text-gray-400 mt-0.5">
                Replicate top-performing SteraTrader masters automatically with zero latency and direct Giants Vault custody.
              </p>
            </div>
          </div>
        </div>

        {/* View Switcher Tabs */}
        <div className="flex items-center gap-2 p-1 bg-[#09120e] border border-white/[0.08] rounded-xl self-start md:self-auto">
          <button
            onClick={() => setActiveTab('marketplace')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all flex items-center gap-2 ${
              activeTab === 'marketplace'
                ? 'bg-[#00f59b]/20 text-[#00f59b] border border-[#00f59b]/30 shadow-sm'
                : 'text-gray-400 hover:text-white hover:bg-white/[0.03]'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            Master Traders Directory
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white/[0.08] text-gray-300">
              {masters.length}
            </span>
          </button>
          <button
            onClick={() => setActiveTab('portfolio')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all flex items-center gap-2 ${
              activeTab === 'portfolio'
                ? 'bg-[#00f59b]/20 text-[#00f59b] border border-[#00f59b]/30 shadow-sm'
                : 'text-gray-400 hover:text-white hover:bg-white/[0.03]'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            My Active Copies
            {activeSubscriptions.length > 0 && (
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-[#00f59b]/30 text-[#00f59b] font-bold">
                {activeSubscriptions.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Top 4 Summary Metrics Ribbon */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Copied Capital */}
        <div className="bg-[#09120e] border border-white/[0.08] hover:border-[#00f59b]/30 rounded-2xl p-5 relative overflow-hidden transition-all group">
          <div className="flex items-center justify-between text-xs text-gray-400 mb-2">
            <span className="font-medium flex items-center gap-1.5">
              <DollarSign className="w-3.5 h-3.5 text-[#00f59b]" /> Total Copied Capital
            </span>
            <button
              onClick={() => setShowBalance(!showBalance)}
              className="text-gray-500 hover:text-gray-300 transition-colors"
            >
              {showBalance ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            </button>
          </div>
          <div className="text-2xl font-black text-white tracking-tight">
            {showBalance ? formatNaira(portfolioSummary.totalAllocatedNgn) : '₦••••••••'}
          </div>
          <p className="text-[11px] text-gray-500 mt-1">Across active master allocations</p>
        </div>

        {/* Card 2: Active Strategies */}
        <div className="bg-[#09120e] border border-white/[0.08] hover:border-[#00f59b]/30 rounded-2xl p-5 relative overflow-hidden transition-all group">
          <div className="flex items-center justify-between text-xs text-gray-400 mb-2">
            <span className="font-medium flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-[#00f59b]" /> Active Strategies Followed
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#00f59b]/15 text-[#00f59b]">
              Live Replication
            </span>
          </div>
          <div className="text-2xl font-black text-white tracking-tight">
            {portfolioSummary.activeStrategiesCount}{' '}
            <span className="text-sm font-normal text-gray-400">Masters</span>
          </div>
          <p className="text-[11px] text-gray-500 mt-1">Automated position sizing on SteraTrader</p>
        </div>

        {/* Card 3: Total Net Profit */}
        <div className="bg-[#09120e] border border-white/[0.08] hover:border-[#00f59b]/30 rounded-2xl p-5 relative overflow-hidden transition-all group">
          <div className="flex items-center justify-between text-xs text-gray-400 mb-2">
            <span className="font-medium flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-[#00f59b]" /> Total Replicated Profit
            </span>
            <span className="text-[10px] font-semibold text-[#00f59b] bg-[#00f59b]/10 px-2 py-0.5 rounded-full">
              +{portfolioSummary.netRoiPercent}% ROI
            </span>
          </div>
          <div className="text-2xl font-black text-[#00f59b] tracking-tight">
            +{formatNaira(portfolioSummary.totalProfitNgn)}
          </div>
          <p className="text-[11px] text-gray-500 mt-1">Cumulative net earnings to date</p>
        </div>

        {/* Card 4: Available in Giants Vault */}
        <div className="bg-[#09120e] border border-white/[0.08] hover:border-[#f5a623]/30 rounded-2xl p-5 relative overflow-hidden transition-all group">
          <div className="flex items-center justify-between text-xs text-gray-400 mb-2">
            <span className="font-medium flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-[#f5a623]" /> Available in Giants Vault
            </span>
            <Link
              href="/dashboard/wallet"
              className="text-[10px] font-bold text-[#f5a623] hover:underline flex items-center gap-0.5"
            >
              Deposit <ArrowUpRight className="w-2.5 h-2.5" />
            </Link>
          </div>
          <div className="text-2xl font-black text-white tracking-tight">
            {formatNaira(vaultBalanceNgn)}
          </div>
          <p className="text-[11px] text-gray-500 mt-1">Instant capital ready for copy allocation</p>
        </div>
      </div>

      {/* VIEW 1: MASTER TRADERS DIRECTORY */}
      {activeTab === 'marketplace' && (
        <div className="space-y-6">
          {/* Controls: Search, Strategy Filters & Sort Bar */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-[#09120e] border border-white/[0.08] rounded-2xl p-4">
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="text"
                placeholder="Search master trader by name, @handle or strategy..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#050a07] border border-white/[0.08] rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#00f59b]/50 transition-colors"
              />
            </div>

            {/* Strategy Filter Chips */}
            <div className="flex flex-wrap items-center gap-1.5">
              {[
                { key: 'ALL', label: 'All Strategies' },
                { key: 'Scalp', label: 'Scalping' },
                { key: 'Swing', label: 'Swing FX' },
                { key: 'Gold', label: 'Gold Specialist' },
                { key: 'Smart Money', label: 'Smart Money' },
                { key: 'Indices', label: 'Indices' },
              ].map((filter) => (
                <button
                  key={filter.key}
                  onClick={() => setStrategyFilter(filter.key)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    strategyFilter === filter.key
                      ? 'bg-[#00f59b]/20 text-[#00f59b] border border-[#00f59b]/40 font-semibold'
                      : 'bg-[#050a07] text-gray-400 hover:text-white border border-white/[0.05]'
                  }`}
                >
                  {filter.label}
                </button>
              ))}
            </div>

            {/* Sort Selector */}
            <div className="flex items-center gap-2 self-end lg:self-auto">
              <span className="text-xs text-gray-500 font-medium whitespace-nowrap">Sort By:</span>
              <select
                value={sortBy}
                onChange={(e: any) => setSortBy(e.target.value)}
                className="bg-[#050a07] border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#00f59b]/50"
              >
                <option value="copiers">Most Copiers</option>
                <option value="roi">Highest ROI (%)</option>
                <option value="winRate">Highest Win Rate (%)</option>
                <option value="drawdown">Lowest Drawdown</option>
                <option value="aum">Highest AUM</option>
              </select>
            </div>
          </div>

          {/* Master Traders Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredMasters.map((master) => (
              <div
                key={master.id}
                className="bg-[#09120e] border border-white/[0.08] hover:border-[#00f59b]/30 rounded-2xl p-6 relative flex flex-col justify-between transition-all group hover:shadow-xl hover:shadow-[#00f59b]/5"
              >
                <div>
                  {/* Top Row: Avatar, Identity, Badges */}
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div className="flex items-center gap-3">
                      <div className="relative w-12 h-12 rounded-full overflow-hidden border-2 border-[#00f59b]/40 bg-[#050a07]">
                        <Image
                          src={master.avatarUrl}
                          alt={master.name}
                          fill
                          className="object-cover"
                        />
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <h3 className="font-bold text-white text-base leading-snug group-hover:text-[#00f59b] transition-colors">
                            {master.name}
                          </h3>
                          <ShieldCheck className="w-4 h-4 text-[#00f59b]" />
                        </div>
                        <p className="text-xs text-gray-400">@{master.handle}</p>
                      </div>
                    </div>

                    <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-[#00f59b]/15 text-[#00f59b] border border-[#00f59b]/30 whitespace-nowrap">
                      {master.strategyType}
                    </span>
                  </div>

                  {/* Platform & Account Specs */}
                  <div className="flex items-center justify-between text-[11px] text-gray-400 bg-[#050a07] border border-white/[0.04] rounded-lg px-3 py-1.5 mb-4">
                    <span className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#00f59b] animate-pulse" />
                      Platform: <strong className="text-white">{master.platform}</strong>
                    </span>
                    <span>
                      Server: <strong className="text-white">{master.server}</strong>
                    </span>
                  </div>

                  {/* Bio & Strategy Summary */}
                  <p className="text-xs text-gray-400 line-clamp-2 leading-relaxed mb-5">
                    {master.description}
                  </p>

                  {/* Primary Performance Metrics Matrix */}
                  <div className="grid grid-cols-3 gap-2 p-3 bg-[#050a07] rounded-xl border border-white/[0.04] mb-4">
                    <div className="text-center">
                      <div className="text-[10px] text-gray-500 font-medium">90D ROI</div>
                      <div className="text-sm font-black text-[#00f59b]">+{master.roiPercent}%</div>
                    </div>
                    <div className="text-center border-x border-white/[0.06]">
                      <div className="text-[10px] text-gray-500 font-medium">Win Rate</div>
                      <div className="text-sm font-black text-white">{master.winRatePercent}%</div>
                    </div>
                    <div className="text-center">
                      <div className="text-[10px] text-gray-500 font-medium">Max DD</div>
                      <div className="text-sm font-black text-amber-400">{master.maxDrawdownPercent}%</div>
                    </div>
                  </div>

                  {/* Secondary Metrics: Profit Factor, Copiers, AUM */}
                  <div className="space-y-2 text-xs border-t border-white/[0.06] pt-3 mb-5">
                    <div className="flex items-center justify-between text-gray-400">
                      <span>Profit Factor:</span>
                      <strong className="text-white">{master.profitFactor}</strong>
                    </div>
                    <div className="flex items-center justify-between text-gray-400">
                      <span>Active Copiers:</span>
                      <strong className="text-white flex items-center gap-1">
                        <Users className="w-3 h-3 text-[#00f59b]" />
                        {master.copiersCount.toLocaleString()} traders
                      </strong>
                    </div>
                    <div className="flex items-center justify-between text-gray-400">
                      <span>Total AUM Replicated:</span>
                      <strong className="text-white">{formatNaira(master.totalAumNgn)}</strong>
                    </div>
                    <div className="flex items-center justify-between text-gray-400">
                      <span>Min Copy / Fee:</span>
                      <span className="text-gray-300">
                        {formatNaira(master.minCopyCapitalNgn)} •{' '}
                        <strong className="text-[#00f59b]">{master.performanceFeePercent}% fee</strong>
                      </span>
                    </div>
                  </div>

                  {/* Equity Sparkline Vector */}
                  <div className="w-full h-8 mb-5 overflow-hidden rounded-md bg-[#00f59b]/[0.02] flex items-center justify-center">
                    <svg className="w-full h-full text-[#00f59b]" viewBox="0 0 200 40" fill="none">
                      <path
                        d="M0 35 Q 25 32, 50 25 T 100 18 T 150 10 T 200 4"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                      />
                      <path
                        d="M0 35 Q 25 32, 50 25 T 100 18 T 150 10 T 200 4 L 200 40 L 0 40 Z"
                        fill="currentColor"
                        fillOpacity="0.1"
                      />
                    </svg>
                  </div>
                </div>

                {/* Actions: Copy Strategy & View Intel */}
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <button
                    onClick={() => openIntelModal(master)}
                    className="w-full py-2.5 px-3 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-gray-300 hover:text-white text-xs font-semibold border border-white/[0.08] transition-colors flex items-center justify-center gap-1"
                  >
                    <BarChart3 className="w-3.5 h-3.5" /> View Intel
                  </button>
                  <button
                    onClick={() => openCopyModal(master)}
                    className="w-full py-2.5 px-3 rounded-xl bg-[#f5a623] hover:bg-[#d48d1a] text-black text-xs font-extrabold transition-all shadow-md shadow-[#f5a623]/20 flex items-center justify-center gap-1"
                  >
                    <Copy className="w-3.5 h-3.5" /> Copy Strategy
                  </button>
                </div>
              </div>
            ))}
          </div>

          {filteredMasters.length === 0 && (
            <div className="text-center py-16 bg-[#09120e] rounded-2xl border border-white/[0.08] space-y-3">
              <Users className="w-10 h-10 text-gray-500 mx-auto" />
              <h3 className="text-base font-bold text-white">No Master Traders Found</h3>
              <p className="text-xs text-gray-400 max-w-sm mx-auto">
                No verified masters matched your filter criteria. Try adjusting your search query or selected strategy.
              </p>
              <button
                onClick={() => {
                  setSearchQuery('');
                  setStrategyFilter('ALL');
                }}
                className="text-xs font-semibold text-[#00f59b] hover:underline"
              >
                Reset All Filters
              </button>
            </div>
          )}
        </div>
      )}

      {/* VIEW 2: MY PORTFOLIO & ACTIVE COPIES */}
      {activeTab === 'portfolio' && (
        <div className="space-y-6">
          <div className="bg-[#09120e] border border-white/[0.08] rounded-2xl p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.06] pb-4">
              <div>
                <h2 className="text-lg font-extrabold text-white">Active Strategy Allocations</h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  Live replicated positions and automatic execution logs linked directly to your Giants Vault.
                </p>
              </div>
              <button
                onClick={() => setActiveTab('marketplace')}
                className="px-4 py-2 rounded-xl bg-[#f5a623] hover:bg-[#d48d1a] text-black text-xs font-bold transition-all flex items-center gap-1.5 self-start sm:self-auto"
              >
                <Copy className="w-3.5 h-3.5" /> Explore & Copy More Masters
              </button>
            </div>

            {/* Active Subscriptions List */}
            {activeSubscriptions.length > 0 ? (
              <div className="space-y-4">
                {activeSubscriptions.map((sub) => (
                  <div
                    key={sub.id}
                    className="bg-[#050a07] border border-white/[0.08] hover:border-[#00f59b]/30 rounded-xl p-5 space-y-4 transition-all"
                  >
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      {/* Master Identity */}
                      <div className="flex items-center gap-3">
                        <div className="relative w-12 h-12 rounded-full overflow-hidden border border-[#00f59b]/40">
                          <Image
                            src={sub.masterAvatar}
                            alt={sub.masterName}
                            fill
                            className="object-cover"
                          />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-bold text-white text-base">{sub.masterName}</h3>
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                sub.status === 'ACTIVE'
                                  ? 'bg-[#00f59b]/15 text-[#00f59b] border border-[#00f59b]/30'
                                  : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                              }`}
                            >
                              {sub.status === 'ACTIVE' ? 'Replicating Live' : 'Paused'}
                            </span>
                          </div>
                          <p className="text-xs text-gray-400">
                            @{sub.masterHandle} • {sub.strategyType}
                          </p>
                        </div>
                      </div>

                      {/* Allocated Capital & Net Profit */}
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 border-t lg:border-t-0 border-white/[0.06] pt-3 lg:pt-0">
                        <div>
                          <span className="text-[10px] text-gray-500 uppercase font-medium">Allocated Capital</span>
                          <div className="text-sm font-extrabold text-white">
                            {formatNaira(sub.allocatedCapitalNgn)}
                          </div>
                        </div>
                        <div>
                          <span className="text-[10px] text-gray-500 uppercase font-medium">Replicated PnL</span>
                          <div
                            className={`text-sm font-extrabold ${
                              sub.totalProfitNgn >= 0 ? 'text-[#00f59b]' : 'text-red-400'
                            }`}
                          >
                            {sub.totalProfitNgn >= 0 ? '+' : ''}
                            {formatNaira(sub.totalProfitNgn)}
                          </div>
                        </div>
                        <div className="col-span-2 sm:col-span-1">
                          <span className="text-[10px] text-gray-500 uppercase font-medium">Sizing Mode</span>
                          <div className="text-xs font-semibold text-gray-300">
                            {sub.copyMode.replace('_', ' ')}
                          </div>
                        </div>
                      </div>

                      {/* Actions: Pause, Resume, Stop & Settle */}
                      <div className="flex items-center gap-2 self-start lg:self-auto">
                        <button
                          onClick={() => handleTogglePause(sub)}
                          className="px-3 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-gray-300 hover:text-white text-xs font-semibold border border-white/[0.08] transition-colors flex items-center gap-1"
                        >
                          {sub.status === 'ACTIVE' ? (
                            <>
                              <Pause className="w-3.5 h-3.5 text-amber-400" /> Pause
                            </>
                          ) : (
                            <>
                              <Play className="w-3.5 h-3.5 text-[#00f59b]" /> Resume
                            </>
                          )}
                        </button>
                        <button
                          onClick={() => handleStopSubscription(sub)}
                          className="px-3 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-bold border border-red-500/30 transition-all flex items-center gap-1"
                        >
                          <StopCircle className="w-3.5 h-3.5" /> Stop & Settle
                        </button>
                      </div>
                    </div>

                    {/* Replicated Trade Activity Sub-Row */}
                    {sub.recentTrades && sub.recentTrades.length > 0 && (
                      <div className="bg-[#09120e] rounded-lg p-3 border border-white/[0.04] space-y-2">
                        <span className="text-[11px] font-semibold text-gray-400 flex items-center gap-1.5">
                          <Clock className="w-3 h-3 text-[#00f59b]" /> Recent Replicated Trades:
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                          {sub.recentTrades.slice(0, 3).map((trade) => (
                            <div
                              key={trade.id}
                              className="text-[11px] bg-[#040806] p-2 rounded border border-white/[0.04] flex items-center justify-between"
                            >
                              <span>
                                <strong className="text-white">{trade.symbol}</strong> ({trade.direction})
                              </span>
                              <span
                                className={`font-bold ${
                                  trade.profitNgn >= 0 ? 'text-[#00f59b]' : 'text-red-400'
                                }`}
                              >
                                {trade.profitNgn >= 0 ? '+' : ''}
                                {formatNaira(trade.profitNgn)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-16 space-y-3">
                <Copy className="w-12 h-12 text-gray-600 mx-auto" />
                <h3 className="text-base font-bold text-white">No Active Copy Allocations</h3>
                <p className="text-xs text-gray-400 max-w-sm mx-auto">
                  You are not currently copying any master traders. Explore verified strategies in our marketplace and start replicating institutional trades.
                </p>
                <button
                  onClick={() => setActiveTab('marketplace')}
                  className="px-5 py-2.5 rounded-xl bg-[#f5a623] hover:bg-[#d48d1a] text-black text-xs font-extrabold transition-all inline-flex items-center gap-1.5"
                >
                  <Copy className="w-3.5 h-3.5" /> Browse Master Traders
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL 1: COPY STRATEGY ALLOCATION MODAL */}
      {isCopyModalOpen && selectedMaster && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="bg-[#09120e] border border-white/[0.1] rounded-2xl w-full max-w-lg p-6 space-y-6 relative overflow-hidden shadow-2xl">
            {/* Header */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="relative w-12 h-12 rounded-full overflow-hidden border border-[#00f59b]/40">
                  <Image
                    src={selectedMaster.avatarUrl}
                    alt={selectedMaster.name}
                    fill
                    className="object-cover"
                  />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-1.5">
                    Copy {selectedMaster.name}
                    <ShieldCheck className="w-4 h-4 text-[#00f59b]" />
                  </h3>
                  <p className="text-xs text-gray-400">
                    @{selectedMaster.handle} • {selectedMaster.strategyType}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsCopyModalOpen(false)}
                className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-white/[0.05]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {actionSuccess && (
              <div className="p-3 bg-[#00f59b]/15 border border-[#00f59b]/30 rounded-xl text-xs text-[#00f59b] flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                {actionSuccess}
              </div>
            )}

            {actionError && (
              <div className="p-3 bg-red-500/15 border border-red-500/30 rounded-xl text-xs text-red-400 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {actionError}
              </div>
            )}

            <form onSubmit={handleCopySubmit} className="space-y-4">
              {/* Capital Allocation Input */}
              <div>
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <label className="text-gray-300 font-medium">Capital Allocation (NGN ₦)</label>
                  <span className="text-gray-400 text-[11px]">
                    Vault Available: <strong className="text-white">{formatNaira(vaultBalanceNgn)}</strong>
                  </span>
                </div>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 font-bold">₦</span>
                  <input
                    type="number"
                    value={allocatedAmount}
                    onChange={(e) => setAllocatedAmount(e.target.value)}
                    min={selectedMaster.minCopyCapitalNgn}
                    step="100000"
                    required
                    className="w-full bg-[#050a07] border border-white/[0.08] rounded-xl pl-8 pr-4 py-2.5 text-sm font-bold text-white focus:outline-none focus:border-[#00f59b]/50"
                  />
                </div>
                {/* Quick Chips */}
                <div className="flex items-center gap-1.5 mt-2 overflow-x-auto pb-1">
                  {[500000, 1000000, 2500000, 5000000].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setAllocatedAmount(String(preset))}
                      className="px-2.5 py-1 rounded-lg text-[10px] font-semibold bg-[#050a07] text-gray-300 border border-white/[0.06] hover:border-[#00f59b]/40 hover:text-white"
                    >
                      {formatNaira(preset)}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setAllocatedAmount(String(vaultBalanceNgn))}
                    className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-[#f5a623]/20 text-[#f5a623] border border-[#f5a623]/40"
                  >
                    Max Available
                  </button>
                </div>
              </div>

              {/* Position Sizing Mode */}
              <div>
                <label className="text-xs text-gray-300 font-medium block mb-1.5">Position Sizing Method</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setCopyMode('PROPORTIONAL_EQUITY')}
                    className={`p-2.5 rounded-xl text-left border transition-all ${
                      copyMode === 'PROPORTIONAL_EQUITY'
                        ? 'bg-[#00f59b]/15 border-[#00f59b]/40 text-white'
                        : 'bg-[#050a07] border-white/[0.06] text-gray-400 hover:text-white'
                    }`}
                  >
                    <div className="text-xs font-bold flex items-center gap-1 text-[#00f59b]">
                      <Check className="w-3 h-3" /> Proportional
                    </div>
                    <p className="text-[10px] text-gray-400 mt-0.5">Scales volume relative to master equity</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setCopyMode('FIXED_LOT')}
                    className={`p-2.5 rounded-xl text-left border transition-all ${
                      copyMode === 'FIXED_LOT'
                        ? 'bg-[#00f59b]/15 border-[#00f59b]/40 text-white'
                        : 'bg-[#050a07] border-white/[0.06] text-gray-400 hover:text-white'
                    }`}
                  >
                    <div className="text-xs font-bold text-white">Fixed Lot Size</div>
                    <p className="text-[10px] text-gray-400 mt-0.5">Static lot size per trade replication</p>
                  </button>
                </div>
              </div>

              {/* Stop Loss Capital Protection Floor */}
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <label className="text-gray-300 font-medium flex items-center gap-1">
                    Stop Loss Floor (Optional)
                  </label>
                  <span className="text-[10px] text-gray-500">Auto-stops copy if equity drops below</span>
                </div>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 font-bold">₦</span>
                  <input
                    type="number"
                    placeholder="e.g. 800000"
                    value={stopLossFloor}
                    onChange={(e) => setStopLossFloor(e.target.value)}
                    className="w-full bg-[#050a07] border border-white/[0.08] rounded-xl pl-8 pr-4 py-2 text-xs text-white focus:outline-none focus:border-[#00f59b]/50"
                  />
                </div>
              </div>

              {/* Fee and Custody Notice */}
              <div className="bg-[#050a07] p-3 rounded-xl border border-white/[0.04] text-[11px] text-gray-400 space-y-1">
                <div className="flex items-center justify-between">
                  <span>Performance Fee:</span>
                  <strong className="text-[#00f59b]">{selectedMaster.performanceFeePercent}% on net profits only</strong>
                </div>
                <p className="text-[10px] text-gray-500 leading-normal">
                  Allocated capital remains in your custody and settles back to your Giants Vault instantly upon stopping.
                </p>
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCopyModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-gray-300 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-2.5 rounded-xl bg-[#f5a623] hover:bg-[#d48d1a] disabled:opacity-50 text-black text-xs font-extrabold shadow-lg shadow-[#f5a623]/20 flex items-center justify-center gap-1"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Allocating...
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" /> Confirm & Start Copying
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: MASTER STRATEGY INTEL & RECENT CLOSED TRADES */}
      {isIntelModalOpen && selectedMaster && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="bg-[#09120e] border border-white/[0.1] rounded-2xl w-full max-w-3xl p-6 space-y-6 relative overflow-hidden shadow-2xl max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-start justify-between border-b border-white/[0.06] pb-4">
              <div className="flex items-center gap-3">
                <div className="relative w-12 h-12 rounded-full overflow-hidden border border-[#00f59b]/40">
                  <Image
                    src={selectedMaster.avatarUrl}
                    alt={selectedMaster.name}
                    fill
                    className="object-cover"
                  />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-white">{selectedMaster.name}</h3>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#00f59b]/15 text-[#00f59b] border border-[#00f59b]/30">
                      Verified Master
                    </span>
                  </div>
                  <p className="text-xs text-gray-400">
                    @{selectedMaster.handle} • SteraTrader Live Account #{selectedMaster.accountNumber}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsIntelModalOpen(false)}
                className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-white/[0.05]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="space-y-6 overflow-y-auto pr-2">
              {/* Detailed Metrics Matrix */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-[#050a07] p-3 rounded-xl border border-white/[0.04] text-center">
                  <div className="text-[10px] text-gray-500">Total Net ROI</div>
                  <div className="text-base font-black text-[#00f59b]">+{selectedMaster.roiPercent}%</div>
                </div>
                <div className="bg-[#050a07] p-3 rounded-xl border border-white/[0.04] text-center">
                  <div className="text-[10px] text-gray-500">Historical Win Rate</div>
                  <div className="text-base font-black text-white">{selectedMaster.winRatePercent}%</div>
                </div>
                <div className="bg-[#050a07] p-3 rounded-xl border border-white/[0.04] text-center">
                  <div className="text-[10px] text-gray-500">Max Equity Drawdown</div>
                  <div className="text-base font-black text-amber-400">{selectedMaster.maxDrawdownPercent}%</div>
                </div>
                <div className="bg-[#050a07] p-3 rounded-xl border border-white/[0.04] text-center">
                  <div className="text-[10px] text-gray-500">Profit Factor / Sharpe</div>
                  <div className="text-base font-black text-white">
                    {selectedMaster.profitFactor} / {selectedMaster.sharpeRatio}
                  </div>
                </div>
              </div>

              {/* Execution Philosophy */}
              <div>
                <h4 className="text-xs font-bold text-gray-300 uppercase tracking-wider mb-2">
                  Strategy & Risk Framework
                </h4>
                <div className="bg-[#050a07] p-4 rounded-xl border border-white/[0.04] text-xs text-gray-300 leading-relaxed">
                  {selectedMaster.description}
                </div>
              </div>

              {/* Verified Closed Trades Log */}
              <div>
                <h4 className="text-xs font-bold text-gray-300 uppercase tracking-wider mb-2 flex items-center justify-between">
                  <span>Verified Closed Trades</span>
                  <span className="text-[10px] text-gray-500 font-normal">Audited on SteraTrader Engine</span>
                </h4>

                {intelLoading ? (
                  <div className="text-center py-8 text-xs text-gray-500 flex items-center justify-center gap-2">
                    <RefreshCw className="w-4 h-4 animate-spin text-[#00f59b]" /> Fetching audited trade logs...
                  </div>
                ) : masterIntelDetails?.trades?.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-white/[0.06] text-gray-500 text-[10px] uppercase">
                          <th className="pb-2">Ticket</th>
                          <th className="pb-2">Symbol</th>
                          <th className="pb-2">Type</th>
                          <th className="pb-2">Volume</th>
                          <th className="pb-2">Entry</th>
                          <th className="pb-2">Exit</th>
                          <th className="pb-2 text-right">Profit (NGN)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/[0.04]">
                        {masterIntelDetails.trades.map((t: MasterTradeRecord) => (
                          <tr key={t.id} className="hover:bg-white/[0.02]">
                            <td className="py-2 text-gray-400 font-mono text-[11px]">{t.ticketId}</td>
                            <td className="py-2 font-bold text-white">{t.symbol}</td>
                            <td className="py-2">
                              <span
                                className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                  t.direction === 'BUY'
                                    ? 'bg-[#00f59b]/15 text-[#00f59b]'
                                    : 'bg-red-500/15 text-red-400'
                                }`}
                              >
                                {t.direction}
                              </span>
                            </td>
                            <td className="py-2 text-gray-300">{t.volume} Lots</td>
                            <td className="py-2 text-gray-400">{t.openPrice}</td>
                            <td className="py-2 text-gray-400">{t.closePrice || '—'}</td>
                            <td className="py-2 text-right font-bold text-[#00f59b]">
                              +{formatNaira(t.profitNgn)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-xs text-gray-500">No trade logs available.</p>
                )}
              </div>
            </div>

            {/* Footer Action */}
            <div className="border-t border-white/[0.06] pt-4 flex items-center justify-between">
              <span className="text-xs text-gray-400">
                Ready to copy? Minimum allocation: <strong className="text-white">{formatNaira(selectedMaster.minCopyCapitalNgn)}</strong>
              </span>
              <button
                onClick={() => {
                  setIsIntelModalOpen(false);
                  openCopyModal(selectedMaster);
                }}
                className="px-5 py-2.5 rounded-xl bg-[#f5a623] hover:bg-[#d48d1a] text-black text-xs font-extrabold flex items-center gap-1.5 shadow-md shadow-[#f5a623]/20"
              >
                <Copy className="w-3.5 h-3.5" /> Allocate & Copy Now
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
