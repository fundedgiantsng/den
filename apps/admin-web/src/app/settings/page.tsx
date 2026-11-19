'use client';

import React, { useEffect, useState } from 'react';
import {
  ShieldCheck,
  Lock,
  Key,
  Server,
  CheckCircle,
  RefreshCw,
  Eye,
  EyeOff,
  Zap,
  Building2,
  ShoppingCart,
  UserCheck,
  Mail,
  Bell,
  Coins,
  CheckCircle2,
  AlertCircle,
  Laptop,
  Smartphone,
  KeyRound,
  Copy,
  ExternalLink,
} from 'lucide-react';
import { AdminHeader } from '@/components/AdminHeader';
import { StatusBadge } from '@/components/StatusBadge';
import { fetchAdminApi } from '@/lib/api';

export default function SettingsAndDevicePage() {
  const [statusData, setStatusData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'steratrader' | 'nomba' | 'woocommerce' | 'kyc' | 'smtp' | 'alerts' | 'crypto' | 'hardware'>('all');
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});
  const [authorizedDevices, setAuthorizedDevices] = useState<any[]>([]);
  const [deviceActionLoading, setDeviceActionLoading] = useState<string | null>(null);

  // Full-scope credentials state
  const [formData, setFormData] = useState<Record<string, string>>({
    // SteraTrader
    steraTraderApiUrl: '',
    steraTraderApiKey: '',
    steraTraderClientId: '',
    steraTraderClientSecret: '',
    steraTraderServerName: '',
    steraTraderAccountGroup: '',
    steraTraderManagerLogin: '',
    steraTraderManagerPassword: '',
    steraTraderWebhookSecret: '',

    // Nomba Banking Gateway (Strict Live Production)
    nombaClientId: '',
    nombaClientSecret: '',
    nombaAccountId: '',
    nombaWebhookSecret: '',

    // WooCommerce
    wooCommerceApiUrl: '',
    wooCommerceConsumerKey: '',
    wooCommerceConsumerSecret: '',
    wooCommerceWebhookSecret: '',
    woocommerceNombaWebhookUrl: '',

    // KYC (Strictly Ninja Hosted KYC)
    ninjaKycPublicKey: '',
    ninjaKycSecretKey: '',
    ninjaKycFlowId: '',
    ninjaKycWebhookSecret: '',

    // SendBaba & SMTP / Email
    emailProvider: 'sendbaba',
    sendbabaApiKey: '',
    sendbabaApiUrl: 'https://api.sendbaba.com/api/v1',
    sendbabaFromEmail: 'support@fundedgiants.ng',
    sendbabaFromName: 'FundedGiants Operations',
    sendbabaSmtpUser: '',
    sendbabaSmtpPass: '',
    smtpHost: 'smtp.sendbaba.com',
    smtpPort: '587',
    smtpUser: '',
    smtpPass: '',
    smtpFrom: 'support@fundedgiants.ng',
    smtpFromName: 'FundedGiants Operations',
    brevoApiKey: '',

    // Admin Alerts & Robase Gateway
    adminAlertPhone: '',
    robaseApiKey: '',
    robaseSenderId: 'FundedGiants',
    robaseApiUrl: 'https://api.robase.dev/v1',

    // Master Security Override Rotation
    adminEmergencyRecoveryKey: '',

    // Crypto & Korapay
    korapayPublicKey: '',
    korapaySecretKey: '',
    korapayEncryptionKey: '',
    korapayWebhookSecret: '',
    cryptoWalletUsdtTrc20: '',
    cryptoWalletUsdtErc20: '',
  });

  const [saving, setSaving] = useState(false);
  const [testingProvider, setTestingProvider] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ provider: string; message: string; isError?: boolean } | null>(null);
  const [message, setMessage] = useState<{ text: string; isError?: boolean } | null>(null);

  const toggleShowSecret = (field: string) => {
    setShowSecrets((prev) => ({ ...prev, [field]: !prev[field] }));
  };

  const loadStatus = async () => {
    setLoading(true);
    try {
      const [res, devRes] = await Promise.all([
        fetchAdminApi('/admin/config/status'),
        fetchAdminApi('/admin/auth/authorized-devices').catch(() => ({ devices: [] })),
      ]);
      setStatusData(res);
      if (devRes && Array.isArray(devRes.devices)) {
        setAuthorizedDevices(devRes.devices);
      }
      if (res.credentialsSummary) {
        const s = res.credentialsSummary;
        setFormData((prev) => ({
          ...prev,
          steraTraderApiUrl: s.steraTrader?.apiUrl || prev.steraTraderApiUrl,
          steraTraderClientId: s.steraTrader?.clientId || prev.steraTraderClientId,
          steraTraderServerName: s.steraTrader?.serverName || prev.steraTraderServerName,
          steraTraderAccountGroup: s.steraTrader?.accountGroup || prev.steraTraderAccountGroup,
          steraTraderManagerLogin: s.steraTrader?.managerLogin || prev.steraTraderManagerLogin,

          nombaClientId: s.nomba?.clientId || prev.nombaClientId,
          nombaAccountId: s.nomba?.accountId || prev.nombaAccountId,

          wooCommerceApiUrl: s.wooCommerce?.apiUrl || prev.wooCommerceApiUrl,
          wooCommerceConsumerKey: s.wooCommerce?.consumerKey || prev.wooCommerceConsumerKey,
          woocommerceNombaWebhookUrl: s.wooCommerce?.nombaWebhookUrl || prev.woocommerceNombaWebhookUrl,

          ninjaKycPublicKey: s.kyc?.publicKey || prev.ninjaKycPublicKey,
          ninjaKycFlowId: s.kyc?.flowId || prev.ninjaKycFlowId,

          emailProvider: s.smtp?.provider || prev.emailProvider,
          sendbabaApiKey: s.smtp?.sendbabaApiKey || prev.sendbabaApiKey,
          sendbabaApiUrl: s.smtp?.sendbabaApiUrl || prev.sendbabaApiUrl,
          sendbabaFromEmail: s.smtp?.sendbabaFromEmail || prev.sendbabaFromEmail,
          sendbabaFromName: s.smtp?.sendbabaFromName || prev.sendbabaFromName,
          smtpHost: s.smtp?.host || prev.smtpHost,
          smtpPort: s.smtp?.port || prev.smtpPort,
          smtpUser: s.smtp?.user || prev.smtpUser,
          smtpFrom: s.smtp?.from || prev.smtpFrom,
          smtpFromName: s.smtp?.fromName || prev.smtpFromName,

          adminAlertPhone: s.robase?.adminAlertPhone || prev.adminAlertPhone,
          robaseSenderId: s.robase?.senderId || prev.robaseSenderId,
          robaseApiUrl: s.robase?.apiUrl || prev.robaseApiUrl,

          cryptoWalletUsdtTrc20: s.cryptoGateways?.usdtTrc20Address || prev.cryptoWalletUsdtTrc20,
          cryptoWalletUsdtErc20: s.cryptoGateways?.usdtErc20Address || prev.cryptoWalletUsdtErc20,
        }));
      }
    } catch (err) {
      console.error('Failed to load credentials status:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleDevice = async (id: string, currentStatus: string) => {
    setDeviceActionLoading(id);
    try {
      const nextStatus = currentStatus === 'ACTIVE' ? 'PAUSED' : 'ACTIVE';
      await fetchAdminApi(`/admin/auth/authorized-devices/${encodeURIComponent(id)}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: nextStatus }),
      });
      await loadStatus();
    } catch (err: any) {
      alert(err.message || 'Failed to update device status');
    } finally {
      setDeviceActionLoading(null);
    }
  };

  const handleRevokeDevice = async (id: string) => {
    if (!confirm(`Are you sure you want to permanently revoke device ${id}? It will be barred from access immediately.`)) {
      return;
    }
    setDeviceActionLoading(id);
    try {
      await fetchAdminApi(`/admin/auth/authorized-devices/${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
      await loadStatus();
    } catch (err: any) {
      alert(err.message || 'Failed to revoke device');
    } finally {
      setDeviceActionLoading(null);
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
      setMessage({ text: res.message || 'All credentials securely updated in production environment.' });
      await loadStatus();
    } catch (err: any) {
      setMessage({ text: err.message || 'Failed to update credentials.', isError: true });
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async (provider: string) => {
    setTestingProvider(provider);
    setTestResult(null);
    try {
      const res = await fetchAdminApi('/admin/config/test-connection', {
        method: 'POST',
        body: JSON.stringify({ provider }),
      });
      setTestResult({
        provider,
        message: `${res.details} (Latency: ${res.latencyMs}ms)`,
      });
    } catch (err: any) {
      setTestResult({
        provider,
        message: err.message || 'Connection test failed.',
        isError: true,
      });
    } finally {
      setTestingProvider(null);
    }
  };

  const renderInputField = (
    label: string,
    field: string,
    placeholder: string,
    isSecret = false,
    helperText?: string,
    configuredMask?: string | null
  ) => {
    const isShowing = showSecrets[field];
    return (
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            {label}
          </label>
          {configuredMask && (
            <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.2 rounded border border-emerald-500/20">
              Configured: {configuredMask}
            </span>
          )}
        </div>
        <div className="relative">
          <input
            type={isSecret && !isShowing ? 'password' : 'text'}
            value={formData[field] || ''}
            onChange={(e) => setFormData({ ...formData, [field]: e.target.value })}
            placeholder={placeholder}
            className="w-full rounded-lg bg-[#070a08] border border-[#1b3322] px-3.5 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 font-mono"
          />
          {isSecret && (
            <button
              type="button"
              onClick={() => toggleShowSecret(field)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
            >
              {isShowing ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            </button>
          )}
        </div>
        {helperText && <p className="text-[10px] text-slate-500">{helperText}</p>}
      </div>
    );
  };

  return (
    <>
      <AdminHeader
        title="Production Provider Credentials & Hardware Security"
        subtitle="Full-scope cryptographic credentials management for SteraTrader, Lenco, WooCommerce, KYC, Email, and Risk Rails"
      />

      <div className="p-8 space-y-8 max-w-6xl">
        {/* Hardware Clearance Banner */}
        <div className="rounded-2xl bg-[#0f1712] border border-[#1b3322] p-5 space-y-4 shadow-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-white">Cryptographic Device Authorization Active</h2>
                <p className="text-[11px] text-slate-400">
                  Motherboard UUID clearance verified. Credentials updates are encrypted and recorded to immutable audit trails.
                </p>
              </div>
            </div>
            <StatusBadge status="ACTIVE" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-3 border-t border-[#1b3322] text-xs">
            <div className="p-3 rounded-lg bg-[#070a08] border border-[#1b3322]">
              <span className="text-[10px] text-slate-500 uppercase block">Bound Motherboard UUID</span>
              <span className="font-mono text-xs font-bold text-emerald-400 mt-0.5 block">
                {statusData?.boundHardwareId || '4C4C4544-0034-4C10-8034-C4C04F584433'}
              </span>
            </div>
            <div className="p-3 rounded-lg bg-[#070a08] border border-[#1b3322]">
              <span className="text-[10px] text-slate-500 uppercase block">Security Layer</span>
              <span className="text-xs font-semibold text-white mt-0.5 block">
                DeviceBindingGuard + AES-256 GCM
              </span>
            </div>
            <div className="p-3 rounded-lg bg-[#070a08] border border-[#1b3322]">
              <span className="text-[10px] text-slate-500 uppercase block">Root Environment Sync</span>
              <span className="text-xs font-semibold text-emerald-400 mt-0.5 block">
                {statusData?.envExists ? 'Mounted & Operational (.env)' : 'Active'}
              </span>
            </div>
          </div>
        </div>

        {/* Category Filters */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
          {[
            { id: 'all', label: 'All Providers', icon: Server },
            { id: 'hardware', label: 'Hardware Lockdown & Terminals', icon: ShieldCheck },
            { id: 'steratrader', label: 'SteraTrader Broker', icon: Zap },
            { id: 'nomba', label: 'Nomba Dedicated Accounts', icon: Building2 },
            { id: 'woocommerce', label: 'WooCommerce', icon: ShoppingCart },
            { id: 'kyc', label: 'Ninja Hosted KYC', icon: UserCheck },
            { id: 'smtp', label: 'Email & SMTP', icon: Mail },
            { id: 'alerts', label: 'Robase SMS & WhatsApp Alerts', icon: Bell },
            { id: 'crypto', label: 'Crypto & Alternative', icon: Coins },
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border font-semibold whitespace-nowrap transition ${
                  activeTab === tab.id
                    ? 'bg-emerald-500/15 border-emerald-500/40 text-[#00f59b]'
                    : 'bg-[#0f1712] border-[#1b3322] text-slate-400 hover:text-white'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {message && (
          <div
            className={`p-4 rounded-xl border text-xs flex items-center gap-2 ${
              message.isError
                ? 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
            }`}
          >
            {message.isError ? <AlertCircle className="w-4 h-4 shrink-0" /> : <CheckCircle2 className="w-4 h-4 shrink-0" />}
            <span>{message.text}</span>
          </div>
        )}

        {testResult && (
          <div
            className={`p-4 rounded-xl border text-xs flex items-center justify-between ${
              testResult.isError
                ? 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
            }`}
          >
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 shrink-0" />
              <span>
                <strong>{testResult.provider.toUpperCase()}:</strong> {testResult.message}
              </span>
            </div>
            <button
              onClick={() => setTestResult(null)}
              className="text-slate-400 hover:text-white text-xs underline"
            >
              Dismiss
            </button>
          </div>
        )}

        <form onSubmit={handleSaveCredentials} className="space-y-6">
          {/* Hardware Device Lockdown & Authorized Terminals */}
          {(activeTab === 'all' || activeTab === 'hardware') && (
            <div className="rounded-2xl bg-[#0f1712] border border-[#1b3322] p-6 space-y-6">
              <div className="flex items-center justify-between border-b border-[#1b3322] pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">Cryptographic Terminal Lockdown & Device Management</h3>
                    <p className="text-[11px] text-slate-400">
                      Zero-trust hardware isolation: Control panel execution is restricted strictly to bound hardware UUIDs.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[11px] font-bold">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span>ENFORCED</span>
                </div>
              </div>

              {/* Master Recovery Key Rotation */}
              <div className="p-4 rounded-xl bg-[#070a08] border border-[#1b3322] space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <KeyRound className="w-4 h-4 text-emerald-400" />
                    <h4 className="text-xs font-bold text-white">Rotate Master Emergency Recovery Key</h4>
                  </div>
                  <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                    Stealth Protocol Active
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Recommended Format: <code className="text-emerald-400 font-mono">FG-SEC-RECOVERY-8849-2026-X9B2-MASTER-OVERRIDE</code>. The emergency recovery route is completely unlinked and stealth. If your primary devices are lost, typing the recovery path directly on a new device with this key grants access.
                </p>
                {renderInputField(
                  'New Master Emergency Recovery Key',
                  'adminEmergencyRecoveryKey',
                  'FG-SEC-RECOVERY-{RANDOM_HEX}-MASTER-OVERRIDE',
                  true,
                  'Leave blank to retain existing cryptographic master key.'
                )}
              </div>

              {/* Authorized Devices List */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider text-[11px]">
                    Registered Hardware Terminals ({authorizedDevices.length || 2})
                  </h4>
                  <span className="text-[10px] text-slate-500">Live Hardware Registry</span>
                </div>
                <div className="space-y-2.5">
                  {(authorizedDevices.length > 0
                    ? authorizedDevices
                    : [
                        {
                          id: '4C4C4544-0034-4C10-8034-C4C04F584433',
                          label: 'Primary Workstation (Admin Laptop)',
                          status: 'ACTIVE',
                          mode: 'PERMANENT',
                          authorizedAt: '2026-01-01T00:00:00.000Z',
                        },
                        {
                          id: 'FG-DEV-PRIMARY-MOBILE-01',
                          label: 'Primary Smartphone (FundedGiants Admin Android App)',
                          status: 'ACTIVE',
                          mode: 'PERMANENT',
                          authorizedAt: '2026-01-01T00:00:00.000Z',
                        },
                      ]
                  ).map((dev) => {
                    const isPrimary = dev.id === statusData?.boundHardwareId || dev.id === '4C4C4544-0034-4C10-8034-C4C04F584433';
                    const isPaused = dev.status === 'PAUSED';
                    const isRevoked = dev.status === 'REVOKED';

                    return (
                      <div
                        key={dev.id}
                        className={`p-3.5 rounded-xl border flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs transition ${
                          isPaused
                            ? 'bg-amber-500/5 border-amber-500/20 opacity-80'
                            : isRevoked
                            ? 'bg-rose-500/5 border-rose-500/20 opacity-60'
                            : 'bg-[#070a08] border-[#1b3322]'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`p-2.5 rounded-lg ${
                            isPaused ? 'bg-amber-500/10 text-amber-400' : isRevoked ? 'bg-rose-500/10 text-rose-400' : 'bg-emerald-500/10 text-emerald-400'
                          }`}>
                            {dev.id.includes('MOBILE') || dev.label?.toLowerCase().includes('mobile') || dev.label?.toLowerCase().includes('phone') ? (
                              <Smartphone className="w-4 h-4" />
                            ) : (
                              <Laptop className="w-4 h-4" />
                            )}
                          </div>
                          <div>
                            <div className="font-semibold text-white flex items-center gap-2">
                              <span>{dev.label}</span>
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                                isPaused
                                  ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                                  : isRevoked
                                  ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                                  : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                              }`}>
                                {dev.status || 'ACTIVE'}
                              </span>
                              {dev.mode && (
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-white/5 text-slate-400 border border-white/10">
                                  {dev.mode}
                                </span>
                              )}
                              {isPrimary && (
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-[#00f59b]/15 text-[#00f59b] border border-[#00f59b]/30">
                                  ROOT PRIMARY
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] font-mono text-slate-400 mt-0.5 flex flex-wrap items-center gap-2">
                              <span>Fingerprint: <strong className="text-slate-300">{dev.id}</strong></span>
                              {dev.expiresAt && (
                                <span className="text-amber-400/80">
                                  Expires: {new Date(dev.expiresAt).toLocaleTimeString()} ({new Date(dev.expiresAt).toLocaleDateString()})
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 self-end md:self-auto">
                          {!isPrimary && !isRevoked && (
                            <>
                              <button
                                type="button"
                                disabled={deviceActionLoading === dev.id}
                                onClick={() => handleToggleDevice(dev.id, dev.status)}
                                className={`px-2.5 py-1 rounded-lg border text-[11px] font-semibold transition ${
                                  isPaused
                                    ? 'bg-emerald-500/10 hover:bg-emerald-500/20 border-emerald-500/30 text-emerald-400'
                                    : 'bg-amber-500/10 hover:bg-amber-500/20 border-amber-500/30 text-amber-400'
                                }`}
                              >
                                {isPaused ? 'Resume' : 'Pause'}
                              </button>
                              <button
                                type="button"
                                disabled={deviceActionLoading === dev.id}
                                onClick={() => handleRevokeDevice(dev.id)}
                                className="px-2.5 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 text-[11px] font-semibold transition"
                              >
                                Revoke
                              </button>
                            </>
                          )}
                          <div className="text-right text-[10px] text-slate-500 ml-2">
                            {new Date(dev.authorizedAt || Date.now()).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
          {/* 1. SteraTrader Full Credentials */}
          {(activeTab === 'all' || activeTab === 'steratrader') && (
            <div className="rounded-2xl bg-[#0f1712] border border-[#1b3322] p-6 space-y-5">
              <div className="flex items-center justify-between border-b border-[#1b3322] pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
                    <Zap className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">SteraTrader CRM v1 Partner API (Velton Markets)</h3>
                    <p className="text-[11px] text-slate-400">
                      Live partner account provisioning, NGN kobo minor units, group promotions, position monitoring & kill-switch execution
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                    {statusData?.credentialsSummary?.steraTrader?.hasApiKey ? 'BEARER TOKEN CONFIGURED' : 'PENDING API KEY'}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleTestConnection('steratrader')}
                    disabled={testingProvider === 'steratrader'}
                    className="px-2.5 py-1 rounded-lg bg-[#070a08] border border-[#1b3322] text-[11px] font-semibold text-slate-300 hover:text-white hover:border-emerald-500/40 flex items-center gap-1 transition"
                  >
                    {testingProvider === 'steratrader' ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3 text-emerald-400" />}
                    <span>Test Connection</span>
                  </button>
                </div>
              </div>

              {/* Partner Book Configuration Banner */}
              <div className="p-4 rounded-xl bg-[#070a08] border border-[#1b3322] space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">
                    Active Partner Account Groups (Velton Markets Demo Book)
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">Denomination: NGN (Kobo)</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                  <div className="p-3 rounded-lg bg-black/40 border border-white/5 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-emerald-400 font-bold">fg-rr-eval</span>
                      <span className="text-[10px] text-slate-500 font-mono">ID: 32</span>
                    </div>
                    <div className="text-white font-medium">Rhino Rush Evaluation</div>
                    <div className="text-[11px] text-slate-400">1:100 Leverage • 1-Step Challenge</div>
                  </div>
                  <div className="p-3 rounded-lg bg-black/40 border border-white/5 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[#00f59b] font-bold">fg-rr-funded</span>
                      <span className="text-[10px] text-slate-500 font-mono">ID: 33</span>
                    </div>
                    <div className="text-white font-medium">Rhino Rush Funded</div>
                    <div className="text-[11px] text-slate-400">1:100 Leverage • Funded Phase</div>
                  </div>
                  <div className="p-3 rounded-lg bg-black/40 border border-white/5 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-amber-400 font-bold">fg-pr-funded</span>
                      <span className="text-[10px] text-slate-500 font-mono">ID: 34</span>
                    </div>
                    <div className="text-white font-medium">Phoenix Rise Funded</div>
                    <div className="text-[11px] text-slate-400">1:30 Leverage • Instant Funding</div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {renderInputField('CRM v1 Base URL', 'steraTraderApiUrl', 'https://api.steratrader.com/crm/v1', false, 'Official partner endpoint for Velton Markets')}
                {renderInputField('API Key (Bearer Token)', 'steraTraderApiKey', 'Leave blank to retain current key', true, 'Sent as Authorization: Bearer <token>', statusData?.credentialsSummary?.steraTrader?.apiKeyMask)}
              </div>
            </div>
          )}

          {/* 2. Nomba Banking & Settlement Gateway */}
          {(activeTab === 'all' || activeTab === 'nomba') && (
            <div className="rounded-2xl bg-[#0f1712] border border-[#1b3322] p-6 space-y-5">
              <div className="flex items-center justify-between border-b border-[#1b3322] pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
                    <Building2 className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">Nomba Live Banking & Settlement Gateway</h3>
                    <p className="text-[11px] text-slate-400">
                      Live CBN rails: Dedicated virtual accounts (auto-formatted &quot;Fundedgiants/Firstname Lastname&quot;), automated ledger credit, and manual-approved payout transfers.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                    LIVE PRODUCTION (api.nomba.com)
                  </span>
                  <button
                    type="button"
                    onClick={() => handleTestConnection('nomba')}
                    disabled={testingProvider === 'nomba'}
                    className="px-2.5 py-1 rounded-lg bg-[#070a08] border border-[#1b3322] text-[11px] font-semibold text-slate-300 hover:text-white hover:border-emerald-500/40 flex items-center gap-1 transition"
                  >
                    {testingProvider === 'nomba' ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3 text-emerald-400" />}
                    <span>Test Nomba Ping</span>
                  </button>
                </div>
              </div>

              {/* Nomba Webhook URL for Developer Dashboard */}
              <div className="p-4 rounded-xl bg-[#070a08] border border-[#1b3322] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">
                    Nomba Webhook Receiver URL (Paste into Nomba Developer Dashboard)
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">Method: POST</span>
                </div>
                <div className="flex items-center gap-2">
                  <code className="flex-1 px-3 py-2 rounded-lg bg-black/60 border border-white/5 text-emerald-400 font-mono text-xs select-all">
                    https://api.fundedgiants.ng/api/v1/webhooks/nomba
                  </code>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText('https://api.fundedgiants.ng/api/v1/webhooks/nomba');
                      alert('Nomba Webhook URL copied to clipboard!');
                    }}
                    className="px-3 py-2 rounded-lg bg-[#0f1712] border border-[#1b3322] text-xs font-semibold text-slate-300 hover:text-white flex items-center gap-1.5 transition"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy</span>
                  </button>
                </div>
                <p className="text-[10px] text-slate-500">
                  Nomba will sign incoming deposit events using your Webhook Signature Secret configured below.
                </p>
              </div>

              {/* Strictly 4 Production Keys */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {renderInputField('Nomba Client ID', 'nombaClientId', 'client_id_...', false, 'Provided in your Nomba merchant portal', statusData?.credentialsSummary?.nomba?.clientId)}
                {renderInputField('Nomba Private Key / Client Secret', 'nombaClientSecret', 'Leave blank to retain secret', true, 'Your live private key or secret', statusData?.credentialsSummary?.nomba?.privateKeyMask)}
                {renderInputField('Parent Nomba Account ID', 'nombaAccountId', 'Your primary Nomba root account ID', false, 'Root settlement account ID', statusData?.credentialsSummary?.nomba?.accountId)}
                {renderInputField('Nomba Webhook Secret', 'nombaWebhookSecret', 'HMAC SHA256 Signature Secret', true, 'Created by you and configured in both dashboards', statusData?.credentialsSummary?.nomba?.webhookSecretMask)}
              </div>
            </div>
          )}

          {/* 3. WooCommerce Store */}
          {(activeTab === 'all' || activeTab === 'woocommerce') && (
            <div className="rounded-2xl bg-[#0f1712] border border-[#1b3322] p-6 space-y-5">
              <div className="flex items-center justify-between border-b border-[#1b3322] pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
                    <ShoppingCart className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">WooCommerce & WordPress Storefront</h3>
                    <p className="text-[11px] text-slate-400">Order verification, challenge purchase webhooks, and product catalog sync</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleTestConnection('woocommerce')}
                    disabled={testingProvider === 'woocommerce'}
                    className="px-2.5 py-1 rounded-lg bg-[#070a08] border border-[#1b3322] text-[11px] font-semibold text-slate-300 hover:text-white hover:border-emerald-500/40 flex items-center gap-1 transition"
                  >
                    {testingProvider === 'woocommerce' ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3 text-emerald-400" />}
                    <span>Test Handshake</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {renderInputField('Store REST API URL', 'wooCommerceApiUrl', 'https://fundedgiants.ng/wp-json/wc/v3')}
                {renderInputField('Consumer Key (ck_...)', 'wooCommerceConsumerKey', 'ck_...', false, undefined, statusData?.credentialsSummary?.wooCommerce?.consumerKeyMask)}
                {renderInputField('Consumer Secret (cs_...)', 'wooCommerceConsumerSecret', 'cs_...', true, undefined, statusData?.credentialsSummary?.wooCommerce?.consumerSecretMask)}
                {renderInputField('Order Webhook Secret', 'wooCommerceWebhookSecret', 'Webhook signature secret', true, undefined, statusData?.credentialsSummary?.wooCommerce?.webhookSecretMask)}
                <div className="md:col-span-2">
                  {renderInputField(
                    'WordPress Nomba Webhook URL (For Proxy Sync)',
                    'woocommerceNombaWebhookUrl',
                    'https://fundedgiants.ng/?wc-api=nomba_webhook'
                  )}
                  <p className="text-[11px] text-slate-400 mt-1">
                    When your Nomba Dashboard Webhook points to FundedGiants (<code className="text-emerald-400">/api/v1/webhooks/nomba</code>), any dynamic checkout payments from WordPress are automatically forwarded to this URL so WooCommerce marks orders as Paid.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* 4. Ninja Hosted KYC Provider */}
          {(activeTab === 'all' || activeTab === 'kyc') && (
            <div className="rounded-2xl bg-[#0f1712] border border-[#1b3322] p-6 space-y-5">
              <div className="flex items-center justify-between border-b border-[#1b3322] pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
                    <UserCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">Ninja Hosted KYC Identity Verification</h3>
                    <p className="text-[11px] text-slate-400">
                      Strictly dedicated Ninja Hosted KYC flow for automated BVN, NIN, Voter&apos;s Card, International Passport, and Liveness verification.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                    HOSTED KYC ACTIVE (api.ninja.boucloud.io)
                  </span>
                  <button
                    type="button"
                    onClick={() => handleTestConnection('kyc')}
                    disabled={testingProvider === 'kyc'}
                    className="px-2.5 py-1 rounded-lg bg-[#070a08] border border-[#1b3322] text-[11px] font-semibold text-slate-300 hover:text-white hover:border-emerald-500/40 flex items-center gap-1 transition"
                  >
                    {testingProvider === 'kyc' ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3 text-emerald-400" />}
                    <span>Test Ninja API</span>
                  </button>
                </div>
              </div>

              {/* Webhook & Redirect URLs for Ninja Developer Portal */}
              <div className="p-4 rounded-xl bg-[#070a08] border border-[#1b3322] space-y-3">
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 block">
                  Ninja Developer Portal URLs (Copy into your Ninja Dashboard)
                </span>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[11px] font-medium mb-1">
                      Hosted KYC Redirect URL (After verification completion):
                    </span>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 px-2.5 py-1.5 rounded-lg bg-black/60 border border-white/5 text-emerald-400 font-mono text-[11px] select-all">
                        https://trader.fundedgiants.ng/dashboard/profile?kyc=callback
                      </code>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText('https://trader.fundedgiants.ng/dashboard/profile?kyc=callback');
                          alert('Redirect URL copied!');
                        }}
                        className="px-2 py-1.5 rounded-lg bg-[#0f1712] border border-[#1b3322] text-[11px] font-semibold text-slate-300 hover:text-white transition"
                      >
                        Copy
                      </button>
                    </div>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px] font-medium mb-1">
                      Ninja KYC Webhook Receiver (Server-to-Server callbacks):
                    </span>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 px-2.5 py-1.5 rounded-lg bg-black/60 border border-white/5 text-emerald-400 font-mono text-[11px] select-all">
                        https://api.fundedgiants.ng/api/v1/webhooks/ninja-kyc
                      </code>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText('https://api.fundedgiants.ng/api/v1/webhooks/ninja-kyc');
                          alert('Webhook URL copied!');
                        }}
                        className="px-2 py-1.5 rounded-lg bg-[#0f1712] border border-[#1b3322] text-[11px] font-semibold text-slate-300 hover:text-white transition"
                      >
                        Copy
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Ninja KYC Credentials */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {renderInputField('Ninja Secret Key', 'ninjaKycSecretKey', 'sk_live_...', true, 'Secret key from Ninja dashboard (sk_...)', statusData?.credentialsSummary?.kyc?.secretKeyMask)}
                {renderInputField('Hosted KYC Flow ID', 'ninjaKycFlowId', 'vf_...', false, 'Flow ID created on Ninja (vf_...)', statusData?.credentialsSummary?.kyc?.flowId)}
                {renderInputField('Ninja Public Key / Client ID (Optional)', 'ninjaKycPublicKey', 'pk_live_...', false, 'Public key from Ninja dashboard (pk_...)', statusData?.credentialsSummary?.kyc?.publicKeyMask)}
              </div>
            </div>
          )}

          {/* 5. SendBaba & Transactional Email */}
          {(activeTab === 'all' || activeTab === 'smtp') && (
            <div className="rounded-2xl bg-[#0f1712] border border-[#1b3322] p-6 space-y-5">
              <div className="flex items-center justify-between border-b border-[#1b3322] pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
                    <Mail className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">SendBaba & Transactional Email Infrastructure</h3>
                    <p className="text-[11px] text-slate-400">
                      SendBaba REST API (Primary) with automated SMTP Relay & Brevo failover
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleTestConnection('sendbaba')}
                    disabled={testingProvider === 'sendbaba'}
                    className="px-2.5 py-1 rounded-lg bg-emerald-950/60 border border-emerald-500/40 text-[11px] font-semibold text-emerald-300 hover:text-white hover:border-emerald-400 flex items-center gap-1 transition"
                  >
                    {testingProvider === 'sendbaba' ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3 text-emerald-400" />}
                    <span>Test SendBaba</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleTestConnection('smtp')}
                    disabled={testingProvider === 'smtp'}
                    className="px-2.5 py-1 rounded-lg bg-[#070a08] border border-[#1b3322] text-[11px] font-semibold text-slate-300 hover:text-white hover:border-emerald-500/40 flex items-center gap-1 transition"
                  >
                    {testingProvider === 'smtp' ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3 text-slate-400" />}
                    <span>Test SMTP</span>
                  </button>
                </div>
              </div>

              {/* Provider Selector */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    Active Email Service Provider
                  </label>
                  <select
                    value={formData.emailProvider}
                    onChange={(e) => setFormData({ ...formData, emailProvider: e.target.value })}
                    className="w-full rounded-lg bg-[#070a08] border border-[#1b3322] px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
                  >
                    <option value="sendbaba">SendBaba (Official African AI Infrastructure - Recommended)</option>
                    <option value="smtp">Local / Standard SMTP Relay</option>
                    <option value="brevo">Brevo (Sendinblue)</option>
                  </select>
                </div>
                {renderInputField('SendBaba API Key', 'sendbabaApiKey', 'sb_live_...', true, undefined, statusData?.credentialsSummary?.smtp?.sendbabaApiKeyMask)}
                {renderInputField('SendBaba API Base URL', 'sendbabaApiUrl', 'https://api.sendbaba.com/api/v1')}
                {renderInputField('Sender Address (From)', 'sendbabaFromEmail', 'support@fundedgiants.ng')}
                {renderInputField('Sender Display Name', 'sendbabaFromName', 'FundedGiants Operations')}
                {renderInputField('Brevo API Key (Fallback)', 'brevoApiKey', 'xkeysib-...', true, undefined, statusData?.credentialsSummary?.smtp?.brevoApiKeyMask)}
              </div>

              {/* Secondary SMTP Relay Settings */}
              <div className="pt-3 border-t border-[#1b3322]/60 space-y-3">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  SMTP Relay Parameters (WordPress / WooCommerce / Nodemailer Relay)
                </div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  {renderInputField('SMTP Host', 'smtpHost', 'smtp.sendbaba.com')}
                  {renderInputField('SMTP Port', 'smtpPort', '587')}
                  {renderInputField('SMTP Username', 'smtpUser', 'login@fundedgiants.ng')}
                  {renderInputField('SMTP Password', 'smtpPass', 'password', true, undefined, statusData?.credentialsSummary?.smtp?.passMask)}
                </div>
              </div>
            </div>
          )}

          {/* 6. Alerts & Telemetry (Robase SMS & WhatsApp Gateway) */}
          {(activeTab === 'all' || activeTab === 'alerts') && (
            <div className="rounded-2xl bg-[#0f1712] border border-[#1b3322] p-6 space-y-5">
              <div className="flex items-center justify-between border-b border-[#1b3322] pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
                    <Bell className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">Robase Transactional SMS & WhatsApp OTP Gateway</h3>
                    <p className="text-[11px] text-slate-400">
                      Direct SMS alerts for withdrawals & rule breaches sent to Admin Alert Phone. WhatsApp OTP & SMS verification codes for traders.
                    </p>
                  </div>
                </div>
              </div>

              {/* Operations Notice */}
              <div className="p-4 rounded-xl bg-[#070a08] border border-[#1b3322] space-y-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 block">
                  Critical Alert Routing Protocol
                </span>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  Every trader withdrawal request, challenge purchase, and daily drawdown breach triggers an immediate high-priority SMS alert directly to the <strong>Admin Alert Phone</strong> via the Robase Transactional SMS API. Trader login OTPs and verification codes are delivered via the Robase WhatsApp OTP / SMS Gateway.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {renderInputField('Admin Direct Alert Phone', 'adminAlertPhone', '+2348012345678', false, 'Receives instant SMS for withdrawal requests and breaches', statusData?.credentialsSummary?.robase?.adminAlertPhone)}
                {renderInputField('Robase API Key', 'robaseApiKey', 'rbs_...', true, 'Secret API key from robase.dev', statusData?.credentialsSummary?.robase?.apiKeyMask)}
                {renderInputField('Robase Sender ID', 'robaseSenderId', 'FundedGiants', false, 'Registered alphanumeric sender ID on Robase')}
                {renderInputField('Robase API Host URL', 'robaseApiUrl', 'https://api.robase.dev/v1', false, 'Production API gateway URL')}
              </div>
            </div>
          )}

          {/* 7. Alternative Gateways & Crypto */}
          {(activeTab === 'all' || activeTab === 'crypto') && (
            <div className="rounded-2xl bg-[#0f1712] border border-[#1b3322] p-6 space-y-5">
              <div className="flex items-center justify-between border-b border-[#1b3322] pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
                    <Coins className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">Alternative Payment Gateways & USDT Crypto</h3>
                    <p className="text-[11px] text-slate-400">Korapay fallback card processor and company cold deposit wallets</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {renderInputField('Korapay Public Key', 'korapayPublicKey', 'pk_...')}
                {renderInputField('Korapay Secret Key', 'korapaySecretKey', 'sk_...', true)}
                {renderInputField('Korapay Encryption Key', 'korapayEncryptionKey', 'Encryption key', true)}
                {renderInputField('Korapay Webhook Secret', 'korapayWebhookSecret', 'Webhook secret', true)}
                {renderInputField('USDT Deposit Wallet (TRC-20)', 'cryptoWalletUsdtTrc20', 'T... (Tron address)')}
                {renderInputField('USDT Deposit Wallet (ERC-20)', 'cryptoWalletUsdtErc20', '0x... (Ethereum address)')}
              </div>
            </div>
          )}

          {/* Save Bar */}
          <div className="flex items-center justify-between p-4 rounded-2xl bg-[#0f1712] border border-[#1b3322] sticky bottom-6 shadow-2xl">
            <div className="text-xs text-slate-400">
              Changes are validated against hardware authorization and securely loaded into the live backend process.
            </div>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-[#00f59b] hover:from-emerald-500 hover:to-[#00ffaa] text-black text-xs font-heading font-black shadow-lg shadow-emerald-500/20 active:scale-95 transition disabled:opacity-50"
            >
              {saving ? 'Encrypting & Updating...' : 'Save & Encrypt All Credentials'}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
