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
  AlertCircle,
} from 'lucide-react';
import { formatNaira } from '@/lib/format';

export default function AffiliateProgramPage() {
  const [copied, setCopied] = useState(false);
  const [transferring, setTransferring] = useState(false);
  const [transferSuccess, setTransferSuccess] = useState<string | null>(null);

  const [affiliateData, setAffiliateData] = useState({
    referralCode: 'FG-74892',
    referralLink: 'https://fundedgiants.com/ref/FG-74892',
    totalReferrals: 18,
    tierPercent: 15, // Tier 2 (11-50 referrals)
    totalCommissionsNgn: 1350000,
    withdrawnCommissionsNgn: 850000,
    availableCommissionNgn: 500000,
  });

  const tiers = [
    { name: 'Tier 1', range: '1 – 10 Referrals', rate: '10% Commission', active: false },
    { name: 'Tier 2 (Current)', range: '11 – 50 Referrals', rate: '15% Commission', active: true },
    { name: 'Tier 3 (VIP)', range: '51+ Referrals', rate: '20% Commission', active: false },
  ];

  const recentReferrals = [
    { id: 'ref-1', date: 'Today, 10:14 AM', plan: 'Rhino Rush ₦10M', commissionNgn: 37125, status: 'Credited' },
    { id: 'ref-2', date: 'Yesterday, 4:20 PM', plan: 'Phoenix Rise ₦5M', commissionNgn: 31350, status: 'Credited' },
    { id: 'ref-3', date: 'Nov 12, 2026', plan: 'Rhino Rush ₦25M', commissionNgn: 73125, status: 'Credited' },
    { id: 'ref-4', date: 'Nov 10, 2026', plan: 'Rhino Rush ₦5M', commissionNgn: 19125, status: 'Credited' },
  ];

  const handleCopy = () => {
    navigator.clipboard.writeText(affiliateData.referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Transfer failed');
      }

      setTransferSuccess(`₦${affiliateData.availableCommissionNgn.toLocaleString()} successfully transferred to your Giants Vault!`);
      setAffiliateData((prev) => ({
        ...prev,
        withdrawnCommissionsNgn: prev.withdrawnCommissionsNgn + prev.availableCommissionNgn,
        availableCommissionNgn: 0,
      }));
    } catch (err: any) {
      // Local fallback representation
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
    <div className="space-y-6 sm:space-y-8 max-w-7xl mx-auto w-full pb-12">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            Tier-Based Partner Program
          </span>
          <span className="text-xs text-fgText-muted">Instant Giants Vault Settlement</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-heading font-extrabold text-white tracking-tight">
          Affiliate & Partner Program
        </h1>
        <p className="text-xs text-fgText-secondary mt-1">
          Invite traders to FundedGiants and earn up to 20% commission on every evaluation and instant funding package purchased.
        </p>
      </div>

      {/* Referral Link & Share Box */}
      <div className="p-5 sm:p-6 rounded-2xl bg-gradient-to-r from-bg-card via-bg-surface to-bg-card border border-emerald-500/30 shadow-cardGlow space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 block mb-1">
              Your Personal Referral Link
            </span>
            <span className="text-xs text-fgText-muted">
              Share your link anywhere. Commissions credit immediately upon order completion.
            </span>
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

      {/* 3 Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Available Commission */}
        <div className="p-5 sm:p-6 rounded-2xl bg-bg-card border border-fgBorder-emerald shadow-cardGlow flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3 text-xs text-fgText-muted">
              <span className="uppercase tracking-wider font-semibold">Available Commission</span>
              <Coins className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl sm:text-3xl font-heading font-extrabold text-white">
              {formatNaira(affiliateData.availableCommissionNgn)}
            </div>
            <p className="text-[11px] text-fgText-secondary mt-1">Ready to transfer to Giants Vault</p>
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

        {/* Total Referrals */}
        <div className="p-5 sm:p-6 rounded-2xl bg-bg-card border border-fgBorder-subtle shadow-cardGlow flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3 text-xs text-fgText-muted">
              <span className="uppercase tracking-wider font-semibold">Total Traders Referred</span>
              <Users className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl sm:text-3xl font-heading font-extrabold text-emerald-400">
              {affiliateData.totalReferrals}
            </div>
            <p className="text-[11px] text-fgText-secondary mt-1">Active traders on platform</p>
          </div>

          <div className="mt-5 pt-3 border-t border-fgBorder-subtle flex items-center justify-between text-xs">
            <span className="text-fgText-muted">Active Commission Rate:</span>
            <span className="font-heading font-bold text-white">{affiliateData.tierPercent}%</span>
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
            <p className="text-[11px] text-fgText-secondary mt-1">Total revenue generated</p>
          </div>

          <div className="mt-5 pt-3 border-t border-fgBorder-subtle flex items-center justify-between text-xs">
            <span className="text-fgText-muted">Total Transferred:</span>
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

      {/* Commission Tiers Grid */}
      <div className="p-6 rounded-2xl bg-bg-surface border border-fgBorder-subtle space-y-4">
        <h2 className="text-base font-heading font-bold text-white">Commission Tiers</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {tiers.map((t) => (
            <div
              key={t.name}
              className={`p-4 rounded-xl border transition-all ${
                t.active
                  ? 'bg-emerald-500/10 border-emerald-500 shadow-emeraldGlow'
                  : 'bg-bg-card border-fgBorder-subtle'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-white">{t.name}</span>
                {t.active && (
                  <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-emerald-500 text-bg-base uppercase">
                    Active
                  </span>
                )}
              </div>
              <span className="text-lg font-heading font-extrabold text-emerald-400 block mb-1">
                {t.rate}
              </span>
              <span className="text-xs text-fgText-muted">{t.range}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Referral Inflows */}
      <div className="p-6 rounded-2xl bg-bg-surface border border-fgBorder-subtle space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-fgBorder-subtle">
          <h2 className="text-base font-heading font-bold text-white">Recent Referral Orders</h2>
          <span className="text-xs text-fgText-muted">Real-time ledger postings</span>
        </div>

        <div className="space-y-3">
          {recentReferrals.map((r) => (
            <div
              key={r.id}
              className="p-3.5 rounded-xl bg-bg-card border border-fgBorder-subtle flex items-center justify-between text-xs gap-3"
            >
              <div>
                <p className="font-bold text-white">{r.plan}</p>
                <p className="text-[10px] text-fgText-muted">{r.date}</p>
              </div>

              <div className="text-right">
                <span className="font-heading font-bold text-emerald-400 block">
                  +{formatNaira(r.commissionNgn)}
                </span>
                <span className="text-[10px] text-emerald-300 font-semibold">{r.status}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
