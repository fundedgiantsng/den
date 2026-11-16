'use client';

import React, { useState } from 'react';
import { User, CheckCircle2, AlertCircle, Loader2, ArrowRight } from 'lucide-react';

interface ChooseUsernameModalProps {
  isOpen: boolean;
  onSuccess: (newUsername: string) => void;
}

export function ChooseUsernameModal({
  isOpen,
  onSuccess,
}: ChooseUsernameModalProps) {
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const clean = username.trim().toLowerCase();
    if (!clean) {
      setError('Please enter a username.');
      return;
    }

    if (!/^[a-z0-9_]{3,20}$/.test(clean)) {
      setError('Username must be 3-20 characters long and contain only lowercase letters, numbers, or underscores.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('http://localhost:4000/api/v1/auth/set-username', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ username: clean }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to set username');
      }

      onSuccess(clean);
    } catch (err: any) {
      setError(err.message || 'Could not claim username. Please try another.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="w-full max-w-md bg-gradient-to-br from-[#0c140f] to-[#040805] border border-emerald-500/30 rounded-2xl p-6 sm:p-7 shadow-2xl space-y-5 text-xs relative overflow-hidden">
        {/* Ambient Top Glow */}
        <div className="absolute -top-16 -right-16 w-36 h-36 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none" />

        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
            <User className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-heading font-extrabold text-white tracking-tight">
              Choose Your Username
            </h3>
            <p className="text-fgText-secondary text-[11px] leading-relaxed mt-0.5">
              Welcome to FundedGiants! Please claim your unique username. This will serve as your public trader identity, leaderboard alias, and affiliate referral tag.
            </p>
          </div>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-fgText-secondary font-medium mb-1.5">
              Unique Username / Trader Handle
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-2.5 text-emerald-400 font-mono font-bold text-sm pointer-events-none">
                @
              </span>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                placeholder="favourtrade"
                required
                maxLength={20}
                autoFocus
                className="w-full pl-9 pr-4 py-2.5 bg-bg-card rounded-xl border border-fgBorder-subtle text-white font-mono text-xs placeholder-fgText-muted focus:outline-none focus:border-emerald-500 transition-colors"
              />
            </div>
            <div className="flex items-center justify-between text-[10px] text-fgText-muted mt-1.5 px-0.5">
              <span>3 to 20 characters (letters, numbers, _)</span>
              <span>{username.length}/20</span>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-[#09150e] border border-emerald-500/15 space-y-1 text-[11px]">
            <div className="flex items-center gap-1.5 text-emerald-400 font-semibold">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Affiliate Code Included</span>
            </div>
            <p className="text-slate-400 text-[10px]">
              Your affiliate referral link will automatically be issued as <span className="font-mono text-emerald-400">fundedgiants.ng?ref={username || 'username'}</span>
            </p>
          </div>

          <button
            type="submit"
            disabled={loading || username.length < 3}
            className="w-full py-3 px-4 bg-emerald-500 hover:bg-emerald-400 text-black font-heading font-extrabold rounded-xl flex items-center justify-center gap-2 transition-all shadow-emeraldGlow disabled:opacity-50 text-xs uppercase tracking-wider"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Claiming Username...</span>
              </>
            ) : (
              <>
                <span>Claim Username & Proceed</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
