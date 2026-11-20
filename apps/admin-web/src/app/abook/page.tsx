'use client';

import React, { useEffect, useState } from 'react';
import {
  ArrowLeftRight,
  ShieldCheck,
  Activity,
  Sliders,
  Layers,
  RefreshCw,
  Search,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Zap,
  Cpu,
  Globe,
  Settings,
  Flame,
  Scale,
} from 'lucide-react';
import { AdminHeader } from '@/components/AdminHeader';
import { MetricCard } from '@/components/MetricCard';
import { StatusBadge } from '@/components/StatusBadge';
import { formatNaira, formatDateTime } from '@/lib/formatters';
import { fetchAdminApi } from '@/lib/api';

export default function AbookRouterPage() {
  const [activeTab, setActiveTab] = useState<'pools' | 'traders' | 'spreads' | 'symbols' | 'deploy'>('traders');
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState<any>(null);
  const [traders, setTraders] = useState<any[]>([]);
  const [symbolConfig, setSymbolConfig] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Editing state for modal
  const [selectedTrader, setSelectedTrader] = useState<any>(null);
  const [editEnabled, setEditEnabled] = useState(false);
  const [editTargetAccount, setEditTargetAccount] = useState('PR-1M');
  const [editCopyRatio, setEditCopyRatio] = useState(1.0);
  const [editNotes, setEditNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Spread markup state
  const [selectedGroup, setSelectedGroup] = useState('fg-rr-funded');
  const [applyingSpread, setApplyingSpread] = useState(false);
  const [spreadResult, setSpreadResult] = useState<any>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [ovRes, trRes, symRes] = await Promise.all([
        fetchAdminApi('/risk/admin/abook/overview').catch(() => ({ success: false })),
        fetchAdminApi('/risk/admin/abook/traders').catch(() => ({ success: false })),
        fetchAdminApi('/risk/admin/abook/symbols').catch(() => ({ success: false })),
      ]);

      if (ovRes && (ovRes.data || ovRes.stats)) {
        setOverview(ovRes.data || ovRes);
      }
      if (trRes && Array.isArray(trRes.data || trRes)) {
        setTraders(trRes.data || trRes);
      }
      if (symRes && (symRes.data || symRes.defaultMap)) {
        setSymbolConfig(symRes.data || symRes);
      }
    } catch (err) {
      console.error('Failed to load A-Book router data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenConfigModal = (trader: any) => {
    setSelectedTrader(trader);
    setEditEnabled(trader.abookEnabled || false);
    setEditTargetAccount(trader.abookTargetAccount || 'PR-1M');
    setEditCopyRatio(Number(trader.abookCopyRatio || 1.0));
    setEditNotes(trader.abookNotes || '');
    setActionSuccess(null);
  };

  const handleSaveConfig = async () => {
    if (!selectedTrader) return;
    setSaving(true);
    setActionSuccess(null);

    try {
      const res = await fetchAdminApi('/risk/admin/abook/configure', {
        method: 'POST',
        body: JSON.stringify({
          accountNumber: selectedTrader.accountNumber,
          enabled: editEnabled,
          targetAccount: editTargetAccount,
          copyRatio: editCopyRatio,
          notes: editNotes,
        }),
      });

      if (res) {
        setActionSuccess(`A-Book configuration updated for ${selectedTrader.accountNumber}`);
        setTimeout(() => {
          setSelectedTrader(null);
          loadData();
        }, 1200);
      }
    } catch (err: any) {
      alert(`Failed to update configuration: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleApplySpreadMarkup = async () => {
    if (!confirm(`Apply 4.0 Pip (40 points) spread markup on group "${selectedGroup}" across all instruments in SteraTrader?`)) {
      return;
    }

    setApplyingSpread(true);
    setSpreadResult(null);

    try {
      const res = await fetchAdminApi('/risk/admin/steratrader/apply-spread-markup', {
        method: 'POST',
        body: JSON.stringify({ group: selectedGroup }),
      });

      setSpreadResult(res.data || res);
      alert('Spread markup command dispatched successfully!');
    } catch (err: any) {
      alert(`Failed to apply spread markup: ${err.message}`);
    } finally {
      setApplyingSpread(false);
    }
  };

  const filteredTraders = traders.filter((t) => {
    const q = searchQuery.toLowerCase();
    return (
      t.accountNumber.toLowerCase().includes(q) ||
      t.traderName.toLowerCase().includes(q) ||
      t.email.toLowerCase().includes(q) ||
      t.abookTargetAccount.toLowerCase().includes(q)
    );
  });

  const POOLS = [
    { tag: 'PR-1M', plan: 'Phoenix Rise Instant', tier: '₦1,000,000', ratio: 'Admin Set' },
    { tag: 'PR-2.5M', plan: 'Phoenix Rise Instant', tier: '₦2,500,000', ratio: 'Admin Set' },
    { tag: 'PR-5M', plan: 'Phoenix Rise Instant', tier: '₦5,000,000', ratio: 'Admin Set' },
    { tag: 'PR-10M', plan: 'Phoenix Rise Instant', tier: '₦10,000,000', ratio: 'Admin Set' },
    { tag: 'PR-25M', plan: 'Phoenix Rise Instant', tier: '₦25,000,000', ratio: 'Admin Set' },
    { tag: 'PR-50M', plan: 'Phoenix Rise Instant', tier: '₦50,000,000', ratio: 'Admin Set' },
    { tag: 'RR-1M', plan: 'Rhino Rush Funded', tier: '₦1,000,000', ratio: 'Admin Set' },
    { tag: 'RR-2.5M', plan: 'Rhino Rush Funded', tier: '₦2,500,000', ratio: 'Admin Set' },
    { tag: 'RR-5M', plan: 'Rhino Rush Funded', tier: '₦5,000,000', ratio: 'Admin Set' },
    { tag: 'RR-10M', plan: 'Rhino Rush Funded', tier: '₦10,000,000', ratio: 'Admin Set' },
    { tag: 'RR-25M', plan: 'Rhino Rush Funded', tier: '₦25,000,000', ratio: 'Admin Set' },
    { tag: 'RR-50M', plan: 'Rhino Rush Funded', tier: '₦50,000,000', ratio: 'Admin Set' },
  ];

  return (
    <>
      <AdminHeader
        title="A-Book Trade Router & Institutional Execution Desk"
        subtitle="Sub-millisecond trade replication, SteraTrader 4.0 pip spread markup tuning, 12 segregated MT5 pools, and trader copy ratio management"
      />

      <div className="p-8 space-y-6">
        {/* Metric Cards Header */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <MetricCard
            title="MT5 Bridge Status"
            value={overview?.bridge?.connected ? 'ONLINE' : 'STANDBY'}
            subtitle={`Port: ${overview?.bridge?.port || 9090} • TCP_NODELAY`}
            icon={Zap}
            variant={overview?.bridge?.connected ? 'emerald' : 'amber'}
          />
          <MetricCard
            title="Connected A-Book Traders"
            value={overview?.stats?.totalEnabledTraders || 0}
            subtitle={`Out of ${overview?.stats?.totalActiveFunded || traders.length} funded traders`}
            icon={ArrowLeftRight}
            variant="emerald"
          />
          <MetricCard
            title="Active Replicated Volume"
            value={`${overview?.stats?.openVolumeLots || 0.0} Lots`}
            subtitle={`${overview?.stats?.openHedgesCount || 0} open positions across pools`}
            icon={Activity}
            variant="emerald"
          />
          <MetricCard
            title="Target Spread Markup"
            value="4.0 Pips"
            subtitle="40 pts floor • Positive slip cushion"
            icon={Scale}
            variant="default"
          />
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-[#1b3322] gap-2">
          {[
            { id: 'traders', label: 'Trader Connection & Copy Ratio', icon: ArrowLeftRight },
            { id: 'pools', label: '12-Account Segregation Matrix', icon: Layers },
            { id: 'spreads', label: 'SteraTrader Spread Management', icon: Sliders },
            { id: 'symbols', label: 'Symbol & Asset Mapping', icon: Globe },
            { id: 'deploy', label: 'Debian MT5 VPS Deployment', icon: Cpu },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-3 text-xs font-bold transition-all border-b-2 ${
                  isActive
                    ? 'border-emerald-400 text-emerald-400 bg-emerald-500/10'
                    : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-[#0f1712]'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* TAB 1: TRADERS CONNECTION & COPY RATIO */}
        {activeTab === 'traders' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
                <input
                  type="text"
                  placeholder="Search funded trader by login, name, email, or pool..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-[#0a0f0d] border border-[#1b3322] rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/50"
                />
              </div>

              <button
                onClick={loadData}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold hover:bg-emerald-500/20 transition-all"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                <span>Refresh Fleet</span>
              </button>
            </div>

            <div className="bg-[#0a0f0d] border border-[#1b3322] rounded-2xl overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#1b3322] bg-[#070a08] text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    <th className="py-3 px-4">Trader / Login</th>
                    <th className="py-3 px-4">Plan & Balance</th>
                    <th className="py-3 px-4">Equity</th>
                    <th className="py-3 px-4">A-Book Status</th>
                    <th className="py-3 px-4">Target Pool</th>
                    <th className="py-3 px-4">Copy Ratio</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1b3322] text-xs">
                  {filteredTraders.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-500">
                        {loading ? 'Loading funded traders...' : 'No active funded traders found matching criteria.'}
                      </td>
                    </tr>
                  ) : (
                    filteredTraders.map((trader) => (
                      <tr key={trader.id} className="hover:bg-[#0f1712] transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-bold text-white">{trader.traderName}</div>
                          <div className="text-[11px] font-mono text-emerald-400">{trader.accountNumber}</div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="text-white font-medium">{trader.planName}</div>
                          <div className="text-slate-400 text-[11px]">{formatNaira(trader.balance)}</div>
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-white">
                          {formatNaira(trader.equity)}
                        </td>
                        <td className="py-3 px-4">
                          {trader.abookEnabled ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                              REPLICATING (A-BOOK)
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-800 text-slate-400 border border-slate-700">
                              INTERNAL (B-BOOK)
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-cyan-400">
                          {trader.abookTargetAccount}
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-amber-400">
                          {Number(trader.abookCopyRatio || 1.0).toFixed(2)}x
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => handleOpenConfigModal(trader)}
                            className="px-3 py-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-400 text-[11px] font-bold transition-all"
                          >
                            Configure A-Book
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 2: 12-ACCOUNT SEGREGATION POOLS MATRIX */}
        {activeTab === 'pools' && (
          <div className="space-y-4">
            <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-emerald-400">12 Segregated MT5 Broker Execution Terminals</h4>
                <p className="text-xs text-slate-300 mt-1">
                  1 dedicated broker MT5 terminal per account size and plan. Copying is executed as-is (0.01 honored 1:1, $\ge 0.02$ scaled by admin copy ratio).
                </p>
              </div>
              <div className="text-xs font-mono font-bold text-white bg-black/40 px-3 py-1.5 rounded-xl border border-emerald-500/30">
                12 Terminals Configured
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {POOLS.map((pool) => {
                const liveStats = overview?.pools?.find((p: any) => p.pool === pool.tag);
                const isPR = pool.tag.startsWith('PR');

                return (
                  <div
                    key={pool.tag}
                    className="p-5 rounded-2xl bg-[#0a0f0d] border border-[#1b3322] hover:border-emerald-500/40 transition-all space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold ${
                        isPR ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                      }`}>
                        {pool.tag}
                      </span>
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    </div>

                    <div>
                      <div className="text-xs font-bold text-white">{pool.plan}</div>
                      <div className="text-[11px] text-slate-400 font-mono mt-0.5">Tier: {pool.tier}</div>
                    </div>

                    <div className="pt-2 border-t border-[#1b3322] flex items-center justify-between text-xs">
                      <span className="text-slate-400">Connected:</span>
                      <span className="font-bold text-white">{liveStats?.connectedTraders || 0} Traders</span>
                    </div>

                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400">Open Volume:</span>
                      <span className="font-bold font-mono text-emerald-400">{liveStats?.openLots || 0.0} Lots</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 3: SPREAD MANAGEMENT (4.0 PIPS) */}
        {activeTab === 'spreads' && (
          <div className="space-y-6">
            <div className="p-6 bg-[#0a0f0d] border border-[#1b3322] rounded-2xl space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Sliders className="w-5 h-5 text-emerald-400" />
                    SteraTrader Spread & Markup Engine
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Control spreads directly via SteraTrader Partner Subsets API (`GET /crm/v1/groups/{'{group_id}'}/instruments`).
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <select
                    value={selectedGroup}
                    onChange={(e) => setSelectedGroup(e.target.value)}
                    className="px-3 py-2 bg-[#070a08] border border-[#1b3322] rounded-xl text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                  >
                    <option value="fg-rr-funded">fg-rr-funded (Rhino Rush 1:100)</option>
                    <option value="fg-pr-funded">fg-pr-funded (Phoenix Rise 1:30)</option>
                    <option value="fg-rr-eval">fg-rr-eval (Evaluation Phase)</option>
                  </select>

                  <button
                    onClick={handleApplySpreadMarkup}
                    disabled={applyingSpread}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs shadow-lg shadow-emerald-500/20 transition-all"
                  >
                    <Flame className="w-4 h-4" />
                    <span>{applyingSpread ? 'Applying to SteraTrader...' : 'Apply 4.0 Pip Symmetrical Markup'}</span>
                  </button>
                </div>
              </div>

              {spreadResult && (
                <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs text-emerald-400 font-mono">
                  Updated {spreadResult.updated}/{spreadResult.total} instruments in group {selectedGroup} with 20pt Bid / 20pt Ask markup.
                </div>
              )}

              {/* Spread Details Breakdown */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-[#1b3322]">
                <div className="p-4 bg-[#070a08] border border-[#1b3322] rounded-xl space-y-2">
                  <div className="text-[11px] font-bold uppercase text-slate-400">Bid Price Adjustment</div>
                  <div className="text-xl font-bold font-mono text-emerald-400">+20 Points (2.0 Pips)</div>
                  <div className="text-[11px] text-slate-400">Shifts SteraTrader Bid down by 2.0 pips below raw liquidity.</div>
                </div>

                <div className="p-4 bg-[#070a08] border border-[#1b3322] rounded-xl space-y-2">
                  <div className="text-[11px] font-bold uppercase text-slate-400">Ask Price Adjustment</div>
                  <div className="text-xl font-bold font-mono text-emerald-400">+20 Points (2.0 Pips)</div>
                  <div className="text-[11px] text-slate-400">Shifts SteraTrader Ask up by 2.0 pips above raw liquidity.</div>
                </div>

                <div className="p-4 bg-[#070a08] border border-[#1b3322] rounded-xl space-y-2">
                  <div className="text-[11px] font-bold uppercase text-slate-400">Guaranteed Floor Spread</div>
                  <div className="text-xl font-bold font-mono text-purple-400">40 Points (4.0 Pips)</div>
                  <div className="text-[11px] text-slate-400">min_spread_points floor prevents spread tightening below 4.0 pips.</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: SYMBOL & ASSET MAPPING */}
        {activeTab === 'symbols' && (
          <div className="space-y-4">
            <div className="p-4 bg-[#0a0f0d] border border-[#1b3322] rounded-2xl flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-white">SteraTrader ➔ MT5 Broker Symbol Normalization</h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  The Trade Router automatically translates incoming SteraTrader symbols to your broker's specific symbol format.
                </p>
              </div>

              <div className="flex items-center gap-3 text-xs font-mono text-slate-300">
                <span>Broker Suffix: <code className="text-emerald-400">{symbolConfig?.suffix || '.raw (or none)'}</code></span>
              </div>
            </div>

            <div className="bg-[#0a0f0d] border border-[#1b3322] rounded-2xl overflow-hidden">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-[#1b3322] bg-[#070a08] text-[11px] font-bold text-slate-400 uppercase">
                    <th className="py-3 px-4">SteraTrader Symbol</th>
                    <th className="py-3 px-4">Asset Class</th>
                    <th className="py-3 px-4">Default Mapped Symbol</th>
                    <th className="py-3 px-4">MT5 Execution Contract</th>
                    <th className="py-3 px-4">Standard Precision</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1b3322]">
                  {[
                    { stera: 'EURUSD', type: 'Forex Major', broker: 'EURUSD', digits: 5, contract: '100,000' },
                    { stera: 'GBPUSD', type: 'Forex Major', broker: 'GBPUSD', digits: 5, contract: '100,000' },
                    { stera: 'USDJPY', type: 'Forex Major', broker: 'USDJPY', digits: 3, contract: '100,000' },
                    { stera: 'XAUUSD', type: 'Precious Metals', broker: 'XAUUSD / GOLD', digits: 2, contract: '100 oz' },
                    { stera: 'US30', type: 'Cash Indices', broker: 'US30 / DJ30', digits: 2, contract: '1 index' },
                    { stera: 'NAS100', type: 'Cash Indices', broker: 'NAS100 / USTEC', digits: 2, contract: '1 index' },
                    { stera: 'USOIL', type: 'Commodities', broker: 'USOIL / WTI', digits: 2, contract: '1,000 bbl' },
                    { stera: 'BTCUSD', type: 'Cryptocurrency', broker: 'BTCUSD', digits: 2, contract: '1 BTC' },
                  ].map((row) => (
                    <tr key={row.stera} className="hover:bg-[#0f1712]">
                      <td className="py-3 px-4 font-mono font-bold text-white">{row.stera}</td>
                      <td className="py-3 px-4 text-slate-400">{row.type}</td>
                      <td className="py-3 px-4 font-mono font-bold text-emerald-400">{row.broker}</td>
                      <td className="py-3 px-4 font-mono text-slate-300">{row.contract}</td>
                      <td className="py-3 px-4 font-mono text-slate-400">{row.digits} Digits</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 5: DEPLOYMENT GUIDE */}
        {activeTab === 'deploy' && (
          <div className="p-6 bg-[#0a0f0d] border border-[#1b3322] rounded-2xl space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Cpu className="w-4 h-4 text-emerald-400" />
              Debian 12 VPS MT5 Server Deployment Workflow
            </h3>
            <p className="text-xs text-slate-300">
              When your London VPS is provisioned (Contabo / Debian 12), run this automated setup to initialize the 12 segregated MT5 instances and start the sub-millisecond TCP Bridge Daemon:
            </p>

            <div className="p-4 bg-black/60 border border-[#1b3322] rounded-xl font-mono text-xs text-emerald-400 space-y-2">
              <p className="text-slate-500"># 1. SSH into London Debian 12 VPS</p>
              <p>ssh root@your_london_vps_ip</p>
              <p className="text-slate-500 pt-2"># 2. Upload and execute automated deployment script</p>
              <p>curl -fsSL https://raw.githubusercontent.com/.../setup-debian.sh | bash</p>
              <p className="text-slate-500 pt-2"># 3. Verify Bridge Daemon status</p>
              <p>pm2 status</p>
            </div>
          </div>
        )}
      </div>

      {/* CONFIGURATION MODAL */}
      {selectedTrader && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-[#0a0f0d] border border-[#1b3322] rounded-2xl p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#1b3322] pb-4">
              <div>
                <h3 className="text-base font-bold text-white">Configure A-Book Routing</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Trader: <strong className="text-white">{selectedTrader.traderName}</strong> ({selectedTrader.accountNumber})
                </p>
              </div>
              <button
                onClick={() => setSelectedTrader(null)}
                className="text-slate-500 hover:text-white text-lg font-bold"
              >
                ×
              </button>
            </div>

            {actionSuccess && (
              <div className="p-3 bg-emerald-500/20 border border-emerald-500/30 rounded-xl text-xs text-emerald-400 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                <span>{actionSuccess}</span>
              </div>
            )}

            <div className="space-y-4 text-xs">
              {/* Toggle Switch */}
              <div className="flex items-center justify-between p-3.5 bg-[#070a08] border border-[#1b3322] rounded-xl">
                <div>
                  <div className="font-bold text-white">Enable A-Book Trade Replication</div>
                  <div className="text-[11px] text-slate-400">Routes trader fills to destination broker MT5 terminal</div>
                </div>
                <input
                  type="checkbox"
                  checked={editEnabled}
                  onChange={(e) => setEditEnabled(e.target.checked)}
                  className="w-5 h-5 accent-emerald-500 rounded cursor-pointer"
                />
              </div>

              {/* Target Account Pool */}
              <div className="space-y-1.5">
                <label className="text-slate-400 font-bold">Target Broker MT5 Pool</label>
                <select
                  value={editTargetAccount}
                  onChange={(e) => setEditTargetAccount(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#070a08] border border-[#1b3322] rounded-xl text-white font-mono focus:outline-none focus:border-emerald-500"
                >
                  {POOLS.map((p) => (
                    <option key={p.tag} value={p.tag}>
                      {p.tag} — {p.plan} ({p.tier})
                    </option>
                  ))}
                </select>
              </div>

              {/* Copy Ratio */}
              <div className="space-y-1.5">
                <div className="flex justify-between">
                  <label className="text-slate-400 font-bold">Copy Ratio Multiplier</label>
                  <span className="font-mono font-bold text-amber-400">{editCopyRatio.toFixed(2)}x</span>
                </div>
                <input
                  type="range"
                  min="0.10"
                  max="3.00"
                  step="0.05"
                  value={editCopyRatio}
                  onChange={(e) => setEditCopyRatio(parseFloat(e.target.value))}
                  className="w-full accent-emerald-500 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                  <span>0.10x (Micro hedge)</span>
                  <span>1.00x (Standard)</span>
                  <span>2.00x (VIP)</span>
                  <span>3.00x (Max)</span>
                </div>
              </div>

              {/* Admin Notes */}
              <div className="space-y-1.5">
                <label className="text-slate-400 font-bold">Admin Audit Notes</label>
                <input
                  type="text"
                  placeholder="e.g. Consistent swing trader, approved for A-Book"
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  className="w-full px-3.5 py-2 bg-[#070a08] border border-[#1b3322] rounded-xl text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#1b3322]">
              <button
                onClick={() => setSelectedTrader(null)}
                className="px-4 py-2 text-xs font-bold text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveConfig}
                disabled={saving}
                className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs shadow-lg shadow-emerald-500/20 transition-all"
              >
                {saving ? 'Saving...' : 'Save Configuration'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
