'use client';

import { API_BASE_URL } from '@/lib/api';
import React, { useState } from 'react';
import { ShieldCheck, AlertCircle, Loader2, CheckCircle2, ArrowRight, X, RefreshCw } from 'lucide-react';

interface FundedGiantsKycModalProps {
  isOpen: boolean;
  onClose?: () => void;
  user: {
    firstName?: string;
    lastName?: string;
    email?: string;
    kycStatus?: string;
  };
  eligibility?: {
    eligible: boolean;
    reason?: string;
  } | null;
  onSuccess: () => void;
}

export function FundedGiantsKycModal({
  isOpen,
  onClose,
  user,
  eligibility,
  onSuccess,
}: FundedGiantsKycModalProps) {
  const [launchingHosted, setLaunchingHosted] = useState(false);
  const [syncingStatus, setSyncingStatus] = useState(false);
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
      setError(err.message || 'Failed to initialize identity verification. Please try again.');
      setLaunchingHosted(false);
    }
  };

  const handleCheckSync = async () => {
    setError(null);
    setSyncingStatus(true);
    try {
      const res = await fetch(`${API_BASE_URL}/auth/ninja-sync-status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email: user.email }),
      });

      const data = await res.json();
      if (res.ok && data?.kycStatus === 'APPROVED') {
        setSuccess(true);
        setTimeout(() => {
          onSuccess();
        }, 1500);
      } else {
        setError(data?.message || 'Verification is not yet confirmed by Ninja. Please complete all verification steps.');
      }
    } catch (err: any) {
      setError(err.message || 'Could not verify status with Ninja. Please try again.');
    } finally {
      setSyncingStatus(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
      <div className="relative w-full max-w-lg rounded-2xl border border-white/10 bg-[#070e0a] p-6 sm:p-8 shadow-2xl shadow-emerald-950/40">
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="absolute top-5 right-5 p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        )}
        <div className="flex items-center gap-3 mb-6">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight">FundedGiants KYC</h2>
            <p className="text-xs text-neutral-400">Identity Verification</p>
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
              Your profile is verified. Your dedicated deposit vault and SteraTrader accounts are active.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4 text-xs text-neutral-300 space-y-2">
              <p className="font-semibold text-white">Why is verification required?</p>
              <p className="text-neutral-400 leading-relaxed">
                To access withdrawals from FundedGiants, identity verification is required by our financial banking partners for all users processing financial transactions.
              </p>
            </div>

            {eligibility && !eligibility.eligible ? (
              <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-4 text-xs text-amber-200 space-y-2">
                <p className="font-semibold text-amber-300 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                  Identity Verification Locked
                </p>
                <p className="text-neutral-300 leading-relaxed">
                  {eligibility.reason || 'Identity verification unlocks automatically once you pass an evaluation challenge or reach the required profit target on your Phoenix Rise funded account.'}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <button
                  type="button"
                  onClick={handleLaunchHostedKyc}
                  disabled={launchingHosted || syncingStatus}
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

                <button
                  type="button"
                  onClick={handleCheckSync}
                  disabled={syncingStatus || launchingHosted}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-white/5 border border-white/10 py-2.5 text-xs font-semibold text-neutral-300 hover:text-white hover:bg-white/10 transition-all duration-200 disabled:opacity-50"
                >
                  {syncingStatus ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-emerald-400" />
                      Checking Ninja Verification Status...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-3.5 w-3.5 text-emerald-400" />
                      Already completed on Ninja? Check Status
                    </>
                  )}
                </button>
              </div>
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
