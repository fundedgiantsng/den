'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ShieldCheck,
  Lock,
  User,
  Key,
  Laptop,
  AlertCircle,
  ArrowRight,
  Eye,
  EyeOff,
  CheckCircle2,
  ExternalLink,
} from 'lucide-react';
import { getAdminDeviceFingerprint, setAdminAuth } from '@/lib/api';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

function AdminLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectPath = searchParams.get('redirect') || '/';

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [masterKey, setMasterKey] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showMasterKey, setShowMasterKey] = useState(false);
  const [deviceFingerprint, setDeviceFingerprint] = useState('');
  const [requiresDeviceBinding, setRequiresDeviceBinding] = useState(false);
  const [deviceLabel, setDeviceLabel] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const devId = getAdminDeviceFingerprint();
    setDeviceFingerprint(devId);
    setDeviceLabel(`Admin Browser (${typeof navigator !== 'undefined' ? navigator.platform : 'Workstation'})`);
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE_URL}/admin/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-device-fingerprint': deviceFingerprint,
          'x-admin-device-id': deviceFingerprint,
        },
        body: JSON.stringify({
          username,
          password,
          deviceFingerprint,
          deviceLabel,
          masterKey: masterKey.trim() || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (
          res.status === 403 &&
          (data.message?.includes('UNAUTHORIZED_DEVICE') || data.message?.includes('bind this terminal'))
        ) {
          setRequiresDeviceBinding(true);
          throw new Error('Unregistered Device: This browser is not authorized. Enter the Admin Master Key below to bind this terminal.');
        }
        throw new Error(data.message || `Login failed with status ${res.status}`);
      }

      setSuccess(true);
      setAdminAuth(data.token, data.deviceFingerprint);

      setTimeout(() => {
        router.push(redirectPath);
      }, 600);
    } catch (err: any) {
      setError(err.message || 'Authentication error.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md space-y-6 relative z-10">
      {/* Brand & Security Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-emerald-950/40 border border-emerald-500/30 text-emerald-400 mb-2 shadow-lg shadow-emerald-950/50">
          <Lock className="w-7 h-7 text-emerald-400" />
        </div>
        <h1 className="text-2xl font-black tracking-tight text-white uppercase">
          FundedGiants <span className="text-emerald-400">Admin Station</span>
        </h1>
        <p className="text-xs text-slate-400 font-medium">
          Tier-5 Executive Access • Dual Security Gate Enforced
        </p>
      </div>

      {/* Security Notification Banner */}
      <div className="rounded-xl bg-[#0f1712] border border-[#1b3322] p-3 text-[11px] text-slate-300 flex items-start gap-2.5">
        <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold text-white">Dual-Lock Protection Active:</span> Both verified administrator credentials and a cryptographic hardware terminal binding are mandatory to access the operations panel.
        </div>
      </div>

      {/* Login Form Card */}
      <div className="rounded-2xl bg-[#0f1712]/90 border border-[#1b3322] shadow-2xl p-6 md:p-8 space-y-6 backdrop-blur-md">
        {error && (
          <div className="rounded-xl bg-rose-500/10 border border-rose-500/30 p-3.5 text-xs text-rose-300 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/30 p-3.5 text-xs text-emerald-300 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Credentials and hardware verified. Opening Command Console...</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          {/* Lock 1: Admin Username */}
          <div className="space-y-1.5">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Administrator Username / Email
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                <User className="w-4 h-4" />
              </div>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="admin"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#070a08] border border-[#1b3322] text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/40 transition-colors"
              />
            </div>
          </div>

          {/* Lock 1: Password */}
          <div className="space-y-1.5">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Executive Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••••••"
                className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-[#070a08] border border-[#1b3322] text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/40 transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-500 hover:text-slate-300 transition-colors"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Lock 2: Hardware Device ID Display */}
          <div className="p-3 rounded-xl bg-[#070a08] border border-[#1b3322] space-y-1.5">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-400 font-semibold flex items-center gap-1.5">
                <Laptop className="w-3.5 h-3.5 text-emerald-400" />
                Terminal Hardware ID:
              </span>
              <span className="font-mono text-[10px] text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-500/20">
                {deviceFingerprint || 'DETECTOR_ACTIVE'}
              </span>
            </div>
            <p className="text-[10px] text-slate-500">
              This browser instance has been tagged with a cryptographic terminal signature.
            </p>
          </div>

          {/* Lock 2 Challenge: Master Key for Unregistered Devices */}
          {requiresDeviceBinding && (
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
              <div className="flex items-center gap-2 text-xs font-bold text-amber-300">
                <Key className="w-4 h-4 text-amber-400 shrink-0" />
                <span>Hardware Device Authorization Required</span>
              </div>
              <p className="text-[11px] text-slate-300">
                This device is not yet registered in the platform hardware registry. Enter the Admin Master Recovery Key to approve and permanently bind this device.
              </p>

              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-amber-200">
                  Admin Master Device Key
                </label>
                <div className="relative">
                  <input
                    type={showMasterKey ? 'text' : 'password'}
                    value={masterKey}
                    onChange={(e) => setMasterKey(e.target.value)}
                    placeholder="FG-SEC-RECOVERY-..."
                    className="w-full px-3 py-2 rounded-lg bg-[#070a08] border border-amber-500/40 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-amber-400 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowMasterKey(!showMasterKey)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-300"
                  >
                    {showMasterKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Device Label
                </label>
                <input
                  type="text"
                  value={deviceLabel}
                  onChange={(e) => setDeviceLabel(e.target.value)}
                  placeholder="e.g. CEO MacBook Pro"
                  className="w-full px-3 py-1.5 rounded-lg bg-[#070a08] border border-[#1b3322] text-xs text-slate-200"
                />
              </div>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-black font-bold text-sm tracking-wide transition-all shadow-lg shadow-emerald-950/40 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed mt-2"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                <span>Verifying Dual Lock...</span>
              </>
            ) : (
              <>
                <span>Authenticate & Enter Console</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Footer Security Links */}
        <div className="pt-4 border-t border-[#1b3322]/80 flex items-center justify-between text-[11px] text-slate-500">
          <span>Terminal Security: Active</span>
          <a
            href="/recovery"
            className="text-emerald-400 hover:text-emerald-300 transition-colors flex items-center gap-1 font-medium"
          >
            <span>Emergency Recovery</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <div className="min-h-screen bg-[#070a08] text-slate-100 flex flex-col justify-center items-center px-4 py-12 relative overflow-hidden">
      {/* Background Decorative Rings */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-[300px] h-[300px] bg-emerald-500/5 rounded-full blur-2xl pointer-events-none" />

      <Suspense fallback={
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-slate-400 font-mono">Loading security gate...</p>
        </div>
      }>
        <AdminLoginForm />
      </Suspense>
    </div>
  );
}
