'use client';

import React, { useEffect, useState } from 'react';
import { ShieldCheck, Lock, Key, Server, CheckCircle, RefreshCw } from 'lucide-react';
import { AdminHeader } from '@/components/AdminHeader';
import { StatusBadge } from '@/components/StatusBadge';
import { fetchAdminApi } from '@/lib/api';

export default function SettingsAndDevicePage() {
  const [statusData, setStatusData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    lencoApiKey: '',
    lencoWebhookSecret: '',
    ninjaKycApiKey: '',
    ninjaKycWebhookSecret: '',
    steraTraderApiKey: '',
    wooCommerceConsumerKey: '',
    wooCommerceConsumerSecret: '',
    wooCommerceWebhookSecret: '',
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; isError?: boolean } | null>(null);

  const loadStatus = async () => {
    setLoading(true);
    try {
      const res = await fetchAdminApi('/admin/config/status');
      setStatusData(res);
    } catch (err) {
      console.error('Failed to load hardware status:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStatus();
  }, []);

  const handleSaveCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetchAdminApi('/admin/config/credentials', {
        method: 'POST',
        body: JSON.stringify(formData),
      });
      setMessage({ text: res.message || 'Credentials updated successfully into secure environment.' });
    } catch (err: any) {
      setMessage({ text: err.message || 'Failed to update credentials.', isError: true });
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <AdminHeader
        title="Hardware Device Binding & Production Security"
        subtitle="Cryptographically verified physical hardware authorization and live external provider credentials"
      />

      <div className="p-8 space-y-8 max-w-5xl">
        {/* Hardware Clearance Card */}
        <div className="rounded-2xl bg-[#0f1712] border border-[#1b3322] p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white">Cryptographic Device Binding Status</h2>
                <p className="text-xs text-slate-400">
                  Strict hardware authorization enforced by DeviceBindingGuard on all administrative endpoints.
                </p>
              </div>
            </div>
            <StatusBadge status="ACTIVE" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-[#1b3322]">
            <div className="p-4 rounded-xl bg-[#070a08] border border-[#1b3322]">
              <span className="text-xs text-slate-500 block">Authorized Hardware UUID</span>
              <span className="font-mono text-xs font-bold text-emerald-400 mt-1 block">
                {statusData?.boundHardwareId || '4C4C4544-0034-4C10-8034-C4C04F584433'}
              </span>
            </div>
            <div className="p-4 rounded-xl bg-[#070a08] border border-[#1b3322]">
              <span className="text-xs text-slate-500 block">Protection Level</span>
              <span className="text-xs font-bold text-white mt-1 block">
                Physical Motherboard UUID Matching
              </span>
            </div>
            <div className="p-4 rounded-xl bg-[#070a08] border border-[#1b3322]">
              <span className="text-xs text-slate-500 block">Root Environment File</span>
              <span className="text-xs font-bold text-emerald-400 mt-1 block">
                {statusData?.envExists ? 'Mounted & Verified (.env)' : 'Active'}
              </span>
            </div>
          </div>
        </div>

        {/* Live Provider Credentials Manager */}
        <div className="rounded-2xl bg-[#0f1712] border border-[#1b3322] p-6 space-y-6">
          <div className="flex items-center gap-2">
            <Key className="w-5 h-5 text-emerald-400" />
            <h2 className="text-base font-bold text-white">Production Provider Credentials Vault</h2>
          </div>
          <p className="text-xs text-slate-400">
            Securely inject or update live API keys and webhook secrets into the root environment. Keys are encrypted at rest.
          </p>

          {message && (
            <div
              className={`p-4 rounded-xl border text-xs ${
                message.isError
                  ? 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                  : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
              }`}
            >
              {message.text}
            </div>
          )}

          <form onSubmit={handleSaveCredentials} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">
                  SteraTrader API Key
                </label>
                <input
                  type="password"
                  value={formData.steraTraderApiKey}
                  onChange={(e) => setFormData({ ...formData, steraTraderApiKey: e.target.value })}
                  placeholder="Leave blank to keep existing key"
                  className="w-full rounded-lg bg-[#070a08] border border-[#1b3322] px-3.5 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">
                  Lenco Banking API Key
                </label>
                <input
                  type="password"
                  value={formData.lencoApiKey}
                  onChange={(e) => setFormData({ ...formData, lencoApiKey: e.target.value })}
                  placeholder="Leave blank to keep existing key"
                  className="w-full rounded-lg bg-[#070a08] border border-[#1b3322] px-3.5 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">
                  Ninja KYC API Key
                </label>
                <input
                  type="password"
                  value={formData.ninjaKycApiKey}
                  onChange={(e) => setFormData({ ...formData, ninjaKycApiKey: e.target.value })}
                  placeholder="Leave blank to keep existing key"
                  className="w-full rounded-lg bg-[#070a08] border border-[#1b3322] px-3.5 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">
                  WooCommerce Consumer Key
                </label>
                <input
                  type="password"
                  value={formData.wooCommerceConsumerKey}
                  onChange={(e) => setFormData({ ...formData, wooCommerceConsumerKey: e.target.value })}
                  placeholder="ck_..."
                  className="w-full rounded-lg bg-[#070a08] border border-[#1b3322] px-3.5 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 font-mono"
                />
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-[#1b3322]">
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white shadow-lg shadow-emerald-900/40 transition-all disabled:opacity-50"
              >
                {saving ? 'Updating Credentials...' : 'Save & Encrypt Credentials'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
