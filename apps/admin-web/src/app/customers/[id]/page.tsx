'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  ShieldCheck,
  UserX,
  UserCheck,
  Wallet,
  Trophy,
  History,
  Building,
  CheckCircle,
  AlertTriangle,
} from 'lucide-react';
import { AdminHeader } from '@/components/AdminHeader';
import { StatusBadge } from '@/components/StatusBadge';
import { ActionModal } from '@/components/ActionModal';
import { formatNaira, formatDateTime, formatDate } from '@/lib/formatters';
import { fetchAdminApi } from '@/lib/api';

export default function CustomerDetailPage() {
  const params = useParams();
  const router = useRouter();
  const customerId = params.id as string;

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'challenges' | 'wallet' | 'orders' | 'audit'>('challenges');
  const [modalConfig, setModalConfig] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    variant: 'danger' | 'warning' | 'primary';
    action: (reason: string) => Promise<void>;
  }>({
    isOpen: false,
    title: '',
    description: '',
    variant: 'primary',
    action: async () => {},
  });

  const loadCustomer = async () => {
    setLoading(true);
    try {
      const res = await fetchAdminApi(`/admin/customers/${customerId}`);
      if (res.success) {
        setData(res.data);
      }
    } catch (err) {
      console.error('Failed to load customer details:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCustomer();
  }, [customerId]);

  const handleSuspend = () => {
    setModalConfig({
      isOpen: true,
      title: 'Suspend Trader Account',
      description: 'Suspending this customer locks login sessions, trading activity, and wallet withdrawals.',
      variant: 'danger',
      action: async (reason: string) => {
        await fetchAdminApi(`/admin/customers/${customerId}/status`, {
          method: 'PATCH',
          body: JSON.stringify({ isSuspended: true, suspensionReason: reason, reason }),
        });
        await loadCustomer();
      },
    });
  };

  const handleReinstate = () => {
    setModalConfig({
      isOpen: true,
      title: 'Reinstate Trader Account',
      description: 'Reinstating restores full customer access to trading dashboard, challenges, and wallet.',
      variant: 'primary',
      action: async (reason: string) => {
        await fetchAdminApi(`/admin/customers/${customerId}/status`, {
          method: 'PATCH',
          body: JSON.stringify({ isSuspended: false, suspensionReason: null, reason }),
        });
        await loadCustomer();
      },
    });
  };

  const handleKycApprove = () => {
    setModalConfig({
      isOpen: true,
      title: 'Manually Approve KYC Verification',
      description: 'Overrides Ninja KYC result and marks trader as compliance-verified.',
      variant: 'primary',
      action: async (reason: string) => {
        await fetchAdminApi(`/admin/customers/${customerId}/status`, {
          method: 'PATCH',
          body: JSON.stringify({ kycStatus: 'APPROVED', reason }),
        });
        await loadCustomer();
      },
    });
  };

  if (loading) {
    return (
      <div className="p-8 text-center text-slate-500">
        Loading customer 360° record...
      </div>
    );
  }

  if (!data?.customer) {
    return (
      <div className="p-8 text-center text-rose-400">
        Customer record not found.
      </div>
    );
  }

  const { customer, wallet, challenges, bankAccounts, orders, auditLogs } = data;

  return (
    <>
      <AdminHeader
        title={`Trader 360° • ${customer.firstName || ''} ${customer.lastName || customer.email}`}
        subtitle={`Customer ID: ${customer.id}`}
        actions={
          <Link
            href="/customers"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0f1712] border border-[#1b3322] text-xs font-semibold text-slate-300 hover:text-white"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Directory</span>
          </Link>
        }
      />

      <div className="p-8 space-y-6">
        {/* Customer Profile Banner */}
        <div className="rounded-2xl bg-[#0f1712] border border-[#1b3322] p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-xl font-bold text-emerald-400">
              {(customer.firstName?.[0] || customer.email?.[0] || 'T').toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white">
                  {customer.firstName || customer.lastName
                    ? `${customer.firstName || ''} ${customer.lastName || ''}`.trim()
                    : 'Registered Trader'}
                </h2>
                <StatusBadge status={customer.kycStatus} />
                {customer.isSuspended ? (
                  <StatusBadge status="SUSPENDED" />
                ) : (
                  <StatusBadge status="ACTIVE" />
                )}
              </div>
              <div className="text-xs text-slate-400 mt-1 flex flex-wrap gap-4">
                <span>Email: <strong className="text-slate-200">{customer.email}</strong></span>
                {customer.phone && <span>Phone: <strong className="text-slate-200">{customer.phone}</strong></span>}
                <span>Registered: <strong className="text-slate-200">{formatDate(customer.createdAt)}</strong></span>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-2.5">
            {customer.kycStatus !== 'APPROVED' && (
              <button
                onClick={handleKycApprove}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white transition-colors"
              >
                <CheckCircle className="w-3.5 h-3.5" />
                <span>Approve KYC</span>
              </button>
            )}

            {customer.isSuspended ? (
              <button
                onClick={handleReinstate}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white transition-colors"
              >
                <UserCheck className="w-3.5 h-3.5" />
                <span>Reinstate Trader</span>
              </button>
            ) : (
              <button
                onClick={handleSuspend}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-xs font-semibold text-white transition-colors"
              >
                <UserX className="w-3.5 h-3.5" />
                <span>Suspend Trader</span>
              </button>
            )}
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2 border-b border-[#1b3322]">
          {[
            { id: 'challenges', label: `Challenges (${challenges.length})`, icon: Trophy },
            { id: 'wallet', label: 'Giants Vault & Banking', icon: Wallet },
            { id: 'orders', label: `Orders (${orders.length})`, icon: Building },
            { id: 'audit', label: `Audit Events (${auditLogs.length})`, icon: History },
          ].map((t) => {
            const Icon = t.icon;
            const active = activeTab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id as any)}
                className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-all ${
                  active
                    ? 'border-emerald-500 text-emerald-400 bg-emerald-500/5'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>

        {/* TAB 1: CHALLENGES */}
        {activeTab === 'challenges' && (
          <div className="space-y-4">
            {challenges.length === 0 ? (
              <div className="rounded-xl bg-[#0f1712] border border-[#1b3322] p-8 text-center text-slate-500 text-xs">
                Trader has not purchased or started any challenges yet.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {challenges.map((ch: any) => (
                  <div
                    key={ch.id}
                    className="rounded-xl bg-[#0f1712] border border-[#1b3322] p-5 space-y-4"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-bold text-white">{ch.productName}</div>
                        <div className="text-xs text-slate-400 font-mono">{ch.challengeNumber}</div>
                      </div>
                      <StatusBadge status={ch.status} />
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-xs bg-[#070a08] p-3 rounded-lg border border-[#1b3322]">
                      <div>
                        <span className="text-slate-500 block">SteraTrader Account</span>
                        <span className="font-mono font-bold text-white">
                          {ch.accountNumber || 'Pending Provisioning'}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Trading Status</span>
                        <StatusBadge status={ch.tradingStatus || 'PROVISIONING'} />
                      </div>
                      <div>
                        <span className="text-slate-500 block">Initial Balance</span>
                        <span className="font-mono text-slate-300">
                          {formatNaira(ch.initialBalanceNgn)}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Live Equity</span>
                        <span className="font-mono font-bold text-emerald-400">
                          {formatNaira(ch.currentEquityNgn)}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">4% Daily DD Limit</span>
                        <span className="font-mono text-slate-400">
                          {formatNaira(ch.dailyDrawdownLimitNgn)}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Static Max Loss Floor</span>
                        <span className="font-mono text-slate-400">
                          {formatNaira(ch.maxDrawdownLimitNgn)}
                        </span>
                      </div>
                    </div>

                    {ch.failureReason && (
                      <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-xs text-rose-400">
                        <strong>Breach Reason:</strong> {ch.failureReason}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: GIANTS VAULT */}
        {activeTab === 'wallet' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-5 rounded-xl bg-[#0f1712] border border-[#1b3322]">
                <div className="text-xs text-slate-400 uppercase font-semibold">Available Vault Balance</div>
                <div className="text-2xl font-bold text-emerald-400 mt-2 font-mono">
                  {formatNaira(wallet?.availableBalanceNgn || 0)}
                </div>
              </div>
              <div className="p-5 rounded-xl bg-[#0f1712] border border-[#1b3322]">
                <div className="text-xs text-slate-400 uppercase font-semibold">Locked in Pending Withdrawals</div>
                <div className="text-2xl font-bold text-amber-400 mt-2 font-mono">
                  {formatNaira(wallet?.lockedBalanceNgn || 0)}
                </div>
              </div>
              <div className="p-5 rounded-xl bg-[#0f1712] border border-[#1b3322]">
                <div className="text-xs text-slate-400 uppercase font-semibold">Dedicated Lenco Virtual Account</div>
                <div className="text-lg font-bold text-white mt-2 font-mono">
                  {wallet?.virtualAccount || 'Unassigned'}
                </div>
                <div className="text-xs text-slate-400 mt-0.5">{wallet?.virtualBank || 'Wema Bank'}</div>
              </div>
            </div>

            {/* Bound Bank Accounts */}
            <div className="rounded-xl bg-[#0f1712] border border-[#1b3322] p-5">
              <h3 className="text-sm font-bold text-white mb-3">Bound Commercial Bank Accounts (CBN Strict KYC)</h3>
              {bankAccounts.length === 0 ? (
                <div className="text-xs text-slate-500">No bank accounts bound by trader.</div>
              ) : (
                <div className="divide-y divide-[#1b3322]">
                  {bankAccounts.map((b: any) => (
                    <div key={b.id} className="py-3 flex items-center justify-between text-xs">
                      <div>
                        <div className="font-semibold text-white">{b.accountName}</div>
                        <div className="text-slate-400 font-mono">
                          {b.bankName} • {b.accountNumber}
                        </div>
                      </div>
                      <StatusBadge status={b.isVerified ? 'APPROVED' : 'PENDING'} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: ORDERS */}
        {activeTab === 'orders' && (
          <div className="rounded-xl bg-[#0f1712] border border-[#1b3322] overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#070a08] border-b border-[#1b3322] text-slate-400 font-semibold uppercase">
                <tr>
                  <th className="py-3 px-6">Order Number</th>
                  <th className="py-3 px-6">Amount</th>
                  <th className="py-3 px-6">Payment Method</th>
                  <th className="py-3 px-6">Status</th>
                  <th className="py-3 px-6">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1b3322]/60 text-slate-300">
                {orders.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-slate-500">
                      Zero orders placed.
                    </td>
                  </tr>
                ) : (
                  orders.map((o: any) => (
                    <tr key={o.id}>
                      <td className="py-3 px-6 font-mono font-bold text-white">{o.orderNumber}</td>
                      <td className="py-3 px-6 font-mono font-semibold text-emerald-400">
                        {formatNaira(o.amount)}
                      </td>
                      <td className="py-3 px-6 font-mono text-slate-400">{o.paymentMethod}</td>
                      <td className="py-3 px-6">
                        <StatusBadge status={o.paymentStatus} />
                      </td>
                      <td className="py-3 px-6 font-mono text-slate-400">{formatDate(o.createdAt)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* TAB 4: AUDIT EVENTS */}
        {activeTab === 'audit' && (
          <div className="rounded-xl bg-[#0f1712] border border-[#1b3322] overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#070a08] border-b border-[#1b3322] text-slate-400 font-semibold uppercase">
                <tr>
                  <th className="py-3 px-6">Timestamp</th>
                  <th className="py-3 px-6">Action</th>
                  <th className="py-3 px-6">Admin / Operator</th>
                  <th className="py-3 px-6">Audit Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1b3322]/60 text-slate-300">
                {auditLogs.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-slate-500">
                      No administrative actions recorded for this trader.
                    </td>
                  </tr>
                ) : (
                  auditLogs.map((log: any) => (
                    <tr key={log.id}>
                      <td className="py-3 px-6 font-mono text-[11px] text-slate-400">
                        {formatDateTime(log.createdAt)}
                      </td>
                      <td className="py-3 px-6 font-semibold text-white">{log.action}</td>
                      <td className="py-3 px-6 font-mono text-slate-400">{log.adminId || 'System'}</td>
                      <td className="py-3 px-6 font-mono text-[10px] text-slate-400 max-w-md truncate">
                        {JSON.stringify(log.details)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Confirmation Modal */}
      <ActionModal
        isOpen={modalConfig.isOpen}
        title={modalConfig.title}
        description={modalConfig.description}
        variant={modalConfig.variant}
        onClose={() => setModalConfig((prev) => ({ ...prev, isOpen: false }))}
        onConfirm={modalConfig.action}
      />
    </>
  );
}
