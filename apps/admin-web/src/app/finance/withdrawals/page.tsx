'use client';

import React, { useEffect, useState } from 'react';
import { ArrowDownLeft, CheckCircle, XCircle, RefreshCw } from 'lucide-react';
import { AdminHeader } from '@/components/AdminHeader';
import { StatusBadge } from '@/components/StatusBadge';
import { ActionModal } from '@/components/ActionModal';
import { formatNaira, formatDateTime } from '@/lib/formatters';
import { fetchAdminApi } from '@/lib/api';

export default function WithdrawalsQueuePage() {
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [modalConfig, setModalConfig] = useState<{
    isOpen: boolean;
    withdrawalId: string;
    action: 'APPROVE' | 'REJECT';
    reference: string;
    amountNgn: number;
  }>({
    isOpen: false,
    withdrawalId: '',
    action: 'APPROVE',
    reference: '',
    amountNgn: 0,
  });

  const loadWithdrawals = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set('status', statusFilter);

      const res = await fetchAdminApi(`/admin/finance/withdrawals?${params.toString()}`);
      if (res.success) {
        setWithdrawals(res.data);
      }
    } catch (err) {
      console.error('Failed to load withdrawals:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWithdrawals();
  }, [statusFilter]);

  const handleProcessConfirm = async (reason: string) => {
    await fetchAdminApi(`/admin/finance/withdrawals/${modalConfig.withdrawalId}/process`, {
      method: 'POST',
      body: JSON.stringify({ action: modalConfig.action, reason }),
    });
    await loadWithdrawals();
  };

  return (
    <>
      <AdminHeader
        title="Bank Withdrawals Review & Disbursement Desk"
        subtitle="Maker-checker authorization, CBN KYC validation, and Lenco automated bank transfers"
      />

      <div className="p-8 space-y-6">
        {/* Filters */}
        <div className="flex items-center justify-between bg-[#0f1712] border border-[#1b3322] p-4 rounded-xl">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">Withdrawal Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 rounded-lg bg-[#070a08] border border-[#1b3322] text-xs text-slate-300 focus:outline-none focus:border-emerald-500"
            >
              <option value="">All Statuses</option>
              <option value="REQUESTED">Pending Review / Requested</option>
              <option value="PAID">Paid / Disbursed</option>
              <option value="REJECTED">Rejected</option>
            </select>
          </div>

          <button
            onClick={loadWithdrawals}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#070a08] border border-[#1b3322] text-xs text-slate-300 hover:text-white"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh Queue</span>
          </button>
        </div>

        {/* Withdrawals Table */}
        <div className="rounded-xl bg-[#0f1712] border border-[#1b3322] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#070a08] border-b border-[#1b3322] text-slate-400 font-semibold uppercase">
                <tr>
                  <th className="py-3.5 px-6">Reference</th>
                  <th className="py-3.5 px-6">Trader</th>
                  <th className="py-3.5 px-6">Requested Amount</th>
                  <th className="py-3.5 px-6">Fee</th>
                  <th className="py-3.5 px-6">Net Disbursement</th>
                  <th className="py-3.5 px-6">Status</th>
                  <th className="py-3.5 px-6">Lenco Transfer Ref</th>
                  <th className="py-3.5 px-6">Date</th>
                  <th className="py-3.5 px-6 text-right">Review Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1b3322]/60 text-slate-300">
                {loading ? (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-slate-500">
                      Loading withdrawals queue...
                    </td>
                  </tr>
                ) : withdrawals.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-slate-500">
                      No withdrawal requests in queue.
                    </td>
                  </tr>
                ) : (
                  withdrawals.map((w) => {
                    const isPending = w.status === 'REQUESTED' || w.status === 'PENDING_REVIEW';
                    return (
                      <tr key={w.id} className="hover:bg-[#142119]/50 transition-colors">
                        <td className="py-3.5 px-6 font-mono font-bold text-white">
                          {w.reference}
                        </td>
                        <td className="py-3.5 px-6">
                          <div className="font-semibold text-white">{w.customerName}</div>
                          <div className="text-[10px] text-slate-400">{w.customerEmail}</div>
                        </td>
                        <td className="py-3.5 px-6 font-mono text-slate-300">
                          {formatNaira(w.amountNgn)}
                        </td>
                        <td className="py-3.5 px-6 font-mono text-slate-400">
                          {formatNaira(w.feeNgn)}
                        </td>
                        <td className="py-3.5 px-6 font-mono font-bold text-emerald-400">
                          {formatNaira(w.netAmountNgn)}
                        </td>
                        <td className="py-3.5 px-6">
                          <StatusBadge status={w.status} />
                        </td>
                        <td className="py-3.5 px-6 font-mono text-[11px] text-slate-400">
                          {w.lencoDisbursementRef || '—'}
                        </td>
                        <td className="py-3.5 px-6 font-mono text-[11px] text-slate-400">
                          {formatDateTime(w.createdAt)}
                        </td>
                        <td className="py-3.5 px-6 text-right">
                          {isPending ? (
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() =>
                                  setModalConfig({
                                    isOpen: true,
                                    withdrawalId: w.id,
                                    action: 'APPROVE',
                                    reference: w.reference,
                                    amountNgn: w.netAmountNgn,
                                  })
                                }
                                className="px-2.5 py-1.5 rounded-lg bg-emerald-600/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-600 hover:text-white transition-colors text-xs font-semibold"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() =>
                                  setModalConfig({
                                    isOpen: true,
                                    withdrawalId: w.id,
                                    action: 'REJECT',
                                    reference: w.reference,
                                    amountNgn: w.netAmountNgn,
                                  })
                                }
                                className="px-2.5 py-1.5 rounded-lg bg-rose-600/10 border border-rose-500/30 text-rose-400 hover:bg-rose-600 hover:text-white transition-colors text-xs font-semibold"
                              >
                                Reject
                              </button>
                            </div>
                          ) : (
                            <span className="text-slate-500 text-[11px]">Processed</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <ActionModal
        isOpen={modalConfig.isOpen}
        title={
          modalConfig.action === 'APPROVE'
            ? `Approve & Disburse ${formatNaira(modalConfig.amountNgn)}`
            : `Reject Withdrawal ${modalConfig.reference}`
        }
        description={
          modalConfig.action === 'APPROVE'
            ? `Initiates interbank disbursement via Lenco to the trader's verified CBN bank account.`
            : `Refunds the withdrawal amount back to the trader's Giants Vault balance.`
        }
        confirmLabel={modalConfig.action === 'APPROVE' ? 'Authorize Disbursement' : 'Reject & Refund'}
        variant={modalConfig.action === 'APPROVE' ? 'primary' : 'danger'}
        onClose={() =>
          setModalConfig({ isOpen: false, withdrawalId: '', action: 'APPROVE', reference: '', amountNgn: 0 })
        }
        onConfirm={handleProcessConfirm}
      />
    </>
  );
}
