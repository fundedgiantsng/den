'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import {
  ShieldCheck,
  Lock,
  Key,
  Laptop,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  Eye,
  EyeOff,
  CheckCircle2,
  MessageSquare,
  RefreshCw,
} from 'lucide-react';
import { getAdminDeviceFingerprint, setAdminAuth, API_BASE_URL } from '@/lib/api';

function AdminLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectPath = searchParams.get('redirect') || '/';

  // Step 1: Keyphrase, Step 2: WhatsApp OTP
  const [step, setStep] = useState<'KEYPHRASE' | 'OTP'>('KEYPHRASE');

  const [keyphrase, setKeyphrase] = useState('');
  const [showKeyphrase, setShowKeyphrase] = useState(false);
  const [otp, setOtp] = useState('');
  const [challengeId, setChallengeId] = useState('');
  const [maskedPhone, setMaskedPhone] = useState('');
  const [deliveryChannel, setDeliveryChannel] = useState('WHATSAPP');

  const [masterKey, setMasterKey] = useState('');
  const [showMasterKey, setShowMasterKey] = useState(false);
  const [deviceFingerprint, setDeviceFingerprint] = useState('');
  const [requiresDeviceBinding, setRequiresDeviceBinding] = useState(false);
  const [deviceLabel, setDeviceLabel] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    const devId = getAdminDeviceFingerprint();
    setDeviceFingerprint(devId);
    setDeviceLabel(`Admin Browser (${typeof navigator !== 'undefined' ? navigator.platform : 'Workstation'})`);
  }, []);

  // Timer for resend cooldown
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  // Step 1: Request OTP with Secret Keyphrase
  const handleRequestOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!keyphrase.trim()) {
      setError('Please enter the executive access keyphrase.');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE_URL}/admin/auth/request-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-device-fingerprint': deviceFingerprint,
          'x-admin-device-id': deviceFingerprint,
        },
        body: JSON.stringify({
          keyphrase: keyphrase.trim(),
          deviceFingerprint,
          deviceLabel,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || `Request failed with status ${res.status}`);
      }

      setChallengeId(data.challengeId);
      setMaskedPhone(data.maskedPhone || 'Security Line');
      setDeliveryChannel(data.deliveryChannel || 'WHATSAPP');
      setStep('OTP');
      setResendCooldown(60);
      setOtp('');
    } catch (err: any) {
      setError(err.message || 'Verification request failed. Check keyphrase and try again.');
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify OTP and Device Binding
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp.trim()) {
      setError('Please enter the 6-digit verification code.');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE_URL}/admin/auth/verify-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-device-fingerprint': deviceFingerprint,
          'x-admin-device-id': deviceFingerprint,
        },
        body: JSON.stringify({
          challengeId,
          otp: otp.trim(),
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
        throw new Error(data.message || `Verification failed with status ${res.status}`);
      }

      setSuccess(true);
      setAdminAuth(data.token, data.deviceFingerprint);

      setTimeout(() => {
        router.push(redirectPath);
      }, 600);
    } catch (err: any) {
      setError(err.message || 'OTP verification failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md space-y-6 relative z-10">
      {/* Brand & Security Header */}
      <div className="text-center space-y-3 flex flex-col items-center">
        <div className="relative h-10 w-48 mb-1">
          <Image
            src="/brand/logo-white.png"
            alt="FundedGiants"
            fill
            className="object-contain object-center"
            priority
          />
        </div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-[11px] font-mono text-emerald-400">
          <Lock className="w-3.5 h-3.5" />
          <span>ADMIN EXECUTIVE GATEWAY</span>
        </div>
        <p className="text-xs text-slate-400 font-medium">
          Tier-5 Executive Access • Two-Factor WhatsApp Security Gate
        </p>
      </div>

      {/* Security Notification Banner */}
      <div className="rounded-xl bg-[#0f1712] border border-[#1b3322] p-3 text-[11px] text-slate-300 flex items-start gap-2.5">
        <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold text-white">Dual-Lock Protection Active:</span> Access requires executive keyphrase authorization followed by WhatsApp OTP dispatch and cryptographic terminal device mapping.
        </div>
      </div>

      {/* Form Card */}
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
            <span>Verification successful. Opening Command Console...</span>
          </div>
        )}

        {step === 'KEYPHRASE' ? (
          /* STEP 1: Enter Secret Keyphrase */
          <form onSubmit={handleRequestOtp} className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Executive Access Keyphrase
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Key className="w-4 h-4" />
                </div>
                <input
                  type={showKeyphrase ? 'text' : 'password'}
                  required
                  value={keyphrase}
                  onChange={(e) => setKeyphrase(e.target.value)}
                  placeholder="Enter Secret Keyphrase"
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-[#070a08] border border-[#1b3322] text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/40 transition-colors font-mono"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowKeyphrase(!showKeyphrase)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-500 hover:text-slate-300 transition-colors"
                >
                  {showKeyphrase ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-[10px] text-slate-500">
                Upon verification, a one-time security pass will be sent via WhatsApp to the registered administrator line.
              </p>
            </div>

            {/* Hardware Terminal Display */}
            <div className="p-3 rounded-xl bg-[#070a08] border border-[#1b3322] space-y-1">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-400 font-semibold flex items-center gap-1.5">
                  <Laptop className="w-3.5 h-3.5 text-emerald-400" />
                  Terminal ID:
                </span>
                <span className="font-mono text-[10px] text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-500/20">
                  {deviceFingerprint || 'ACTIVE_DETECTOR'}
                </span>
              </div>
              <p className="text-[10px] text-slate-500">
                Cryptographic hardware footprint bound to this login attempt.
              </p>
            </div>

            {/* Request OTP Button */}
            <button
              type="submit"
              disabled={loading || !keyphrase.trim()}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-black font-bold text-sm tracking-wide transition-all shadow-lg shadow-emerald-950/40 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed mt-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                  <span>Verifying Keyphrase & Dispatching Code...</span>
                </>
              ) : (
                <>
                  <MessageSquare className="w-4 h-4" />
                  <span>Request WhatsApp Access Code</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        ) : (
          /* STEP 2: Enter WhatsApp OTP */
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <div className="rounded-xl bg-emerald-950/40 border border-emerald-500/30 p-3 text-xs text-emerald-300 flex items-start gap-2.5">
              <MessageSquare className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-white">Code Dispatched via {deliveryChannel}:</span>
                <p className="mt-0.5 text-emerald-300/90 text-[11px]">
                  Check WhatsApp on administrator line <span className="font-mono font-bold text-emerald-200">{maskedPhone}</span> for your 6-digit access OTP.
                </p>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">
                6-Digit Security OTP
              </label>
              <input
                type="text"
                required
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/[^0-9]/g, ''))}
                placeholder="000000"
                className="w-full text-center tracking-[0.5em] font-mono text-2xl py-3 rounded-xl bg-[#070a08] border border-[#1b3322] text-emerald-400 placeholder-slate-700 focus:outline-none focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/40 transition-colors"
                autoFocus
              />
            </div>

            {/* Lock 2 Challenge: Master Key if Unregistered Device */}
            {requiresDeviceBinding && (
              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                <div className="flex items-center gap-2 text-xs font-bold text-amber-300">
                  <Key className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>Hardware Device Authorization Required</span>
                </div>
                <p className="text-[11px] text-slate-300">
                  This device is not yet registered in the platform hardware registry. Enter the Admin Master Recovery Key to approve and permanently bind this workstation.
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
                    placeholder="e.g. CEO Admin Workstation"
                    className="w-full px-3 py-1.5 rounded-lg bg-[#070a08] border border-[#1b3322] text-xs text-slate-200"
                  />
                </div>
              </div>
            )}

            {/* Verify Button */}
            <button
              type="submit"
              disabled={loading || otp.length < 6}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-black font-bold text-sm tracking-wide transition-all shadow-lg shadow-emerald-950/40 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed mt-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                  <span>Verifying Code & Terminal...</span>
                </>
              ) : (
                <>
                  <span>Verify & Enter Console</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            {/* Resend & Back Actions */}
            <div className="flex items-center justify-between text-xs pt-2">
              <button
                type="button"
                onClick={() => {
                  setStep('KEYPHRASE');
                  setError(null);
                }}
                className="text-slate-400 hover:text-slate-200 flex items-center gap-1 transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Change Keyphrase</span>
              </button>

              <button
                type="button"
                disabled={resendCooldown > 0 || loading}
                onClick={() => handleRequestOtp()}
                className="text-emerald-400 hover:text-emerald-300 disabled:text-slate-600 disabled:cursor-not-allowed flex items-center gap-1 transition-colors font-medium"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                <span>
                  {resendCooldown > 0 ? `Resend Code (${resendCooldown}s)` : 'Resend WhatsApp Code'}
                </span>
              </button>
            </div>
          </form>
        )}

        {/* Footer Security Notice - No link to /recovery */}
        <div className="pt-4 border-t border-[#1b3322]/80 flex items-center justify-between text-[11px] text-slate-500">
          <span>Terminal Security: Active</span>
          <span className="font-mono text-emerald-400/80">Hardware Gate Enforced</span>
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

      <Suspense
        fallback={
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-xs text-slate-400 font-mono">Loading security gate...</p>
          </div>
        }
      >
        <AdminLoginForm />
      </Suspense>
    </div>
  );
}
