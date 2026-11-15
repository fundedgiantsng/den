'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Building2,
  Plus,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Lock,
  Trash2,
  Check,
  RefreshCw,
  Search,
  X,
} from 'lucide-react';

interface BankAccount {
  id: string;
  bankName: string;
  accountNumber: string;
  accountName: string;
  isVerified: boolean;
  isPrimary: boolean;
}

interface BankOption {
  code: string;
  name: string;
}

export default function BankAccountsPage() {
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [availableBanks, setAvailableBanks] = useState<BankOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form states
  const [selectedBankCode, setSelectedBankCode] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [bankSearch, setBankSearch] = useState('');

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

  const fetchData = async () => {
    setLoading(true);
    try {
      const [resOverview, resBanks] = await Promise.all([
        fetch(`${apiUrl}/api/v1/wallet/overview`, { credentials: 'include' }),
        fetch(`${apiUrl}/api/v1/wallet/banks`, { credentials: 'include' }),
      ]);

      if (resOverview.ok) {
        const data = await resOverview.json();
        setBankAccounts(data.boundBankAccounts || []);
      }

      if (resBanks.ok) {
        const banks = await resBanks.json();
        setAvailableBanks(banks || []);
        if (banks?.length > 0 && !selectedBankCode) {
          setSelectedBankCode(banks[0].code);
        }
      }
    } catch (err) {
      console.error('Failed to load bank account settings:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleBindAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!selectedBankCode) {
      setError('Please select a commercial bank or fintech');
      return;
    }

    if (!accountNumber || accountNumber.length !== 10) {
      setError('Account number must be exactly 10 digits');
      return;
    }

    const selectedBank = availableBanks.find((b) => b.code === selectedBankCode);
    const bankName = selectedBank ? selectedBank.name : 'Unknown Bank';

    setSubmitting(true);
    try {
      const res = await fetch(`${apiUrl}/api/v1/wallet/bind-bank-account`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          bankCode: selectedBankCode,
          bankName,
          accountNumber,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to bind bank account');
      }

      setSuccess(`Bank account successfully verified and bound: ${data.account.accountName}`);
      setAccountNumber('');
      fetchData();
      setTimeout(() => {
        setIsModalOpen(false);
        setSuccess(null);
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Verification failed. Ensure your account name matches your KYC record.');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredBanks = availableBanks.filter((b) =>
    b.name.toLowerCase().includes(bankSearch.toLowerCase())
  );

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-16">
      {/* Header */}
      <div>
        <Link
          href="/dashboard/wallet"
          className="inline-flex items-center gap-1.5 text-xs text-fgText-secondary hover:text-white mb-2 transition"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Central Wallet</span>
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-heading font-extrabold text-white">Bound Bank Accounts</h1>
            <p className="text-xs text-fgText-secondary mt-0.5">
              Verified Nigerian destination bank accounts for automated profit withdrawals and disbursements.
            </p>
          </div>
          <button
            onClick={() => {
              setError(null);
              setSuccess(null);
              setIsModalOpen(true);
            }}
            disabled={bankAccounts.length >= 3}
            className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-bg-base font-heading font-extrabold text-xs flex items-center gap-1.5 transition shadow-emeraldGlow shrink-0"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Add Bank Account ({bankAccounts.length}/3)</span>
          </button>
        </div>
      </div>

      {/* Security Rule Notice */}
      <div className="p-4 rounded-xl bg-bg-surface border border-fgBorder-subtle flex items-start gap-3 text-xs text-fgText-secondary">
        <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-semibold text-white">Lenco & CBN Strict KYC Name-Matching Regulation</p>
          <p className="leading-relaxed">
            In compliance with Anti-Money Laundering (AML) standards, withdrawals are strictly restricted to bank accounts matching the verified legal name on your Ninja KYC record. Third-party accounts are strictly rejected.
          </p>
        </div>
      </div>

      {/* Account List */}
      <div className="p-6 rounded-2xl bg-bg-card border border-fgBorder-subtle space-y-4">
        <h2 className="text-xs font-heading font-bold text-white uppercase tracking-wider">
          Active Verified Accounts
        </h2>

        {loading ? (
          <div className="py-12 flex flex-col items-center justify-center gap-2 text-fgText-muted">
            <RefreshCw className="w-6 h-6 animate-spin text-emerald-400" />
            <span className="text-xs">Loading verified accounts...</span>
          </div>
        ) : bankAccounts.length === 0 ? (
          <div className="py-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-400 mx-auto flex items-center justify-center">
              <Building2 className="w-6 h-6" />
            </div>
            <p className="text-sm font-semibold text-white">No bound bank account found</p>
            <p className="text-xs text-fgText-muted max-w-sm mx-auto">
              You have not bound any withdrawal account yet. Add a verified Nigerian bank account to enable instant disbursements.
            </p>
            <button
              onClick={() => setIsModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-emerald-500 text-bg-base font-bold text-xs inline-flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Bind Account Now</span>
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {bankAccounts.map((acc) => (
              <div
                key={acc.id}
                className="p-4 rounded-xl bg-bg-surface border border-fgBorder-subtle hover:border-fgBorder-emerald transition flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shrink-0">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold text-white">{acc.bankName}</p>
                      {acc.isVerified && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 font-medium border border-emerald-500/30 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>KYC Verified</span>
                        </span>
                      )}
                      {acc.isPrimary && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-white font-medium">
                          Primary
                        </span>
                      )}
                    </div>
                    <p className="text-xs font-mono text-fgText-secondary mt-0.5">
                      •••• •••• {acc.accountNumber.slice(-4)} • {acc.accountName}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto">
                  <Link
                    href="/dashboard/wallet/withdraw"
                    className="px-3 py-1.5 rounded-lg bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 border border-emerald-500/30 text-xs font-semibold transition"
                  >
                    Withdraw to this Account
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Bank Account Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#0b1612] border border-emerald-500/30 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-5 relative">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 text-fgText-muted hover:text-white transition"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="space-y-1">
              <h3 className="text-lg font-heading font-bold text-white flex items-center gap-2">
                <Building2 className="w-5 h-5 text-emerald-400" />
                <span>Bind Nigerian Bank Account</span>
              </h3>
              <p className="text-xs text-fgText-secondary">
                Select your bank and enter your 10-digit account number. Account name will be verified automatically.
              </p>
            </div>

            {success && (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{success}</span>
              </div>
            )}

            {error && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleBindAccount} className="space-y-4 text-xs">
              <div>
                <label className="block text-fgText-secondary font-medium mb-1">
                  Select Bank / Fintech
                </label>
                <div className="mb-2">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-fgText-muted absolute left-3 top-2.5" />
                    <input
                      type="text"
                      placeholder="Search bank name..."
                      value={bankSearch}
                      onChange={(e) => setBankSearch(e.target.value)}
                      className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-black/40 border border-white/[0.1] text-white text-xs placeholder:text-fgText-muted focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>
                <select
                  value={selectedBankCode}
                  onChange={(e) => setSelectedBankCode(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-black/40 border border-white/[0.1] text-white focus:outline-none focus:border-emerald-500 text-xs"
                  required
                >
                  <option value="" disabled>-- Select CBN Bank --</option>
                  {filteredBanks.map((b) => (
                    <option key={b.code} value={b.code} className="bg-neutral-900 text-white">
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-fgText-secondary font-medium mb-1">
                  10-Digit NUBAN Account Number
                </label>
                <input
                  type="text"
                  maxLength={10}
                  pattern="[0-9]{10}"
                  placeholder="e.g. 0123456789"
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, ''))}
                  required
                  className="w-full p-2.5 rounded-xl bg-black/40 border border-white/[0.1] text-white font-mono text-sm tracking-wider focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="p-3 rounded-xl bg-black/50 border border-white/[0.06] text-[11px] text-fgText-muted flex items-start gap-2">
                <Lock className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                <span>
                  The account holder name on this NUBAN will be resolved via Lenco and checked against your verified KYC name.
                </span>
              </div>

              <button
                type="submit"
                disabled={submitting || accountNumber.length !== 10 || !selectedBankCode}
                className="w-full py-3 rounded-xl bg-[#00e575] hover:bg-[#00c966] disabled:opacity-50 text-black font-heading font-extrabold text-xs shadow-lg shadow-emerald-500/20 active:scale-95 transition flex items-center justify-center gap-1.5"
              >
                {submitting ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Check className="w-4 h-4" />
                )}
                <span>{submitting ? 'Verifying with Interbank Network...' : 'Verify & Bind Account'}</span>
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}