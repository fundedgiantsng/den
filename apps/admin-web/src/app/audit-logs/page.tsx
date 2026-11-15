'use client';

import React, { useEffect, useState } from 'react';
import { ClipboardList, RefreshCw, Filter, Search } from 'lucide-react';
import { AdminHeader } from '@/components/AdminHeader';
import { StatusBadge } from '@/components/StatusBadge';
import { formatDateTime } from '@/lib/formatters';
import { fetchAdminApi } from '@/lib/api';

export default function AuditTrailPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState('');

  const loadAuditLogs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (actionFilter) params.set('action', actionFilter);

      const res = await fetchAdminApi(`/admin/audit-logs?${params.toString()}`);
      if (res.success) {
        setLogs(res.data);
      }
    } catch (err) {
      console.error('Failed to load audit logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAuditLogs();
  }, [actionFilter]);

  return (
    <>
      <AdminHeader
        title="Immutable Audit Trail & Staff Governance"
        subtitle="Chronological, tamper-evident record of all administrative actions, ledger modifications, and risk overrides"
      />

      <div className="p-8 space-y-6">
        {/* Filter */}
        <div className="flex items-center justify-between bg-[#0f1712] border border-[#1b3322] p-4 rounded-xl">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">Action Type:</span>
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="px-3 py-2 rounded-lg bg-[#070a08] border border-[#1b3322] text-xs text-slate-300 focus:outline-none focus:border-emerald-500"
            >
              <option value="">All Administrative Actions</option>
              <option value="ADMIN_CUSTOMER_STATUS_UPDATE">Customer Status Change</option>
              <option value="ADMIN_TRADING_ACCOUNT_TERMINATION">Account Kill-Switch</option>
              <option value="ADMIN_WITHDRAWAL_APPROVED">Withdrawal Approved</option>
              <option value="ADMIN_WITHDRAWAL_REJECTED">Withdrawal Rejected</option>
              <option value="ADMIN_COUPON_CREATED">Coupon Created</option>
              <option value="ADMIN_COUPON_TOGGLED">Coupon Toggled</option>
            </select>
          </div>

          <button
            onClick={loadAuditLogs}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#070a08] border border-[#1b3322] text-xs text-slate-300 hover:text-white"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh Trail</span>
          </button>
        </div>

        {/* Audit Log Table */}
        <div className="rounded-xl bg-[#0f1712] border border-[#1b3322] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#070a08] border-b border-[#1b3322] text-slate-400 font-semibold uppercase">
                <tr>
                  <th className="py-3.5 px-6">Timestamp</th>
                  <th className="py-3.5 px-6">Action</th>
                  <th className="py-3.5 px-6">Resource / Target</th>
                  <th className="py-3.5 px-6">Operator ID</th>
                  <th className="py-3.5 px-6">Target Trader</th>
                  <th className="py-3.5 px-6">Audit Details & Justification</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1b3322]/60 text-slate-300">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-500">
                      Loading audit events...
                    </td>
                  </tr>
                ) : logs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-500">
                      Zero audit events found.
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr key={log.id} className="hover:bg-[#142119]/50 transition-colors">
                      <td className="py-3.5 px-6 font-mono text-[11px] text-slate-400">
                        {formatDateTime(log.createdAt)}
                      </td>
                      <td className="py-3.5 px-6 font-bold text-white">
                        {log.action}
                      </td>
                      <td className="py-3.5 px-6 font-mono text-slate-400">
                        {log.resource} {log.resourceId ? `(${log.resourceId})` : ''}
                      </td>
                      <td className="py-3.5 px-6 font-mono text-emerald-400">
                        {log.adminId || 'SUPER_ADMIN'}
                      </td>
                      <td className="py-3.5 px-6">
                        {log.userName ? (
                          <div>
                            <div className="font-semibold text-white">{log.userName}</div>
                            <div className="text-[10px] text-slate-400">{log.userEmail}</div>
                          </div>
                        ) : (
                          <span className="text-slate-500">—</span>
                        )}
                      </td>
                      <td className="py-3.5 px-6 font-mono text-[11px] text-slate-300 max-w-md">
                        {typeof log.details === 'object'
                          ? JSON.stringify(log.details)
                          : log.details || '—'}
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
