'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import {
  Mail,
  Phone,
  ArrowRight,
  ShieldCheck,
  Award,
  Zap,
  Users,
  Loader2,
  User,
  MapPin,
  Sparkles,
} from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();

  // Mode: LOGIN vs SIGNUP
  const [authMode, setAuthMode] = useState<'LOGIN' | 'SIGNUP'>('LOGIN');

  // Login state
  const [authType, setAuthType] = useState<'EMAIL' | 'PHONE'>('EMAIL');
  const [identifier, setIdentifier] = useState('');

  // Sign up state
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPhone, setSignupPhone] = useState('');
  const [signupAddress, setSignupAddress] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLoginSubmit = async (e: React.FormEvent) => {
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

      router.push(`/verify?identifier=${encodeURIComponent(identifier.trim())}&channel=${data.channel}`);
    } catch (err: any) {
      setError(err.message || 'Something went wrong. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!firstName.trim() || !lastName.trim()) {
      setError('Please provide your first and last name.');
      return;
    }
    if (!signupEmail.trim()) {
      setError('Please enter your email address.');
      return;
    }
    if (!signupPhone.trim()) {
      setError('Please enter your phone number (WhatsApp preferred).');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('http://localhost:4000/api/v1/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          email: signupEmail.trim(),
          phone: signupPhone.trim(),
          address: signupAddress.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to complete registration');
      }

      router.push(`/verify?identifier=${encodeURIComponent(signupEmail.trim())}&channel=EMAIL&isSignUp=true`);
    } catch (err: any) {
      setError(err.message || 'Registration failed. Please check your details.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg-base text-white flex flex-col justify-between selection:bg-emerald-500 selection:text-black">
      {/* Top Navbar */}
      <header className="w-full max-w-7xl mx-auto px-6 py-6 flex items-center justify-between">
        <Link href="/" className="flex items-center">
          <div className="relative h-10 w-48">
            <Image
              src="/brand/logo-white.png"
              alt="FundedGiants"
              fill
              className="object-contain object-left"
              priority
            />
          </div>
        </Link>

        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-bg-card border border-fgBorder-subtle text-xs text-fgText-secondary">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>Strict Device Verification</span>
        </div>
      </header>

      {/* Main Split Grid */}
      <main className="w-full max-w-7xl mx-auto px-6 py-8 flex-1 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
        {/* Left Column: Auth Forms */}
        <div className="lg:col-span-6 flex flex-col justify-center max-w-lg">
          {/* Main Mode Toggle: Sign In vs Create Account */}
          <div className="flex p-1 rounded-xl bg-bg-card border border-fgBorder-subtle mb-6">
            <button
              type="button"
              onClick={() => {
                setAuthMode('LOGIN');
                setError(null);
              }}
              className={`flex-1 py-2.5 rounded-lg text-xs font-heading font-extrabold transition-all uppercase tracking-wider ${
                authMode === 'LOGIN'
                  ? 'bg-emerald-500 text-black shadow-md'
                  : 'text-fgText-secondary hover:text-white'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setAuthMode('SIGNUP');
                setError(null);
              }}
              className={`flex-1 py-2.5 rounded-lg text-xs font-heading font-extrabold transition-all uppercase tracking-wider flex items-center justify-center gap-1.5 ${
                authMode === 'SIGNUP'
                  ? 'bg-emerald-500 text-black shadow-md'
                  : 'text-fgText-secondary hover:text-white'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Create Account</span>
            </button>
          </div>

          <div className="mb-6">
            <span className="px-3 py-1 rounded-full text-[11px] font-semibold tracking-wider uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 inline-block mb-3">
              Forex & CFD Prop Firm
            </span>
            <h1 className="text-3xl sm:text-4xl font-heading font-extrabold tracking-tight text-white mb-2">
              {authMode === 'LOGIN' ? (
                <>Welcome <span className="text-emerald-400">Back</span></>
              ) : (
                <>Join <span className="text-emerald-400">FundedGiants</span></>
              )}
            </h1>
            <p className="text-xs text-fgText-secondary leading-relaxed">
              {authMode === 'LOGIN'
                ? 'Enter your email or phone to receive a secure login code.'
                : 'Register directly to join our affiliate program, manage your wallet, and purchase challenge accounts.'}
            </p>
          </div>

          {error && (
            <div className="mb-4 p-3.5 rounded-xl bg-red-950/40 border border-red-500/30 text-red-400 text-xs">
              {error}
            </div>
          )}

          {/* 1. SIGN IN FORM */}
          {authMode === 'LOGIN' && (
            <div className="space-y-4">
              {/* Identifier Type Switcher */}
              <div className="flex rounded-xl bg-bg-card p-1 border border-fgBorder-subtle text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setAuthType('EMAIL');
                    setIdentifier('');
                    setError(null);
                  }}
                  className={`flex-1 py-2 rounded-lg font-semibold flex items-center justify-center gap-2 transition-all ${
                    authType === 'EMAIL'
                      ? 'bg-white/[0.08] text-emerald-400 border border-emerald-500/30 font-bold'
                      : 'text-fgText-secondary hover:text-white'
                  }`}
                >
                  <Mail className="w-3.5 h-3.5" />
                  <span>Email Address</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAuthType('PHONE');
                    setIdentifier('');
                    setError(null);
                  }}
                  className={`flex-1 py-2 rounded-lg font-semibold flex items-center justify-center gap-2 transition-all ${
                    authType === 'PHONE'
                      ? 'bg-white/[0.08] text-emerald-400 border border-emerald-500/30 font-bold'
                      : 'text-fgText-secondary hover:text-white'
                  }`}
                >
                  <Phone className="w-3.5 h-3.5" />
                  <span>Phone (SMS / WhatsApp)</span>
                </button>
              </div>

              <form onSubmit={handleLoginSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-fgText-secondary mb-1.5">
                    {authType === 'EMAIL' ? 'Email Address' : 'Phone Number (E.164)'}
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-fgText-muted">
                      {authType === 'EMAIL' ? <Mail className="w-4 h-4" /> : <Phone className="w-4 h-4" />}
                    </div>
                    <input
                      type={authType === 'EMAIL' ? 'email' : 'tel'}
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      placeholder={authType === 'EMAIL' ? 'trader@example.com' : '+234 800 000 0000'}
                      className="w-full pl-10 pr-4 py-3 bg-bg-card rounded-xl border border-fgBorder-subtle text-white text-sm placeholder-fgText-muted focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all font-mono"
                      disabled={loading}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 px-4 bg-emerald-500 hover:bg-emerald-400 text-black font-heading font-extrabold rounded-xl flex items-center justify-center gap-2 transition-all shadow-emeraldGlow disabled:opacity-50 text-xs uppercase tracking-wider"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Sending secure OTP...</span>
                    </>
                  ) : (
                    <>
                      <span>Get Login Code</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            </div>
          )}

          {/* 2. DIRECT SIGN UP FORM */}
          {authMode === 'SIGNUP' && (
            <form onSubmit={handleSignupSubmit} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-fgText-secondary font-medium mb-1">First Name</label>
                  <div className="relative">
                    <User className="w-3.5 h-3.5 absolute left-3 top-3 text-fgText-muted pointer-events-none" />
                    <input
                      type="text"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder="Olugbenga"
                      required
                      className="w-full pl-9 pr-3 py-2.5 bg-bg-card rounded-xl border border-fgBorder-subtle text-white text-xs placeholder-fgText-muted focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-fgText-secondary font-medium mb-1">Last Name</label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Olamide"
                    required
                    className="w-full px-3 py-2.5 bg-bg-card rounded-xl border border-fgBorder-subtle text-white text-xs placeholder-fgText-muted focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-fgText-secondary font-medium mb-1">Email Address</label>
                <div className="relative">
                  <Mail className="w-3.5 h-3.5 absolute left-3 top-3 text-fgText-muted pointer-events-none" />
                  <input
                    type="email"
                    value={signupEmail}
                    onChange={(e) => setSignupEmail(e.target.value)}
                    placeholder="olugbenga@example.com"
                    required
                    className="w-full pl-9 pr-3 py-2.5 bg-bg-card rounded-xl border border-fgBorder-subtle text-white text-xs placeholder-fgText-muted focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-fgText-secondary font-medium mb-1">
                  Phone Number (WhatsApp Preferred)
                </label>
                <div className="relative">
                  <Phone className="w-3.5 h-3.5 absolute left-3 top-3 text-fgText-muted pointer-events-none" />
                  <input
                    type="tel"
                    value={signupPhone}
                    onChange={(e) => setSignupPhone(e.target.value)}
                    placeholder="+234 803 123 4567"
                    required
                    className="w-full pl-9 pr-3 py-2.5 bg-bg-card rounded-xl border border-fgBorder-subtle text-white text-xs placeholder-fgText-muted focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-fgText-secondary font-medium mb-1">
                  Residential Address
                </label>
                <div className="relative">
                  <MapPin className="w-3.5 h-3.5 absolute left-3 top-3 text-fgText-muted pointer-events-none" />
                  <input
                    type="text"
                    value={signupAddress}
                    onChange={(e) => setSignupAddress(e.target.value)}
                    placeholder="14 Admiralty Way, Lekki Phase 1, Lagos"
                    className="w-full pl-9 pr-3 py-2.5 bg-bg-card rounded-xl border border-fgBorder-subtle text-white text-xs placeholder-fgText-muted focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 px-4 bg-emerald-500 hover:bg-emerald-400 text-black font-heading font-extrabold rounded-xl flex items-center justify-center gap-2 transition-all shadow-emeraldGlow disabled:opacity-50 text-xs uppercase tracking-wider mt-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Creating account & sending OTP...</span>
                  </>
                ) : (
                  <>
                    <span>Create Account & Get Code</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* Feature Badges Row */}
          <div className="grid grid-cols-2 gap-3 mt-8 pt-6 border-t border-fgBorder-subtle">
            <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-bg-card/50 border border-fgBorder-subtle/50">
              <Award className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <div className="text-[11px] leading-tight">
                <span className="font-semibold text-white block">Trading Accounts</span>
                <span className="text-fgText-muted text-[10px]">Rhino 1-Step & Phoenix Instant</span>
              </div>
            </div>

            <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-bg-card/50 border border-fgBorder-subtle/50">
              <Zap className="w-4 h-4 text-amber-400 flex-shrink-0" />
              <div className="text-[11px] leading-tight">
                <span className="font-semibold text-white block">Affiliate & Partner</span>
                <span className="text-fgText-muted text-[10px]">Earn up to 10% CPA + 3% Payouts</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Hero Visual with Official Bull Emblem and Glowing Matrix */}
        <div className="lg:col-span-6 hidden lg:flex items-center justify-center relative">
          <div className="relative w-full aspect-square max-w-lg rounded-3xl p-8 bg-gradient-to-b from-bg-surface to-bg-card border border-emerald-500/20 shadow-2xl flex flex-col items-center justify-between overflow-hidden">
            {/* Ambient Background Glows */}
            <div className="absolute -top-20 -left-20 w-60 h-60 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-20 -right-20 w-60 h-60 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none" />

            {/* Glowing Bull Geometric Icon */}
            <div className="relative my-auto flex flex-col items-center">
              <div className="relative w-48 h-48 drop-shadow-[0_0_35px_rgba(16,185,129,0.35)] animate-pulse">
                <Image
                  src="/brand/icon.png"
                  alt="FundedGiants Emblem"
                  fill
                  className="object-contain"
                  priority
                />
              </div>

              {/* Vector Candlestick Chart Decoration */}
              <div className="mt-8 flex items-end gap-2 h-20 opacity-80">
                <div className="w-2.5 h-8 bg-emerald-500 rounded-sm" />
                <div className="w-2.5 h-12 bg-emerald-400 rounded-sm" />
                <div className="w-2.5 h-6 bg-red-400 rounded-sm" />
                <div className="w-2.5 h-14 bg-emerald-500 rounded-sm" />
                <div className="w-2.5 h-10 bg-emerald-400 rounded-sm" />
                <div className="w-2.5 h-16 bg-emerald-300 rounded-sm" />
                <div className="w-2.5 h-12 bg-emerald-500 rounded-sm" />
                <div className="w-2.5 h-20 bg-emerald-400 rounded-sm shadow-emeraldGlow" />
              </div>
            </div>

            {/* Tagline Box */}
            <div className="w-full text-center py-4 px-6 rounded-2xl bg-bg-base/70 backdrop-blur-md border border-fgBorder-subtle">
              <span className="text-xs uppercase font-extrabold tracking-widest text-emerald-400 block mb-1">
                FundedGiants
              </span>
              <p className="text-xs text-fgText-secondary">
                More Than Capital. It&apos;s a Platform.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full max-w-7xl mx-auto px-6 py-6 border-t border-fgBorder-subtle flex flex-col sm:flex-row items-center justify-between text-xs text-fgText-muted gap-4">
        <span>&copy; {new Date().getFullYear()} FundedGiants. All Rights Reserved.</span>
        <div className="flex items-center gap-6">
          <Link href="/terms" className="hover:text-white transition-colors">Terms of Service</Link>
          <Link href="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link>
          <Link href="/support" className="hover:text-white transition-colors">Contact Support</Link>
        </div>
      </footer>
    </div>
  );
}
