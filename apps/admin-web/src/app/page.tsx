'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Users,
  Trophy,
  DollarSign,
  ArrowDownLeft,
  ShieldAlert,
  Server,
  RefreshCw,
  Share2,
  ExternalLink,
} from 'lucide-react';
import { AdminHeader } from '@/components/AdminHeader';
import { MetricCard } from '@/components/MetricCard';
import { StatusBadge } from '@/components/StatusBadge';
import { formatNaira, formatDateTime } from '@/lib/formatters';
import { fetchAdminApi } from '@/lib/api';

export default function AdminDashboardPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    try {
      const res = await fetchAdminApi('/admin/overview');
      if (res.success) {
        setData(res.data);
      }
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  return (
    <>
      <AdminHeader
        title="Executive Control Panel"
        subtitle="Real-time operational, financial, and risk telemetry across FundedGiants"
        actions={
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0f1712] border border-[#1b3322] text-xs font-semibold text-slate-300 hover:text-white hover:border-emerald-500/40 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        }
      />

      <div className="p-8 space-y-8">
        {/* Top-Level KPI Metric Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          <MetricCard
            title="Total Traders"
            value={loading ? '...' : data?.customers?.total || 0}
            subtitle={loading ? '...' : `+${data?.customers?.newToday || 0} registered today`}
            icon={Users}
            variant="emerald"
          />
          <MetricCard
            title="Active Challenges"
            value={loading ? '...' : data?.challenges?.active || 0}
            subtitle={loading ? '...' : `${data?.challenges?.total || 0} total challenges`}
            icon={Trophy}
            variant="emerald"
          />
          <MetricCard
            title="Challenge Revenue"
            value={loading ? '...' : formatNaira(data?.financials?.totalRevenueNgn)}
            subtitle="Verified WooCommerce purchases"
            icon={DollarSign}
            variant="emerald"
          />
          <MetricCard
            title="Vault Liabilities"
            value={loading ? '...' : formatNaira(data?.financials?.vaultLiabilitiesNgn)}
            subtitle="Total customer wallet funds"
            icon={DollarSign}
            variant="default"
          />
          <MetricCard
            title="Pending Payouts"
            value={loading ? '...' : data?.financials?.pendingWithdrawalsCount || 0}
            subtitle={loading ? '...' : formatNaira(data?.financials?.pendingWithdrawalNgn)}
            icon={ArrowDownLeft}
            variant="amber"
          />
          <MetricCard
            title="Affiliate Payouts"
            value={loading ? '...' : formatNaira(data?.financials?.affiliateCommissionsPaidNgn)}
            subtitle={loading ? '...' : `${data?.affiliates?.total || 0} registered partners`}
            icon={Share2}
            variant="default"
          />
        </div>

        {/* Integration Health Matrix */}
        <div className="rounded-2xl bg-[#0f1712] border border-[#1b3322] p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Server className="w-4 h-4 text-emerald-400" />
              Core Infrastructure & Provider Health
            </h2>
            <span className="text-xs text-slate-400">Environment Parity: Production Parity</span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {[
              { name: 'PostgreSQL Database', status: data?.systemHealth?.database || 'ONLINE', desc: 'Prisma Client Primary' },
              { name: 'SteraTrader Broker', status: data?.systemHealth?.steraTrader || 'CONNECTED', desc: 'Sub-second event receiver' },
              { name: 'Nomba Banking API', status: data?.systemHealth?.nombaBanking || data?.systemHealth?.lencoBanking || 'CONNECTED', desc: 'Dedicated NUBAN & Payouts' },
              { name: 'Ninja KYC Provider', status: data?.systemHealth?.ninjaKyc || 'READY', desc: 'Identity verification bridge' },
              { name: 'WooCommerce Bridge', status: data?.systemHealth?.wooCommerceBridge || 'CONNECTED', desc: 'AES-256 HMAC orders sync' },
            ].map((integ) => (
              <div
                key={integ.name}
                className="p-4 rounded-xl bg-[#070a08] border border-[#1b3322]/80 flex flex-col justify-between"
              >
                <div>
                  <div className="text-xs font-semibold text-slate-300">{integ.name}</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">{integ.desc}</div>
                </div>
                <div className="mt-3">
                  <StatusBadge status={integ.status} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Risk Breaches & Liquidations */}
        <div className="rounded-2xl bg-[#0f1712] border border-[#1b3322] overflow-hidden">
          <div className="p-6 border-b border-[#1b3322] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-rose-400" />
              <h2 className="text-base font-bold text-white">Recent Critical Risk Liquidations</h2>
            </div>
            <Link
              href="/risk"
              className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
            >
              <span>View Full Risk Audit Trail</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#070a08] border-b border-[#1b3322] text-slate-400 font-semibold uppercase">
                <tr>
                  <th className="py-3 px-6">Timestamp</th>
                  <th className="py-3 px-6">Account #</th>
                  <th className="py-3 px-6">Trader</th>
                  <th className="py-3 px-6">Challenge Product</th>
                  <th className="py-3 px-6">Rule Breached</th>
                  <th className="py-3 px-6">Snapshot Equity</th>
                  <th className="py-3 px-6">Liquidation Reason</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1b3322]/60 text-slate-300">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-500">
                      Loading real-time risk telemetry...
                    </td>
                  </tr>
                ) : !data?.recentBreaches || data.recentBreaches.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-500">
                      Zero active rule breaches. All running accounts are currently safe within drawdown limits.
                    </td>
                  </tr>
                ) : (
                  data.recentBreaches.map((b: any) => (
                    <tr key={b.id} className="hover:bg-[#142119]/50 transition-colors">
                      <td className="py-3 px-6 font-mono text-[11px] text-slate-400">
                        {formatDateTime(b.createdAt)}
                      </td>
                      <td className="py-3 px-6 font-mono font-bold text-white">
                        {b.accountNumber || '—'}
                      </td>
                      <td className="py-3 px-6">
                        <div className="font-semibold text-white">{b.customerName}</div>
                        <div className="text-[10px] text-slate-400">{b.customerEmail}</div>
                      </td>
                      <td className="py-3 px-6 text-slate-300">{b.productName || '—'}</td>
                      <td className="py-3 px-6">
                        <StatusBadge status={b.eventType} />
                      </td>
                      <td className="py-3 px-6 font-mono font-bold text-rose-400">
                        {formatNaira(b.snapshotEquity)}
                      </td>
                      <td className="py-3 px-6 text-slate-400 max-w-xs truncate" title={b.description}>
                        {b.description}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Quick Nav Workflow Shortcuts */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Link
            href="/finance/withdrawals"
            className="p-5 rounded-xl bg-[#0f1712] border border-[#1b3322] hover:border-emerald-500/40 transition-all flex items-center justify-between group"
          >
            <div>
              <div className="text-xs font-semibold text-slate-400 uppercase">Financial Desk</div>
              <div className="text-sm font-bold text-white mt-1 group-hover:text-emerald-400 transition-colors">
                Pending Bank Withdrawals
              </div>
            </div>
            <ArrowDownLeft className="w-5 h-5 text-emerald-400" />
          </Link>

          <Link
            href="/customers"
            className="p-5 rounded-xl bg-[#0f1712] border border-[#1b3322] hover:border-emerald-500/40 transition-all flex items-center justify-between group"
          >
            <div>
              <div className="text-xs font-semibold text-slate-400 uppercase">Compliance Desk</div>
              <div className="text-sm font-bold text-white mt-1 group-hover:text-emerald-400 transition-colors">
                Trader KYC Directory
              </div>
            </div>
            <Users className="w-5 h-5 text-emerald-400" />
          </Link>

          <Link
            href="/challenges"
            className="p-5 rounded-xl bg-[#0f1712] border border-[#1b3322] hover:border-emerald-500/40 transition-all flex items-center justify-between group"
          >
            <div>
              <div className="text-xs font-semibold text-slate-400 uppercase">Operations Desk</div>
              <div className="text-sm font-bold text-white mt-1 group-hover:text-emerald-400 transition-colors">
                Active Challenges Roster
              </div>
            </div>
            <Trophy className="w-5 h-5 text-emerald-400" />
          </Link>

          <Link
            href="/audit-logs"
            className="p-5 rounded-xl bg-[#0f1712] border border-[#1b3322] hover:border-emerald-500/40 transition-all flex items-center justify-between group"
          >
            <div>
              <div className="text-xs font-semibold text-slate-400 uppercase">Governance Desk</div>
              <div className="text-sm font-bold text-white mt-1 group-hover:text-emerald-400 transition-colors">
                Immutable System Audit Trail
              </div>
            </div>
            <Server className="w-5 h-5 text-emerald-400" />
          </Link>
        </div>
      </div>
    </>
  );
}
