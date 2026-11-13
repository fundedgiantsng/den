'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Check,
  ShieldCheck,
  Wallet,
  Loader2,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { formatNaira } from '@/lib/format';

interface PlanConfig {
  id: 'rhino-rush' | 'phoenix-rise';
  name: string;
  subtitle: string;
  accent: string;
  dailyDD: string;
  maxDD: string;
  target: string;
  payouts: string;
  leverage: string;
  refund: string;
  prices: Record<number, number>;
}

const plans: PlanConfig[] = [
  {
    id: 'rhino-rush',
    name: 'Rhino Rush',
    subtitle: '1 Step Challenge',
    accent: 'emerald',
    dailyDD: '4%',
    maxDD: '10%',
    target: '10% (2% Daily Cap)',
    payouts: 'First: 5% | Subsequent: 2% Min',
    leverage: '1:100',
    refund: '100% Fee Refund at 10% total payouts',
    prices: {
      1000000: 27500,
      2500000: 67500,
      5000000: 127500,
      10000000: 247500,
      25000000: 487500,
      50000000: 967500,
    },
  },
  {
    id: 'phoenix-rise',
    name: 'Phoenix Rise',
    subtitle: 'Instant Funding',
    accent: 'gold',
    dailyDD: '4%',
    maxDD: '7%',
    target: '10% On-Demand / 15 Days',
    payouts: 'Daily On-Demand (Min 2%)',
    leverage: '1:30',
    refund: 'No refund',
    prices: {
      1000000: 43000,
      2500000: 106000,
      5000000: 209000,
      10000000: 412000,
      25000000: 1015000,
      50000000: 2018000,
    },
  },
];

const sizes = [1000000, 2500000, 5000000, 10000000, 25000000, 50000000];

export default function InDashboardBuyChallengePage() {
  const [selectedPlan, setSelectedPlan] = useState<'rhino-rush' | 'phoenix-rise'>('rhino-rush');
  const [selectedSize, setSelectedSize] = useState<number>(5000000);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successResult, setSuccessResult] = useState<any | null>(null);

  // Available NGN Wallet Balance
  const walletBalanceNgn = 18450000;

  const currentPlan = plans.find((p) => p.id === selectedPlan)!;
  const currentPrice = currentPlan.prices[selectedSize] || 0;
  const hasSufficientFunds = walletBalanceNgn >= currentPrice;

  const handlePayFromWallet = async () => {
    setError(null);
    setLoading(true);

    try {
      const res = await fetch('http://localhost:4000/api/v1/challenges/purchase-from-wallet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          planType: selectedPlan,
          accountSizeNgn: selectedSize,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Payment from wallet failed');
      }

      setSuccessResult(data);
    } catch (err: any) {
      setError(err.message || 'Error processing wallet purchase');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-xs text-fgText-secondary hover:text-white mb-2"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Dashboard</span>
        </Link>
        <h1 className="text-3xl font-heading font-extrabold text-white">Get Funded</h1>
        <p className="text-xs text-fgText-secondary">
          Select your trading account type and size. Bypasses external checkout and charges your Central NGN Wallet directly.
        </p>
      </div>

      {successResult ? (
        <div className="p-8 rounded-2xl bg-bg-card border border-fgBorder-emerald text-center space-y-5 shadow-emeraldGlow">
          <div className="w-14 h-14 rounded-full bg-emerald-500/20 text-emerald-400 mx-auto flex items-center justify-center">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-heading font-bold text-white">Challenge Account Provisioned!</h2>
          <p className="text-sm text-fgText-secondary max-w-lg mx-auto">
            Your wallet was charged <span className="text-white font-mono font-bold">{formatNaira(successResult.debitedAmountNgn)}</span>. Your SteraTrader account has been created on the live NGN broker subset.
          </p>

          <div className="p-4 rounded-xl bg-bg-surface border border-fgBorder-subtle max-w-md mx-auto text-left space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-fgText-muted">Challenge ID</span>
              <span className="font-mono text-white font-bold">{successResult.challengeNumber}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-fgText-muted">SteraTrader Login</span>
              <span className="font-mono text-emerald-400 font-bold">
                {successResult.tradingAccount?.accountNumber || 'Provisioning in progress...'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-fgText-muted">Platform</span>
              <span className="text-white font-bold">SteraTrader (NGN Group)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-fgText-muted">Account Size</span>
              <span className="text-white font-mono font-bold">{formatNaira(selectedSize)}</span>
            </div>
          </div>

          <div className="pt-4 flex items-center justify-center gap-4">
            <Link
              href="/dashboard/trading-accounts"
              className="px-6 py-2.5 rounded-xl bg-emerald-500 text-bg-base font-bold text-xs"
            >
              View Trading Accounts
            </Link>
            <button
              type="button"
              onClick={() => setSuccessResult(null)}
              className="px-6 py-2.5 rounded-xl bg-bg-card border border-fgBorder-subtle text-white font-semibold text-xs hover:border-emerald-500"
            >
              Purchase Another
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Step 1: Select Plan */}
          <div className="space-y-3">
            <label className="text-xs font-heading font-bold text-white uppercase tracking-wider">
              1. Choose Challenge Type
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {plans.map((p) => {
                const isSelected = selectedPlan === p.id;
                return (
                  <div
                    key={p.id}
                    onClick={() => setSelectedPlan(p.id)}
                    className={`p-6 rounded-2xl cursor-pointer transition-all border ${
                      isSelected
                        ? p.id === 'phoenix-rise'
                          ? 'bg-bg-surface border-gold-500 ring-2 ring-gold-500/20'
                          : 'bg-bg-surface border-emerald-500 ring-2 ring-emerald-500/20'
                        : 'bg-bg-card border-fgBorder-subtle hover:border-fgBorder-emerald'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-lg font-heading font-extrabold text-white">{p.name}</h3>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          p.id === 'phoenix-rise'
                            ? 'bg-gold-500/20 text-gold-400 border border-gold-500/30'
                            : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        }`}
                      >
                        {p.subtitle}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs text-fgText-secondary mt-4 pt-3 border-t border-fgBorder-subtle">
                      <div>
                        <span className="text-fgText-muted block text-[10px]">Daily Drawdown</span>
                        <span className="text-white font-bold">{p.dailyDD}</span>
                      </div>
                      <div>
                        <span className="text-fgText-muted block text-[10px]">Max Drawdown</span>
                        <span className="text-white font-bold">{p.maxDD}</span>
                      </div>
                      <div>
                        <span className="text-fgText-muted block text-[10px]">Profit Target</span>
                        <span className="text-emerald-400 font-bold">{p.target}</span>
                      </div>
                      <div>
                        <span className="text-fgText-muted block text-[10px]">Leverage</span>
                        <span className="text-white font-bold">{p.leverage}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Step 2: Select Size */}
          <div className="space-y-3">
            <label className="text-xs font-heading font-bold text-white uppercase tracking-wider">
              2. Select Account Capital Size
            </label>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              {sizes.map((s) => {
                const isSelected = selectedSize === s;
                const price = currentPlan.prices[s];
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setSelectedSize(s)}
                    className={`p-3.5 rounded-xl text-center border transition-all ${
                      isSelected
                        ? 'bg-bg-surface border-emerald-500 ring-2 ring-emerald-500/20'
                        : 'bg-bg-card border-fgBorder-subtle hover:border-fgBorder-emerald'
                    }`}
                  >
                    <span className="block text-sm font-heading font-extrabold text-white">
                      {formatNaira(s)}
                    </span>
                    <span className="block text-xs font-mono text-emerald-400 font-bold mt-1">
                      {formatNaira(price)}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {error && (
            <div className="p-4 rounded-xl bg-red-950/40 border border-red-500/30 text-red-400 text-xs">
              {error}
            </div>
          )}

          {/* Summary & Direct Wallet Payment Section */}
          <div className="p-6 rounded-2xl bg-bg-card border border-fgBorder-emerald shadow-cardGlow flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 text-xs text-fgText-secondary">
                <Wallet className="w-4 h-4 text-emerald-400" />
                <span>Central NGN Wallet Balance:</span>
                <span className="font-mono font-bold text-white">{formatNaira(walletBalanceNgn)}</span>
              </div>
              <div className="mt-2">
                <span className="text-xs text-fgText-muted">Total Order Charge:</span>
                <p className="text-3xl font-heading font-extrabold text-white">
                  {formatNaira(currentPrice)}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              {hasSufficientFunds ? (
                <button
                  type="button"
                  onClick={handlePayFromWallet}
                  disabled={loading}
                  className="px-8 py-4 bg-emerald-500 hover:bg-emerald-400 text-bg-base font-heading font-extrabold text-sm rounded-xl transition-all shadow-emeraldGlow disabled:opacity-50 flex items-center gap-2"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <span>Pay from Wallet</span>
                      <Check className="w-4 h-4" />
                    </>
                  )}
                </button>
              ) : (
                <div className="flex items-center gap-3">
                  <span className="text-xs text-red-400 flex items-center gap-1 font-semibold">
                    <AlertTriangle className="w-4 h-4" />
                    <span>Insufficient Wallet Balance</span>
                  </span>
                  <Link
                    href="/dashboard/wallet/fund"
                    className="px-5 py-3 rounded-xl bg-bg-surface border border-emerald-500 text-emerald-400 text-xs font-bold hover:bg-emerald-500/10"
                  >
                    Deposit Funds
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
