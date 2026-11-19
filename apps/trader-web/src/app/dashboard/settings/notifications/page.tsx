'use client';

import { API_BASE_URL } from '@/lib/api';
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
  Check,
  X,
  Zap,
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

  const apiUrl = API_BASE_URL;

  useEffect(() => {
    async function fetchSettings() {
      setLoading(true);
      try {
        const [resPrefs, resAccrued] = await Promise.all([
          fetch(`${API_BASE_URL}/notifications/preferences`, { credentials: 'include' }),
          fetch(`${API_BASE_URL}/notifications/accrued-fees`, { credentials: 'include' }),
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
      const res = await fetch(`${API_BASE_URL}/notifications/preferences`, {
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
          Customize delivery channels and configure alert triggers. Operational notifications accrue monthly and are charged to your Giants Vault.
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
        {/* Table 1: Delivery Channels & Fee Schedule */}
        <div className="p-6 rounded-2xl bg-[#09120e] border border-white/[0.08] shadow-xl overflow-hidden space-y-4">
          <div className="border-b border-white/[0.08] pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-base font-bold text-white">Delivery Channels & Fee Schedule</h3>
              <p className="text-xs text-neutral-400 mt-0.5">
                Toggle channels to activate operational dispatches. Fees are billed at the end of each calendar month.
              </p>
            </div>
            <span className="text-[11px] font-mono px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 self-start sm:self-auto font-semibold">
              Month-End Billing
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-white/[0.08] text-neutral-400 uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-3">Channel</th>
                  <th className="py-3 px-3">Unit Cost</th>
                  <th className="py-3 px-3">Billing Schedule</th>
                  <th className="py-3 px-3">Speed</th>
                  <th className="py-3 px-3 text-right">Status / Toggle</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.05]">
                {/* In-App */}
                <tr className="hover:bg-white/[0.02] transition">
                  <td className="py-3.5 px-3">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
                        <Bell className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="font-bold text-white block">In-App Alerts</span>
                        <span className="text-[10px] text-neutral-400">Trader dashboard bell & drawer</span>
                      </div>
                    </div>
                  </td>
                  <td className="py-3.5 px-3">
                    <span className="font-mono font-bold text-emerald-400">₦0.00</span>
                  </td>
                  <td className="py-3.5 px-3 text-neutral-300">Always Free</td>
                  <td className="py-3.5 px-3 text-neutral-400">Instant</td>
                  <td className="py-3.5 px-3 text-right">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold">
                      <Check className="w-3 h-3" />
                      Always Active
                    </span>
                  </td>
                </tr>

                {/* Email */}
                <tr className="hover:bg-white/[0.02] transition">
                  <td className="py-3.5 px-3">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
                        <Mail className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="font-bold text-white block">Branded Email</span>
                        <span className="text-[10px] text-neutral-400">Pass certificates, receipts & reports</span>
                      </div>
                    </div>
                  </td>
                  <td className="py-3.5 px-3">
                    <span className="font-mono font-bold text-white">₦10.00</span>
                    <span className="text-[10px] text-neutral-500 block">per dispatch</span>
                  </td>
                  <td className="py-3.5 px-3 text-neutral-300">Billed 1st of month to Vault</td>
                  <td className="py-3.5 px-3 text-neutral-400">High Priority</td>
                  <td className="py-3.5 px-3 text-right">
                    <button
                      type="button"
                      onClick={() => setPrefs({ ...prefs, email: !prefs.email })}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                        prefs.email ? 'bg-emerald-500' : 'bg-neutral-800 border border-white/10'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-black transition-transform ${
                          prefs.email ? 'translate-x-6' : 'translate-x-1 bg-neutral-400'
                        }`}
                      />
                    </button>
                  </td>
                </tr>

                {/* SMS */}
                <tr className="hover:bg-white/[0.02] transition">
                  <td className="py-3.5 px-3">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400">
                        <Smartphone className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="font-bold text-white block">Direct SMS</span>
                        <span className="text-[10px] text-neutral-400">Urgent drawdown warnings & alerts</span>
                      </div>
                    </div>
                  </td>
                  <td className="py-3.5 px-3">
                    <span className="font-mono font-bold text-white">₦10.00</span>
                    <span className="text-[10px] text-neutral-500 block">per dispatch</span>
                  </td>
                  <td className="py-3.5 px-3 text-neutral-300">Billed 1st of month to Vault</td>
                  <td className="py-3.5 px-3 text-neutral-400">Immediate Telco</td>
                  <td className="py-3.5 px-3 text-right">
                    <button
                      type="button"
                      onClick={() => setPrefs({ ...prefs, sms: !prefs.sms })}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                        prefs.sms ? 'bg-emerald-500' : 'bg-neutral-800 border border-white/10'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-black transition-transform ${
                          prefs.sms ? 'translate-x-6' : 'translate-x-1 bg-neutral-400'
                        }`}
                      />
                    </button>
                  </td>
                </tr>

                {/* WhatsApp */}
                <tr className="hover:bg-white/[0.02] transition">
                  <td className="py-3.5 px-3">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
                        <MessageSquare className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="font-bold text-white block">WhatsApp Direct</span>
                        <span className="text-[10px] text-neutral-400">Interactive bot & instant alerts</span>
                      </div>
                    </div>
                  </td>
                  <td className="py-3.5 px-3">
                    <span className="font-mono font-bold text-white">₦25.00</span>
                    <span className="text-[10px] text-neutral-500 block">per dispatch</span>
                  </td>
                  <td className="py-3.5 px-3 text-neutral-300">Billed 1st of month to Vault</td>
                  <td className="py-3.5 px-3 text-neutral-400">Instant WhatsApp</td>
                  <td className="py-3.5 px-3 text-right">
                    <button
                      type="button"
                      onClick={() => setPrefs({ ...prefs, whatsapp: !prefs.whatsapp })}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                        prefs.whatsapp ? 'bg-emerald-500' : 'bg-neutral-800 border border-white/10'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-black transition-transform ${
                          prefs.whatsapp ? 'translate-x-6' : 'translate-x-1 bg-neutral-400'
                        }`}
                      />
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Table 2: Notification Event Triggers */}
        <div className="p-6 rounded-2xl bg-[#09120e] border border-white/[0.08] shadow-xl space-y-4">
          <div className="border-b border-white/[0.08] pb-3">
            <h3 className="text-base font-bold text-white">Operational Event Triggers</h3>
            <p className="text-xs text-neutral-400 mt-0.5">
              Specify which system events dispatch notifications to your enabled channels.
            </p>
          </div>

          <div className="space-y-3">
            {/* Trigger 1: Trading & Risk */}
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.06]">
              <div className="max-w-xl">
                <span className="text-xs font-bold text-white block">Trading & Risk Engine Alerts</span>
                <span className="text-[11px] text-neutral-400 leading-relaxed block mt-0.5">
                  Critical 3% equity drawdown warning, 4% equity daily breach, max static trailing breach, and SteraTrader account lockouts.
                </span>
              </div>
              <button
                type="button"
                onClick={() => setPrefs({ ...prefs, tradingAlerts: !prefs.tradingAlerts })}
                className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus:outline-none ${
                  prefs.tradingAlerts ? 'bg-emerald-500' : 'bg-neutral-800 border border-white/10'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-black transition-transform ${
                    prefs.tradingAlerts ? 'translate-x-6' : 'translate-x-1 bg-neutral-400'
                  }`}
                />
              </button>
            </div>

            {/* Trigger 2: Finance & Wallet */}
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.06]">
              <div className="max-w-xl">
                <span className="text-xs font-bold text-white block">Finance & Vault Transactions</span>
                <span className="text-[11px] text-neutral-400 leading-relaxed block mt-0.5">
                  Inward virtual account deposits, surplus overpayment adjustments, profit payout approvals, and bank transfer credits.
                </span>
              </div>
              <button
                type="button"
                onClick={() => setPrefs({ ...prefs, financeAlerts: !prefs.financeAlerts })}
                className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus:outline-none ${
                  prefs.financeAlerts ? 'bg-emerald-500' : 'bg-neutral-800 border border-white/10'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-black transition-transform ${
                    prefs.financeAlerts ? 'translate-x-6' : 'translate-x-1 bg-neutral-400'
                  }`}
                />
              </button>
            </div>

            {/* Trigger 3: Security & Identity */}
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.06]">
              <div className="max-w-xl">
                <span className="text-xs font-bold text-white block">Security & Identity Verifications</span>
                <span className="text-[11px] text-neutral-400 leading-relaxed block mt-0.5">
                  FundedGiants KYC approvals, new device authorizations, and session security updates.
                </span>
              </div>
              <button
                type="button"
                onClick={() => setPrefs({ ...prefs, securityAlerts: !prefs.securityAlerts })}
                className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus:outline-none ${
                  prefs.securityAlerts ? 'bg-emerald-500' : 'bg-neutral-800 border border-white/10'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-black transition-transform ${
                    prefs.securityAlerts ? 'translate-x-6' : 'translate-x-1 bg-neutral-400'
                  }`}
                />
              </button>
            </div>

            {/* Trigger 4: Platform Announcements */}
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.06]">
              <div className="max-w-xl">
                <span className="text-xs font-bold text-white block">Platform Updates & Announcements</span>
                <span className="text-[11px] text-neutral-400 leading-relaxed block mt-0.5">
                  Official system maintenance schedules, new challenge tiers, and holiday trading hours.
                </span>
              </div>
              <button
                type="button"
                onClick={() => setPrefs({ ...prefs, marketingAlerts: !prefs.marketingAlerts })}
                className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus:outline-none ${
                  prefs.marketingAlerts ? 'bg-emerald-500' : 'bg-neutral-800 border border-white/10'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-black transition-transform ${
                    prefs.marketingAlerts ? 'translate-x-6' : 'translate-x-1 bg-neutral-400'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Submit CTA */}
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
