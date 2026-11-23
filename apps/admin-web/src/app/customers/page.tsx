'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Search, Filter, ShieldCheck, UserX, UserCheck, Eye, RefreshCw, ExternalLink, Loader2 } from 'lucide-react';
import { AdminHeader } from '@/components/AdminHeader';
import { StatusBadge } from '@/components/StatusBadge';
import { formatNaira, formatDate } from '@/lib/formatters';
import { fetchAdminApi } from '@/lib/api';

export default function CustomersDirectoryPage() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [kycFilter, setKycFilter] = useState('');
  const [suspendedFilter, setSuspendedFilter] = useState('');
  const [impersonatingId, setImpersonatingId] = useState<string | null>(null);

  const loadCustomers = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (kycFilter) params.set('kycStatus', kycFilter);
      if (suspendedFilter) params.set('isSuspended', suspendedFilter);

      const res = await fetchAdminApi(`/admin/customers?${params.toString()}`);
      if (res.success) {
        setCustomers(res.data);
      }
    } catch (err) {
      console.error('Failed to load customers:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleImpersonate = async (customerId: string) => {
    setImpersonatingId(customerId);
    try {
      const res = await fetchAdminApi(`/admin/customers/${customerId}/impersonate`, {
        method: 'POST',
        body: JSON.stringify({ reason: 'Admin customer directory impersonation' }),
      });
      if (res.success && res.redirectUrl) {
        window.open(res.redirectUrl, '_blank', 'noopener,noreferrer');
      } else {
        alert(res.message || 'Failed to start impersonation session');
      }
    } catch (err: any) {
      alert('Error initiating impersonation: ' + err.message);
    } finally {
      setImpersonatingId(null);
    }
  };

  useEffect(() => {
    loadCustomers();
  }, [kycFilter, suspendedFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadCustomers();
  };

  return (
    <>
      <AdminHeader
        title="Customer Directory & Compliance"
        subtitle="Search, filter, and inspect verified FundedGiants trading accounts and KYC states"
      />

      <div className="p-8 space-y-6">
        {/* Search & Filter Toolbar */}
        <div className="flex flex-col md:flex-row gap-4 justify-between items-stretch md:items-center bg-[#0f1712] border border-[#1b3322] p-4 rounded-xl">
          <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, email, phone..."
              className="w-full pl-10 pr-4 py-2 rounded-lg bg-[#070a08] border border-[#1b3322] text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />
          </form>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">KYC:</span>
              <select
                value={kycFilter}
                onChange={(e) => setKycFilter(e.target.value)}
                className="px-3 py-2 rounded-lg bg-[#070a08] border border-[#1b3322] text-xs text-slate-300 focus:outline-none focus:border-emerald-500"
              >
                <option value="">All KYC States</option>
                <option value="APPROVED">Approved</option>
                <option value="PENDING">Pending</option>
                <option value="UNVERIFIED">Unverified</option>
                <option value="REJECTED">Rejected</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">Status:</span>
              <select
                value={suspendedFilter}
                onChange={(e) => setSuspendedFilter(e.target.value)}
                className="px-3 py-2 rounded-lg bg-[#070a08] border border-[#1b3322] text-xs text-slate-300 focus:outline-none focus:border-emerald-500"
              >
                <option value="">All Statuses</option>
                <option value="false">Active Only</option>
                <option value="true">Suspended Only</option>
              </select>
            </div>

            <button
              onClick={loadCustomers}
              className="p-2 rounded-lg bg-[#070a08] border border-[#1b3322] text-slate-400 hover:text-white"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Customers Table */}
        <div className="rounded-xl bg-[#0f1712] border border-[#1b3322] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#070a08] border-b border-[#1b3322] text-slate-400 font-semibold uppercase">
                <tr>
                  <th className="py-3.5 px-6">Trader Name & Contact</th>
                  <th className="py-3.5 px-6">Role</th>
                  <th className="py-3.5 px-6">KYC Status</th>
                  <th className="py-3.5 px-6">Account Status</th>
                  <th className="py-3.5 px-6">Vault Balance</th>
                  <th className="py-3.5 px-6">Challenges</th>
                  <th className="py-3.5 px-6">Joined Date</th>
                  <th className="py-3.5 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1b3322]/60 text-slate-300">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-500">
                      Loading customer records...
                    </td>
                  </tr>
                ) : customers.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-500">
                      No matching customer accounts found.
                    </td>
                  </tr>
                ) : (
                  customers.map((c) => (
                    <tr key={c.id} className="hover:bg-[#142119]/50 transition-colors">
                      <td className="py-3.5 px-6">
                        <div className="font-semibold text-white">
                          {c.firstName || c.lastName
                            ? `${c.firstName || ''} ${c.lastName || ''}`.trim()
                            : 'Registered Trader'}
                        </div>
                        <div className="text-[11px] text-slate-400">{c.email}</div>
                        {c.phone && <div className="text-[10px] text-slate-500 font-mono">{c.phone}</div>}
                      </td>
                      <td className="py-3.5 px-6 font-mono text-[11px] text-slate-400">
                        {c.role}
                      </td>
                      <td className="py-3.5 px-6">
                        <StatusBadge status={c.kycStatus} />
                      </td>
                      <td className="py-3.5 px-6">
                        {c.isSuspended ? (
                          <StatusBadge status="SUSPENDED" />
                        ) : (
                          <StatusBadge status="ACTIVE" />
                        )}
                      </td>
                      <td className="py-3.5 px-6 font-mono font-semibold text-emerald-400">
                        {formatNaira(c.walletBalanceNgn)}
                      </td>
                      <td className="py-3.5 px-6">
                        <span className="px-2 py-0.5 rounded bg-[#070a08] border border-[#1b3322] text-xs font-mono">
                          {c.activeChallengesCount} active
                        </span>
                      </td>
                      <td className="py-3.5 px-6 font-mono text-[11px] text-slate-400">
                        {formatDate(c.createdAt)}
                      </td>
                      <td className="py-3.5 px-6 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleImpersonate(c.id)}
                            disabled={impersonatingId === c.id}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-purple-500/10 border border-purple-500/30 text-xs font-semibold text-purple-300 hover:bg-purple-500/20 transition-colors"
                            title="Log in to Trader Portal as this user in a new tab"
                          >
                            {impersonatingId === c.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <ExternalLink className="w-3.5 h-3.5" />
                            )}
                            <span>Impersonate</span>
                          </button>
                          <Link
                            href={`/customers/${c.id}`}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-xs font-semibold text-emerald-400 hover:bg-emerald-500/20 transition-colors"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>View 360°</span>
                          </Link>
                        </div>
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
