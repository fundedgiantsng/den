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
} from 'lucide-react';

export default function AdminEmergencyRecoveryPage() {
  const [recoveryKey, setRecoveryKey] = useState('');
  const [deviceLabel, setDeviceLabel] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successData, setSuccessData] = useState<{
    deviceFingerprint: string;
    deviceLabel: string;
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
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
      const res = await fetch(`${apiUrl}/admin/auth/emergency-recovery`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          recoveryKey: recoveryKey.trim(),
          deviceLabel: deviceLabel.trim() || 'Emergency Replacement Hardware Station',
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Authorization failed. Invalid recovery key.');
      }

      // Persist granted device fingerprint in local client storage
      localStorage.setItem('fg_admin_device_fingerprint', data.deviceFingerprint);
      document.cookie = `fg_admin_device_id=${data.deviceFingerprint}; path=/; max-age=31536000; SameSite=Lax`;

      setSuccessData({
        deviceFingerprint: data.deviceFingerprint,
        deviceLabel: data.deviceLabel,
        authorizedAt: data.authorizedAt,
      });

      // Redirect after 3 seconds
      setTimeout(() => {
        window.location.href = '/';
      }, 3000);
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
            FundedGiants administrative access is strictly bound to authorized physical hardware. If your primary workstation or primary phone was lost, stolen, or damaged, enter your offline Master Recovery Key below to permanently authorize this replacement hardware.
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
                <h3 className="text-lg font-bold text-white mb-1">Replacement Device Authorized</h3>
                <p className="text-xs text-slate-400">
                  Hardware lockdown successfully overridden for this terminal.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-black/50 border border-white/5 text-left space-y-2">
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-slate-400">Device Label:</span>
                  <span className="font-semibold text-white">{successData.deviceLabel}</span>
                </div>
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-slate-400">Device Fingerprint:</span>
                  <span className="font-mono text-emerald-400 font-bold">{successData.deviceFingerprint}</span>
                </div>
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

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-300">
                  Master Emergency Recovery Key
                </label>
                <div className="relative">
                  <input
                    type={showKey ? 'text' : 'password'}
                    value={recoveryKey}
                    onChange={(e) => setRecoveryKey(e.target.value)}
                    placeholder="FG-SEC-RECOVERY-..."
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
                  This 32+ character offline recovery token was generated during initial platform provisioning.
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-300">
                  Replacement Device Nickname / Label
                </label>
                <input
                  type="text"
                  value={deviceLabel}
                  onChange={(e) => setDeviceLabel(e.target.value)}
                  placeholder="e.g. Replacement MacBook Pro 16 / Backup Laptop"
                  className="w-full rounded-xl bg-[#070a08] border border-[#1b3322] px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
                <p className="text-[11px] text-slate-500">
                  Helps identify this authorized terminal in the security audit logs and settings panel.
                </p>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-600 via-emerald-600 to-emerald-500 hover:from-amber-500 hover:to-emerald-400 text-black text-xs font-black font-heading tracking-wide uppercase shadow-lg shadow-emerald-500/10 active:scale-98 transition disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <span>Verifying Master Token & Binding Hardware...</span>
                  ) : (
                    <>
                      <KeyRound className="w-4 h-4" />
                      <span>Authorize This Hardware Station</span>
                    </>
                  )}
                </button>
              </div>

              <div className="pt-2 border-t border-[#1b3322] flex items-center justify-between text-[11px] text-slate-500">
                <span className="flex items-center gap-1">
                  <Lock className="w-3 h-3 text-slate-400" />
                  SHA-256 Constant-Time Hardware Lock
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
