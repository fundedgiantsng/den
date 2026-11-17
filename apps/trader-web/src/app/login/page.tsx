'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import {
  Mail,
  Phone,
  ArrowRight,
  Award,
  Zap,
  Users,
  Loader2,
  User,
  MapPin,
  Sparkles,
  ChevronRight,
} from 'lucide-react';

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Mode: LOGIN vs SIGNUP
  const [authMode, setAuthMode] = useState<'LOGIN' | 'SIGNUP'>('LOGIN');

  // Login state
  const [authType, setAuthType] = useState<'EMAIL' | 'PHONE'>('EMAIL');
  const [identifier, setIdentifier] = useState('');

  // Sign up state
  const [signupUsername, setSignupUsername] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPhone, setSignupPhone] = useState('');
  const [signupAddress, setSignupAddress] = useState('');
  const [affiliateCode, setAffiliateCode] = useState<string>('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Marketing banners rotated every hour
  const marketingBanners = [
    {
      id: 'eat-like-a-giant',
      src: '/banners/banner-eat-like-a-giant.jpg',
      alt: 'If You Can Trade You Eat Like a Giant',
    },
    {
      id: 'withdraw-today',
      src: '/banners/banner-withdraw-today.jpg',
      alt: 'Withdraw Today, again tomorrow, & the next',
    },
  ];

  const [bannerIndex, setBannerIndex] = useState(0);

  useEffect(() => {
    const updateBanner = () => {
      const currentHour = new Date().getHours();
      setBannerIndex(currentHour % marketingBanners.length);
    };
    updateBanner();
    const interval = setInterval(updateBanner, 60000);
    return () => clearInterval(interval);
  }, []);

  // 60-Day Affiliate Referral Tracking (via ?ref=, ?aff=, ?affiliate=)
  useEffect(() => {
    const ref = searchParams?.get('ref') || searchParams?.get('aff') || searchParams?.get('affiliate');
    if (ref) {
      const cleanRef = ref.trim().toLowerCase();
      setAffiliateCode(cleanRef);
      // Set persistent 60-day cookie (60 * 24 * 60 * 60 = 5,184,000s)
      document.cookie = `fg_aff_code=${encodeURIComponent(cleanRef)}; path=/; max-age=5184000; SameSite=Lax`;
    } else if (typeof document !== 'undefined') {
      const match = document.cookie.match(/(?:^|;\s*)fg_aff_code=([^;]+)/);
      if (match) {
        setAffiliateCode(decodeURIComponent(match[1]));
      }
    }
  }, [searchParams]);

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

      router.push(`/verify?identifier=${encodeURIComponent(identifier.trim())}&channel=${authType}`);
    } catch (err: any) {
      setError(err.message || 'Error occurred while requesting OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanUsername = signupUsername.trim().toLowerCase();
    if (!cleanUsername) {
      setError('Please choose a username for your account.');
      return;
    }
    if (!/^[a-z0-9_]{3,20}$/.test(cleanUsername)) {
      setError('Username must be 3-20 characters long and contain only lowercase letters, numbers, or underscores.');
      return;
    }

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
          username: cleanUsername,
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          email: signupEmail.trim(),
          phone: signupPhone.trim(),
          address: signupAddress.trim() || undefined,
          referredBy: affiliateCode || undefined,
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
                  ? 'bg-emerald-500 text-black shadow-emeraldGlow'
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
              className={`flex-1 py-2.5 rounded-lg text-xs font-heading font-extrabold transition-all uppercase tracking-wider ${
                authMode === 'SIGNUP'
                  ? 'bg-emerald-500 text-black shadow-emeraldGlow'
                  : 'text-fgText-secondary hover:text-white'
              }`}
            >
              Create Account
            </button>
          </div>

          <div className="mb-6">
            <h1 className="text-3xl font-heading font-extrabold tracking-tight text-white mb-2">
              {authMode === 'LOGIN' ? 'Welcome Back' : 'Join FundedGiants'}
            </h1>
            <p className="text-xs text-fgText-secondary">
              {authMode === 'LOGIN'
                ? 'Sign in to access your trading accounts, wallet vault, and on-demand payouts.'
                : 'Create your trader profile to begin your prop trading journey.'}
            </p>
          </div>

          {error && (
            <div className="mb-5 p-3 rounded-xl bg-red-950/40 border border-red-500/30 text-red-400 text-xs">
              {error}
            </div>
          )}

          {/* SIGN IN FORM */}
          {authMode === 'LOGIN' ? (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              {/* Auth Type Switcher */}
              <div className="flex rounded-xl bg-bg-surface p-1 border border-fgBorder-subtle">
                <button
                  type="button"
                  onClick={() => {
                    setAuthType('EMAIL');
                    setIdentifier('');
                  }}
                  className={`flex-1 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
                    authType === 'EMAIL'
                      ? 'bg-bg-card text-emerald-400 border border-fgBorder-emerald shadow-sm'
                      : 'text-fgText-secondary hover:text-white'
                  }`}
                >
                  <Mail className="w-3.5 h-3.5" />
                  <span>Email Code</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAuthType('PHONE');
                    setIdentifier('');
                  }}
                  className={`flex-1 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
                    authType === 'PHONE'
                      ? 'bg-bg-card text-emerald-400 border border-fgBorder-emerald shadow-sm'
                      : 'text-fgText-secondary hover:text-white'
                  }`}
                >
                  <Phone className="w-3.5 h-3.5" />
                  <span>Phone Number</span>
                </button>
              </div>

              <div>
                <label className="block text-fgText-secondary font-medium mb-1 text-xs">
                  {authType === 'EMAIL' ? 'Email Address' : 'Phone Number'}
                </label>
                <div className="relative">
                  {authType === 'EMAIL' ? (
                    <Mail className="w-3.5 h-3.5 absolute left-3 top-3 text-fgText-muted pointer-events-none" />
                  ) : (
                    <Phone className="w-3.5 h-3.5 absolute left-3 top-3 text-fgText-muted pointer-events-none" />
                  )}
                  <input
                    type={authType === 'EMAIL' ? 'email' : 'tel'}
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder={
                      authType === 'EMAIL'
                        ? 'trader@fundedgiants.ng'
                        : '+234 803 123 4567'
                    }
                    required
                    className="w-full pl-9 pr-3 py-2.5 bg-bg-card rounded-xl border border-fgBorder-subtle text-white text-xs placeholder-fgText-muted focus:outline-none focus:border-emerald-500 font-mono"
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
                    <span>Sending code...</span>
                  </>
                ) : (
                  <>
                    <span>Sign In</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          ) : (
            /* CREATE ACCOUNT FORM */
            <form onSubmit={handleSignupSubmit} className="space-y-3.5">
              <div>
                <label className="block text-fgText-secondary font-medium mb-1 text-xs">
                  Choose Username (Your Permanent Trader Handle)
                </label>
                <div className="relative">
                  <User className="w-3.5 h-3.5 absolute left-3 top-3 text-fgText-muted pointer-events-none" />
                  <input
                    type="text"
                    value={signupUsername}
                    onChange={(e) => setSignupUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                    placeholder="e.g. giantstrader"
                    required
                    maxLength={20}
                    className="w-full pl-9 pr-3 py-2.5 bg-bg-card rounded-xl border border-fgBorder-subtle text-white text-xs placeholder-fgText-muted focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>
                <p className="mt-1 text-[10px] text-fgText-muted">3-20 characters. Also powers your personal affiliate referral link.</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-fgText-secondary font-medium mb-1 text-xs">First Name</label>
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="Chukwuebuka"
                    required
                    className="w-full px-3 py-2.5 bg-bg-card rounded-xl border border-fgBorder-subtle text-white text-xs placeholder-fgText-muted focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-fgText-secondary font-medium mb-1 text-xs">Last Name</label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Okafor"
                    required
                    className="w-full px-3 py-2.5 bg-bg-card rounded-xl border border-fgBorder-subtle text-white text-xs placeholder-fgText-muted focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-fgText-secondary font-medium mb-1 text-xs">Email Address</label>
                <div className="relative">
                  <Mail className="w-3.5 h-3.5 absolute left-3 top-3 text-fgText-muted pointer-events-none" />
                  <input
                    type="email"
                    value={signupEmail}
                    onChange={(e) => setSignupEmail(e.target.value)}
                    placeholder="trader@fundedgiants.ng"
                    required
                    className="w-full pl-9 pr-3 py-2.5 bg-bg-card rounded-xl border border-fgBorder-subtle text-white text-xs placeholder-fgText-muted focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-fgText-secondary font-medium mb-1 text-xs">Phone Number</label>
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
                <label className="block text-fgText-secondary font-medium mb-1 text-xs">Residential Address</label>
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
                    <span>Creating account...</span>
                  </>
                ) : (
                  <>
                    <span>Create Account</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* Feature Badges Row (Directly Linked in Same Tab to WordPress Sections) */}
          <div className="grid grid-cols-2 gap-3 mt-8 pt-6 border-t border-fgBorder-subtle">
            <a
              href="https://fundedgiants.ng/#pricing"
              target="_self"
              className="flex items-center gap-2.5 p-2.5 rounded-xl bg-bg-card/50 border border-fgBorder-subtle/50 hover:border-emerald-500/40 hover:bg-emerald-500/5 transition-all cursor-pointer group"
            >
              <Award className="w-4 h-4 text-emerald-400 flex-shrink-0 group-hover:scale-110 transition-transform" />
              <div className="text-[11px] leading-tight">
                <span className="font-semibold text-white block group-hover:text-emerald-400 transition-colors">Trading Accounts</span>
                <span className="text-fgText-muted text-[10px]">Choose Your Path</span>
              </div>
            </a>

            <a
              href="https://fundedgiants.ng/earn-as-affiliate/"
              target="_self"
              className="flex items-center gap-2.5 p-2.5 rounded-xl bg-bg-card/50 border border-fgBorder-subtle/50 hover:border-amber-500/40 hover:bg-amber-500/5 transition-all cursor-pointer group"
            >
              <Zap className="w-4 h-4 text-amber-400 flex-shrink-0 group-hover:scale-110 transition-transform" />
              <div className="text-[11px] leading-tight">
                <span className="font-semibold text-white block group-hover:text-amber-400 transition-colors">Affiliate & Partner</span>
                <span className="text-fgText-muted text-[10px]">Earn up to 10% CPA</span>
              </div>
            </a>
          </div>
        </div>

        {/* Right Column: Spotlight Marketing Ad Banner */}
        <div className="lg:col-span-6 hidden lg:flex items-center justify-center relative">
          <div className="w-full max-w-md rounded-2xl bg-gradient-to-br from-[#0e1f17] via-[#091510] to-[#040806] border border-emerald-500/25 p-5 sm:p-6 shadow-2xl relative overflow-hidden space-y-4">
            {/* Ambient Glows */}
            <div className="absolute -top-20 -left-20 w-60 h-60 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-20 -right-20 w-60 h-60 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none" />

            {/* Visual Marketing Banner */}
            <div className="relative w-full rounded-xl overflow-hidden bg-black/40 border border-emerald-500/20 flex items-center justify-center group shadow-xl">
              <img
                src={marketingBanners[bannerIndex].src}
                alt={marketingBanners[bannerIndex].alt}
                className="w-full h-auto object-contain rounded-xl transition-transform duration-500 group-hover:scale-[1.01]"
              />
            </div>

            <a
              href="https://fundedgiants.ng/get-funded"
              target="_self"
              className="w-full py-3 px-4 rounded-xl bg-[#f5a623] hover:bg-[#e0961f] text-black font-heading font-extrabold text-xs transition shadow-lg shadow-amber-500/20 active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span>Get Funded</span>
              <ChevronRight className="w-3.5 h-3.5 stroke-[3]" />
            </a>
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

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-bg-base flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
