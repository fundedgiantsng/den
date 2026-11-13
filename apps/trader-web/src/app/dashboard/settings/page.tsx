'use client';

import React, { useState, useEffect } from 'react';
import { KeyRound, ShieldAlert, CheckCircle2, Lock, Save, Loader2, AlertCircle } from 'lucide-react';
import Image from 'next/image';

export default function AdminSettingsPage() {
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [deviceStatus, setDeviceStatus] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [credentials, setCredentials] = useState({
    lencoApiKey: '',
    lencoWebhookSecret: '',
    ninjaKycApiKey: '',
    ninjaKycWebhookSecret: '',
    robaseApiKey: '',
    steraTraderApiKey: '',
    wooCommerceConsumerKey: '',
    wooCommerceConsumerSecret: '',
    wooCommerceWebhookSecret: '',
  });

  useEffect(() => {
    async function checkStatus() {
      try {
        const res = await fetch('http://localhost:4000/api/v1/admin/config/status');
        const data = await res.json();
        setDeviceStatus(data);
      } catch (err) {
        console.error('Failed to query device status', err);
      } finally {
        setLoadingStatus(false);
      }
    }
    checkStatus();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const res = await fetch('http://localhost:4000/api/v1/admin/config/credentials', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-device-fingerprint': deviceStatus?.boundHardwareId || '',
        },
        body: JSON.stringify(credentials),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to update credentials.');
      }

      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Failed to save credentials.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8 max-w-4xl pb-12">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-red-500/10 text-red-400 border border-red-500/20">
            Air-Gapped Admin Console
          </span>
          <span className="text-xs text-fgText-muted">Hardware Bound & Device Isolated</span>
        </div>
        <h1 className="text-2xl md:text-3xl font-heading font-extrabold text-white tracking-tight">
          Live API Credentials & Environment
        </h1>
        <p className="text-xs text-fgText-secondary mt-1">
          Directly load live production API credentials into the application <code className="text-emerald-400">.env</code>. Only requests originating from this approved, hardware-bound device are permitted to write environment changes.
        </p>
      </div>

      {/* Device Binding Status Card */}
      <div className="p-5 rounded-2xl bg-bg-surface border border-fgBorder-subtle flex items-start gap-4">
        <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400">
          <Lock className="w-5 h-5" />
        </div>
        <div className="space-y-1">
          <span className="text-xs font-bold text-white block">Approved Primary Hardware Device</span>
          <p className="text-[11px] font-mono text-emerald-400">
            {deviceStatus?.boundHardwareId || 'Detecting hardware fingerprint...'}
          </p>
          <p className="text-[11px] text-fgText-muted">
            All other client devices and frontend users are compartmentalized and prohibited from modifying source code, configuration files, or database credentials.
          </p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSave} className="space-y-6">
        {/* Lenco Integration */}
        <div className="p-6 rounded-2xl bg-bg-surface border border-fgBorder-subtle space-y-4">
          <div className="flex items-center gap-2">
            <KeyRound className="w-4 h-4 text-emerald-400" />
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">
              Lenco Banking & Dedicated Virtual Accounts
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-fgText-secondary mb-1">
                Lenco API Secret Key
              </label>
              <input
                type="password"
                value={credentials.lencoApiKey}
                onChange={(e) => setCredentials({ ...credentials, lencoApiKey: e.target.value })}
                placeholder="sec_live_..."
                className="w-full px-3 py-2 bg-bg-card rounded-lg border border-fgBorder-subtle text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-fgText-secondary mb-1">
                Lenco Webhook Signing Secret
              </label>
              <input
                type="password"
                value={credentials.lencoWebhookSecret}
                onChange={(e) =>
                  setCredentials({ ...credentials, lencoWebhookSecret: e.target.value })
                }
                placeholder="whsec_..."
                className="w-full px-3 py-2 bg-bg-card rounded-lg border border-fgBorder-subtle text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>
        </div>

        {/* Ninja KYC */}
        <div className="p-6 rounded-2xl bg-bg-surface border border-fgBorder-subtle space-y-4">
          <div className="flex items-center gap-2">
            <KeyRound className="w-4 h-4 text-emerald-400" />
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">
              Ninja KYC (Identity Verification)
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-fgText-secondary mb-1">
                Ninja KYC API Key
              </label>
              <input
                type="password"
                value={credentials.ninjaKycApiKey}
                onChange={(e) => setCredentials({ ...credentials, ninjaKycApiKey: e.target.value })}
                placeholder="ninja_live_..."
                className="w-full px-3 py-2 bg-bg-card rounded-lg border border-fgBorder-subtle text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-fgText-secondary mb-1">
                Ninja Webhook Secret
              </label>
              <input
                type="password"
                value={credentials.ninjaKycWebhookSecret}
                onChange={(e) =>
                  setCredentials({ ...credentials, ninjaKycWebhookSecret: e.target.value })
                }
                placeholder="whsec_ninja_..."
                className="w-full px-3 py-2 bg-bg-card rounded-lg border border-fgBorder-subtle text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>
        </div>

        {/* Robase SMS / WhatsApp & SteraTrader */}
        <div className="p-6 rounded-2xl bg-bg-surface border border-fgBorder-subtle space-y-4">
          <div className="flex items-center gap-2">
            <KeyRound className="w-4 h-4 text-emerald-400" />
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">
              Robase (OTP) & SteraTrader Live
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-fgText-secondary mb-1">
                Robase API Key (SMS & WhatsApp Delivery)
              </label>
              <input
                type="password"
                value={credentials.robaseApiKey}
                onChange={(e) => setCredentials({ ...credentials, robaseApiKey: e.target.value })}
                placeholder="rb_live_..."
                className="w-full px-3 py-2 bg-bg-card rounded-lg border border-fgBorder-subtle text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-fgText-secondary mb-1">
                SteraTrader Provisioning API Key
              </label>
              <input
                type="password"
                value={credentials.steraTraderApiKey}
                onChange={(e) =>
                  setCredentials({ ...credentials, steraTraderApiKey: e.target.value })
                }
                placeholder="stera_live_key_..."
                className="w-full px-3 py-2 bg-bg-card rounded-lg border border-fgBorder-subtle text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>
        </div>

        {/* WooCommerce Bridge Keys */}
        <div className="p-6 rounded-2xl bg-bg-surface border border-fgBorder-subtle space-y-4">
          <div className="flex items-center gap-2">
            <KeyRound className="w-4 h-4 text-emerald-400" />
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">
              WooCommerce Store Bridge
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-fgText-secondary mb-1">
                Consumer Key
              </label>
              <input
                type="text"
                value={credentials.wooCommerceConsumerKey}
                onChange={(e) =>
                  setCredentials({ ...credentials, wooCommerceConsumerKey: e.target.value })
                }
                placeholder="ck_..."
                className="w-full px-3 py-2 bg-bg-card rounded-lg border border-fgBorder-subtle text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-fgText-secondary mb-1">
                Consumer Secret
              </label>
              <input
                type="password"
                value={credentials.wooCommerceConsumerSecret}
                onChange={(e) =>
                  setCredentials({ ...credentials, wooCommerceConsumerSecret: e.target.value })
                }
                placeholder="cs_..."
                className="w-full px-3 py-2 bg-bg-card rounded-lg border border-fgBorder-subtle text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-fgText-secondary mb-1">
                Webhook Secret
              </label>
              <input
                type="password"
                value={credentials.wooCommerceWebhookSecret}
                onChange={(e) =>
                  setCredentials({ ...credentials, wooCommerceWebhookSecret: e.target.value })
                }
                placeholder="secret_..."
                className="w-full px-3 py-2 bg-bg-card rounded-lg border border-fgBorder-subtle text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-red-950/40 border border-red-500/40 text-red-400 text-xs flex items-center gap-3">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-3">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-400" />
            <span>Credentials saved directly to .env. All live services are now configured!</span>
          </div>
        )}

        <button
          type="submit"
          disabled={saving}
          className="w-full py-4 bg-emerald-500 hover:bg-emerald-400 text-bg-base font-bold rounded-xl flex items-center justify-center gap-2 transition-all shadow-emeraldGlow disabled:opacity-50 text-xs uppercase tracking-wider"
        >
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Writing credentials to environment...</span>
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              <span>Save & Load to .env</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
}
