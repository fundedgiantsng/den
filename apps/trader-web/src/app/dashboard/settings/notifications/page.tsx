'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Bell,
  Mail,
  MessageSquare,
  Smartphone,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Save,
  ArrowLeft,
  Calendar,
  DollarSign,
  Info,
} from 'lucide-react';
import { formatNaira } from '@/lib/format';

interface Preferences {
  inApp: boolean;
  email: boolean;
  sms: boolean;
  whatsapp: boolean;
  tradingAlerts: boolean;
  financeAlerts: boolean;
  securityAlerts: boolean;
  marketingAlerts: boolean;
}

interface AccruedFees {
  billingMonth: string;
  totalNgn: number;
  unbilledDispatchesCount: number;
  breakdown: {
    emailCount: number;
    smsCount: number;
    whatsappCount: number;
    inAppCount: number;
  };
}

export default function NotificationSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [prefs, setPrefs] = useState<Preferences>({
    inApp: true,
    email: true,
    sms: false,
    whatsapp: false,
    tradingAlerts: true,
    financeAlerts: true,
    securityAlerts: true,
    marketingAlerts: false,
  });

  const [accrued, setAccrued] = useState<AccruedFees>({
    billingMonth: new Date().toISOString().slice(0, 7),
    totalNgn: 0,
    unbilledDispatchesCount: 0,
    breakdown: {
      emailCount: 0,
      smsCount: 0,
      whatsappCount: 0,
      inAppCount: 0,
    },
  });

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

  useEffect(() => {
    async function fetchSettings() {
      setLoading(true);
      try {
        const [resPrefs, resAccrued] = await Promise.all([
          fetch(`${apiUrl}/api/v1/notifications/preferences`, { credentials: 'include' }),
          fetch(`${apiUrl}/api/v1/notifications/accrued-fees`, { credentials: 'include' }),
        ]);

        if (resPrefs.ok) {
          const data = await resPrefs.json();
          if (data?.data) {
            setPrefs({
              inApp: data.data.inApp ?? true,
              email: data.data.email ?? true,
              sms: data.data.sms ?? false,
              whatsapp: data.data.whatsapp ?? false,
              tradingAlerts: data.data.tradingAlerts ?? true,
              financeAlerts: data.data.financeAlerts ?? true,
              securityAlerts: data.data.securityAlerts ?? true,
              marketingAlerts: data.data.marketingAlerts ?? false,
            });
          }
        }

        if (resAccrued.ok) {
          const data = await resAccrued.json();
          if (data?.data) {
            setAccrued(data.data);
          }
        }
      } catch (err: any) {
        console.error('Failed to load notification settings:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchSettings();
  }, [apiUrl]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch(`${apiUrl}/api/v1/notifications/preferences`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(prefs),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to update preferences.');
      }

      setSuccess('Notification preferences saved successfully!');
      setTimeout(() => setSuccess(null), 3500);
    } catch (err: any) {
      setError(err.message || 'Failed to save preferences.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-16">
      {/* Back button & Heading */}
      <div>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-xs text-neutral-400 hover:text-white mb-2 transition"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Dashboard</span>
        </Link>
        <h1 className="text-2xl sm:text-3xl font-heading font-extrabold text-white tracking-tight flex items-center gap-2.5">
          <Bell className="w-7 h-7 text-emerald-400" />
          <span>Notification & Alert Settings</span>
        </h1>
        <p className="text-xs sm:text-sm text-neutral-400 mt-1">
          Customize your delivery channels and alert triggers. Operational notifications accrue monthly and are charged to your Giants Vault.
        </p>
      </div>

      {success && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center gap-3 text-xs text-emerald-400">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center gap-3 text-xs text-red-400">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Monthly Accrued Fees Summary Card */}
      <div className="p-6 rounded-2xl bg-[#09120e] border border-emerald-500/20 shadow-xl relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/[0.08]">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-emerald-400">
              <Calendar className="w-4 h-4" />
              <span>Current Cycle: {accrued.billingMonth}</span>
            </div>
            <h2 className="text-lg font-bold text-white mt-1">Accrued Operational Fees</h2>
          </div>
          <div className="text-left sm:text-right">
            <span className="text-xs text-neutral-400 block">Total Accrued (Month-End Charge)</span>
            <span className="text-2xl font-mono font-extrabold text-emerald-400">
              {formatNaira(accrued.totalNgn)}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 text-xs">
          <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.05]">
            <span className="text-neutral-400 block text-[11px]">In-App (Bell)</span>
            <span className="text-sm font-bold text-white mt-0.5 block">
              {accrued.breakdown.inAppCount} sent
            </span>
            <span className="text-[10px] text-emerald-400 font-semibold">₦0 / Always Free</span>
          </div>

          <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.05]">
            <span className="text-neutral-400 block text-[11px]">Email Dispatches</span>
            <span className="text-sm font-bold text-white mt-0.5 block">
              {accrued.breakdown.emailCount} sent
            </span>
            <span className="text-[10px] text-neutral-400">₦10 per dispatch</span>
          </div>

          <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.05]">
            <span className="text-neutral-400 block text-[11px]">SMS Dispatches</span>
            <span className="text-sm font-bold text-white mt-0.5 block">
              {accrued.breakdown.smsCount} sent
            </span>
            <span className="text-[10px] text-neutral-400">₦10 per dispatch</span>
          </div>

          <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.05]">
            <span className="text-neutral-400 block text-[11px]">WhatsApp Alerts</span>
            <span className="text-sm font-bold text-white mt-0.5 block">
              {accrued.breakdown.whatsappCount} sent
            </span>
            <span className="text-[10px] text-neutral-400">₦25 per dispatch</span>
          </div>
        </div>

        <div className="mt-4 p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/15 flex items-start gap-2.5 text-[11px] text-neutral-300">
          <Info className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            <span className="text-white font-semibold">Transparent Billing Policy:</span> Initial registration and login OTPs are 100% sponsored by FundedGiants (₦0). Operational notifications accrue during the month and are billed to your Central Giants Vault on the 1st of each calendar month.
          </p>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Delivery Channels */}
        <div className="p-6 rounded-2xl bg-[#09120e] border border-white/[0.08] space-y-4 shadow-xl">
          <div className="border-b border-white/[0.08] pb-3">
            <h3 className="text-base font-bold text-white">Delivery Channels</h3>
            <p className="text-xs text-neutral-400 mt-0.5">
              Select where you want to receive operational alerts and account notifications.
            </p>
          </div>

          <div className="space-y-3">
            {/* In-App */}
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.06]">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400">
                  <Bell className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-white">In-App Notifications</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400">
                      Free (Default)
                    </span>
                  </div>
                  <p className="text-xs text-neutral-400 mt-0.5">
                    Real-time alerts in your trader dashboard and mobile drawer.
                  </p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={prefs.inApp}
                disabled
                className="w-4 h-4 accent-emerald-500 rounded cursor-not-allowed opacity-80"
              />
            </div>

            {/* Email */}
            <label className="flex items-center justify-between p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:border-white/[0.15] cursor-pointer transition">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-400">
                  <Mail className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-white">Branded Email</span>
                    <span className="text-[11px] text-neutral-400">₦10 / dispatch</span>
                  </div>
                  <p className="text-xs text-neutral-400 mt-0.5">
                    Official challenge passes, credentials, breach warnings, and receipts.
                  </p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={prefs.email}
                onChange={(e) => setPrefs({ ...prefs, email: e.target.checked })}
                className="w-4 h-4 accent-emerald-500 rounded cursor-pointer"
              />
            </label>

            {/* SMS */}
            <label className="flex items-center justify-between p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:border-white/[0.15] cursor-pointer transition">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-400">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-white">Direct SMS</span>
                    <span className="text-[11px] text-neutral-400">₦10 / dispatch</span>
                  </div>
                  <p className="text-xs text-neutral-400 mt-0.5">
                    Critical phone alerts for daily drawdown limits and urgent payouts.
                  </p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={prefs.sms}
                onChange={(e) => setPrefs({ ...prefs, sms: e.target.checked })}
                className="w-4 h-4 accent-emerald-500 rounded cursor-pointer"
              />
            </label>

            {/* WhatsApp */}
            <label className="flex items-center justify-between p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:border-white/[0.15] cursor-pointer transition">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-white">WhatsApp Direct</span>
                    <span className="text-[11px] text-neutral-400">₦25 / dispatch</span>
                  </div>
                  <p className="text-xs text-neutral-400 mt-0.5">
                    Instant interactive alerts directly to your registered WhatsApp number.
                  </p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={prefs.whatsapp}
                onChange={(e) => setPrefs({ ...prefs, whatsapp: e.target.checked })}
                className="w-4 h-4 accent-emerald-500 rounded cursor-pointer"
              />
            </label>
          </div>
        </div>

        {/* Alert Categories */}
        <div className="p-6 rounded-2xl bg-[#09120e] border border-white/[0.08] space-y-4 shadow-xl">
          <div className="border-b border-white/[0.08] pb-3">
            <h3 className="text-base font-bold text-white">Notification Categories</h3>
            <p className="text-xs text-neutral-400 mt-0.5">
              Control the specific events that trigger notifications.
            </p>
          </div>

          <div className="space-y-3">
            <label className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:border-white/[0.12] cursor-pointer">
              <div>
                <span className="text-xs font-semibold text-white block">Trading & Risk Alerts</span>
                <span className="text-[11px] text-neutral-400">
                  3% drawdown warnings, 4% equity breaches, Phase pass certifications, account locking.
                </span>
              </div>
              <input
                type="checkbox"
                checked={prefs.tradingAlerts}
                onChange={(e) => setPrefs({ ...prefs, tradingAlerts: e.target.checked })}
                className="w-4 h-4 accent-emerald-500 rounded cursor-pointer"
              />
            </label>

            <label className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:border-white/[0.12] cursor-pointer">
              <div>
                <span className="text-xs font-semibold text-white block">Financial & Wallet Alerts</span>
                <span className="text-[11px] text-neutral-400">
                  Inward deposits, overage credits, profit payout approvals, and bank disbursements.
                </span>
              </div>
              <input
                type="checkbox"
                checked={prefs.financeAlerts}
                onChange={(e) => setPrefs({ ...prefs, financeAlerts: e.target.checked })}
                className="w-4 h-4 accent-emerald-500 rounded cursor-pointer"
              />
            </label>

            <label className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:border-white/[0.12] cursor-pointer">
              <div>
                <span className="text-xs font-semibold text-white block">Security & Authentication</span>
                <span className="text-[11px] text-neutral-400">
                  Password changes, new device logins, and session notifications.
                </span>
              </div>
              <input
                type="checkbox"
                checked={prefs.securityAlerts}
                onChange={(e) => setPrefs({ ...prefs, securityAlerts: e.target.checked })}
                className="w-4 h-4 accent-emerald-500 rounded cursor-pointer"
              />
            </label>

            <label className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:border-white/[0.12] cursor-pointer">
              <div>
                <span className="text-xs font-semibold text-white block">Platform News & Competitions</span>
                <span className="text-[11px] text-neutral-400">
                  Prop trading challenges, trading leaderboards, and promotion announcements.
                </span>
              </div>
              <input
                type="checkbox"
                checked={prefs.marketingAlerts}
                onChange={(e) => setPrefs({ ...prefs, marketingAlerts: e.target.checked })}
                className="w-4 h-4 accent-emerald-500 rounded cursor-pointer"
              />
            </label>
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={saving}
            className="w-full sm:w-auto px-8 py-3 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-black text-xs font-bold rounded-xl transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Saving Preferences...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Save Notification Preferences</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
