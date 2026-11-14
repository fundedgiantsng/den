'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Check,
  ShieldCheck,
  Wallet,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Tag,
  Users,
  Sparkles,
} from 'lucide-react';
import { formatNaira } from '@/lib/format';

interface PlanConfig {
  id: 'rhino-rush' | 'phoenix-rise';
  name: string;
  subtitle: string;
  accent: 'blue' | 'gold';
  dailyDD: string;
  maxDD: string;
  target: string;
  payouts: string;
  leverage: string;
  profitSplit: string;
  refund: string;
  prices: Record<number, number>;
}

const plans: PlanConfig[] = [
  {
    id: 'rhino-rush',
    name: 'Rhino Rush',
    subtitle: '1 Step Challenge',
    accent: 'blue',
    dailyDD: '4% (Static)',
    maxDD: '10% (Static)',
    target: '10% (2% Daily Cap)',
    payouts: 'Tiered 50% -> 60% -> 70% -> 80% (Min 2%)',
    leverage: '1:100',
    profitSplit: 'Tiered 50% - 80%',
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
    dailyDD: '4% (Static)',
    maxDD: '7% (Static)',
    target: '1st Payout: 10% Target | Subsequent: 2% Min',
    payouts: 'Tiered 60% (<15d) / 50% (15d+) -> 60% -> 70% -> 80%',
    leverage: '1:30',
    profitSplit: 'Tiered 50% - 80%',
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

  // Dual Coupon Input States
  const [affiliateCode, setAffiliateCode] = useState<string>('');
  const [discountCode, setDiscountCode] = useState<string>('');

  // Coupon Validation Results
  const [validationResult, setValidationResult] = useState<{
    subtotalNgn: number;
    siteCoupon: { code: string; isValid: boolean; discountPercent: number; discountNgn: number; message: string };
    affiliateCoupon: { code: string; username: string; isValid: boolean; discountPercent: number; discountNgn: number; message: string };
    totalDiscountNgn: number;
    finalTotalNgn: number;
  } | null>(null);

  const [isValidating, setIsValidating] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successResult, setSuccessResult] = useState<any | null>(null);

  // Live Wallet Balance
  const [walletBalanceNgn, setWalletBalanceNgn] = useState<number>(18450000);

  const currentPlan = plans.find((p) => p.id === selectedPlan)!;
  const currentPrice = currentPlan.prices[selectedSize] || 0;

  // Fetch live wallet balance on mount
  useEffect(() => {
    fetch('http://localhost:4000/api/v1/wallet/overview', { credentials: 'include' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && typeof data.availableBalanceNgn === 'number') {
          setWalletBalanceNgn(data.availableBalanceNgn);
        }
      })
      .catch(() => {});
  }, []);

  // Debounced Coupon Validation
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);

    timerRef.current = setTimeout(async () => {
      if (!affiliateCode.trim() && !discountCode.trim()) {
        setValidationResult(null);
        return;
      }

      setIsValidating(true);
      try {
        const res = await fetch('http://localhost:4000/api/v1/challenges/validate-coupons', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            planType: selectedPlan,
            accountSizeNgn: selectedSize,
            siteCouponCode: discountCode.trim() || undefined,
            affiliateCode: affiliateCode.trim() || undefined,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          setValidationResult(data);
        }
      } catch (err) {
        console.error('Coupon validation error:', err);
      } finally {
        setIsValidating(false);
      }
    }, 500);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [selectedPlan, selectedSize, affiliateCode, discountCode]);

  const finalTotalNgn = validationResult ? validationResult.finalTotalNgn : currentPrice;
  const hasSufficientFunds = walletBalanceNgn >= finalTotalNgn;

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
          siteCouponCode: discountCode.trim() || undefined,
          affiliateCode: affiliateCode.trim() || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Payment processing failed');
      }

      setSuccessResult(data);
      // Update local wallet balance state
      setWalletBalanceNgn((prev) => Math.max(0, prev - finalTotalNgn));
    } catch (err: any) {
      setError(err.message || 'Payment could not be processed');
    } finally {
      setLoading(false);
    }
  };

  const fmtSizeLabel = (n: number) => {
    return n >= 1000000 ? `₦${n / 1000000}M` : `₦${(n / 1000).toLocaleString()}k`;
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12 w-full">
      {/* Header Bar */}
      <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="p-2 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-fgText-secondary hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-xl sm:text-2xl font-heading font-extrabold text-white flex items-center gap-2">
              <span>Funding</span>
              <span className={selectedPlan === 'phoenix-rise' ? 'text-amber-400' : 'text-sky-400'}>
                Pathway
              </span>
            </h1>
            <p className="text-xs text-fgText-secondary">
              Select your Nigerian trading pathway and account size to activate instantly from Giants Vault.
            </p>
          </div>
        </div>

        {/* Giants Vault Pill */}
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#0e1a12] border border-white/[0.08]">
          <Wallet className="w-4 h-4 text-emerald-400" />
          <div className="text-right">
            <div className="text-[10px] text-fgText-secondary uppercase tracking-wider font-semibold">Giants Vault</div>
            <div className="text-xs font-mono font-bold text-white">{formatNaira(walletBalanceNgn)}</div>
          </div>
        </div>
      </div>

      {successResult ? (
        <div className="fg-card p-6 sm:p-8 text-center max-w-xl mx-auto space-y-5 border-emerald-500/30">
          <div className="w-14 h-14 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center mx-auto text-emerald-400">
            <CheckCircle2 className="w-7 h-7" />
          </div>
          <div>
            <h2 className="text-xl font-heading font-extrabold text-white">Challenge Activated Successfully!</h2>
            <p className="text-xs text-fgText-secondary mt-1">
              Your trading account has been provisioned and linked to your dashboard.
            </p>
          </div>

          <div className="bg-[#0e1a12] rounded-xl p-4 text-left border border-white/[0.08] space-y-2.5 text-xs font-mono">
            <div className="flex justify-between border-b border-white/[0.06] pb-2">
              <span className="text-fgText-secondary">Order Reference:</span>
              <span className="text-white font-bold">{successResult.orderNumber}</span>
            </div>
            <div className="flex justify-between border-b border-white/[0.06] pb-2">
              <span className="text-fgText-secondary">Challenge ID:</span>
              <span className="text-white font-bold">{successResult.challengeNumber}</span>
            </div>
            <div className="flex justify-between border-b border-white/[0.06] pb-2">
              <span className="text-fgText-secondary">Debited from Vault:</span>
              <span className="text-emerald-400 font-bold">{formatNaira(successResult.debitedAmountNgn)}</span>
            </div>
            {successResult.tradingAccount && (
              <div className="flex justify-between pt-1">
                <span className="text-fgText-secondary">SteraTrader Login:</span>
                <span className="text-white font-bold">{successResult.tradingAccount.accountNumber}</span>
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-2">
            <Link
              href="/dashboard"
              className="flex-1 py-2.5 px-4 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs uppercase tracking-wider transition-colors text-center"
            >
              Go to Trading Dashboard
            </Link>
            <button
              onClick={() => {
                setSuccessResult(null);
                setAffiliateCode('');
                setDiscountCode('');
                setValidationResult(null);
              }}
              className="py-2.5 px-4 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] text-white text-xs font-semibold transition-colors"
            >
              Buy Another
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Plan & Size Selection + Dual Coupons */}
          <div className="lg:col-span-7 space-y-6">
            {/* 1. Plan Types */}
            <div className="fg-card p-5 space-y-3">
              <div className="text-[11px] font-bold text-fgText-secondary uppercase tracking-wider">
                1. Select Challenge Type
              </div>
              <div className="grid grid-cols-2 gap-3">
                {plans.map((p) => {
                  const isActive = selectedPlan === p.id;
                  const isGold = p.accent === 'gold';
                  return (
                    <button
                      key={p.id}
                      onClick={() => setSelectedPlan(p.id)}
                      type="button"
                      className={`p-3.5 rounded-xl border text-center transition-all ${
                        isActive
                          ? isGold
                            ? 'bg-amber-500 text-black border-white shadow-[0_0_20px_rgba(245,158,11,0.25)]'
                            : 'bg-sky-500 text-black border-white shadow-[0_0_20px_rgba(56,189,248,0.25)]'
                          : 'bg-white/[0.03] border-white/[0.08] text-white hover:border-white/20 hover:bg-white/[0.06]'
                      }`}
                    >
                      <div className="text-sm font-heading font-extrabold uppercase leading-tight">{p.name}</div>
                      <div
                        className={`text-[11px] font-semibold mt-1 ${
                          isActive ? 'text-black/80' : isGold ? 'text-amber-400' : 'text-sky-400'
                        }`}
                      >
                        {p.subtitle}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. Account Sizes */}
            <div className="fg-card p-5 space-y-3">
              <div className="text-[11px] font-bold text-fgText-secondary uppercase tracking-wider">
                2. Select Account Capital
              </div>
              <div className="grid grid-cols-3 gap-2 sm:gap-2.5">
                {sizes.map((s) => {
                  const isActive = selectedSize === s;
                  const isGold = selectedPlan === 'phoenix-rise';
                  return (
                    <button
                      key={s}
                      onClick={() => setSelectedSize(s)}
                      type="button"
                      className={`py-3 px-2 rounded-lg border text-center font-bold text-xs font-mono transition-all ${
                        isActive
                          ? isGold
                            ? 'bg-amber-500 text-black border-white shadow-[0_0_15px_rgba(245,158,11,0.25)]'
                            : 'bg-sky-500 text-black border-white shadow-[0_0_15px_rgba(56,189,248,0.25)]'
                          : 'bg-white/[0.03] border-white/[0.08] text-fgText-primary hover:border-white/20 hover:bg-white/[0.06]'
                      }`}
                    >
                      {fmtSizeLabel(s)}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 3. Dual Coupons & Partnerships */}
            <div className="fg-card p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-[11px] font-bold text-fgText-secondary uppercase tracking-wider flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-emerald-400" />
                  <span>3. Coupons & Partnerships</span>
                </div>
                {isValidating && (
                  <span className="text-[10px] text-fgText-secondary flex items-center gap-1 font-mono">
                    <Loader2 className="w-3 h-3 animate-spin text-emerald-400" /> Validating...
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* Field 1: Affiliate Code */}
                <div>
                  <label className="block text-[10px] font-bold text-fgText-secondary uppercase tracking-wider mb-1.5 flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    <span>Affiliate Code</span>
                  </label>
                  <input
                    type="text"
                    value={affiliateCode}
                    onChange={(e) => setAffiliateCode(e.target.value)}
                    placeholder="Enter affiliate ID"
                    className="fg-input font-mono uppercase"
                  />
                  {validationResult?.affiliateCoupon?.message && (
                    <p
                      className={`text-[11px] mt-1 font-medium ${
                        validationResult.affiliateCoupon.isValid ? 'text-emerald-400' : 'text-red-400'
                      }`}
                    >
                      {validationResult.affiliateCoupon.message}
                    </p>
                  )}
                </div>

                {/* Field 2: Site Discount Coupon */}
                <div>
                  <label className="block text-[10px] font-bold text-fgText-secondary uppercase tracking-wider mb-1.5 flex items-center gap-1">
                    <Tag className="w-3 h-3" />
                    <span>Discount Coupon</span>
                  </label>
                  <input
                    type="text"
                    value={discountCode}
                    onChange={(e) => setDiscountCode(e.target.value)}
                    placeholder="Enter coupon code"
                    className="fg-input font-mono uppercase"
                  />
                  {validationResult?.siteCoupon?.message && (
                    <p
                      className={`text-[11px] mt-1 font-medium ${
                        validationResult.siteCoupon.isValid ? 'text-emerald-400' : 'text-red-400'
                      }`}
                    >
                      {validationResult.siteCoupon.message}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Order Summary & Instant Checkout */}
          <div className="lg:col-span-5">
            <div className="fg-card p-5 sm:p-6 space-y-4 lg:sticky lg:top-4">
              {/* Product Title */}
              <div className="border-b border-white/[0.08] pb-3">
                <div className="text-[10px] text-fgText-secondary uppercase tracking-wider font-semibold">
                  Selected Program
                </div>
                <div className="text-sm font-heading font-extrabold text-white uppercase mt-0.5">
                  {currentPlan.name} • {currentPlan.subtitle} — {fmtSizeLabel(selectedSize)}
                </div>
              </div>

              {/* Trading Condition Metrics */}
              <div className="grid grid-cols-2 gap-2.5 text-xs border-b border-white/[0.08] pb-3">
                <div>
                  <span className="text-[10px] text-fgText-secondary uppercase block">Profit Target</span>
                  <span className="font-bold text-white font-mono">{currentPlan.target}</span>
                </div>
                <div>
                  <span className="text-[10px] text-fgText-secondary uppercase block">Payouts</span>
                  <span className="font-bold text-white font-mono">{currentPlan.payouts}</span>
                </div>
                <div>
                  <span className="text-[10px] text-fgText-secondary uppercase block">Daily Drawdown</span>
                  <span className="font-bold text-white font-mono">
                    {formatNaira(selectedSize * 0.04)} ({currentPlan.dailyDD})
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-fgText-secondary uppercase block">Max Drawdown</span>
                  <span className="font-bold text-white font-mono">
                    {formatNaira(selectedSize * (selectedPlan === 'phoenix-rise' ? 0.07 : 0.1))} ({currentPlan.maxDD})
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-fgText-secondary uppercase block">Leverage</span>
                  <span className="font-bold text-white font-mono">{currentPlan.leverage}</span>
                </div>
                <div>
                  <span className="text-[10px] text-fgText-secondary uppercase block">Profit Split</span>
                  <span className="font-bold text-white font-mono">{currentPlan.profitSplit}</span>
                </div>
              </div>

              {/* Price Calculation Rows */}
              <div className="space-y-1.5 text-xs font-mono">
                <div className="flex justify-between text-fgText-secondary">
                  <span>Subtotal:</span>
                  <span className="text-white">{formatNaira(currentPrice)}</span>
                </div>

                {validationResult?.siteCoupon?.isValid && validationResult.siteCoupon.discountNgn > 0 && (
                  <div className="flex justify-between text-emerald-400">
                    <span>Site Promo (-{validationResult.siteCoupon.discountPercent}%):</span>
                    <span>-{formatNaira(validationResult.siteCoupon.discountNgn)}</span>
                  </div>
                )}

                {validationResult?.affiliateCoupon?.isValid && validationResult.affiliateCoupon.discountNgn > 0 && (
                  <div className="flex justify-between text-emerald-400">
                    <span>Affiliate Discount (-{validationResult.affiliateCoupon.discountPercent}%):</span>
                    <span>-{formatNaira(validationResult.affiliateCoupon.discountNgn)}</span>
                  </div>
                )}

                <div className="flex justify-between items-baseline pt-2 border-t border-white/[0.08]">
                  <span className="text-xs uppercase font-bold text-white">Final Total:</span>
                  <span className="text-lg font-bold font-mono text-white tracking-tight">
                    {formatNaira(finalTotalNgn)}
                  </span>
                </div>
              </div>

              {/* Vault Balance Status */}
              <div className="p-3 rounded-lg bg-[#0e1a12] border border-white/[0.08] text-xs space-y-1">
                <div className="flex justify-between items-center">
                  <span className="text-fgText-secondary">Giants Vault Available:</span>
                  <span className="font-mono font-bold text-white">{formatNaira(walletBalanceNgn)}</span>
                </div>
                {!hasSufficientFunds && (
                  <div className="text-[11px] text-amber-400 flex items-center gap-1 pt-1 font-sans">
                    <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                    <span>Insufficient balance. Deposit funds into Giants Vault to proceed.</span>
                  </div>
                )}
              </div>

              {error && (
                <div className="p-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Action Button */}
              {hasSufficientFunds ? (
                <button
                  onClick={handlePayFromWallet}
                  disabled={loading}
                  type="button"
                  className={`w-full py-3 px-4 rounded-xl font-heading font-extrabold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${
                    selectedPlan === 'phoenix-rise'
                      ? 'bg-amber-500 hover:bg-amber-400 text-black shadow-[0_0_20px_rgba(245,158,11,0.25)]'
                      : 'bg-emerald-500 hover:bg-emerald-400 text-black shadow-[0_0_20px_rgba(34,197,94,0.25)]'
                  }`}
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Provisioning SteraTrader Account...</span>
                    </>
                  ) : (
                    <>
                      <Wallet className="w-4 h-4" />
                      <span>Pay from Giants Vault • {formatNaira(finalTotalNgn)}</span>
                    </>
                  )}
                </button>
              ) : (
                <Link
                  href="/dashboard/wallet?tab=DEPOSIT"
                  className="w-full py-3 px-4 rounded-xl font-heading font-extrabold text-xs uppercase tracking-wider flex items-center justify-center gap-2 bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/25 transition-all text-center"
                >
                  Deposit into Giants Vault
                </Link>
              )}

              <p className="text-[10px] text-fgText-secondary text-center leading-relaxed">
                One-time activation fee • Instant SteraTrader credentials • {currentPlan.profitSplit} Split
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
