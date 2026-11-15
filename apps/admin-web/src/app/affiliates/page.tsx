'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Share2, Tag, RefreshCw } from 'lucide-react';
import { AdminHeader } from '@/components/AdminHeader';
import { MetricCard } from '@/components/MetricCard';
import { formatNaira, formatDate } from '@/lib/formatters';
import { fetchAdminApi } from '@/lib/api';

export default function AffiliatesManagementPage() {
  const [affiliates, setAffiliates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadAffiliates = async () => {
    setLoading(true);
    try {
      const res = await fetchAdminApi('/admin/affiliates');
      if (res.success) {
        setAffiliates(res.data);
      }
    } catch (err) {
      console.error('Failed to load affiliates:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAffiliates();
  }, []);

  const totalCommissions = affiliates.reduce((acc, a) => acc + a.totalEarningsNgn, 0);
  const totalReferrals = affiliates.reduce((acc, a) => acc + a.referralsCount, 0);

  return (
    <>
      <AdminHeader
        title="Affiliate Partners & Referral Commissions"
        subtitle="10% CPA direct commissions, 3% recurring profit referral payouts, and referral network oversight"
        actions={
          <Link
            href="/affiliates/coupons"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white transition-colors"
          >
            <Tag className="w-3.5 h-3.5" />
            <span>Manage Coupons</span>
          </Link>
        }
      />

      <div className="p-8 space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <MetricCard
            title="Total Registered Affiliates"
            value={affiliates.length}
            subtitle="Active partners with referral handles"
            icon={Share2}
            variant="emerald"
          />
          <MetricCard
            title="Referred Challenge Purchases"
            value={totalReferrals}
            subtitle="Total customer signups via referral"
            icon={Share2}
            variant="default"
          />
          <MetricCard
            title="Total Commissions Earned"
            value={formatNaira(totalCommissions)}
            subtitle="Combined 10% CPA & 3% Recurring Profit Share"
            icon={Share2}
            variant="emerald"
          />
        </div>

        {/* Affiliates Table */}
        <div className="rounded-xl bg-[#0f1712] border border-[#1b3322] overflow-hidden">
          <div className="p-4 border-b border-[#1b3322] flex items-center justify-between">
            <h2 className="text-sm font-bold text-white">Partner Performance Table</h2>
            <button
              onClick={loadAffiliates}
              className="p-2 rounded-lg bg-[#070a08] border border-[#1b3322] text-slate-400 hover:text-white"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#070a08] border-b border-[#1b3322] text-slate-400 font-semibold uppercase">
                <tr>
                  <th className="py-3.5 px-6">Referral Code / Handle</th>
                  <th className="py-3.5 px-6">Affiliate Partner</th>
                  <th className="py-3.5 px-6">Referred Traders</th>
                  <th className="py-3.5 px-6">Total Commissions</th>
                  <th className="py-3.5 px-6">Paid Volume</th>
                  <th className="py-3.5 px-6">Pending Commission</th>
                  <th className="py-3.5 px-6">Registered Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1b3322]/60 text-slate-300">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-500">
                      Loading affiliate partners...
                    </td>
                  </tr>
                ) : affiliates.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-500">
                      Zero registered affiliates.
                    </td>
                  </tr>
                ) : (
                  affiliates.map((aff) => (
                    <tr key={aff.id} className="hover:bg-[#142119]/50 transition-colors">
                      <td className="py-3.5 px-6 font-mono font-bold text-emerald-400">
                        {aff.handle}
                      </td>
                      <td className="py-3.5 px-6">
                        <div className="font-semibold text-white">{aff.customerName}</div>
                        <div className="text-[10px] text-slate-400">{aff.customerEmail}</div>
                      </td>
                      <td className="py-3.5 px-6 font-mono font-bold text-white">
                        {aff.referralsCount}
                      </td>
                      <td className="py-3.5 px-6 font-mono font-semibold text-emerald-400">
                        {formatNaira(aff.totalEarningsNgn)}
                      </td>
                      <td className="py-3.5 px-6 font-mono text-slate-300">
                        {formatNaira(aff.paidEarningsNgn)}
                      </td>
                      <td className="py-3.5 px-6 font-mono text-amber-400">
                        {formatNaira(aff.pendingEarningsNgn)}
                      </td>
                      <td className="py-3.5 px-6 font-mono text-[11px] text-slate-400">
                        {formatDate(aff.createdAt)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
