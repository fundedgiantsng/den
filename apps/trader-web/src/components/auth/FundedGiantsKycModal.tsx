'use client';

import { API_BASE_URL } from '@/lib/api';
import React, { useState } from 'react';
import { ShieldCheck, AlertCircle, Loader2, CheckCircle2, ArrowRight } from 'lucide-react';

interface FundedGiantsKycModalProps {
  isOpen: boolean;
  onClose?: () => void;
  user: {
    firstName?: string;
    lastName?: string;
    email?: string;
    kycStatus?: string;
  };
  onSuccess: () => void;
}

export function FundedGiantsKycModal({
  isOpen,
  user,
  onSuccess,
}: FundedGiantsKycModalProps) {
  const [bvn, setBvn] = useState('');
  const [loading, setLoading] = useState(false);
  const [launchingHosted, setLaunchingHosted] = useState(false);
  const [useDirectBvn, setUseDirectBvn] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const handleLaunchHostedKyc = async () => {
    setError(null);
    setLaunchingHosted(true);
    try {
      const res = await fetch(`${API_BASE_URL}/auth/ninja-hosted-kyc`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email: user.email }),
      });

      const data = await res.json();
      if (!res.ok || !data.data?.url) {
        throw new Error(data.message || 'Unable to initialize identity verification session.');
      }

      // Redirect user to the secure verification gateway
      window.location.href = data.data.url;
    } catch (err: any) {
      setError(err.message || 'Failed to initialize identity verification. You can also use Quick BVN Verification below.');
      setLaunchingHosted(false);
    }
  };

  const handleBvnChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 11);
    setBvn(val);
  };

  const handleVerifyBvn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (bvn.length !== 11) {
      setError('Bank Verification Number (BVN) must be exactly 11 digits.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/auth/ninja-bvn-verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          bvn,
          email: user.email,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Identity verification failed. Please check your BVN details.');
      }

      setSuccess(true);
      setTimeout(() => {
        onSuccess();
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Verification failed. Please retry.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
      <div className="relative w-full max-w-lg rounded-2xl border border-white/10 bg-[#070e0a] p-6 sm:p-8 shadow-2xl shadow-emerald-950/40">
        <div className="flex items-center gap-3 mb-6">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight">FundedGiants KYC</h2>
            <p className="text-xs text-neutral-400">Mandatory Identity Verification</p>
          </div>
        </div>

        {error && (
          <div className="mb-5 flex items-center gap-3 rounded-xl border border-red-500/20 bg-red-500/10 p-3.5 text-xs text-red-300">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
            <span>{error}</span>
          </div>
        )}

        {success ? (
          <div className="py-8 text-center space-y-3">
            <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 mb-2">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <h3 className="text-lg font-bold text-white">Identity Verified Successfully!</h3>
            <p className="text-xs text-neutral-400 max-w-sm mx-auto">
              Your profile is verified. Your dedicated deposit vault and SteraTrader accounts are now active.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4 text-xs text-neutral-300 space-y-2">
              <p className="font-semibold text-white">Why is verification required?</p>
              <p className="text-neutral-400 leading-relaxed">
                As a regulated proprietary trading firm, Nigerian financial regulations require identity verification before trading account provisioning and dedicated wallet deposit activation.
              </p>
            </div>

            {!useDirectBvn ? (
              <div className="space-y-4">
                <button
                  type="button"
                  onClick={handleLaunchHostedKyc}
                  disabled={launchingHosted}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-500 py-3.5 text-sm font-semibold text-black hover:bg-emerald-400 transition-all duration-200 disabled:opacity-50 shadow-lg shadow-emerald-500/20"
                >
                  {launchingHosted ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Connecting to Verification Gateway...
                    </>
                  ) : (
                    <>
                      Complete KYC
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>

                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => setUseDirectBvn(true)}
                    className="text-xs text-neutral-400 hover:text-emerald-400 underline transition-colors"
                  >
                    Or verify quickly using your 11-digit BVN
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleVerifyBvn} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                    11-Digit Bank Verification Number (BVN)
                  </label>
                  <input
                    type="text"
                    value={bvn}
                    onChange={handleBvnChange}
                    placeholder="Enter 11-digit BVN"
                    required
                    className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 px-4 text-sm text-white placeholder-neutral-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-all font-mono tracking-widest text-center"
                  />
                  <p className="mt-1.5 text-[11px] text-neutral-500 text-center">
                    Dial *565*0# on your registered SIM to retrieve your BVN.
                  </p>
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setUseDirectBvn(false)}
                    className="flex-1 rounded-xl border border-white/10 bg-white/5 py-2.5 text-xs font-semibold text-neutral-300 hover:bg-white/10 transition-colors"
                  >
                    Back to Hosted KYC
                  </button>
                  <button
                    type="submit"
                    disabled={loading || bvn.length !== 11}
                    className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-emerald-500 py-2.5 text-xs font-semibold text-black hover:bg-emerald-400 transition-colors disabled:opacity-50"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        Verifying...
                      </>
                    ) : (
                      'Verify BVN'
                    )}
                  </button>
                </div>
              </form>
            )}

            <div className="pt-2 text-center text-[11px] text-neutral-500">
              🔒 256-bit Bank-grade encryption. Your data is encrypted and strictly protected.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
