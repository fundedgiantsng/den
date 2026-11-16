'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Tag,
  Plus,
  Power,
  RefreshCw,
  Mail,
  Copy,
  Check,
  Edit2,
  Trash2,
  ExternalLink,
  Users,
  Shield,
  Zap,
  Gift,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { AdminHeader } from '@/components/AdminHeader';
import { StatusBadge } from '@/components/StatusBadge';
import { formatNaira, formatDate } from '@/lib/formatters';
import { fetchAdminApi } from '@/lib/api';

export default function DiscountCouponsPage() {
  const [coupons, setCoupons] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState<string | null>(null);

  // Modals state
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedCoupon, setSelectedCoupon] = useState<any | null>(null);

  // Form state for Create / Edit
  const [formCode, setFormCode] = useState('');
  const [formDiscount, setFormDiscount] = useState<number>(10);
  const [formAudience, setFormAudience] = useState<'ALL' | 'RESTRICTED'>('ALL');
  const [formEmails, setFormEmails] = useState('');
  const [formScope, setFormScope] = useState<'ALL' | 'SPECIFIC'>('ALL');
  const [formAccountType, setFormAccountType] = useState('ALL');
  const [formAccountSize, setFormAccountSize] = useState<number | ''>('');
  const [formDirectAssign, setFormDirectAssign] = useState(false);
  const [formMaxUsage, setFormMaxUsage] = useState<number | ''>(100);
  const [formExpiresAt, setFormExpiresAt] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formSendEmail, setFormSendEmail] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [bannerSuccess, setBannerSuccess] = useState<string | null>(null);

  const wpBaseUrl = process.env.NEXT_PUBLIC_WORDPRESS_URL || 'https://fundedgiants.ng';

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

  const openCreateModal = () => {
    setFormCode(`GIANT-${Math.floor(1000 + Math.random() * 9000)}`);
    setFormDiscount(10);
    setFormAudience('ALL');
    setFormEmails('');
    setFormScope('ALL');
    setFormAccountType('ALL');
    setFormAccountSize('');
    setFormDirectAssign(false);
    setFormMaxUsage(100);
    setFormExpiresAt('');
    setFormDescription('');
    setFormSendEmail(false);
    setFormError(null);
    setCreateModalOpen(true);
  };

  const openEditModal = (coupon: any) => {
    setSelectedCoupon(coupon);
    setFormCode(coupon.code);
    setFormDiscount(coupon.discountPercent);
    setFormAudience(coupon.restrictedEmails && coupon.restrictedEmails.length > 0 ? 'RESTRICTED' : 'ALL');
    setFormEmails(coupon.restrictedEmails ? coupon.restrictedEmails.join('\n') : '');
    setFormScope(coupon.restrictedAccountType || coupon.restrictedAccountSize ? 'SPECIFIC' : 'ALL');
    setFormAccountType(coupon.restrictedAccountType || 'ALL');
    setFormAccountSize(coupon.restrictedAccountSize || '');
    setFormDirectAssign(Boolean(coupon.assignedAccountPlan));
    setFormMaxUsage(coupon.maxUsage || '');
    setFormExpiresAt(coupon.expiresAt ? coupon.expiresAt.slice(0, 10) : '');
    setFormDescription(coupon.description || '');
    setFormSendEmail(false);
    setFormError(null);
    setEditModalOpen(true);
  };

  const handleCreateCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setFormError(null);

    const emailList = formAudience === 'RESTRICTED'
      ? formEmails.split(/[\n,]+/).map((e) => e.trim().toLowerCase()).filter(Boolean)
      : [];

    if (formAudience === 'RESTRICTED' && emailList.length === 0) {
      setFormError('Please provide at least one recipient email address for restricted coupon.');
      setSubmitting(false);
      return;
    }

    try {
      await fetchAdminApi('/admin/affiliates/coupons', {
        method: 'POST',
        body: JSON.stringify({
          code: formCode.trim().toUpperCase(),
          discountPercent: Number(formDiscount),
          maxUsage: formMaxUsage ? Number(formMaxUsage) : null,
          expiresAt: formExpiresAt || null,
          restrictedEmails: emailList,
          restrictedAccountType: formScope === 'SPECIFIC' && formAccountType !== 'ALL' ? formAccountType : null,
          restrictedAccountSize: formScope === 'SPECIFIC' && formAccountSize ? Number(formAccountSize) : null,
          assignedAccountPlan: formDirectAssign && formAccountType !== 'ALL' ? formAccountType : null,
          assignedAccountSize: formDirectAssign && formAccountSize ? Number(formAccountSize) : null,
          description: formDescription || null,
          sendEmail: formSendEmail,
        }),
      });

      setCreateModalOpen(false);
      setBannerSuccess(`Coupon ${formCode.toUpperCase()} successfully created${formSendEmail ? ' and emailed to user(s)' : ''}!`);
      setTimeout(() => setBannerSuccess(null), 4000);
      await loadCoupons();
    } catch (err: any) {
      setFormError(err.message || 'Failed to create coupon.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCoupon) return;
    setSubmitting(true);
    setFormError(null);

    const emailList = formAudience === 'RESTRICTED'
      ? formEmails.split(/[\n,]+/).map((e) => e.trim().toLowerCase()).filter(Boolean)
      : [];

    try {
      await fetchAdminApi(`/admin/affiliates/coupons/${selectedCoupon.code}`, {
        method: 'PUT',
        body: JSON.stringify({
          discountPercent: Number(formDiscount),
          maxUsage: formMaxUsage ? Number(formMaxUsage) : null,
          expiresAt: formExpiresAt || null,
          restrictedEmails: emailList,
          restrictedAccountType: formScope === 'SPECIFIC' && formAccountType !== 'ALL' ? formAccountType : null,
          restrictedAccountSize: formScope === 'SPECIFIC' && formAccountSize ? Number(formAccountSize) : null,
          assignedAccountPlan: formDirectAssign && formAccountType !== 'ALL' ? formAccountType : null,
          assignedAccountSize: formDirectAssign && formAccountSize ? Number(formAccountSize) : null,
          description: formDescription || null,
          sendEmail: formSendEmail,
        }),
      });

      setEditModalOpen(false);
      setBannerSuccess(`Coupon ${selectedCoupon.code} updated successfully.`);
      setTimeout(() => setBannerSuccess(null), 3000);
      await loadCoupons();
    } catch (err: any) {
      setFormError(err.message || 'Failed to update coupon.');
    } finally {
      setSubmitting(false);
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

  const handleDeleteCoupon = async (code: string) => {
    if (!confirm(`Are you sure you want to permanently delete and terminate coupon '${code}'?`)) return;
    try {
      await fetchAdminApi(`/admin/affiliates/coupons/${code}`, {
        method: 'DELETE',
      });
      setBannerSuccess(`Coupon ${code} permanently terminated.`);
      setTimeout(() => setBannerSuccess(null), 3000);
      await loadCoupons();
    } catch (err) {
      console.error('Failed to delete coupon:', err);
    }
  };

  const handleCopyLink = (coupon: any) => {
    const plan = coupon.assignedAccountPlan || (coupon.restrictedAccountType !== 'ALL' ? coupon.restrictedAccountType : '');
    const size = coupon.assignedAccountSize || coupon.restrictedAccountSize || '';
    const planParam = plan ? `&plan=${encodeURIComponent(plan)}` : '';
    const sizeParam = size ? `&size=${encodeURIComponent(size)}` : '';
    const link = `${wpBaseUrl}/checkout/?coupon=${encodeURIComponent(coupon.code)}${planParam}${sizeParam}`;

    navigator.clipboard.writeText(link);
    setCopiedLink(coupon.code);
    setTimeout(() => setCopiedLink(null), 2500);
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2500);
  };

  const handleResendEmail = async (coupon: any) => {
    const emails = coupon.restrictedEmails;
    if (!emails || emails.length === 0) {
      alert('This coupon is not tied to any specific email address. Edit the coupon to add recipient emails.');
      return;
    }
    try {
      await fetchAdminApi(`/admin/affiliates/coupons/${coupon.code}/send-email`, {
        method: 'POST',
        body: JSON.stringify({
          emails,
          discountPercent: coupon.discountPercent,
          assignedPlan: coupon.assignedAccountPlan || coupon.restrictedAccountType,
          assignedSize: coupon.assignedAccountSize || coupon.restrictedAccountSize,
        }),
      });
      setBannerSuccess(`Notification email re-sent to ${emails.join(', ')}.`);
      setTimeout(() => setBannerSuccess(null), 3000);
    } catch (err: any) {
      alert(`Failed to send email: ${err.message}`);
    }
  };

  return (
    <>
      <AdminHeader
        title="Promotional Coupons & Account Assignment"
        subtitle="Issue general discounts, 100% free accounts, email-restricted codes, or direct account grants with WordPress checkout integration"
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
              onClick={openCreateModal}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white shadow-md shadow-emerald-900/40 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create Coupon</span>
            </button>
          </div>
        }
      />

      <div className="p-8 space-y-6">
        {bannerSuccess && (
          <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{bannerSuccess}</span>
          </div>
        )}

        {/* Coupons List Table */}
        <div className="rounded-xl bg-[#0f1712] border border-[#1b3322] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#070a08] border-b border-[#1b3322] text-slate-400 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 px-5">Code</th>
                  <th className="py-3.5 px-5">Discount</th>
                  <th className="py-3.5 px-5">Audience & Emails</th>
                  <th className="py-3.5 px-5">Program Scope</th>
                  <th className="py-3.5 px-5">Usage</th>
                  <th className="py-3.5 px-5">Status</th>
                  <th className="py-3.5 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1b3322]/60 text-slate-300">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-500">
                      Loading promotional coupons...
                    </td>
                  </tr>
                ) : coupons.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-500">
                      Zero coupons found. Click &quot;Create Coupon&quot; to issue your first promo or free account code.
                    </td>
                  </tr>
                ) : (
                  coupons.map((c) => (
                    <tr key={c.id} className="hover:bg-[#142119]/50 transition-colors">
                      {/* Code */}
                      <td className="py-3.5 px-5">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-emerald-400 text-sm">{c.code}</span>
                          <button
                            onClick={() => handleCopyCode(c.code)}
                            title="Copy Code"
                            className="text-slate-500 hover:text-white transition"
                          >
                            {copiedCode === c.code ? (
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                        {c.description && (
                          <div className="text-[10px] text-slate-400 mt-0.5">{c.description}</div>
                        )}
                      </td>

                      {/* Discount */}
                      <td className="py-3.5 px-5">
                        {c.discountPercent === 100 ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                            <Gift className="w-3 h-3" />
                            100% FREE ACCOUNT
                          </span>
                        ) : (
                          <span className="font-bold text-white font-mono text-xs">
                            {c.discountPercent}% OFF
                          </span>
                        )}
                      </td>

                      {/* Audience */}
                      <td className="py-3.5 px-5">
                        {c.restrictedEmails && c.restrictedEmails.length > 0 ? (
                          <div className="space-y-0.5">
                            <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded bg-sky-500/10 text-sky-400 border border-sky-500/20 font-mono">
                              <Users className="w-2.5 h-2.5" />
                              {c.restrictedEmails.length} Email(s)
                            </span>
                            <div className="text-[10px] text-slate-400 truncate max-w-[180px]" title={c.restrictedEmails.join(', ')}>
                              {c.restrictedEmails.join(', ')}
                            </div>
                          </div>
                        ) : (
                          <span className="text-[10px] text-slate-400 font-mono">General Public</span>
                        )}
                      </td>

                      {/* Program Scope */}
                      <td className="py-3.5 px-5">
                        {c.assignedAccountPlan ? (
                          <div className="text-[11px] text-amber-300 font-semibold flex items-center gap-1">
                            <span>Assigned: {c.assignedAccountPlan.toUpperCase()}</span>
                            {c.assignedAccountSize && (
                              <span className="font-mono">({formatNaira(c.assignedAccountSize)})</span>
                            )}
                          </div>
                        ) : c.restrictedAccountType || c.restrictedAccountSize ? (
                          <div className="text-[11px] text-slate-300">
                            {c.restrictedAccountType || 'Any Program'}
                            {c.restrictedAccountSize && ` • ${formatNaira(c.restrictedAccountSize)}`}
                          </div>
                        ) : (
                          <span className="text-[10px] text-slate-400">All Challenges</span>
                        )}
                      </td>

                      {/* Usage */}
                      <td className="py-3.5 px-5 font-mono text-xs">
                        <span className="text-white font-bold">{c.usageCount}</span>
                        <span className="text-slate-500"> / {c.maxUsage || '∞'}</span>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-5">
                        <StatusBadge status={c.isActive ? 'ACTIVE' : 'SUSPENDED'} />
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Copy WordPress Checkout Link */}
                          <button
                            onClick={() => handleCopyLink(c)}
                            title="Copy WordPress Purchase Link"
                            className="p-1.5 rounded-lg bg-[#070a08] border border-[#1b3322] text-slate-400 hover:text-emerald-400 hover:border-emerald-500/40 transition"
                          >
                            {copiedLink === c.code ? (
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                              <ExternalLink className="w-3.5 h-3.5" />
                            )}
                          </button>

                          {/* Email notification if emails attached */}
                          {c.restrictedEmails && c.restrictedEmails.length > 0 && (
                            <button
                              onClick={() => handleResendEmail(c)}
                              title="Re-send Email Notification"
                              className="p-1.5 rounded-lg bg-[#070a08] border border-[#1b3322] text-slate-400 hover:text-sky-400 transition"
                            >
                              <Mail className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* Edit Coupon */}
                          <button
                            onClick={() => openEditModal(c)}
                            title="Edit Coupon"
                            className="p-1.5 rounded-lg bg-[#070a08] border border-[#1b3322] text-slate-400 hover:text-white transition"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          {/* Toggle Active / Deactivate */}
                          <button
                            onClick={() => handleToggleCoupon(c.code, c.isActive)}
                            title={c.isActive ? 'Deactivate' : 'Activate'}
                            className={`p-1.5 rounded-lg border transition ${
                              c.isActive
                                ? 'bg-amber-500/10 border-amber-500/20 text-amber-400 hover:bg-amber-500 hover:text-black'
                                : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500 hover:text-black'
                            }`}
                          >
                            <Power className="w-3.5 h-3.5" />
                          </button>

                          {/* Permanent Early Termination / Delete */}
                          <button
                            onClick={() => handleDeleteCoupon(c.code)}
                            title="Permanently Delete / Terminate"
                            className="p-1.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 hover:bg-rose-600 hover:text-white transition"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
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

      {/* CREATE COUPON MODAL */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-lg rounded-2xl bg-[#0f1712] border border-[#1b3322] p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#1b3322] pb-3">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Tag className="w-4 h-4 text-emerald-400" />
                  <span>Create Promotional Coupon</span>
                </h3>
                <p className="text-xs text-slate-400">
                  General use or email-tied coupons with 1% to 100% discount for WordPress and Dashboard checkout.
                </p>
              </div>
            </div>

            {formError && (
              <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-xs text-rose-400 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleCreateCoupon} className="space-y-4 text-xs">
              {/* 1. Code & Quick Discount */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold uppercase text-slate-400 mb-1">
                    Coupon Code
                  </label>
                  <input
                    type="text"
                    value={formCode}
                    onChange={(e) => setFormCode(e.target.value.toUpperCase())}
                    placeholder="e.g. GIANT10, VIPFREE"
                    required
                    className="w-full rounded-lg bg-[#070a08] border border-[#1b3322] px-3 py-2 text-white font-mono uppercase font-bold focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold uppercase text-slate-400 mb-1">
                    Discount Percentage (1% - 100%)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={formDiscount}
                    onChange={(e) => setFormDiscount(Number(e.target.value))}
                    required
                    className="w-full rounded-lg bg-[#070a08] border border-[#1b3322] px-3 py-2 text-white font-mono font-bold focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Quick Preset Buttons */}
              <div className="flex items-center gap-1.5 pt-0.5">
                {[10, 20, 50, 100].map((pct) => (
                  <button
                    key={pct}
                    type="button"
                    onClick={() => setFormDiscount(pct)}
                    className={`px-2.5 py-1 rounded text-[10px] font-bold transition ${
                      formDiscount === pct
                        ? 'bg-emerald-500 text-black'
                        : 'bg-[#070a08] border border-[#1b3322] text-slate-300 hover:text-white'
                    }`}
                  >
                    {pct === 100 ? '100% FREE' : `${pct}% OFF`}
                  </button>
                ))}
              </div>

              {/* 2. Target Audience */}
              <div className="space-y-2 pt-2 border-t border-[#1b3322]">
                <label className="block text-[11px] font-semibold uppercase text-slate-400">
                  Target Audience
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setFormAudience('ALL')}
                    className={`py-2 px-3 rounded-lg border text-center font-semibold transition ${
                      formAudience === 'ALL'
                        ? 'bg-emerald-500/15 border-emerald-500 text-[#00f59b]'
                        : 'bg-[#070a08] border-[#1b3322] text-slate-400'
                    }`}
                  >
                    General Public (Any User)
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormAudience('RESTRICTED')}
                    className={`py-2 px-3 rounded-lg border text-center font-semibold transition ${
                      formAudience === 'RESTRICTED'
                        ? 'bg-emerald-500/15 border-emerald-500 text-[#00f59b]'
                        : 'bg-[#070a08] border-[#1b3322] text-slate-400'
                    }`}
                  >
                    Restricted to Email(s)
                  </button>
                </div>

                {formAudience === 'RESTRICTED' && (
                  <div className="space-y-1 pt-1">
                    <label className="block text-[10px] text-slate-400">
                      Enter user email address(es) (separate multiple by commas or newlines):
                    </label>
                    <textarea
                      rows={3}
                      value={formEmails}
                      onChange={(e) => setFormEmails(e.target.value)}
                      placeholder="trader@gmail.com, investor@yahoo.com"
                      required
                      className="w-full rounded-lg bg-[#070a08] border border-[#1b3322] p-2.5 text-white font-mono text-xs focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                )}
              </div>

              {/* 3. Account Scope & Direct Assignment */}
              <div className="space-y-2 pt-2 border-t border-[#1b3322]">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-semibold uppercase text-slate-400">
                    Challenge Program & Capital Restriction
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer text-[10px] text-amber-300 font-semibold">
                    <input
                      type="checkbox"
                      checked={formDirectAssign}
                      onChange={(e) => {
                        setFormDirectAssign(e.target.checked);
                        if (e.target.checked) setFormScope('SPECIFIC');
                      }}
                      className="accent-amber-500 rounded"
                    />
                    <span>Direct Account Assignment</span>
                  </label>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setFormScope('ALL');
                      setFormDirectAssign(false);
                    }}
                    className={`py-2 px-3 rounded-lg border text-center font-semibold transition ${
                      formScope === 'ALL'
                        ? 'bg-emerald-500/15 border-emerald-500 text-[#00f59b]'
                        : 'bg-[#070a08] border-[#1b3322] text-slate-400'
                    }`}
                  >
                    All Programs & Sizes
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormScope('SPECIFIC')}
                    className={`py-2 px-3 rounded-lg border text-center font-semibold transition ${
                      formScope === 'SPECIFIC'
                        ? 'bg-emerald-500/15 border-emerald-500 text-[#00f59b]'
                        : 'bg-[#070a08] border-[#1b3322] text-slate-400'
                    }`}
                  >
                    Specific Program & Size
                  </button>
                </div>

                {formScope === 'SPECIFIC' && (
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="block text-[10px] text-slate-400 mb-1">Challenge Program</label>
                      <select
                        value={formAccountType}
                        onChange={(e) => setFormAccountType(e.target.value)}
                        className="w-full rounded-lg bg-[#070a08] border border-[#1b3322] px-3 py-2 text-white font-mono"
                      >
                        <option value="ALL">Any Program</option>
                        <option value="rhino-rush">Rhino Rush (1-Step)</option>
                        <option value="phoenix-rise">Phoenix Rise (Instant)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] text-slate-400 mb-1">Account Capital</label>
                      <select
                        value={formAccountSize}
                        onChange={(e) => setFormAccountSize(e.target.value ? Number(e.target.value) : '')}
                        className="w-full rounded-lg bg-[#070a08] border border-[#1b3322] px-3 py-2 text-white font-mono"
                      >
                        <option value="">Any Size</option>
                        <option value="1000000">₦1,000,000</option>
                        <option value="2500000">₦2,500,000</option>
                        <option value="5000000">₦5,000,000</option>
                        <option value="10000000">₦10,000,000</option>
                        <option value="25000000">₦25,000,000</option>
                        <option value="50000000">₦50,000,000</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>

              {/* 4. Limits & Notifications */}
              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-[#1b3322]">
                <div>
                  <label className="block text-[10px] text-slate-400 mb-1">Max Usages</label>
                  <input
                    type="number"
                    min="1"
                    value={formMaxUsage}
                    onChange={(e) => setFormMaxUsage(e.target.value ? Number(e.target.value) : '')}
                    placeholder="Unlimited if blank"
                    className="w-full rounded-lg bg-[#070a08] border border-[#1b3322] px-3 py-2 text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[10px] text-slate-400 mb-1">Expiration Date (Optional)</label>
                  <input
                    type="date"
                    value={formExpiresAt}
                    onChange={(e) => setFormExpiresAt(e.target.value)}
                    className="w-full rounded-lg bg-[#070a08] border border-[#1b3322] px-3 py-2 text-white font-mono"
                  />
                </div>
              </div>

              {/* Email Dispatch Checkbox */}
              {formAudience === 'RESTRICTED' && (
                <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between">
                  <div>
                    <div className="font-bold text-white text-[11px]">Dispatch Email to User(s)</div>
                    <div className="text-[10px] text-slate-400">
                      Sends coupon code and direct WordPress checkout link immediately upon creation
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={formSendEmail}
                    onChange={(e) => setFormSendEmail(e.target.checked)}
                    className="w-4 h-4 accent-emerald-500 rounded cursor-pointer"
                  />
                </div>
              )}

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#1b3322]">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-transparent text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold shadow-md shadow-emerald-900/40 active:scale-95 transition"
                >
                  {submitting ? 'Creating...' : 'Create & Issue Coupon'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT COUPON MODAL */}
      {editModalOpen && selectedCoupon && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-lg rounded-2xl bg-[#0f1712] border border-[#1b3322] p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#1b3322] pb-3">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Edit2 className="w-4 h-4 text-emerald-400" />
                  <span>Edit Coupon: {selectedCoupon.code}</span>
                </h3>
                <p className="text-xs text-slate-400">
                  Modify discount parameters, add or remove emails, change programs, or adjust limits.
                </p>
              </div>
            </div>

            {formError && (
              <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-xs text-rose-400 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleUpdateCoupon} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold uppercase text-slate-400 mb-1">
                    Coupon Code
                  </label>
                  <input
                    type="text"
                    value={formCode}
                    disabled
                    className="w-full rounded-lg bg-[#070a08]/60 border border-[#1b3322] px-3 py-2 text-slate-400 font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold uppercase text-slate-400 mb-1">
                    Discount Percentage (%)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={formDiscount}
                    onChange={(e) => setFormDiscount(Number(e.target.value))}
                    required
                    className="w-full rounded-lg bg-[#070a08] border border-[#1b3322] px-3 py-2 text-white font-mono font-bold focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Emails */}
              <div className="space-y-1">
                <label className="block text-[11px] font-semibold uppercase text-slate-400">
                  Restricted Emails (Leave blank for general public)
                </label>
                <textarea
                  rows={3}
                  value={formEmails}
                  onChange={(e) => setFormEmails(e.target.value)}
                  placeholder="email1@example.com, email2@example.com"
                  className="w-full rounded-lg bg-[#070a08] border border-[#1b3322] p-2.5 text-white font-mono text-xs focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Program Scope */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] text-slate-400 mb-1">Program</label>
                  <select
                    value={formAccountType}
                    onChange={(e) => setFormAccountType(e.target.value)}
                    className="w-full rounded-lg bg-[#070a08] border border-[#1b3322] px-3 py-2 text-white font-mono"
                  >
                    <option value="ALL">Any Program</option>
                    <option value="rhino-rush">Rhino Rush (1-Step)</option>
                    <option value="phoenix-rise">Phoenix Rise (Instant)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] text-slate-400 mb-1">Account Capital</label>
                  <select
                    value={formAccountSize}
                    onChange={(e) => setFormAccountSize(e.target.value ? Number(e.target.value) : '')}
                    className="w-full rounded-lg bg-[#070a08] border border-[#1b3322] px-3 py-2 text-white font-mono"
                  >
                    <option value="">Any Size</option>
                    <option value="1000000">₦1,000,000</option>
                    <option value="2500000">₦2,500,000</option>
                    <option value="5000000">₦5,000,000</option>
                    <option value="10000000">₦10,000,000</option>
                    <option value="25000000">₦25,000,000</option>
                    <option value="50000000">₦50,000,000</option>
                  </select>
                </div>
              </div>

              {/* Usage & Expiry */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] text-slate-400 mb-1">Max Usages</label>
                  <input
                    type="number"
                    min="1"
                    value={formMaxUsage}
                    onChange={(e) => setFormMaxUsage(e.target.value ? Number(e.target.value) : '')}
                    className="w-full rounded-lg bg-[#070a08] border border-[#1b3322] px-3 py-2 text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[10px] text-slate-400 mb-1">Expiration Date</label>
                  <input
                    type="date"
                    value={formExpiresAt}
                    onChange={(e) => setFormExpiresAt(e.target.value)}
                    className="w-full rounded-lg bg-[#070a08] border border-[#1b3322] px-3 py-2 text-white font-mono"
                  />
                </div>
              </div>

              <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between">
                <div>
                  <div className="font-bold text-white text-[11px]">Send Updated Notification Email</div>
                  <div className="text-[10px] text-slate-400">
                    Dispatches the WordPress purchase link to the attached recipient emails
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={formSendEmail}
                  onChange={(e) => setFormSendEmail(e.target.checked)}
                  className="w-4 h-4 accent-emerald-500 rounded cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#1b3322]">
                <button
                  type="button"
                  onClick={() => setEditModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-transparent text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold shadow-md shadow-emerald-900/40 active:scale-95 transition"
                >
                  {submitting ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
