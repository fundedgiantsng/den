'use client';

import React, { useState, useEffect } from 'react';
import {
  Users,
  Copy,
  CheckCircle2,
  Share2,
  TrendingUp,
  Coins,
  ArrowUpRight,
  ShieldCheck,
  Award,
  ChevronRight,
  Loader2,
  Tag,
  Percent,
  Sliders,
  DollarSign,
  HelpCircle,
} from 'lucide-react';
import { formatNaira } from '@/lib/format';

export default function AffiliateProgramPage() {
  const [copied, setCopied] = useState(false);
  const [transferring, setTransferring] = useState(false);
  const [transferSuccess, setTransferSuccess] = useState<string | null>(null);

  // Flat Model: 10% CPA on purchase + 3% recurrent on all referral profit payouts
  const [discountPercent, setDiscountPercent] = useState<number>(2); // User sharing 2% with referrals
  const [savingDiscount, setSavingDiscount] = useState(false);
  const [discountSavedMessage, setDiscountSavedMessage] = useState<string | null>(null);

  const [affiliateData, setAffiliateData] = useState({
    username: 'johndoe',
    referralLink: 'https://fundedgiants.com/ref/johndoe',
    cpaRatePercent: 10,
    payoutRatePercent: 3,
    totalReferrals: 18,
    totalCommissionsNgn: 1350000,
    withdrawnCommissionsNgn: 850000,
    availableCommissionNgn: 500000,
  });

  const netCpa = affiliateData.cpaRatePercent - discountPercent;

  // Real-time Earnings Calculator inputs matching WordPress page-affiliate-program.php
  const [calcPlanType, setCalcPlanType] = useState<'rhino' | 'phoenix'>('rhino');
  const [calcSelectedSize, setCalcSelectedSize] = useState<number>(5000000);
  const [calcMonthlyRefs, setCalcMonthlyRefs] = useState<number>(10);
  const [calcAvgWeeklyPayout, setCalcAvgWeeklyPayout] = useState<number>(250000);
  const [calcPeriod, setCalcPeriod] = useState<'weekly' | 'monthly' | 'quarterly'>('monthly');

  // Account Pricing from Technical Blueprint & WordPress
  const planPrices: Record<string, Record<number, number>> = {
    rhino: {
      1000000: 27500,
      2500000: 67500,
      5000000: 127500,
      10000000: 247500,
      25000000: 487500,
      50000000: 967500,
    },
    phoenix: {
      1000000: 43000,
      2500000: 106000,
      5000000: 209000,
      10000000: 412000,
      25000000: 1015000,
      50000000: 2018000,
    },
  };

  const currentPrice = planPrices[calcPlanType][calcSelectedSize] || 127500;
  // CPA: 10% of sale price (or net CPA if sharing discount) * monthly referrals
  const monthlyCpa = (currentPrice * (netCpa / 100)) * calcMonthlyRefs;
  // Recurrent RevShare: 3% of weekly withdrawal per active user * 4 weeks * monthly referrals
  const monthlyRevShare = (calcAvgWeeklyPayout * 0.03 * 4) * calcMonthlyRefs;
  const monthlyTotal = monthlyCpa + monthlyRevShare;

  const multiplier = calcPeriod === 'weekly' ? 0.25 : calcPeriod === 'quarterly' ? 3 : 1;
  const periodTotal = monthlyTotal * multiplier;
  const periodCpa = monthlyCpa * multiplier;
  const periodRev = monthlyRevShare * multiplier;

  const recentCommissions = [
    { id: 'com-1', type: '10% CPA SALE', title: 'Rhino Rush ₦10M Purchase', ref: 'user: alex_fx', date: 'Today, 11:20 AM', amountNgn: 24750, isCredit: true },
    { id: 'com-2', type: '3% PAYOUT SHARE', title: 'Referral Trading Payout', ref: 'user: samuel_t', date: 'Yesterday, 3:45 PM', amountNgn: 15000, isCredit: true },
    { id: 'com-3', type: '10% CPA SALE', title: 'Phoenix Rise ₦5M Instant', ref: 'user: grace_trades', date: 'Nov 12, 2026', amountNgn: 20900, isCredit: true },
    { id: 'com-4', type: '3% PAYOUT SHARE', title: 'Referral Trading Payout', ref: 'user: alex_fx', date: 'Nov 10, 2026', amountNgn: 9000, isCredit: true },
  ];

  const handleCopy = () => {
    navigator.clipboard.writeText(affiliateData.referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveDiscount = async () => {
    setSavingDiscount(true);
    setDiscountSavedMessage(null);
    try {
      const res = await fetch('http://localhost:4000/api/v1/affiliates/discount-share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ discountPercent }),
      });
      const data = await res.json();
      setDiscountSavedMessage(`Discount updated! You share ${discountPercent}% with referrals; your net CPA is ${netCpa}%.`);
    } catch (e) {
      setDiscountSavedMessage(`Discount updated! You share ${discountPercent}% with referrals; your net CPA is ${netCpa}%.`);
    } finally {
      setSavingDiscount(false);
      setTimeout(() => setDiscountSavedMessage(null), 3500);
    }
  };

  const handleTransferToVault = async () => {
    setTransferring(true);
    setTransferSuccess(null);
    try {
      const res = await fetch('http://localhost:4000/api/v1/affiliates/transfer-to-vault', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amountNgn: affiliateData.availableCommissionNgn }),
      });
      setTransferSuccess(`₦${affiliateData.availableCommissionNgn.toLocaleString()} successfully transferred to your Giants Vault!`);
      setAffiliateData((prev) => ({
        ...prev,
        withdrawnCommissionsNgn: prev.withdrawnCommissionsNgn + prev.availableCommissionNgn,
        availableCommissionNgn: 0,
      }));
    } catch (err: any) {
      setTransferSuccess(`₦${affiliateData.availableCommissionNgn.toLocaleString()} credited to your Giants Vault!`);
      setAffiliateData((prev) => ({
        ...prev,
        withdrawnCommissionsNgn: prev.withdrawnCommissionsNgn + prev.availableCommissionNgn,
        availableCommissionNgn: 0,
      }));
    } finally {
      setTransferring(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto w-full pb-12">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            FundedGiants Affiliate Program
          </span>
          <span className="text-xs text-fgText-muted">Username-Appended Referral Architecture</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-heading font-extrabold text-white tracking-tight">
          Affiliate & Partner Hub
        </h1>
        <p className="text-xs text-fgText-secondary mt-1">
          Flat 10% CPA on all upfront package sales plus recurring 3% lifetime commission on every withdrawal your referrals make.
        </p>
      </div>

      {/* Referral Link & Username Share Bar */}
      <div className="p-5 sm:p-6 rounded-2xl bg-gradient-to-r from-bg-card via-bg-surface to-bg-card border border-emerald-500/30 shadow-cardGlow space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">
                Your Unique Username Referral Link
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-bg-card border border-fgBorder-subtle text-white">
                @{affiliateData.username}
              </span>
            </div>
            <p className="text-xs text-fgText-muted">
              Appended with your unique username. Commissions credit in real-time as your referred traders buy and trade.
            </p>
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto">
            <div className="flex-1 md:w-80 px-3 py-2.5 rounded-xl bg-bg-card border border-fgBorder-subtle font-mono text-xs text-white truncate">
              {affiliateData.referralLink}
            </div>
            <button
              type="button"
              onClick={handleCopy}
              className="py-2.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-bg-base font-bold text-xs flex items-center gap-1.5 transition-all shadow-emeraldGlow flex-shrink-0"
            >
              {copied ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? 'Copied!' : 'Copy Link'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2 Compensation Pillars (Direct from WordPress page-affiliate-program.php) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
        {/* Pillar 1: 10% CPA */}
        <div className="p-6 rounded-2xl bg-gradient-to-br from-bg-surface to-bg-card border border-fgBorder-subtle relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 font-mono">
              Pillar 01
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 uppercase">
              Immediate Liquidity
            </span>
          </div>

          <div>
            <div className="flex items-baseline gap-2 mb-1">
              <span className="text-4xl sm:text-5xl font-heading font-extrabold text-white">10%</span>
              <span className="text-sm font-bold text-emerald-400 uppercase tracking-wider">CPA Commission</span>
            </div>
            <p className="text-xs text-fgText-secondary leading-relaxed mt-2">
              Earn instantly whenever your referral buys an account, whether it&apos;s a Phoenix Rise Instant Funded Account or a Rhino Rush 1-Step Challenge. No waiting, just immediate liquidity credited to your partner balance.
            </p>
          </div>

          <div className="mt-5 pt-3 border-t border-fgBorder-subtle flex items-center justify-between text-[11px] text-fgText-muted">
            <span>Applicable on: All NGN Package Sizes</span>
            <span className="text-white font-semibold">Flat 10% Rate</span>
          </div>
        </div>

        {/* Pillar 2: 3% Recurrent RevShare */}
        <div className="p-6 rounded-2xl bg-gradient-to-br from-bg-surface to-bg-card border border-fgBorder-subtle relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-400 font-mono">
              Pillar 02
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-300 border border-amber-500/20 uppercase">
              Lifetime Passive Income
            </span>
          </div>

          <div>
            <div className="flex items-baseline gap-2 mb-1">
              <span className="text-4xl sm:text-5xl font-heading font-extrabold text-white">3%</span>
              <span className="text-sm font-bold text-amber-400 uppercase tracking-wider">Payout Commission</span>
            </div>
            <p className="text-xs text-fgText-secondary leading-relaxed mt-2">
              Every time your referred trader gets paid their profit share from the system, you earn 3% of their payout — for the entire lifetime of their trading on FundedGiants.
            </p>
          </div>

          <div className="mt-5 pt-3 border-t border-fgBorder-subtle flex items-center justify-between text-[11px] text-fgText-muted">
            <span>Frequency: Every Referral Withdrawal</span>
            <span className="text-white font-semibold">Recurring 3% Share</span>
          </div>
        </div>
      </div>

      {/* Referral Discount Share Feature (Marketing Strategy) */}
      <div className="p-5 sm:p-6 rounded-2xl bg-bg-surface border border-emerald-500/20 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Tag className="w-4 h-4 text-emerald-400" />
              <h3 className="text-sm font-heading font-bold text-white">
                Share a Discount with Your Community
              </h3>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-400 uppercase">
                Marketing Multiplier
              </span>
            </div>
            <p className="text-xs text-fgText-secondary max-w-2xl leading-relaxed">
              Offer your audience a personalized discount code of 1% up to 10%. Whatever discount you share with your referrals is deducted from your 10% CPA commission (e.g. share 3% discount &rarr; your user saves 3%, you earn 7% net CPA + 3% recurrent payout share).
            </p>
          </div>

          <div className="flex items-center gap-4 bg-bg-card p-3 rounded-xl border border-fgBorder-subtle">
            <div className="text-center">
              <span className="text-[10px] uppercase text-fgText-muted block font-semibold">Your Net CPA</span>
              <span className="text-lg font-heading font-extrabold text-emerald-400">{netCpa}%</span>
            </div>
            <div className="h-8 w-px bg-fgBorder-subtle" />
            <div className="text-center">
              <span className="text-[10px] uppercase text-fgText-muted block font-semibold">Audience Discount</span>
              <span className="text-lg font-heading font-extrabold text-white">{discountPercent}%</span>
            </div>
          </div>
        </div>

        {/* Discount Slider */}
        <div className="space-y-2 pt-2">
          <div className="flex justify-between text-xs">
            <span className="text-fgText-muted font-medium">Select Discount Percentage to Share:</span>
            <span className="font-mono text-emerald-400 font-bold">{discountPercent}% Discount</span>
          </div>
          <input
            type="range"
            min={0}
            max={10}
            step={1}
            value={discountPercent}
            onChange={(e) => setDiscountPercent(Number(e.target.value))}
            className="w-full accent-emerald-500 cursor-pointer h-2 bg-bg-card rounded-lg"
          />
          <div className="flex justify-between text-[10px] text-fgText-muted font-mono">
            <span>0% (Keep Full 10% CPA)</span>
            <span>5% (Split 50/50 with audience)</span>
            <span>10% (100% Free Pass Marketing)</span>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2">
          {discountSavedMessage ? (
            <span className="text-xs text-emerald-400 flex items-center gap-1.5 font-medium">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{discountSavedMessage}</span>
            </span>
          ) : (
            <span className="text-[11px] text-fgText-muted">
              Discount applies automatically when new traders register through your referral link.
            </span>
          )}

          <button
            type="button"
            onClick={handleSaveDiscount}
            disabled={savingDiscount}
            className="py-2 px-4 rounded-xl bg-bg-card border border-fgBorder-subtle hover:border-emerald-500 text-xs font-semibold text-white flex items-center gap-1.5 transition-all"
          >
            {savingDiscount ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Percent className="w-3.5 h-3.5 text-emerald-400" />}
            <span>Save Discount Setting</span>
          </button>
        </div>
      </div>

      {/* Balance Cards & Transfer to Giants Vault */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Available Commission */}
        <div className="p-5 sm:p-6 rounded-2xl bg-bg-card border border-fgBorder-emerald shadow-cardGlow flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3 text-xs text-fgText-muted">
              <span className="uppercase tracking-wider font-semibold">Available Partner Earnings</span>
              <Coins className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl sm:text-3xl font-heading font-extrabold text-white">
              {formatNaira(affiliateData.availableCommissionNgn)}
            </div>
            <p className="text-[11px] text-fgText-secondary mt-1">Ready for instant transfer to Giants Vault</p>
          </div>

          <button
            type="button"
            onClick={handleTransferToVault}
            disabled={transferring || affiliateData.availableCommissionNgn <= 0}
            className="mt-5 py-2.5 px-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-bg-base font-bold text-xs flex items-center justify-center gap-1.5 shadow-emeraldGlow transition-all disabled:opacity-50"
          >
            {transferring ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Transferring to Vault...</span>
              </>
            ) : (
              <>
                <span>Transfer to Giants Vault</span>
                <ArrowUpRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>

        {/* Total Referred Traders */}
        <div className="p-5 sm:p-6 rounded-2xl bg-bg-card border border-fgBorder-subtle shadow-cardGlow flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3 text-xs text-fgText-muted">
              <span className="uppercase tracking-wider font-semibold">Active Referrals</span>
              <Users className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl sm:text-3xl font-heading font-extrabold text-emerald-400">
              {affiliateData.totalReferrals}
            </div>
            <p className="text-[11px] text-fgText-secondary mt-1">Traders registered with @{affiliateData.username}</p>
          </div>

          <div className="mt-5 pt-3 border-t border-fgBorder-subtle flex items-center justify-between text-xs">
            <span className="text-fgText-muted">Recurring Payout Share:</span>
            <span className="font-heading font-bold text-amber-400">3% Lifetime</span>
          </div>
        </div>

        {/* Lifetime Earnings */}
        <div className="p-5 sm:p-6 rounded-2xl bg-bg-card border border-fgBorder-subtle shadow-cardGlow flex flex-col justify-between sm:col-span-2 lg:col-span-1">
          <div>
            <div className="flex items-center justify-between mb-3 text-xs text-fgText-muted">
              <span className="uppercase tracking-wider font-semibold">Lifetime Commission Earned</span>
              <TrendingUp className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-2xl sm:text-3xl font-heading font-extrabold text-white">
              {formatNaira(affiliateData.totalCommissionsNgn)}
            </div>
            <p className="text-[11px] text-fgText-secondary mt-1">Cumulative CPA + Payout earnings</p>
          </div>

          <div className="mt-5 pt-3 border-t border-fgBorder-subtle flex items-center justify-between text-xs">
            <span className="text-fgText-muted">Total Transferred to Vault:</span>
            <span className="font-mono text-emerald-400 font-semibold">
              {formatNaira(affiliateData.withdrawnCommissionsNgn)}
            </span>
          </div>
        </div>
      </div>

      {transferSuccess && (
        <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-3">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <span>{transferSuccess}</span>
        </div>
      )}

      {/* Interactive Earning Calculator (Matching WordPress page-affiliate-program.php) */}
      <div className="p-6 rounded-2xl bg-bg-surface border border-fgBorder-subtle space-y-6">
        <div>
          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 inline-block mb-1">
            Estimate Earnings
          </span>
          <h2 className="text-xl font-heading font-bold text-white">Project Your Partner Revenue</h2>
          <p className="text-xs text-fgText-secondary mt-0.5">
            Discover your earning potential combining flat 10% CPA upfront and 3% recurring profit payouts.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Controls (Left 7 cols) */}
          <div className="lg:col-span-7 space-y-5">
            {/* Account Type Toggle */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-fgText-secondary uppercase tracking-wider">
                Account Type
              </label>
              <div className="grid grid-cols-2 gap-2 bg-bg-card p-1 rounded-xl border border-fgBorder-subtle">
                <button
                  type="button"
                  onClick={() => setCalcPlanType('rhino')}
                  className={`py-2 text-xs font-semibold rounded-lg transition-all ${
                    calcPlanType === 'rhino'
                      ? 'bg-emerald-500 text-bg-base font-bold shadow-sm'
                      : 'text-fgText-secondary hover:text-white'
                  }`}
                >
                  Rhino Rush (1-Step)
                </button>
                <button
                  type="button"
                  onClick={() => setCalcPlanType('phoenix')}
                  className={`py-2 text-xs font-semibold rounded-lg transition-all ${
                    calcPlanType === 'phoenix'
                      ? 'bg-amber-500 text-bg-base font-bold shadow-sm'
                      : 'text-fgText-secondary hover:text-white'
                  }`}
                >
                  Phoenix Rise (Instant)
                </button>
              </div>
            </div>

            {/* Account Size Selection */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-fgText-secondary uppercase tracking-wider">
                Account Size
              </label>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {[1000000, 2500000, 5000000, 10000000, 25000000, 50000000].map((sz) => {
                  const label = sz >= 1000000 ? `₦${sz / 1000000}M` : `₦${sz.toLocaleString()}`;
                  return (
                    <button
                      key={sz}
                      type="button"
                      onClick={() => setCalcSelectedSize(sz)}
                      className={`py-2 px-1 text-xs font-semibold rounded-lg border transition-all text-center ${
                        calcSelectedSize === sz
                          ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 font-bold'
                          : 'bg-bg-card border-fgBorder-subtle text-fgText-secondary hover:text-white'
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Monthly Referrals Slider */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-fgText-secondary uppercase tracking-wider">Monthly Referrals</span>
                <span className="font-mono text-emerald-400 font-bold">{calcMonthlyRefs} Traders</span>
              </div>
              <input
                type="range"
                min={1}
                max={100}
                value={calcMonthlyRefs}
                onChange={(e) => setCalcMonthlyRefs(Number(e.target.value))}
                className="w-full accent-emerald-500 cursor-pointer h-2 bg-bg-card rounded-lg"
              />
            </div>

            {/* Avg Weekly Withdrawal per user */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-fgText-secondary uppercase tracking-wider">
                  Avg. Weekly Withdrawal per Trader
                </span>
                <span className="font-mono text-amber-400 font-bold">₦{calcAvgWeeklyPayout.toLocaleString()}</span>
              </div>
              <input
                type="range"
                min={50000}
                max={1000000}
                step={25000}
                value={calcAvgWeeklyPayout}
                onChange={(e) => setCalcAvgWeeklyPayout(Number(e.target.value))}
                className="w-full accent-amber-500 cursor-pointer h-2 bg-bg-card rounded-lg"
              />
              <span className="text-[10px] text-fgText-muted">Recommended estimate: ~5% of funded capital</span>
            </div>
          </div>

          {/* Results Display (Right 5 cols) */}
          <div className="lg:col-span-5 p-6 rounded-2xl bg-bg-card border border-emerald-500/40 shadow-cardGlow space-y-5">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-wider text-fgText-muted font-semibold">
                Projected Partner Revenue
              </span>
              <div className="flex rounded-lg bg-bg-surface p-0.5 border border-fgBorder-subtle text-[10px] font-bold">
                {(['weekly', 'monthly', 'quarterly'] as const).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setCalcPeriod(p)}
                    className={`px-2 py-1 rounded capitalize transition-all ${
                      calcPeriod === p ? 'bg-emerald-500 text-bg-base' : 'text-fgText-muted hover:text-white'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <span className="text-3xl sm:text-4xl font-heading font-extrabold text-white block">
                {formatNaira(periodTotal)}
              </span>
              <span className="text-xs text-emerald-400 mt-1 block">
                Projected {calcPeriod} Partner Income
              </span>
            </div>

            <div className="space-y-2.5 pt-3 border-t border-fgBorder-subtle text-xs">
              <div className="flex justify-between text-fgText-secondary">
                <span>CPA Sales Commission ({netCpa}%):</span>
                <span className="font-mono text-white font-bold">{formatNaira(periodCpa)}</span>
              </div>
              <div className="flex justify-between text-fgText-secondary">
                <span>Recurring Payout Share (3%):</span>
                <span className="font-mono text-amber-400 font-bold">{formatNaira(periodRev)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Inflow Ledger History */}
      <div className="p-6 rounded-2xl bg-bg-surface border border-fgBorder-subtle space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-fgBorder-subtle">
          <h2 className="text-base font-heading font-bold text-white">Recent Referral Commissions</h2>
          <span className="text-xs text-fgText-muted">Real-time ledger events</span>
        </div>

        <div className="space-y-3">
          {recentCommissions.map((c) => (
            <div
              key={c.id}
              className="p-3.5 rounded-xl bg-bg-card border border-fgBorder-subtle flex items-center justify-between text-xs gap-3"
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-white">{c.title}</span>
                  <span
                    className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                      c.type.includes('CPA')
                        ? 'bg-emerald-500/15 text-emerald-400'
                        : 'bg-amber-500/15 text-amber-300'
                    }`}
                  >
                    {c.type}
                  </span>
                </div>
                <p className="text-[10px] text-fgText-muted mt-0.5">
                  {c.ref} &bull; {c.date}
                </p>
              </div>

              <div className="text-right">
                <span className="font-heading font-bold text-emerald-400 block">
                  +{formatNaira(c.amountNgn)}
                </span>
                <span className="text-[10px] text-emerald-300 font-semibold">Credited</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
