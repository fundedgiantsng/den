'use client';

import React, { useEffect, useState } from 'react';
import { Wallet, RefreshCw, Filter } from 'lucide-react';
import { AdminHeader } from '@/components/AdminHeader';
import { StatusBadge } from '@/components/StatusBadge';
import { formatNaira, formatDateTime } from '@/lib/formatters';
import { fetchAdminApi } from '@/lib/api';

export default function GeneralLedgerPage() {
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [txTypeFilter, setTxTypeFilter] = useState('');

  const loadLedger = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (txTypeFilter) params.set('transactionType', txTypeFilter);

      const res = await fetchAdminApi(`/admin/finance/ledger?${params.toString()}`);
      if (res.success) {
        setEntries(res.data);
      }
    } catch (err) {
      console.error('Failed to load ledger:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLedger();
  }, [txTypeFilter]);

  return (
    <>
      <AdminHeader
        title="Double-Entry General Ledger"
        subtitle="Immutable financial journal entries, balance sheet accounts, and transactional audit trails"
      />

      <div className="p-8 space-y-6">
        {/* Filters */}
        <div className="flex items-center justify-between bg-[#0f1712] border border-[#1b3322] p-4 rounded-xl">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">Transaction Type:</span>
            <select
              value={txTypeFilter}
              onChange={(e) => setTxTypeFilter(e.target.value)}
              className="px-3 py-2 rounded-lg bg-[#070a08] border border-[#1b3322] text-xs text-slate-300 focus:outline-none focus:border-emerald-500"
            >
              <option value="">All Transactions</option>
              <option value="CHALLENGE_PURCHASE">Challenge Purchase</option>
              <option value="DEPOSIT_LENCO_VIRTUAL">Lenco Virtual Deposit</option>
              <option value="TRADER_EARNINGS_PAYOUT">Trader Earnings Payout</option>
              <option value="AFFILIATE_COMMISSION_PAYOUT">Affiliate Commission</option>
              <option value="ADJUSTMENT">Ledger Adjustment</option>
            </select>
          </div>

          <button
            onClick={loadLedger}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#070a08] border border-[#1b3322] text-xs text-slate-300 hover:text-white"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh Ledger</span>
          </button>
        </div>

        {/* Ledger Entries Table */}
        <div className="rounded-xl bg-[#0f1712] border border-[#1b3322] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#070a08] border-b border-[#1b3322] text-slate-400 font-semibold uppercase">
                <tr>
                  <th className="py-3.5 px-6">Posted At</th>
                  <th className="py-3.5 px-6">Entry Number</th>
                  <th className="py-3.5 px-6">Transaction Type</th>
                  <th className="py-3.5 px-6">Narration & Reference</th>
                  <th className="py-3.5 px-6">Debits (Dr)</th>
                  <th className="py-3.5 px-6">Credits (Cr)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1b3322]/60 text-slate-300">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-500">
                      Loading general ledger journal entries...
                    </td>
                  </tr>
                ) : entries.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-500">
                      Zero ledger journal entries recorded.
                    </td>
                  </tr>
                ) : (
                  entries.map((entry) => {
                    const debits = entry.lines.filter((l: any) => l.debitNgn > 0);
                    const credits = entry.lines.filter((l: any) => l.creditNgn > 0);

                    return (
                      <tr key={entry.id} className="hover:bg-[#142119]/50 transition-colors">
                        <td className="py-3.5 px-6 font-mono text-[11px] text-slate-400">
                          {formatDateTime(entry.postedAt)}
                        </td>
                        <td className="py-3.5 px-6 font-mono font-bold text-white">
                          {entry.entryNumber}
                        </td>
                        <td className="py-3.5 px-6">
                          <StatusBadge status={entry.transactionType} />
                        </td>
                        <td className="py-3.5 px-6">
                          <div className="font-semibold text-slate-200">{entry.narration}</div>
                          <div className="text-[10px] font-mono text-slate-500">{entry.reference}</div>
                        </td>
                        <td className="py-3.5 px-6">
                          {debits.map((d: any, idx: number) => (
                            <div key={idx} className="font-mono text-emerald-400">
                              <span className="text-slate-400">{d.accountCode}: </span>
                              <strong>{formatNaira(d.debitNgn)}</strong>
                            </div>
                          ))}
                        </td>
                        <td className="py-3.5 px-6">
                          {credits.map((c: any, idx: number) => (
                            <div key={idx} className="font-mono text-sky-400">
                              <span className="text-slate-400">{c.accountCode}: </span>
                              <strong>{formatNaira(c.creditNgn)}</strong>
                            </div>
                          ))}
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
    </>
  );
}
