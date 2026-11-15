'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Search, Trophy, Filter, Eye, RefreshCw } from 'lucide-react';
import { AdminHeader } from '@/components/AdminHeader';
import { StatusBadge } from '@/components/StatusBadge';
import { formatNaira, formatDate } from '@/lib/formatters';
import { fetchAdminApi } from '@/lib/api';

export default function AdminChallengesPage() {
  const [challenges, setChallenges] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');

  const loadChallenges = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set('status', statusFilter);
      if (search) params.set('search', search);

      const res = await fetchAdminApi(`/admin/challenges?${params.toString()}`);
      if (res.success) {
        setChallenges(res.data);
      }
    } catch (err) {
      console.error('Failed to load challenges:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadChallenges();
  }, [statusFilter]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadChallenges();
  };

  return (
    <>
      <AdminHeader
        title="Challenges Management"
        subtitle="Operational oversight of Rhino Rush (1-Step) and Phoenix Rise (Instant) challenge instances"
      />

      <div className="p-8 space-y-6">
        {/* Filter Bar */}
        <div className="flex flex-col md:flex-row gap-4 justify-between items-stretch md:items-center bg-[#0f1712] border border-[#1b3322] p-4 rounded-xl">
          <form onSubmit={handleSearch} className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search challenge #, account #, or trader..."
              className="w-full pl-10 pr-4 py-2 rounded-lg bg-[#070a08] border border-[#1b3322] text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />
          </form>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">Status:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 rounded-lg bg-[#070a08] border border-[#1b3322] text-xs text-slate-300 focus:outline-none focus:border-emerald-500"
              >
                <option value="">All Statuses</option>
                <option value="ACTIVE">Active</option>
                <option value="PASSED">Passed</option>
                <option value="FAILED">Failed</option>
                <option value="PENDING_PROVISIONING">Pending Provisioning</option>
              </select>
            </div>

            <button
              onClick={loadChallenges}
              className="p-2 rounded-lg bg-[#070a08] border border-[#1b3322] text-slate-400 hover:text-white"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Challenges Table */}
        <div className="rounded-xl bg-[#0f1712] border border-[#1b3322] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#070a08] border-b border-[#1b3322] text-slate-400 font-semibold uppercase">
                <tr>
                  <th className="py-3.5 px-6">Challenge #</th>
                  <th className="py-3.5 px-6">Trader</th>
                  <th className="py-3.5 px-6">Product & Size</th>
                  <th className="py-3.5 px-6">SteraTrader Account</th>
                  <th className="py-3.5 px-6">Live Equity</th>
                  <th className="py-3.5 px-6">Status</th>
                  <th className="py-3.5 px-6">Start Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1b3322]/60 text-slate-300">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-500">
                      Loading challenges...
                    </td>
                  </tr>
                ) : challenges.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-500">
                      No challenge instances found.
                    </td>
                  </tr>
                ) : (
                  challenges.map((ch) => (
                    <tr key={ch.id} className="hover:bg-[#142119]/50 transition-colors">
                      <td className="py-3.5 px-6 font-mono font-bold text-white">
                        {ch.challengeNumber}
                      </td>
                      <td className="py-3.5 px-6">
                        <div className="font-semibold text-white">{ch.customerName}</div>
                        <div className="text-[10px] text-slate-400">{ch.customerEmail}</div>
                      </td>
                      <td className="py-3.5 px-6">
                        <div className="font-semibold text-slate-200">{ch.productName}</div>
                        <div className="text-[10px] font-mono text-emerald-400">
                          {formatNaira(ch.accountSizeNgn)}
                        </div>
                      </td>
                      <td className="py-3.5 px-6 font-mono font-semibold text-white">
                        {ch.accountNumber || 'Pending'}
                      </td>
                      <td className="py-3.5 px-6 font-mono font-bold text-emerald-400">
                        {formatNaira(ch.currentEquityNgn || ch.accountSizeNgn)}
                      </td>
                      <td className="py-3.5 px-6">
                        <StatusBadge status={ch.status} />
                      </td>
                      <td className="py-3.5 px-6 font-mono text-[11px] text-slate-400">
                        {formatDate(ch.createdAt)}
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
