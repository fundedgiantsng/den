'use client';

import { API_BASE_URL } from '@/lib/api';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Wallet,
  Building2,
  Copy,
  CheckCircle2,
  ShieldCheck,
  AlertCircle,
  ArrowLeft,
  Clock,
  RefreshCw,
} from 'lucide-react';

interface DedicatedAccount {
  bankName: string;
  accountName: string;
  accountNumber: string;
  currency: string;
}

export default function FundWalletPage() {
  const [copied, setCopied] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [virtualAccount, setVirtualAccount] = useState<DedicatedAccount>({
    bankName: '',
    accountName: '',
    accountNumber: '',
    currency: 'NGN (₦)',
  });

  const apiUrl = API_BASE_URL;

  useEffect(() => {
    async function loadAccount() {
      setLoading(true);
      try {
        const res = await fetch(`${API_BASE_URL}/wallet/overview`, { credentials: 'include' });
        if (res.ok) {
          const data = await res.json();
          if (data.dedicatedAccount && data.dedicatedAccount.accountNumber) {
            setVirtualAccount({
              bankName: data.dedicatedAccount.bankName || 'Nombank MFB',
              accountName: data.dedicatedAccount.accountName || 'FundedGiants Trader',
              accountNumber: data.dedicatedAccount.accountNumber,
              currency: data.dedicatedAccount.currency || 'NGN (₦)',
            });
          }
        }
      } catch (err) {
        console.error('Failed to load virtual account details:', err);
      } finally {
        setLoading(false);
      }
    }
    loadAccount();
  }, [apiUrl]);

  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopied(field);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-16">
      {/* Back to Wallet */}
      <div>
        <Link
          href="/dashboard/wallet"
          className="inline-flex items-center gap-1.5 text-xs text-fgText-secondary hover:text-white mb-2 transition"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Central Wallet</span>
        </Link>
        <h1 className="text-2xl font-heading font-extrabold text-white">Deposit Funds (NGN)</h1>
        <p className="text-xs text-fgText-secondary">
          Transfer directly from your Nigerian bank account to your dedicated FundedGiants deposit vault.
        </p>
      </div>

      {/* Virtual Account Card */}
      <div className="p-6 md:p-8 rounded-2xl bg-bg-card border border-fgBorder-emerald shadow-emeraldGlow relative overflow-hidden">
        <div className="flex items-center justify-between pb-6 border-b border-fgBorder-subtle">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-fgText-muted uppercase tracking-wider font-semibold">Dedicated Bank</p>
              <p className="text-base font-heading font-bold text-white">
                {loading ? 'Fetching...' : virtualAccount.bankName}
              </p>
            </div>
          </div>

          <div className="px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-semibold flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Instant Auto-Credit</span>
          </div>
        </div>

        {/* Account Number Box */}
        <div className="my-6 p-4 rounded-xl bg-bg-surface border border-fgBorder-subtle flex items-center justify-between">
          <div>
            <p className="text-[10px] text-fgText-muted uppercase tracking-wider font-semibold">
              Virtual Account Number
            </p>
            <p className="text-2xl font-mono font-extrabold text-white tracking-widest mt-0.5">
              {loading ? '••••••••••' : virtualAccount.accountNumber}
            </p>
          </div>
          <button
            type="button"
            onClick={() => handleCopy(virtualAccount.accountNumber, 'acc')}
            className="px-3.5 py-2 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-400 text-xs font-semibold flex items-center gap-1.5 transition-all"
          >
            {copied === 'acc' ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                <span>Copy</span>
              </>
            )}
          </button>
        </div>

        {/* Account Name */}
        <div className="flex items-center justify-between py-2 border-b border-fgBorder-subtle text-xs">
          <span className="text-fgText-muted">Account Name</span>
          <span className="font-semibold text-white">{loading ? '...' : virtualAccount.accountName}</span>
        </div>

        {/* Currency & Settling */}
        <div className="flex items-center justify-between py-2 border-b border-fgBorder-subtle text-xs">
          <span className="text-fgText-muted">Currency</span>
          <span className="font-semibold text-emerald-400 font-mono">Nigerian Naira (₦)</span>
        </div>

        <div className="flex items-center justify-between py-2 text-xs">
          <span className="text-fgText-muted">Minimum Deposit</span>
          <span className="font-semibold text-white font-mono">₦1,000.00</span>
        </div>
      </div>

      {/* Information & Instructions Banner */}
      <div className="p-4 rounded-xl bg-bg-card border border-fgBorder-subtle space-y-2 text-xs text-fgText-secondary">
        <div className="flex items-center gap-2 text-white font-semibold">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>Automatic Webhook Crediting</span>
        </div>
        <p className="leading-relaxed">
          This account is permanently assigned to you via our dedicated interbank settlement vault. Any funds sent from any Nigerian bank app will be verified via real-time webhooks and automatically credited to your Central NGN Wallet within seconds.
        </p>
        <p className="text-[11px] text-fgText-muted flex items-center gap-1 pt-1">
          <Clock className="w-3.5 h-3.5" />
          <span>Average settlement speed: 10 - 45 seconds.</span>
        </p>
      </div>
    </div>
  );
}