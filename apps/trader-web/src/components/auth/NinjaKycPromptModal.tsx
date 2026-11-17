'use client';

import React, { useState } from 'react';
import { ShieldCheck, AlertCircle, Loader2, CheckCircle2, X } from 'lucide-react';

interface NinjaKycPromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: {
    firstName?: string;
    lastName?: string;
    email?: string;
    kycStatus?: string;
  };
  onSuccess: () => void;
}

export function NinjaKycPromptModal({
  isOpen,
  onClose,
  user,
  onSuccess,
}: NinjaKycPromptModalProps) {
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
      const res = await fetch('http://localhost:4000/api/v1/auth/ninja-hosted-kyc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });

      const data = await res.json();
      if (!res.ok || !data.data?.url) {
        throw new Error(data.message || 'Unable to launch Ninja Hosted KYC session.');
      }

      // Redirect user to Ninja.ng Hosted Verification page
      window.location.href = data.data.url;
    } catch (err: any) {
      setError(err.message || 'Failed to initialize Ninja KYC hosted flow. Try manual BVN verification.');
      setLaunchingHosted(false);
    }
  };

  const handleBvnChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 11);
    setBvn(val);
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (bvn.length !== 11) {
      setError('Bank Verification Number (BVN) must be exactly 11 digits.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('http://localhost:4000/api/v1/auth/ninja-bvn-verify', {
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
        throw new Error(data.message || 'NinjaKYC verification failed. Please verify your BVN.');
      }

      setSuccess(true);
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-sm"
        onClick={() => !loading && !launchingHosted && onClose()}
      />

      {/* Modal Dialog */}
      <div className="relative z-10 w-full max-w-lg bg-bg-surface border border-fgBorder-subtle rounded-2xl shadow-2xl p-6 sm:p-8 space-y-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Identity Verification (NinjaKYC)</h3>
              <p className="text-xs text-fgText-secondary">
                Official Ninja.ng Hosted Verification for biometric & BVN validation
              </p>
            </div>
          </div>
          <button
            type="button"
            disabled={loading || launchingHosted}
            onClick={onClose}
            className="p-1 rounded-lg text-fgText-muted hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {success ? (
          <div className="p-6 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex flex-col items-center text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h4 className="text-base font-bold text-white">Verification Successful!</h4>
            <p className="text-xs text-emerald-200">
              Your identity has been verified via NinjaKYC. Your dedicated deposit account is activated.
            </p>
          </div>
        ) : (
          <div className="space-y-5">
            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center gap-2 text-xs text-red-400">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Profile on File Info */}
            <div className="p-3.5 bg-bg-card rounded-xl border border-fgBorder-subtle space-y-2">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-fgText-muted">
                Profile on File
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-fgText-secondary block">Full Name:</span>
                  <span className="text-white font-medium">
                    {user.firstName || 'Valued'} {user.lastName || 'Trader'}
                  </span>
                </div>
                <div>
                  <span className="text-fgText-secondary block">Email:</span>
                  <span className="text-white font-medium truncate block">
                    {user.email || 'user@fundedgiants.ng'}
                  </span>
                </div>
              </div>
            </div>

            {/* Ninja Hosted KYC Flow (Primary) */}
            {!useDirectBvn ? (
              <div className="p-5 rounded-xl bg-black/40 border border-emerald-500/30 space-y-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                      Ninja.ng Hosted Verification Flow
                    </h4>
                  </div>
                  <p className="text-xs text-fgText-secondary leading-relaxed">
                    You will be directed to Ninja&apos;s secure hosted verification portal to submit your BVN/NIN and complete biometric liveness. Upon completion, you will be redirected back and your dedicated deposit account will be auto-generated.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleLaunchHostedKyc}
                  disabled={launchingHosted}
                  className="w-full py-3.5 rounded-xl bg-[#00e575] hover:bg-[#00c966] disabled:opacity-50 text-black font-heading font-extrabold text-xs shadow-lg shadow-emerald-500/20 active:scale-95 transition flex items-center justify-center gap-2"
                >
                  {launchingHosted ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Creating Secure Hosted Session...</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4" />
                      <span>Start Ninja Hosted KYC Verification</span>
                    </>
                  )}
                </button>

                <div className="text-center pt-1">
                  <button
                    type="button"
                    onClick={() => setUseDirectBvn(true)}
                    className="text-[11px] text-fgText-muted hover:text-emerald-400 transition"
                  >
                    Or verify directly with BVN
                  </button>
                </div>
              </div>
            ) : (
              /* Fallback Direct BVN Input */
              <form onSubmit={handleVerify} className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-fgText-secondary">
                      Bank Verification Number (BVN)
                    </label>
                    <span className="text-[11px] text-fgText-muted">{bvn.length}/11 digits</span>
                  </div>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={11}
                    value={bvn}
                    onChange={handleBvnChange}
                    placeholder="Enter 11-digit BVN"
                    className="w-full px-4 py-3 bg-bg-card rounded-xl border border-fgBorder-subtle text-sm text-white placeholder-fgText-muted tracking-widest focus:outline-none focus:border-emerald-500 transition-colors"
                    required
                  />
                  <p className="text-[11px] text-fgText-muted mt-1.5">
                    Direct validation against Nigerian Interbank Settlement System via NinjaKYC.
                  </p>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <button
                    type="button"
                    onClick={() => setUseDirectBvn(false)}
                    className="text-xs text-fgText-muted hover:text-white"
                  >
                    ← Switch to Hosted KYC
                  </button>
                  <button
                    type="submit"
                    disabled={loading || bvn.length !== 11}
                    className="px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-xs font-bold text-black flex items-center gap-2 transition-all shadow-lg shadow-emerald-500/20"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Verifying...</span>
                      </>
                    ) : (
                      <span>Verify BVN</span>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
