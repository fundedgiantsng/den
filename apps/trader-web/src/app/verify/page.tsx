'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ShieldCheck, ArrowRight, ArrowLeft, MessageSquare, Loader2, Edit3 } from 'lucide-react';

export default function VerifyOtpPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const identifier = searchParams.get('identifier') || '';
  const initialChannel = searchParams.get('channel') || 'EMAIL';

  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [cooldown, setCooldown] = useState(45);
  const [loading, setLoading] = useState(false);
  const [whatsappLoading, setWhatsappLoading] = useState(false);
  const [channel, setChannel] = useState(initialChannel);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    // Focus first input box
    inputsRef.current[0]?.focus();

    // 45s countdown timer
    const timer = setInterval(() => {
      setCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const handleDigitChange = (index: number, val: string) => {
    if (!/^\d*$/.test(val)) return; // numbers only

    const newCode = [...code];
    newCode[index] = val.slice(-1); // only keep last entered char
    setCode(newCode);

    // Auto advance focus
    if (val && index < 5) {
      inputsRef.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
  };

  const handleVerify = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError(null);
    const fullCode = code.join('');

    if (fullCode.length !== 6) {
      setError('Please enter all 6 digits of the verification code');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('http://localhost:4000/api/v1/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include', // Receive HttpOnly session cookie
        body: JSON.stringify({
          identifier,
          code: fullCode,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Verification failed. Incorrect code.');
      }

      // Successful verification! Redirect to central dashboard
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  const handleWhatsAppRetry = async () => {
    if (cooldown > 0) return;
    setError(null);
    setSuccessMsg(null);
    setWhatsappLoading(true);

    try {
      const res = await fetch('http://localhost:4000/api/v1/auth/retry-whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: identifier }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to dispatch WhatsApp OTP');
      }

      setChannel('WHATSAPP');
      setCooldown(45);
      setCode(['', '', '', '', '', '']);
      inputsRef.current[0]?.focus();
      setSuccessMsg('A new verification code has been sent to your WhatsApp.');
    } catch (err: any) {
      setError(err.message || 'WhatsApp retry failed');
    } finally {
      setWhatsappLoading(false);
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

      {/* Main Verification Card */}
      <div className="max-w-md w-full mx-auto my-auto py-12">
        <h1 className="text-4xl font-heading font-extrabold text-white tracking-tight mb-2">
          Enter <span className="text-emerald-400">Verification Code</span>
        </h1>
        <p className="text-sm text-fgText-secondary mb-4">
          We&apos;ve sent a 6-digit code via {channel} to:
        </p>

        {/* Identifier Badge with Edit link */}
        <div className="flex items-center justify-between p-3 rounded-xl bg-bg-card border border-fgBorder-subtle mb-6">
          <span className="text-xs font-mono font-medium text-white truncate max-w-[280px]">
            {identifier || 'No identifier provided'}
          </span>
          <Link
            href="/login"
            className="flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-300 font-medium"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>Change</span>
          </Link>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-950/40 border border-red-500/30 text-red-400 text-xs">
            {error}
          </div>
        )}

        {successMsg && (
          <div className="mb-4 p-3 rounded-lg bg-emerald-950/40 border border-emerald-500/30 text-emerald-400 text-xs">
            {successMsg}
          </div>
        )}

        {/* 6 Digit Inputs */}
        <form onSubmit={handleVerify} className="space-y-6">
          <div className="flex justify-between gap-2 md:gap-3">
            {code.map((digit, idx) => (
              <input
                key={idx}
                ref={(el) => {
                  inputsRef.current[idx] = el;
                }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleDigitChange(idx, e.target.value)}
                onKeyDown={(e) => handleKeyDown(idx, e)}
                className="w-12 h-14 md:w-14 md:h-16 text-center text-xl md:text-2xl font-mono font-bold bg-bg-card text-white rounded-xl border border-fgBorder-subtle focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none transition-all"
                disabled={loading}
              />
            ))}
          </div>

          <button
            type="submit"
            disabled={loading || code.join('').length !== 6}
            className="w-full py-3.5 px-4 bg-emerald-500 hover:bg-emerald-400 text-bg-base font-semibold rounded-xl flex items-center justify-center gap-2 transition-all shadow-emeraldGlow disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <span>Verify</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Resend & WhatsApp Fallback */}
        <div className="mt-6 flex flex-col gap-3 text-center text-xs">
          <p className="text-fgText-muted">
            Didn&apos;t receive the code?{' '}
            {cooldown > 0 ? (
              <span className="text-emerald-400 font-mono">
                Resend in (00:{cooldown < 10 ? `0${cooldown}` : cooldown})
              </span>
            ) : (
              <Link href="/login" className="text-emerald-400 hover:underline">
                Resend code
              </Link>
            )}
          </p>

          {/* Robase WhatsApp Retry Option for Phone users */}
          {channel !== 'EMAIL' && (
            <button
              type="button"
              onClick={handleWhatsAppRetry}
              disabled={whatsappLoading || cooldown > 0}
              className="inline-flex items-center justify-center gap-1.5 text-xs text-emerald-400 hover:text-emerald-300 font-medium disabled:opacity-40 transition-colors"
            >
              {whatsappLoading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <MessageSquare className="w-3.5 h-3.5" />
              )}
              <span>Send code via WhatsApp</span>
            </button>
          )}

          <div className="pt-2">
            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 text-xs text-fgText-secondary hover:text-white"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to login</span>
            </Link>
          </div>
        </div>
      </div>

      <div className="text-center py-4 border-t border-fgBorder-subtle text-xs text-fgText-muted">
        FundedGiants Platform &copy; {new Date().getFullYear()}. All Rights Reserved.
      </div>
    </div>
  );
}
