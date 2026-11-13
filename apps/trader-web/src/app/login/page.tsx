'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Mail, Phone, ArrowRight, ShieldCheck, Wallet, Copy, Award, Loader2 } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [authType, setAuthType] = useState<'EMAIL' | 'PHONE'>('EMAIL');
  const [identifier, setIdentifier] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!identifier.trim()) {
      setError(authType === 'EMAIL' ? 'Please enter your email address' : 'Please enter your phone number');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('http://localhost:4000/api/v1/auth/request-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier: identifier.trim(),
          type: authType,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to request verification code');
      }

      // Navigate to OTP verification screen with state
      router.push(`/verify?identifier=${encodeURIComponent(identifier.trim())}&channel=${data.channel}`);
    } catch (err: any) {
      setError(err.message || 'Something went wrong. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-between p-6 md:p-12">
      {/* Top Bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-bg-card card-border-glow flex items-center justify-center">
            <span className="text-emerald-400 font-bold text-xl font-heading">FG</span>
          </div>
          <span className="text-xl font-heading font-extrabold tracking-tight text-white">
            FundedGiants
          </span>
        </div>

        <div className="flex items-center gap-2 text-xs text-fgText-secondary">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>Secure & Encrypted</span>
        </div>
      </div>

      {/* Main Form Center */}
      <div className="max-w-md w-full mx-auto my-auto py-12">
        <h1 className="text-4xl md:text-5xl font-heading font-extrabold text-white tracking-tight mb-3">
          Welcome <span className="text-emerald-400">Back</span>
        </h1>
        <p className="text-sm text-fgText-secondary mb-8">
          Access your account and take control of your trading journey.
        </p>

        {/* Auth Mode Toggle */}
        <div className="flex rounded-xl bg-bg-card p-1 mb-6 border border-fgBorder-subtle">
          <button
            type="button"
            onClick={() => {
              setAuthType('EMAIL');
              setIdentifier('');
              setError(null);
            }}
            className={`flex-1 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
              authType === 'EMAIL'
                ? 'bg-emerald-500 text-bg-base shadow-sm'
                : 'text-fgText-secondary hover:text-white'
            }`}
          >
            <Mail className="w-3.5 h-3.5" />
            <span>Email</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setAuthType('PHONE');
              setIdentifier('');
              setError(null);
            }}
            className={`flex-1 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
              authType === 'PHONE'
                ? 'bg-emerald-500 text-bg-base shadow-sm'
                : 'text-fgText-secondary hover:text-white'
            }`}
          >
            <Phone className="w-3.5 h-3.5" />
            <span>Phone (SMS)</span>
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-950/40 border border-red-500/30 text-red-400 text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-fgText-secondary mb-2">
              {authType === 'EMAIL' ? 'Email Address' : 'Phone Number (e.g. +2348012345678)'}
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-fgText-muted">
                {authType === 'EMAIL' ? <Mail className="w-4 h-4" /> : <Phone className="w-4 h-4" />}
              </div>
              <input
                type={authType === 'EMAIL' ? 'email' : 'tel'}
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder={authType === 'EMAIL' ? 'youremail@example.com' : '+234 800 000 0000'}
                className="w-full pl-10 pr-4 py-3 bg-bg-card rounded-xl border border-fgBorder-subtle text-white text-sm placeholder-fgText-muted focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
                disabled={loading}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 px-4 bg-emerald-500 hover:bg-emerald-400 text-bg-base font-semibold rounded-xl flex items-center justify-center gap-2 transition-all shadow-emeraldGlow disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <span>Continue</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-xs text-fgText-muted">
            Need help?{' '}
            <a href="mailto:support@fundedgiants.com" className="text-emerald-400 hover:underline">
              Contact Support
            </a>
          </p>
        </div>
      </div>

      {/* Feature Badges Footer */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-8 border-t border-fgBorder-subtle max-w-4xl mx-auto w-full">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-bg-card border border-fgBorder-emerald text-emerald-400">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <p className="text-xs font-semibold text-white">Prop Trading</p>
            <p className="text-[10px] text-fgText-muted">Accounts</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-bg-card border border-fgBorder-emerald text-emerald-400">
            <Wallet className="w-4 h-4" />
          </div>
          <div>
            <p className="text-xs font-semibold text-white">Fast & Secure</p>
            <p className="text-[10px] text-fgText-muted">Payouts</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-bg-card border border-fgBorder-emerald text-emerald-400">
            <Copy className="w-4 h-4" />
          </div>
          <div>
            <p className="text-xs font-semibold text-white">Copy Trading</p>
            <p className="text-[10px] text-fgText-muted">Solutions</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-bg-card border border-fgBorder-emerald text-emerald-400">
            <Award className="w-4 h-4" />
          </div>
          <div>
            <p className="text-xs font-semibold text-white">IB Program</p>
            <p className="text-[10px] text-fgText-muted">& Rebates</p>
          </div>
        </div>
      </div>
    </div>
  );
}
