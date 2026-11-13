'use client';

import React, { useState, useEffect } from 'react';
import { Award, Zap, ShieldCheck, CheckCircle2, AlertCircle, ArrowRight, Loader2, Sparkles } from 'lucide-react';
import Image from 'next/image';

interface PlanDefinition {
  id: string;
  title: string;
  subtitle: string;
  accent: string;
  leverage: string;
  dailyDrawdownPercent: number;
  maxDrawdownPercent: number;
  profitTarget: string;
  payouts: string;
  refundNote: string;
  pricing: Record<string, number>;
}

export default function BuyChallengePage() {
  const [plans, setPlans] = useState<PlanDefinition[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<string>('rhino-rush');
  const [selectedSize, setSelectedSize] = useState<number>(5000000);
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successData, setSuccessData] = useState<any | null>(null);

  // Available Sizes in NGN (strictly Naira)
  const sizes = [1000000, 2500000, 5000000, 10000000, 25000000, 50000000];

  useEffect(() => {
    async function fetchPlans() {
      try {
        const res = await fetch('http://localhost:4000/api/v1/challenges/plans');
        const data = await res.json();
        if (data.plans) {
          setPlans(data.plans);
        }
      } catch (e: any) {
        console.error('Failed to load plans:', e);
      } finally {
        setLoadingPlans(false);
      }
    }
    fetchPlans();
  }, []);

  const activePlan = plans.find((p) => p.id === selectedPlanId);
  const fee = activePlan?.pricing?.[selectedSize] || 0;

  const handlePayFromWallet = async () => {
    setError(null);
    setPurchasing(true);
    setSuccessData(null);

    try {
      const res = await fetch('http://localhost:4000/api/v1/challenges/purchase-from-wallet', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // In production, session cookie is sent automatically with credentials: 'include'
        },
        credentials: 'include',
        body: JSON.stringify({
          planType: selectedPlanId,
          accountSizeNgn: selectedSize,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to process purchase from wallet.');
      }

      setSuccessData(data);
    } catch (err: any) {
      setError(err.message || 'Failed to complete wallet purchase.');
    } finally {
      setPurchasing(false);
    }
  };

  return (
    <div className="space-y-8 max-w-6xl pb-12">
      {/* Page Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            Direct Wallet Provisioning
          </span>
          <span className="text-xs text-fgText-muted">Instant SteraTrader Setup</span>
        </div>
        <h1 className="text-2xl md:text-3xl font-heading font-extrabold text-white tracking-tight">
          Select Your Assessment Plan
        </h1>
        <p className="text-xs text-fgText-secondary mt-1">
          Bypasses billing checkout entirely — your Central NGN Wallet balance is debited and your trading credentials are created immediately.
        </p>
      </div>

      {/* Plan Type Selector */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Rhino Rush (1 Step Challenge) */}
        <div
          onClick={() => setSelectedPlanId('rhino-rush')}
          className={`cursor-pointer p-6 rounded-2xl border transition-all relative overflow-hidden ${
            selectedPlanId === 'rhino-rush'
              ? 'bg-gradient-to-b from-[#0e2118] to-bg-surface border-emerald-500 shadow-emeraldGlow'
              : 'bg-bg-surface border-fgBorder-subtle hover:border-fgBorder-default'
          }`}
        >
          {selectedPlanId === 'rhino-rush' && (
            <div className="absolute top-3 right-3 px-2 py-0.5 rounded-full bg-emerald-500 text-bg-base text-[10px] font-bold uppercase tracking-wider">
              Selected
            </div>
          )}
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-heading font-bold text-white">Rhino Rush</h2>
              <span className="text-xs text-emerald-400 font-semibold">1 Step Challenge (Challenge &rarr; Funded)</span>
            </div>
          </div>
          <p className="text-xs text-fgText-secondary leading-relaxed mb-4">
            Pass the single evaluation phase with disciplined risk management to unlock your fully funded live account.
          </p>
          <div className="grid grid-cols-3 gap-2 pt-3 border-t border-fgBorder-subtle text-center text-xs">
            <div>
              <span className="text-[10px] text-fgText-muted block uppercase">Profit Target</span>
              <span className="font-bold text-white">10%</span>
            </div>
            <div>
              <span className="text-[10px] text-fgText-muted block uppercase">Max Loss</span>
              <span className="font-bold text-white">10%</span>
            </div>
            <div>
              <span className="text-[10px] text-fgText-muted block uppercase">Leverage</span>
              <span className="font-bold text-emerald-400">1:100</span>
            </div>
          </div>
        </div>

        {/* Phoenix Rise (Instant Funding) */}
        <div
          onClick={() => setSelectedPlanId('phoenix-rise')}
          className={`cursor-pointer p-6 rounded-2xl border transition-all relative overflow-hidden ${
            selectedPlanId === 'phoenix-rise'
              ? 'bg-gradient-to-b from-[#241a0b] to-bg-surface border-amber-500 shadow-[0_0_25px_rgba(245,158,11,0.2)]'
              : 'bg-bg-surface border-fgBorder-subtle hover:border-fgBorder-default'
          }`}
        >
          {selectedPlanId === 'phoenix-rise' && (
            <div className="absolute top-3 right-3 px-2 py-0.5 rounded-full bg-amber-500 text-bg-base text-[10px] font-bold uppercase tracking-wider">
              Selected
            </div>
          )}
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-heading font-bold text-white">Phoenix Rise</h2>
              <span className="text-xs text-amber-400 font-semibold">Live / Instant Funding</span>
            </div>
          </div>
          <p className="text-xs text-fgText-secondary leading-relaxed mb-4">
            Zero evaluation phases. Direct access to a live funded trading account with immediate on-demand profit withdrawals.
          </p>
          <div className="grid grid-cols-3 gap-2 pt-3 border-t border-fgBorder-subtle text-center text-xs">
            <div>
              <span className="text-[10px] text-fgText-muted block uppercase">Phase</span>
              <span className="font-bold text-amber-400">Instant</span>
            </div>
            <div>
              <span className="text-[10px] text-fgText-muted block uppercase">Max Loss</span>
              <span className="font-bold text-white">7%</span>
            </div>
            <div>
              <span className="text-[10px] text-fgText-muted block uppercase">Leverage</span>
              <span className="font-bold text-amber-400">1:30</span>
            </div>
          </div>
        </div>
      </div>

      {/* Account Size Selection Buttons */}
      <div className="p-6 rounded-2xl bg-bg-surface border border-fgBorder-subtle space-y-4">
        <span className="text-xs font-semibold uppercase tracking-wider text-fgText-muted block">
          Select Account Capital (NGN)
        </span>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {sizes.map((sz) => {
            const isSelected = selectedSize === sz;
            const sizeLabel =
              sz >= 1000000 ? `₦${sz / 1000000}M` : `₦${sz.toLocaleString()}`;

            return (
              <button
                key={sz}
                type="button"
                onClick={() => setSelectedSize(sz)}
                className={`py-3 px-2 rounded-xl text-center border transition-all ${
                  isSelected
                    ? selectedPlanId === 'phoenix-rise'
                      ? 'bg-amber-500/20 border-amber-500 text-amber-300 shadow-sm font-bold'
                      : 'bg-emerald-500/20 border-emerald-500 text-emerald-300 shadow-sm font-bold'
                    : 'bg-bg-card border-fgBorder-subtle text-fgText-secondary hover:text-white hover:border-fgBorder-default'
                }`}
              >
                <span className="text-sm block">{sizeLabel}</span>
                <span className="text-[10px] text-fgText-muted block font-mono">
                  {selectedPlanId === 'phoenix-rise' ? 'Instant Live' : '1-Step Target'}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Purchase Confirmation Box */}
      <div className="p-6 rounded-2xl bg-bg-surface border border-fgBorder-subtle flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="space-y-1 text-center md:text-left">
          <span className="text-[11px] text-fgText-muted uppercase tracking-wider block">
            Assessment & Activation Fee
          </span>
          <div className="flex items-baseline gap-2 justify-center md:justify-start">
            <span className="text-3xl font-heading font-extrabold text-white font-mono">
              ₦{fee.toLocaleString()}
            </span>
            <span className="text-xs text-fgText-secondary font-medium">NGN</span>
          </div>
          <p className="text-[11px] text-fgText-muted">
            {selectedPlanId === 'rhino-rush'
              ? 'Includes 100% fee refund upon reaching 10% total payouts on funded phase.'
              : 'Direct live trading account with daily on-demand profit disbursements.'}
          </p>
        </div>

        <button
          type="button"
          onClick={handlePayFromWallet}
          disabled={purchasing}
          className={`w-full md:w-auto px-8 py-4 font-bold rounded-xl flex items-center justify-center gap-3 transition-all text-sm ${
            selectedPlanId === 'phoenix-rise'
              ? 'bg-amber-500 hover:bg-amber-400 text-bg-base shadow-[0_0_20px_rgba(245,158,11,0.3)]'
              : 'bg-emerald-500 hover:bg-emerald-400 text-bg-base shadow-emeraldGlow'
          } disabled:opacity-50`}
        >
          {purchasing ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Provisioning SteraTrader Account...</span>
            </>
          ) : (
            <>
              <span>Pay ₦{fee.toLocaleString()} from Wallet</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="p-4 rounded-xl bg-red-950/40 border border-red-500/40 text-red-400 text-xs flex items-center gap-3">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Success Notification */}
      {successData && (
        <div className="p-6 rounded-2xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 text-xs space-y-3">
          <div className="flex items-center gap-2 text-sm font-bold text-white">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            <span>Account Successfully Provisioned!</span>
          </div>
          <p>
            Your account credentials have been created on SteraTrader under subset{' '}
            <span className="font-mono text-white font-semibold">FG-NGN-Standard</span>.
          </p>
          <div className="p-3 rounded-lg bg-bg-card font-mono text-white text-[11px] space-y-1">
            <div>Account Login: {successData.account?.loginNumber}</div>
            <div>Server: SteraTrader Live</div>
            <div>Balance: ₦{selectedSize.toLocaleString()}</div>
          </div>
        </div>
      )}
    </div>
  );
}
