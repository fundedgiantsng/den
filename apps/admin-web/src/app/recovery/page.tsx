'use client';

import React, { useState } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  KeyRound,
  Laptop,
  Smartphone,
  AlertTriangle,
  ArrowRight,
  Eye,
  EyeOff,
  CheckCircle2,
  Lock,
  Clock,
} from 'lucide-react';

export default function AdminEmergencyRecoveryPage() {
  const [recoveryKey, setRecoveryKey] = useState('');
  const [deviceLabel, setDeviceLabel] = useState('');
  const [mode, setMode] = useState<'PERMANENT' | 'TEMPORARY'>('PERMANENT');
  const [showKey, setShowKey] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successData, setSuccessData] = useState<{
    deviceFingerprint: string;
    deviceLabel: string;
    mode: 'PERMANENT' | 'TEMPORARY';
    expiresAt?: string | null;
    authorizedAt: string;
  } | null>(null);

  const handleAuthorizeDevice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recoveryKey.trim()) {
      setError('Master Emergency Recovery Key is required.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.fundedgiants.ng/api/v1';
      const res = await fetch(`${apiUrl}/admin/auth/emergency-recovery`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          recoveryKey: recoveryKey.trim(),
          deviceLabel: deviceLabel.trim() || undefined,
          mode,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Authorization failed. Invalid recovery key.');
      }

      // Persist granted device fingerprint in local client storage
      localStorage.setItem('fg_admin_device_fingerprint', data.deviceFingerprint);
      const cookieAge = mode === 'TEMPORARY' ? 86400 : 31536000;
      document.cookie = `fg_admin_device_id=${data.deviceFingerprint}; path=/; max-age=${cookieAge}; SameSite=Lax`;

      setSuccessData({
        deviceFingerprint: data.deviceFingerprint,
        deviceLabel: data.deviceLabel,
        mode: data.mode,
        expiresAt: data.expiresAt,
        authorizedAt: data.authorizedAt,
      });

      // Redirect after 3 seconds
      setTimeout(() => {
        window.location.href = '/';
      }, 2500);
    } catch (err: any) {
      setError(err.message || 'Emergency recovery verification failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#070a08] text-white flex flex-col items-center justify-center p-4 sm:p-6 font-sans">
      <div className="w-full max-w-xl">
        {/* Brand Lock Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 mb-4 shadow-xl shadow-amber-500/5">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold font-heading tracking-tight text-white mb-2">
            Admin Emergency Recovery Portal
          </h1>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            FundedGiants Hardware Lockdown Protocol & Device Replacement Authorization
          </p>
        </div>

        {/* Security Advisory Card */}
        <div className="mb-6 p-4 rounded-xl bg-[#0f1712] border border-[#1b3322] flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="text-xs text-slate-300 leading-relaxed">
            <span className="font-bold text-amber-400 block mb-1">Restricted Administrative Route</span>
            FundedGiants administrative access is strictly bound to authorized physical hardware. If your primary workstation or primary phone was lost, stolen, or damaged, enter your offline Master Recovery Key below to authorize access.
          </div>
        </div>

        {/* Form Card */}
        <div className="rounded-2xl bg-[#0f1712] border border-[#1b3322] p-6 sm:p-8 shadow-2xl relative overflow-hidden">
          {successData ? (
            <div className="space-y-6 text-center py-4">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white mb-1">
                  {successData.mode === 'TEMPORARY' ? 'Temporary Emergency Session Active' : 'Replacement Device Permanently Bound'}
                </h3>
                <p className="text-xs text-slate-400">
                  {successData.mode === 'TEMPORARY'
                    ? '24-hour temporary access pass granted. Hardware not permanently whitelisted.'
                    : 'Hardware lockdown successfully overridden. Device permanently whitelisted.'}
                </p>
              </div>

              <div className="p-4 rounded-xl bg-black/50 border border-white/5 text-left space-y-2">
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-slate-400">Access Mode:</span>
                  <span className="font-semibold text-emerald-400">{successData.mode === 'TEMPORARY' ? 'Temporary (24h Pass)' : 'Permanent Hardware Binding'}</span>
                </div>
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-slate-400">Device Label:</span>
                  <span className="font-semibold text-white">{successData.deviceLabel}</span>
                </div>
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-slate-400">Device Fingerprint:</span>
                  <span className="font-mono text-emerald-400 font-bold">{successData.deviceFingerprint}</span>
                </div>
                {successData.expiresAt && (
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-slate-400">Expires At:</span>
                    <span className="text-amber-400 font-semibold">{new Date(successData.expiresAt).toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-slate-400">Authorized At:</span>
                  <span className="text-slate-300">{new Date(successData.authorizedAt).toLocaleString()}</span>
                </div>
              </div>

              <div className="text-xs text-emerald-400 font-semibold animate-pulse">
                Redirecting to Admin Control Panel in a few seconds...
              </div>

              <a
                href="/"
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold transition shadow-lg shadow-emerald-500/20"
              >
                <span>Enter Control Panel Now</span>
                <ArrowRight className="w-4 h-4" />
              </a>
            </div>
          ) : (
            <form onSubmit={handleAuthorizeDevice} className="space-y-5">
              {error && (
                <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2.5">
                  <ShieldAlert className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Authorization Purpose / Mode Toggle */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-300">
                  Authorization Purpose
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setMode('PERMANENT')}
                    className={`p-3 rounded-xl border text-left transition ${
                      mode === 'PERMANENT'
                        ? 'bg-emerald-500/15 border-emerald-500/50 text-white'
                        : 'bg-[#070a08] border-[#1b3322] text-slate-400 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2 text-xs font-bold mb-1">
                      <Laptop className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Bind New Device</span>
                    </div>
                    <div className="text-[10px] text-slate-400 leading-tight">
                      Permanently whitelists this laptop or phone as a replacement admin device.
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setMode('TEMPORARY')}
                    className={`p-3 rounded-xl border text-left transition ${
                      mode === 'TEMPORARY'
                        ? 'bg-amber-500/15 border-amber-500/50 text-white'
                        : 'bg-[#070a08] border-[#1b3322] text-slate-400 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2 text-xs font-bold mb-1">
                      <Clock className="w-3.5 h-3.5 text-amber-400" />
                      <span>Temporary (24h)</span>
                    </div>
                    <div className="text-[10px] text-slate-400 leading-tight">
                      Temporary 24h session. Does not permanently bind or save this hardware.
                    </div>
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-300">
                  Master Emergency Recovery Key
                </label>
                <div className="relative">
                  <input
                    type={showKey ? 'text' : 'password'}
                    value={recoveryKey}
                    onChange={(e) => setRecoveryKey(e.target.value)}
                    placeholder="Enter offline master recovery key..."
                    required
                    className="w-full rounded-xl bg-[#070a08] border border-[#1b3322] px-3.5 py-2.5 pr-10 text-xs text-white focus:outline-none focus:border-amber-500 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowKey(!showKey)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                  >
                    {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[11px] text-slate-500">
                  Recommended pattern: <code className="font-mono text-slate-400">FG-SEC-RECOVERY-&#123;128BIT_HEX&#125;-MASTER-OVERRIDE</code>
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-300">
                  Device Nickname / Label (Optional)
                </label>
                <input
                  type="text"
                  value={deviceLabel}
                  onChange={(e) => setDeviceLabel(e.target.value)}
                  placeholder={mode === 'TEMPORARY' ? 'e.g. Hotel Workstation / Borrowed Laptop' : 'e.g. Replacement MacBook Pro 16 / Personal iPhone'}
                  className="w-full rounded-xl bg-[#070a08] border border-[#1b3322] px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-600 via-emerald-600 to-emerald-500 hover:from-amber-500 hover:to-emerald-400 text-black text-xs font-black font-heading tracking-wide uppercase shadow-lg shadow-emerald-500/10 active:scale-98 transition disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <span>Verifying Master Token & Authorizing Access...</span>
                  ) : (
                    <>
                      <KeyRound className="w-4 h-4" />
                      <span>{mode === 'TEMPORARY' ? 'Grant 24-Hour Emergency Access' : 'Permanently Authorize This Terminal'}</span>
                    </>
                  )}
                </button>
              </div>

              <div className="pt-2 border-t border-[#1b3322] flex items-center justify-between text-[11px] text-slate-500">
                <span className="flex items-center gap-1">
                  <Lock className="w-3 h-3 text-slate-400" />
                  SHA-256 Constant-Time Lock
                </span>
                <span>FundedGiants Core Security</span>
              </div>
            </form>
          )}
        </div>

        {/* Back Link */}
        <div className="text-center mt-6">
          <a
            href="/"
            className="text-xs text-slate-400 hover:text-white transition flex items-center justify-center gap-1.5"
          >
            <span>Return to Admin Login</span>
            <ArrowRight className="w-3 h-3" />
          </a>
        </div>
      </div>
    </div>
  );
}
