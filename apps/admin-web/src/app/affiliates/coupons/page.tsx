'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Tag, Plus, CheckCircle, Power, RefreshCw } from 'lucide-react';
import { AdminHeader } from '@/components/AdminHeader';
import { StatusBadge } from '@/components/StatusBadge';
import { formatNaira, formatDate } from '@/lib/formatters';
import { fetchAdminApi } from '@/lib/api';

export default function DiscountCouponsPage() {
  const [coupons, setCoupons] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    code: '',
    discountPercent: 10,
    maxUsage: 100,
  });
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const loadCoupons = async () => {
    setLoading(true);
    try {
      const res = await fetchAdminApi('/admin/affiliates/coupons');
      if (res.success) {
        setCoupons(res.data);
      }
    } catch (err) {
      console.error('Failed to load coupons:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCoupons();
  }, []);

  const handleCreateCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    setFormError(null);
    try {
      await fetchAdminApi('/admin/affiliates/coupons', {
        method: 'POST',
        body: JSON.stringify(formData),
      });
      setCreateModalOpen(false);
      setFormData({ code: '', discountPercent: 10, maxUsage: 100 });
      await loadCoupons();
    } catch (err: any) {
      setFormError(err.message || 'Failed to create coupon.');
    } finally {
      setFormLoading(false);
    }
  };

  const handleToggleCoupon = async (code: string, currentStatus: boolean) => {
    try {
      await fetchAdminApi(`/admin/affiliates/coupons/${code}/toggle`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive: !currentStatus }),
      });
      await loadCoupons();
    } catch (err) {
      console.error('Failed to toggle coupon:', err);
    }
  };

  return (
    <>
      <AdminHeader
        title="Discount Coupons & Promotional Codes"
        subtitle="Custom challenge discount codes (1% to 10%), usage caps, and dynamic CPA deduction policies"
        actions={
          <div className="flex items-center gap-2">
            <Link
              href="/affiliates"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0f1712] border border-[#1b3322] text-xs font-semibold text-slate-300 hover:text-white"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Affiliates</span>
            </Link>
            <button
              onClick={() => setCreateModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create Coupon</span>
            </button>
          </div>
        }
      />

      <div className="p-8 space-y-6">
        <div className="rounded-xl bg-[#0f1712] border border-[#1b3322] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#070a08] border-b border-[#1b3322] text-slate-400 font-semibold uppercase">
                <tr>
                  <th className="py-3.5 px-6">Coupon Code</th>
                  <th className="py-3.5 px-6">Discount</th>
                  <th className="py-3.5 px-6">Usage Count</th>
                  <th className="py-3.5 px-6">Usage Cap</th>
                  <th className="py-3.5 px-6">Status</th>
                  <th className="py-3.5 px-6">Created Date</th>
                  <th className="py-3.5 px-6 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1b3322]/60 text-slate-300">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-500">
                      Loading coupons...
                    </td>
                  </tr>
                ) : coupons.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-500">
                      Zero active coupons. Click "Create Coupon" to launch a promotional code.
                    </td>
                  </tr>
                ) : (
                  coupons.map((c) => (
                    <tr key={c.id} className="hover:bg-[#142119]/50 transition-colors">
                      <td className="py-3.5 px-6 font-mono font-bold text-emerald-400">
                        {c.code}
                      </td>
                      <td className="py-3.5 px-6 font-bold text-white">
                        {c.discountPercent}% OFF
                      </td>
                      <td className="py-3.5 px-6 font-mono font-bold text-white">
                        {c.usageCount}
                      </td>
                      <td className="py-3.5 px-6 font-mono text-slate-400">
                        {c.maxUsage || 'Unlimited'}
                      </td>
                      <td className="py-3.5 px-6">
                        <StatusBadge status={c.isActive ? 'ACTIVE' : 'SUSPENDED'} />
                      </td>
                      <td className="py-3.5 px-6 font-mono text-[11px] text-slate-400">
                        {formatDate(c.createdAt)}
                      </td>
                      <td className="py-3.5 px-6 text-right">
                        <button
                          onClick={() => handleToggleCoupon(c.code, c.isActive)}
                          className={`px-3 py-1.5 rounded-lg border text-xs font-semibold transition-colors ${
                            c.isActive
                              ? 'bg-rose-500/10 border-rose-500/30 text-rose-400 hover:bg-rose-600 hover:text-white'
                              : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-600 hover:text-white'
                          }`}
                        >
                          {c.isActive ? 'Deactivate' : 'Activate'}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Create Coupon Modal */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="relative w-full max-w-md rounded-2xl bg-[#0f1712] border border-[#1b3322] p-6 shadow-2xl">
            <h3 className="text-base font-bold text-white mb-1">Create Promotional Coupon</h3>
            <p className="text-xs text-slate-400 mb-4">
              Configures custom discount percentages (1% to 10%) deducted proportionately from CPA.
            </p>

            {formError && (
              <div className="mb-4 rounded-lg bg-rose-500/10 border border-rose-500/30 p-3 text-xs text-rose-400">
                {formError}
              </div>
            )}

            <form onSubmit={handleCreateCoupon} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">
                  Coupon Code
                </label>
                <input
                  type="text"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  placeholder="e.g. LAUNCH10, GIANTS5"
                  required
                  className="w-full rounded-lg bg-[#070a08] border border-[#1b3322] px-3 py-2 text-sm text-white font-mono uppercase focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">
                  Discount Percentage (%)
                </label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={formData.discountPercent}
                  onChange={(e) => setFormData({ ...formData, discountPercent: Number(e.target.value) })}
                  required
                  className="w-full rounded-lg bg-[#070a08] border border-[#1b3322] px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">
                  Permitted discount range: 1% to 10% (strict policy compliance).
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">
                  Max Usages
                </label>
                <input
                  type="number"
                  min="1"
                  value={formData.maxUsage}
                  onChange={(e) => setFormData({ ...formData, maxUsage: Number(e.target.value) })}
                  className="w-full rounded-lg bg-[#070a08] border border-[#1b3322] px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 mt-6 pt-2 border-t border-[#1b3322]">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-slate-700 text-xs font-semibold text-slate-300 hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white shadow-md shadow-emerald-900/40"
                >
                  {formLoading ? 'Creating...' : 'Create Coupon'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
