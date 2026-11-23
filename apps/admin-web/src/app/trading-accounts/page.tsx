'use client';

import React, { useEffect, useState } from 'react';
import { Search, Activity, ShieldAlert, Power, RefreshCw, RotateCcw, Coins } from 'lucide-react';
import { AdminHeader } from '@/components/AdminHeader';
import { StatusBadge } from '@/components/StatusBadge';
import { ActionModal } from '@/components/ActionModal';
import { ReinstateAccountModal } from '@/components/ReinstateAccountModal';
import { AdjustBalanceModal } from '@/components/AdjustBalanceModal';
import { formatNaira, formatDateTime } from '@/lib/formatters';
import { fetchAdminApi } from '@/lib/api';

export default function TradingAccountsPage() {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [killModal, setKillModal] = useState<{
    isOpen: boolean;
    accountId: string;
    accountNumber: string;
  }>({
    isOpen: false,
    accountId: '',
    accountNumber: '',
  });
  const [reinstateModal, setReinstateModal] = useState<{
    isOpen: boolean;
    account: any | null;
  }>({
    isOpen: false,
    account: null,
  });
  const [adjustModal, setAdjustModal] = useState<{
    isOpen: boolean;
    account: any | null;
  }>({
    isOpen: false,
    account: null,
  });

  const loadAccounts = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (statusFilter) params.set('status', statusFilter);

      const res = await fetchAdminApi(`/admin/trading-accounts?${params.toString()}`);
      if (res.success) {
        setAccounts(res.data);
      }
    } catch (err) {
      console.error('Failed to load trading accounts:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAccounts();
  }, [statusFilter]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadAccounts();
  };

  const handleTriggerKillSwitch = async (reason: string) => {
    await fetchAdminApi(`/admin/trading-accounts/${killModal.accountId}/terminate`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
    await loadAccounts();
  };

  return (
    <>
      <AdminHeader
        title="SteraTrader Accounts Management"
        subtitle="Live telemetry, broker synchronization, and administrative emergency kill-switch"
      />

      <div className="p-8 space-y-6">
        {/* Search & Filter Toolbar */}
        <div className="flex flex-col md:flex-row gap-4 justify-between items-stretch md:items-center bg-[#0f1712] border border-[#1b3322] p-4 rounded-xl">
          <form onSubmit={handleSearch} className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search account #, or trader email..."
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
                <option value="CLOSED">Closed / Breached</option>
                <option value="SUSPENDED">Suspended</option>
              </select>
            </div>

            <button
              onClick={loadAccounts}
              className="p-2 rounded-lg bg-[#070a08] border border-[#1b3322] text-slate-400 hover:text-white"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Accounts Table */}
        <div className="rounded-xl bg-[#0f1712] border border-[#1b3322] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#070a08] border-b border-[#1b3322] text-slate-400 font-semibold uppercase">
                <tr>
                  <th className="py-3.5 px-6">Account #</th>
                  <th className="py-3.5 px-6">Trader</th>
                  <th className="py-3.5 px-6">Challenge Product</th>
                  <th className="py-3.5 px-6">Initial Balance</th>
                  <th className="py-3.5 px-6">Current Balance</th>
                  <th className="py-3.5 px-6">Current Equity</th>
                  <th className="py-3.5 px-6">Status</th>
                  <th className="py-3.5 px-6">Last Synced</th>
                  <th className="py-3.5 px-6 text-right">Emergency Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1b3322]/60 text-slate-300">
                {loading ? (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-slate-500">
                      Loading SteraTrader accounts...
                    </td>
                  </tr>
                ) : accounts.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-slate-500">
                      No matching trading accounts found.
                    </td>
                  </tr>
                ) : (
                  accounts.map((acc) => (
                    <tr key={acc.id} className="hover:bg-[#142119]/50 transition-colors">
                      <td className="py-3.5 px-6 font-mono font-bold text-white">
                        {acc.accountNumber}
                      </td>
                      <td className="py-3.5 px-6">
                        <div className="font-semibold text-white">{acc.customerName}</div>
                        <div className="text-[10px] text-slate-400">{acc.customerEmail}</div>
                      </td>
                      <td className="py-3.5 px-6 text-slate-300">
                        {acc.productName || acc.challengeNumber || '—'}
                      </td>
                      <td className="py-3.5 px-6 font-mono text-slate-400">
                        {formatNaira(acc.initialBalanceNgn)}
                      </td>
                      <td className="py-3.5 px-6 font-mono font-semibold text-white">
                        {formatNaira(acc.currentBalanceNgn)}
                      </td>
                      <td className="py-3.5 px-6 font-mono font-bold text-emerald-400">
                        {formatNaira(acc.currentEquityNgn)}
                      </td>
                      <td className="py-3.5 px-6">
                        <StatusBadge status={acc.status} />
                      </td>
                      <td className="py-3.5 px-6 font-mono text-[11px] text-slate-400">
                        {formatDateTime(acc.lastSyncedAt)}
                      </td>
                      <td className="py-3.5 px-6 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setAdjustModal({ isOpen: true, account: acc })}
                            title="Adjust balance for demo / withdrawal testing"
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 hover:bg-amber-500 hover:text-black transition-colors text-xs font-semibold"
                          >
                            <Coins className="w-3.5 h-3.5" />
                            <span>Adjust</span>
                          </button>

                          {acc.status === 'ACTIVE' ? (
                            <button
                              onClick={() =>
                                setKillModal({
                                  isOpen: true,
                                  accountId: acc.id,
                                  accountNumber: acc.accountNumber,
                                })
                              }
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-rose-600/10 border border-rose-500/30 text-rose-400 hover:bg-rose-600 hover:text-white transition-colors text-xs font-semibold"
                            >
                              <Power className="w-3.5 h-3.5" />
                              <span>Kill Switch</span>
                            </button>
                          ) : (
                            <button
                              onClick={() => setReinstateModal({ isOpen: true, account: acc })}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-600/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-600 hover:text-white transition-colors text-xs font-semibold"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                              <span>Reinstate</span>
                            </button>
                          )}
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

      <ActionModal
        isOpen={killModal.isOpen}
        title={`Trigger Emergency Kill-Switch for ${killModal.accountNumber}`}
        description="Terminates trading access on SteraTrader, closes the account, and marks the challenge as FAILED."
        confirmLabel="Liquidate & Terminate"
        variant="danger"
        onClose={() => setKillModal({ isOpen: false, accountId: '', accountNumber: '' })}
        onConfirm={handleTriggerKillSwitch}
      />

      <ReinstateAccountModal
        isOpen={reinstateModal.isOpen}
        account={reinstateModal.account}
        onClose={() => setReinstateModal({ isOpen: false, account: null })}
        onSuccess={loadAccounts}
      />

      <AdjustBalanceModal
        isOpen={adjustModal.isOpen}
        account={adjustModal.account}
        onClose={() => setAdjustModal({ isOpen: false, account: null })}
        onSuccess={loadAccounts}
      />
    </>
  );
}
