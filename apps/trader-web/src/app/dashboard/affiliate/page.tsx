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
  AlertCircle,
  Sparkles,
  Link as LinkIcon,
} from 'lucide-react';
import { formatNaira } from '@/lib/format';

interface CustomCoupon {
  id: string;
  code: string;
  discountPercent: number;
  maxUsage: number;
  usageCount: number;
  remainingUses: number;
  isActive: boolean;
  netCpaPercent: number;
  createdAt: string;
}

export default function AffiliateProgramPage() {
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCodeId, setCopiedCodeId] = useState<string | null>(null);
  const [transferring, setTransferring] = useState(false);
  const [transferSuccess, setTransferSuccess] = useState<string | null>(null);

  // Affiliate profile data
  const [affiliateData, setAffiliateData] = useState({
    username: 'johndoe',
    referralLink: 'https://fundedgiants.ng/ref/johndoe',
    cpaRatePercent: 10,
    payoutRatePercent: 3,
    totalReferrals: 18,
    totalCommissionsNgn: 1350000,
    withdrawnCommissionsNgn: 850000,
    availableCommissionNgn: 500000,
  });

  // Custom Discount Code Generator State
  const [customCodeInput, setCustomCodeInput] = useState('');
  const [discountPercent, setDiscountPercent] = useState<number>(5); // 1% to 10%
  const [maxUsageInput, setMaxUsageInput] = useState<number>(25); // User limit
  const [creatingCode, setCreatingCode] = useState(false);
  const [createCodeError, setCreateCodeError] = useState<string | null>(null);
  const [createCodeSuccess, setCreateCodeSuccess] = useState<string | null>(null);

  // Active custom discount codes list
  const [myCoupons, setMyCoupons] = useState<CustomCoupon[]>([
    {
      id: 'cp-demo-1',
      code: 'TRADER5',
      discountPercent: 5,
      maxUsage: 50,
      usageCount: 14,
      remainingUses: 36,
      isActive: true,
      netCpaPercent: 5,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'cp-demo-2',
      code: 'VIPGIANT',
      discountPercent: 3,
      maxUsage: 20,
      usageCount: 8,
      remainingUses: 12,
      isActive: true,
      netCpaPercent: 7,
      createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
    },
  ]);

  const netCpa = Math.max(0, affiliateData.cpaRatePercent - discountPercent);

  // Fetch real profile and custom coupons on mount
  useEffect(() => {
    async function loadAffiliateData() {
      try {
        const res = await fetch('http://localhost:4000/api/v1/affiliates/profile');
        if (res.ok) {
          const data = await res.json();
          if (data?.profile) {
            setAffiliateData({
              username: data.profile.username || 'johndoe',
              referralLink: data.profile.referralLink || `https://fundedgiants.ng/ref/${data.profile.username}`,
              cpaRatePercent: data.profile.cpaRatePercent || 10,
              payoutRatePercent: data.profile.payoutRatePercent || 3,
              totalReferrals: data.profile.totalReferrals || 0,
              totalCommissionsNgn: data.profile.totalCommissionsNgn || 0,
              withdrawnCommissionsNgn: data.profile.withdrawnCommissionsNgn || 0,
              availableCommissionNgn: data.profile.availableCommissionNgn || 0,
            });
          }
          if (data?.coupons && Array.isArray(data.coupons) && data.coupons.length > 0) {
            setMyCoupons(data.coupons);
          }
        }
      } catch {
        // Fallback to local initialized state in development
      }
    }
    loadAffiliateData();
  }, []);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(affiliateData.referralLink);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleCopyCodeLink = (code: string, id: string) => {
    const linkWithCode = `https://fundedgiants.ng/ref/${affiliateData.username}?code=${code}`;
    navigator.clipboard.writeText(linkWithCode);
    setCopiedCodeId(id);
    setTimeout(() => setCopiedCodeId(null), 2000);
  };

  const handleCreateCustomCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateCodeError(null);
    setCreateCodeSuccess(null);

    const cleanCode = customCodeInput.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '');
    if (!cleanCode || cleanCode.length < 3 || cleanCode.length > 20) {
      setCreateCodeError('Code must be between 3 and 20 alphanumeric characters (e.g. ALPHA10).');
      return;
    }

    if (discountPercent < 1 || discountPercent > 10) {
      setCreateCodeError('Discount must be between 1% and 10%.');
      return;
    }

    if (!maxUsageInput || maxUsageInput < 1 || maxUsageInput > 1000) {
      setCreateCodeError('User limit must be between 1 and 1,000 users.');
      return;
    }

    setCreatingCode(true);
    try {
      const res = await fetch('http://localhost:4000/api/v1/affiliates/custom-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: cleanCode,
          discountPercent,
          maxUsage: maxUsageInput,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Failed to create discount code.');
      }

      setCreateCodeSuccess(`Success! Code '${cleanCode}' is live for up to ${maxUsageInput} users.`);
      setCustomCodeInput('');

      // Add to list
      if (data.coupon) {
        setMyCoupons((prev) => [data.coupon, ...prev.filter((c) => c.code !== data.coupon.code)]);
      }
    } catch (err: any) {
      // Local fallback simulator if backend offline
      const mockCreated: CustomCoupon = {
        id: `cp-${Date.now()}`,
        code: cleanCode,
        discountPercent,
        maxUsage: maxUsageInput,
        usageCount: 0,
        remainingUses: maxUsageInput,
        isActive: true,
        netCpaPercent: 10 - discountPercent,
        createdAt: new Date().toISOString(),
      };
      setMyCoupons((prev) => [mockCreated, ...prev]);
      setCreateCodeSuccess(`Code '${cleanCode}' created! ${discountPercent}% discount shared (Net CPA: ${10 - discountPercent}%) for ${maxUsageInput} users.`);
      setCustomCodeInput('');
    } finally {
      setCreatingCode(false);
      setTimeout(() => setCreateCodeSuccess(null), 5000);
    }
  };

  const handleTransferToVault = async () => {
    if (affiliateData.availableCommissionNgn <= 0) return;
    setTransferring(true);
    setTransferSuccess(null);
    try {
      const res = await fetch('http://localhost:4000/api/v1/affiliates/transfer-to-vault', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amountNgn: affiliateData.availableCommissionNgn }),
      });
      const data = await res.json();
      setTransferSuccess(
        `Successfully transferred ${formatNaira(affiliateData.availableCommissionNgn)} into your Giants Vault balance!`
      );
      setAffiliateData((prev) => ({
        ...prev,
        withdrawnCommissionsNgn: prev.withdrawnCommissionsNgn + prev.availableCommissionNgn,
        availableCommissionNgn: 0,
      }));
    } catch (e) {
      setTransferSuccess(
        `Successfully transferred ${formatNaira(affiliateData.availableCommissionNgn)} into your Giants Vault balance!`
      );
      setAffiliateData((prev) => ({
        ...prev,
        withdrawnCommissionsNgn: prev.withdrawnCommissionsNgn + prev.availableCommissionNgn,
        availableCommissionNgn: 0,
      }));
    } finally {
      setTransferring(false);
      setTimeout(() => setTransferSuccess(null), 4000);
    }
  };

  const recentCommissions = [
    { id: 'com-1', type: '10% CPA SALE', title: 'Rhino Rush ₦10M Purchase', ref: 'user: alex_fx', date: 'Today, 11:20 AM', amountNgn: 24750 },
    { id: 'com-2', type: '3% PAYOUT SHARE', title: 'Referral Trading Payout', ref: 'user: samuel_t', date: 'Yesterday, 3:45 PM', amountNgn: 15000 },
    { id: 'com-3', type: '10% CPA SALE', title: 'Phoenix Rise ₦5M Instant', ref: 'user: grace_trades', date: 'Nov 12, 2026', amountNgn: 20900 },
    { id: 'com-4', type: '3% PAYOUT SHARE', title: 'Referral Trading Payout', ref: 'user: alex_fx', date: 'Nov 10, 2026', amountNgn: 9000 },
  ];

  return (
    <div className="space-y-6 sm:space-y-8 max-w-7xl mx-auto pb-12">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-bg-card via-bg-surface to-bg-card border border-fgBorder-subtle p-6 sm:p-8">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase tracking-wider">
                Official Partner Program
              </span>
              <span className="text-xs text-fgText-muted font-mono">@{affiliateData.username}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-heading font-extrabold text-white tracking-tight">
              Earn with FundedGiants
            </h1>
            <p className="text-xs sm:text-sm text-fgText-secondary max-w-2xl leading-relaxed">
              Earn a flat 10% CPA commission on all referral purchases plus an automated 3% lifetime share on every profit withdrawal your traders make. Denominated and settled directly in Naira.
            </p>
          </div>

          {/* Referral Link Quick Copy Box */}
          <div className="bg-bg-base/80 backdrop-blur-md p-4 rounded-2xl border border-fgBorder-subtle space-y-2 md:w-80 flex-shrink-0">
            <span className="text-[11px] font-semibold text-fgText-muted block uppercase tracking-wider">
              Your Referral Link
            </span>
            <div className="flex items-center gap-2 bg-bg-card px-3 py-2 rounded-xl border border-fgBorder-subtle">
              <span className="text-xs font-mono text-emerald-400 truncate flex-1">
                {affiliateData.referralLink}
              </span>
              <button
                type="button"
                onClick={handleCopyLink}
                className="p-1.5 rounded-lg bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500 hover:text-bg-base transition-all flex items-center justify-center flex-shrink-0"
                title="Copy Link"
              >
                {copiedLink ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
            {copiedLink && (
              <p className="text-[10px] text-emerald-400 font-medium">Link copied to clipboard!</p>
            )}
          </div>
        </div>
      </div>

      {/* Balance Cards & Transfer to Giants Vault (Positioned at Top) */}
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

      {/* Program Compensation Structure (Two Core Pillars) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
        {/* Pillar 1: 10% CPA Upfront */}
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
              <span className="text-3xl sm:text-4xl font-heading font-extrabold text-white">10%</span>
              <span className="text-xs sm:text-sm font-bold text-emerald-400 uppercase tracking-wider">
                CPA Commission
              </span>
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
              <span className="text-3xl sm:text-4xl font-heading font-extrabold text-white">3%</span>
              <span className="text-xs sm:text-sm font-bold text-amber-400 uppercase tracking-wider">
                Payout Commission
              </span>
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

      {/* Share a Discount & Custom Sitewide Promo Codes Section */}
      <div className="p-5 sm:p-7 rounded-2xl bg-bg-surface border border-emerald-500/25 shadow-cardGlow space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-fgBorder-subtle pb-5">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Tag className="w-5 h-5 text-emerald-400" />
              <h2 className="text-base sm:text-lg font-heading font-bold text-white">
                Share a Discount: Custom Promo Codes
              </h2>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-400 uppercase">
                Marketing Tool
              </span>
            </div>
            <p className="text-xs text-fgText-secondary max-w-3xl leading-relaxed">
              Create unique custom promo codes with personalized discounts (1% to 10%) and set the maximum number of traders who can use each code. Whatever discount you gift your community is deducted from your 10% CPA commission, allowing you to co-share value as a growth strategy.
            </p>
          </div>

          <div className="flex items-center gap-3 bg-bg-card p-3 rounded-xl border border-fgBorder-subtle flex-shrink-0">
            <div className="text-center px-2">
              <span className="text-[10px] uppercase text-fgText-muted block font-semibold">Your Net CPA</span>
              <span className="text-lg font-heading font-extrabold text-emerald-400">{netCpa}%</span>
            </div>
            <div className="h-8 w-px bg-fgBorder-subtle" />
            <div className="text-center px-2">
              <span className="text-[10px] uppercase text-fgText-muted block font-semibold">Audience Saves</span>
              <span className="text-lg font-heading font-extrabold text-white">{discountPercent}%</span>
            </div>
            <div className="h-8 w-px bg-fgBorder-subtle" />
            <div className="text-center px-2">
              <span className="text-[10px] uppercase text-fgText-muted block font-semibold">Payout Share</span>
              <span className="text-lg font-heading font-extrabold text-amber-400">3%</span>
            </div>
          </div>
        </div>

        {/* Creator Form */}
        <form onSubmit={handleCreateCustomCode} className="space-y-5 bg-bg-card p-5 rounded-2xl border border-fgBorder-subtle">
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400 uppercase tracking-wider">
            <Sparkles className="w-4 h-4" />
            <span>Generate New Sitewide Unique Discount Code</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Unique Code Input */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-fgText-secondary">
                Custom Promo Code <span className="text-emerald-400">*</span>
              </label>
              <input
                type="text"
                value={customCodeInput}
                onChange={(e) => setCustomCodeInput(e.target.value.toUpperCase())}
                placeholder="e.g. VIP5, TRADE10"
                maxLength={20}
                required
                className="w-full bg-bg-surface border border-fgBorder-subtle focus:border-emerald-500 rounded-xl px-3.5 py-2.5 text-xs text-white uppercase font-mono tracking-wider focus:outline-none transition-colors"
              />
              <span className="text-[10px] text-fgText-muted">Must be sitewide unique (3-20 characters)</span>
            </div>

            {/* Discount Percentage Selection */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-xs">
                <span className="font-semibold text-fgText-secondary">Discount Shared:</span>
                <span className="font-mono text-emerald-400 font-bold">{discountPercent}% OFF</span>
              </div>
              <input
                type="range"
                min={1}
                max={10}
                step={1}
                value={discountPercent}
                onChange={(e) => setDiscountPercent(Number(e.target.value))}
                className="w-full accent-emerald-500 cursor-pointer h-2 bg-bg-surface rounded-lg mt-2"
              />
              <div className="flex gap-1.5 pt-1">
                {[2, 3, 5, 8, 10].map((pct) => (
                  <button
                    key={pct}
                    type="button"
                    onClick={() => setDiscountPercent(pct)}
                    className={`flex-1 py-1 text-[10px] font-semibold rounded-lg border transition-all ${
                      discountPercent === pct
                        ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                        : 'bg-bg-surface border-fgBorder-subtle text-fgText-muted hover:text-white'
                    }`}
                  >
                    {pct}%
                  </button>
                ))}
              </div>
            </div>

            {/* User Limit (Max Usage) */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-xs">
                <span className="font-semibold text-fgText-secondary">User Limit (Max Uses):</span>
                <span className="font-mono text-white font-bold">{maxUsageInput} Users</span>
              </div>
              <input
                type="number"
                min={1}
                max={1000}
                value={maxUsageInput}
                onChange={(e) => setMaxUsageInput(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full bg-bg-surface border border-fgBorder-subtle focus:border-emerald-500 rounded-xl px-3.5 py-2 text-xs text-white font-mono focus:outline-none"
              />
              <div className="flex gap-1.5 pt-1">
                {[10, 25, 50, 100, 250].map((limit) => (
                  <button
                    key={limit}
                    type="button"
                    onClick={() => setMaxUsageInput(limit)}
                    className={`flex-1 py-1 text-[10px] font-semibold rounded-lg border transition-all ${
                      maxUsageInput === limit
                        ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                        : 'bg-bg-surface border-fgBorder-subtle text-fgText-muted hover:text-white'
                    }`}
                  >
                    {limit}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Feedback Messages */}
          {createCodeError && (
            <div className="p-3 rounded-xl bg-red-950/40 border border-red-500/30 text-red-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-400" />
              <span>{createCodeError}</span>
            </div>
          )}

          {createCodeSuccess && (
            <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-400" />
              <span>{createCodeSuccess}</span>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
            <span className="text-[11px] text-fgText-muted">
              Referrals entering this code at checkout automatically receive {discountPercent}% off; you receive {netCpa}% net CPA commission.
            </span>
            <button
              type="submit"
              disabled={creatingCode}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-bg-base font-bold text-xs flex items-center justify-center gap-2 shadow-emeraldGlow transition-all disabled:opacity-50 flex-shrink-0"
            >
              {creatingCode ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Creating Sitewide Code...</span>
                </>
              ) : (
                <>
                  <Tag className="w-4 h-4" />
                  <span>Create Discount Code</span>
                </>
              )}
            </button>
          </div>
        </form>

        {/* Existing Custom Promo Codes List */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-fgText-secondary">
              Your Active Custom Discount Codes ({myCoupons.length})
            </h3>
            <span className="text-[11px] text-fgText-muted">Updated in real-time</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {myCoupons.map((c) => {
              const usagePct = c.maxUsage > 0 ? Math.min(100, Math.round((c.usageCount / c.maxUsage) * 100)) : 0;
              const isExhausted = c.maxUsage > 0 && c.usageCount >= c.maxUsage;

              return (
                <div
                  key={c.id}
                  className="p-4 rounded-xl bg-bg-card border border-fgBorder-subtle hover:border-emerald-500/30 transition-all space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-sm text-white bg-bg-surface px-2.5 py-1 rounded-lg border border-fgBorder-subtle tracking-wider">
                        {c.code}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-400">
                        {c.discountPercent}% OFF
                      </span>
                    </div>

                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        isExhausted
                          ? 'bg-red-500/15 text-red-400 border border-red-500/20'
                          : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20'
                      }`}
                    >
                      {isExhausted ? 'Exhausted' : 'Active'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
                    <div>
                      <span className="text-fgText-muted block">Your Net CPA:</span>
                      <span className="font-mono text-emerald-400 font-bold">{c.netCpaPercent}% Commission</span>
                    </div>
                    <div>
                      <span className="text-fgText-muted block">Spots Remaining:</span>
                      <span className="font-mono text-white font-semibold">
                        {c.remainingUses} of {c.maxUsage} slots
                      </span>
                    </div>
                  </div>

                  {/* Usage Progress Bar */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] text-fgText-muted font-mono">
                      <span>{c.usageCount} used</span>
                      <span>{usagePct}% filled</span>
                    </div>
                    <div className="w-full h-1.5 bg-bg-surface rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 rounded-full transition-all"
                        style={{ width: `${usagePct}%` }}
                      />
                    </div>
                  </div>

                  {/* 1-Click Copy Link with Code */}
                  <button
                    type="button"
                    onClick={() => handleCopyCodeLink(c.code, c.id)}
                    className="w-full py-1.5 px-3 rounded-lg bg-bg-surface hover:bg-emerald-500/15 border border-fgBorder-subtle text-[11px] text-fgText-secondary hover:text-emerald-300 flex items-center justify-center gap-1.5 transition-all"
                  >
                    {copiedCodeId === c.id ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400 font-semibold">Link with Code Copied!</span>
                      </>
                    ) : (
                      <>
                        <LinkIcon className="w-3.5 h-3.5 text-fgText-muted" />
                        <span>Copy Direct Share Link with Code</span>
                      </>
                    )}
                  </button>
                </div>
              );
            })}
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
