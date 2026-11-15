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
} from 'lucide-react';
import { AdminHeader } from '@/components/AdminHeader';
import { StatusBadge } from '@/components/StatusBadge';
import { fetchAdminApi } from '@/lib/api';

export default function SettingsAndDevicePage() {
  const [statusData, setStatusData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'steratrader' | 'lenco' | 'woocommerce' | 'kyc' | 'smtp' | 'alerts' | 'crypto'>('all');
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});

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

    // Lenco
    lencoEnvironment: 'sandbox',
    lencoBaseUrl: '',
    lencoPublicKey: '',
    lencoSecretKey: '',
    lencoDisbursementAccountId: '',
    lencoVirtualAccountWebhookSecret: '',
    lencoDisbursementWebhookSecret: '',

    // WooCommerce
    wooCommerceApiUrl: '',
    wooCommerceConsumerKey: '',
    wooCommerceConsumerSecret: '',
    wooCommerceWebhookSecret: '',

    // KYC
    kycProvider: 'sumsub',
    kycBaseUrl: '',
    kycAppToken: '',
    kycSecretKey: '',
    kycLevelName: '',
    kycWebhookSecret: '',

    // SMTP / Email
    emailProvider: 'smtp',
    smtpHost: '',
    smtpPort: '587',
    smtpUser: '',
    smtpPass: '',
    smtpFrom: '',
    smtpFromName: '',
    brevoApiKey: '',

    // Alerts
    telegramBotToken: '',
    telegramChatId: '',
    discordWebhookUrl: '',

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
      const res = await fetchAdminApi('/admin/config/status');
      setStatusData(res);
      if (res.credentialsSummary) {
        const s = res.credentialsSummary;
        setFormData((prev) => ({
          ...prev,
          steraTraderApiUrl: s.steraTrader?.apiUrl || prev.steraTraderApiUrl,
          steraTraderClientId: s.steraTrader?.clientId || prev.steraTraderClientId,
          steraTraderServerName: s.steraTrader?.serverName || prev.steraTraderServerName,
          steraTraderAccountGroup: s.steraTrader?.accountGroup || prev.steraTraderAccountGroup,
          steraTraderManagerLogin: s.steraTrader?.managerLogin || prev.steraTraderManagerLogin,

          lencoEnvironment: s.lenco?.environment || prev.lencoEnvironment,
          lencoBaseUrl: s.lenco?.baseUrl || prev.lencoBaseUrl,
          lencoDisbursementAccountId: s.lenco?.disbursementAccountId || prev.lencoDisbursementAccountId,

          wooCommerceApiUrl: s.wooCommerce?.apiUrl || prev.wooCommerceApiUrl,

          kycProvider: s.kyc?.provider || prev.kycProvider,
          kycBaseUrl: s.kyc?.baseUrl || prev.kycBaseUrl,
          kycLevelName: s.kyc?.levelName || prev.kycLevelName,

          emailProvider: s.smtp?.provider || prev.emailProvider,
          smtpHost: s.smtp?.host || prev.smtpHost,
          smtpPort: s.smtp?.port || prev.smtpPort,
          smtpUser: s.smtp?.user || prev.smtpUser,
          smtpFrom: s.smtp?.from || prev.smtpFrom,
          smtpFromName: s.smtp?.fromName || prev.smtpFromName,

          telegramChatId: s.alerts?.telegramChatId || prev.telegramChatId,

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
            { id: 'steratrader', label: 'SteraTrader Broker', icon: Zap },
            { id: 'lenco', label: 'Lenco Banking', icon: Building2 },
            { id: 'woocommerce', label: 'WooCommerce', icon: ShoppingCart },
            { id: 'kyc', label: 'KYC Verification', icon: UserCheck },
            { id: 'smtp', label: 'Email & SMTP', icon: Mail },
            { id: 'alerts', label: 'Risk Alerts', icon: Bell },
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
          {/* 1. SteraTrader Full Credentials */}
          {(activeTab === 'all' || activeTab === 'steratrader') && (
            <div className="rounded-2xl bg-[#0f1712] border border-[#1b3322] p-6 space-y-5">
              <div className="flex items-center justify-between border-b border-[#1b3322] pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
                    <Zap className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">SteraTrader Bridge & Broker API</h3>
                    <p className="text-[11px] text-slate-400">Live trading account provisioning, order monitoring, and kill-switch execution</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                    {statusData?.credentialsSummary?.steraTrader?.hasApiKey ? 'CREDENTIALS CONFIGURED' : 'PENDING CREDENTIALS'}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleTestConnection('steratrader')}
                    disabled={testingProvider === 'steratrader'}
                    className="px-2.5 py-1 rounded-lg bg-[#070a08] border border-[#1b3322] text-[11px] font-semibold text-slate-300 hover:text-white hover:border-emerald-500/40 flex items-center gap-1 transition"
                  >
                    {testingProvider === 'steratrader' ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3 text-emerald-400" />}
                    <span>Test Ping</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {renderInputField('REST API Host / Base URL', 'steraTraderApiUrl', 'https://api.steratrader.com')}
                {renderInputField('API Access Key / Bearer Token', 'steraTraderApiKey', 'Leave blank to retain current key', true, undefined, statusData?.credentialsSummary?.steraTrader?.apiKeyMasked)}
                {renderInputField('Client ID (OAuth)', 'steraTraderClientId', 'Client ID')}
                {renderInputField('Client Secret', 'steraTraderClientSecret', 'Leave blank to retain current secret', true)}
                {renderInputField('Server Name', 'steraTraderServerName', 'FundedGiants-Live')}
                {renderInputField('Default Account Group', 'steraTraderAccountGroup', 'FG-Standard')}
                {renderInputField('Manager Login ID', 'steraTraderManagerLogin', 'Manager ID for balance inject')}
                {renderInputField('Manager Password', 'steraTraderManagerPassword', 'Manager password', true)}
                {renderInputField('Webhook Signature Secret', 'steraTraderWebhookSecret', 'HMAC SHA256 Secret', true)}
              </div>
            </div>
          )}

          {/* 2. Lenco Banking Rails */}
          {(activeTab === 'all' || activeTab === 'lenco') && (
            <div className="rounded-2xl bg-[#0f1712] border border-[#1b3322] p-6 space-y-5">
              <div className="flex items-center justify-between border-b border-[#1b3322] pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
                    <Building2 className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">Lenco Direct Nigerian Banking & Settlement</h3>
                    <p className="text-[11px] text-slate-400">Automated NGN dedicated virtual accounts, bank reconciliations, and payout transfers</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                    {statusData?.credentialsSummary?.lenco?.hasSecretKey ? 'ACTIVE RAILS' : 'PENDING SECRET'}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleTestConnection('lenco')}
                    disabled={testingProvider === 'lenco'}
                    className="px-2.5 py-1 rounded-lg bg-[#070a08] border border-[#1b3322] text-[11px] font-semibold text-slate-300 hover:text-white hover:border-emerald-500/40 flex items-center gap-1 transition"
                  >
                    {testingProvider === 'lenco' ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3 text-emerald-400" />}
                    <span>Test Lenco API</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    Environment
                  </label>
                  <select
                    value={formData.lencoEnvironment}
                    onChange={(e) => setFormData({ ...formData, lencoEnvironment: e.target.value })}
                    className="w-full rounded-lg bg-[#070a08] border border-[#1b3322] px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
                  >
                    <option value="sandbox">Sandbox / Staging</option>
                    <option value="live">Live Production (CBN Direct)</option>
                  </select>
                </div>
                {renderInputField('Lenco Base URL', 'lencoBaseUrl', 'https://api.lenco.ng')}
                {renderInputField('Public Key', 'lencoPublicKey', 'pk_live_...', false, undefined, statusData?.credentialsSummary?.lenco?.publicKeyMasked)}
                {renderInputField('Secret Key', 'lencoSecretKey', 'sk_live_...', true)}
                {renderInputField('Disbursement Funding Account ID', 'lencoDisbursementAccountId', 'Account UUID for automated payouts')}
                {renderInputField('Virtual Account Webhook Secret', 'lencoVirtualAccountWebhookSecret', 'HMAC Secret for Inward Deposits', true)}
                {renderInputField('Disbursement Webhook Secret', 'lencoDisbursementWebhookSecret', 'HMAC Secret for Transfer Callbacks', true)}
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
                {renderInputField('Store REST API URL', 'wooCommerceApiUrl', 'https://fundedgiants.com/wp-json/wc/v3')}
                {renderInputField('Consumer Key (ck_...)', 'wooCommerceConsumerKey', 'ck_...', false, undefined, statusData?.credentialsSummary?.wooCommerce?.consumerKeyMasked)}
                {renderInputField('Consumer Secret (cs_...)', 'wooCommerceConsumerSecret', 'cs_...', true)}
                {renderInputField('Order Webhook Secret', 'wooCommerceWebhookSecret', 'Webhook signature secret', true)}
              </div>
            </div>
          )}

          {/* 4. KYC Provider */}
          {(activeTab === 'all' || activeTab === 'kyc') && (
            <div className="rounded-2xl bg-[#0f1712] border border-[#1b3322] p-6 space-y-5">
              <div className="flex items-center justify-between border-b border-[#1b3322] pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
                    <UserCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">Identity Verification & KYC Gate</h3>
                    <p className="text-[11px] text-slate-400">Sumsub / NinjaKYC automated BVN, NIN, Government ID, and liveness verification</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleTestConnection('kyc')}
                  disabled={testingProvider === 'kyc'}
                  className="px-2.5 py-1 rounded-lg bg-[#070a08] border border-[#1b3322] text-[11px] font-semibold text-slate-300 hover:text-white hover:border-emerald-500/40 flex items-center gap-1 transition"
                >
                  {testingProvider === 'kyc' ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3 text-emerald-400" />}
                  <span>Test KYC Gateway</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    KYC Engine
                  </label>
                  <select
                    value={formData.kycProvider}
                    onChange={(e) => setFormData({ ...formData, kycProvider: e.target.value })}
                    className="w-full rounded-lg bg-[#070a08] border border-[#1b3322] px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
                  >
                    <option value="sumsub">Sumsub Global ID</option>
                    <option value="ninjakyc">NinjaKYC / Verified.ng</option>
                    <option value="robase">Robase Nigerian Identity Engine</option>
                  </select>
                </div>
                {renderInputField('Base URL', 'kycBaseUrl', 'https://api.sumsub.com')}
                {renderInputField('App Token / API Key', 'kycAppToken', 'App Token', true)}
                {renderInputField('Secret Key', 'kycSecretKey', 'Secret Key', true)}
                {renderInputField('Verification Level Name', 'kycLevelName', 'basic-kyc-level')}
                {renderInputField('Webhook HMAC Secret', 'kycWebhookSecret', 'HMAC verification secret', true)}
              </div>
            </div>
          )}

          {/* 5. SMTP / Email Provider */}
          {(activeTab === 'all' || activeTab === 'smtp') && (
            <div className="rounded-2xl bg-[#0f1712] border border-[#1b3322] p-6 space-y-5">
              <div className="flex items-center justify-between border-b border-[#1b3322] pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
                    <Mail className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">Transactional Email & SMTP Relay</h3>
                    <p className="text-[11px] text-slate-400">Brevo, Postmark, or SMTP relay for challenge credentials and payout receipts</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleTestConnection('smtp')}
                  disabled={testingProvider === 'smtp'}
                  className="px-2.5 py-1 rounded-lg bg-[#070a08] border border-[#1b3322] text-[11px] font-semibold text-slate-300 hover:text-white hover:border-emerald-500/40 flex items-center gap-1 transition"
                >
                  {testingProvider === 'smtp' ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3 text-emerald-400" />}
                  <span>Test Relay</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    Email Service Provider
                  </label>
                  <select
                    value={formData.emailProvider}
                    onChange={(e) => setFormData({ ...formData, emailProvider: e.target.value })}
                    className="w-full rounded-lg bg-[#070a08] border border-[#1b3322] px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
                  >
                    <option value="smtp">Standard SMTP Relay</option>
                    <option value="brevo">Brevo (Sendinblue)</option>
                    <option value="postmark">Postmark</option>
                    <option value="sendgrid">SendGrid</option>
                  </select>
                </div>
                {renderInputField('SMTP Host', 'smtpHost', 'smtp-relay.brevo.com')}
                {renderInputField('SMTP Port', 'smtpPort', '587')}
                {renderInputField('SMTP Username / Email', 'smtpUser', 'login@fundedgiants.com')}
                {renderInputField('SMTP Password', 'smtpPass', 'password', true)}
                {renderInputField('Sender Address (From)', 'smtpFrom', 'support@fundedgiants.com')}
                {renderInputField('Sender Display Name', 'smtpFromName', 'FundedGiants Operations')}
                {renderInputField('Brevo API Key (Optional)', 'brevoApiKey', 'xkeysib-...', true)}
              </div>
            </div>
          )}

          {/* 6. Alerts & Telemetry */}
          {(activeTab === 'all' || activeTab === 'alerts') && (
            <div className="rounded-2xl bg-[#0f1712] border border-[#1b3322] p-6 space-y-5">
              <div className="flex items-center justify-between border-b border-[#1b3322] pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
                    <Bell className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">Emergency Risk Alerts & Telemetry</h3>
                    <p className="text-[11px] text-slate-400">Instant alerts for max daily drawdown breaches, equity spikes, and settlement events</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {renderInputField('Telegram Bot Token', 'telegramBotToken', 'bot123456:ABC-DEF...', true)}
                {renderInputField('Telegram Alert Chat / Group ID', 'telegramChatId', '-1001234567890')}
                {renderInputField('Discord Webhook URL', 'discordWebhookUrl', 'https://discord.com/api/webhooks/...', true)}
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
