'use client';

import { API_BASE_URL } from '@/lib/api';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Building2,
  AlertCircle,
  Plus,
  ShieldCheck,
  CheckCircle2,
  Lock,
  RefreshCw,
} from 'lucide-react';
import { formatNaira } from '@/lib/format';

interface BoundAccount {
  id: string;
  bankName: string;
  accountNumber: string;
  accountName: string;
  isVerified: boolean;
  isPrimary: boolean;
}

export default function WithdrawFundsPage() {
  const [amount, setAmount] = useState('');
  const [selectedAccount, setSelectedAccount] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [fetchingData, setFetchingData] = useState(true);
  const [success, setSuccess] = useState(false);
  const [withdrawalRef, setWithdrawalRef] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  const [availableBalanceNgn, setAvailableBalanceNgn] = useState<number>(0);
  const [boundAccounts, setBoundAccounts] = useState<BoundAccount[]>([]);

  const apiUrl = API_BASE_URL;

  useEffect(() => {
    async function loadWallet() {
      setFetchingData(true);
      try {
        const res = await fetch(`${API_BASE_URL}/wallet/overview`, { credentials: 'include' });
        if (res.ok) {
          const data = await res.json();
          setAvailableBalanceNgn(data.availableBalanceNgn ?? 0);
          setBoundAccounts(data.boundBankAccounts ?? []);
          if (data.boundBankAccounts?.length > 0) {
            setSelectedAccount(data.boundBankAccounts[0].id);
          }
        }
      } catch (err) {
        console.error('Failed to load wallet data for withdrawal:', err);
      } finally {
        setFetchingData(false);
      }
    }
    loadWallet();
  }, [apiUrl]);

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const withdrawAmount = Number(amount);
    if (!withdrawAmount || withdrawAmount < 5000) {
      setError('Minimum withdrawal amount is ₦5,000.00');
      return;
    }

    if (withdrawAmount > availableBalanceNgn) {
      setError('Requested amount exceeds available balance in Giants Vault');
      return;
    }

    if (!selectedAccount) {
      setError('Please select or bind a verified destination bank account');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/wallet/withdraw`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          bankAccountId: selectedAccount,
          amountNgn: withdrawAmount,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Withdrawal could not be processed');
      }

      setWithdrawalRef(data.reference || `FG-WTH-${Date.now()}`);
      setAvailableBalanceNgn((prev) => Math.max(0, prev - withdrawAmount));
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Failed to dispatch withdrawal to interbank network');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-16">
      {/* Header */}
      <div>
        <Link
          href="/dashboard/wallet"
          className="inline-flex items-center gap-1.5 text-xs text-fgText-secondary hover:text-white mb-2 transition"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Central Wallet</span>
        </Link>
        <h1 className="text-2xl font-heading font-extrabold text-white">Withdraw Funds (NGN)</h1>
        <p className="text-xs text-fgText-secondary">
          Transfer your available trader profits or affiliate earnings to your verified Nigerian bank account.
        </p>
      </div>

      {success ? (
        <div className="p-8 rounded-2xl bg-bg-card border border-fgBorder-emerald text-center space-y-4 shadow-emeraldGlow">
          <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 mx-auto flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-heading font-bold text-white">Withdrawal Request Dispatched</h2>
          <p className="text-xs text-fgText-secondary max-w-md mx-auto">
            Your withdrawal of <span className="text-white font-mono font-bold">{formatNaira(Number(amount))}</span> has been submitted for compliance review and will be disbursed via Nomba Banking to your bound bank account upon approval.
          </p>
          <div className="p-3 bg-bg-surface rounded-xl border border-fgBorder-subtle font-mono text-xs text-fgText-muted inline-block">
            Reference: <span className="text-emerald-400 font-bold">{withdrawalRef}</span>
          </div>
          <div className="pt-4">
            <Link
              href="/dashboard/wallet"
              className="px-6 py-2.5 rounded-xl bg-emerald-500 text-bg-base font-bold text-xs inline-block shadow-emeraldGlow hover:bg-emerald-400 transition"
            >
              Return to Wallet
            </Link>
          </div>
        </div>
      ) : (
        <form onSubmit={handleWithdraw} className="space-y-6">
          {error && (
            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Available Balance Indicator */}
          <div className="p-4 rounded-xl bg-bg-card border border-fgBorder-subtle flex items-center justify-between">
            <div>
              <p className="text-[10px] text-fgText-muted uppercase tracking-wider font-semibold">
                Available Withdrawable Balance
              </p>
              <p className="text-xl font-heading font-extrabold text-emerald-400 mt-0.5">
                {fetchingData ? 'Loading...' : formatNaira(availableBalanceNgn)}
              </p>
            </div>
            <button
              type="button"
              disabled={fetchingData || availableBalanceNgn <= 0}
              onClick={() => setAmount(availableBalanceNgn.toString())}
              className="text-xs text-emerald-400 hover:text-emerald-300 font-bold disabled:opacity-40"
            >
              Withdraw Max
            </button>
          </div>

          {/* Amount Input */}
          <div className="p-6 rounded-2xl bg-bg-card border border-fgBorder-subtle space-y-4">
            <label className="block text-xs font-semibold text-white">Amount to Withdraw (₦)</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-fgText-muted font-mono font-bold text-lg">
                ₦
              </span>
              <input
                type="number"
                min="5000"
                max={availableBalanceNgn}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="50,000"
                className="w-full pl-10 pr-4 py-3 bg-bg-surface rounded-xl border border-fgBorder-subtle text-white font-mono text-lg font-bold placeholder-fgText-muted focus:outline-none focus:border-emerald-500"
                required
              />
            </div>
            <p className="text-[11px] text-fgText-muted">Minimum withdrawal: ₦5,000.00 • Disbursement Fee: ₦0.00</p>
          </div>

          {/* Select Bound Destination Account (Max 3, matching KYC) */}
          <div className="p-6 rounded-2xl bg-bg-card border border-fgBorder-subtle space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-white">Select Bound Bank Account</label>
              <Link
                href="/dashboard/wallet/bank-accounts"
                className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Manage Accounts ({boundAccounts.length}/3)</span>
              </Link>
            </div>

            {fetchingData ? (
              <div className="py-6 flex items-center justify-center gap-2 text-fgText-muted text-xs">
                <RefreshCw className="w-4 h-4 animate-spin text-emerald-400" />
                <span>Loading destination accounts...</span>
              </div>
            ) : boundAccounts.length === 0 ? (
              <div className="p-4 rounded-xl bg-bg-surface border border-dashed border-fgBorder-subtle text-center space-y-2">
                <p className="text-xs text-white font-semibold">No bound bank account found</p>
                <p className="text-[11px] text-fgText-muted">
                  You need at least one verified Nigerian bank account to withdraw funds.
                </p>
                <Link
                  href="/dashboard/wallet/bank-accounts"
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-500 text-bg-base font-bold text-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Bind Account Now</span>
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {boundAccounts.map((acc) => (
                  <label
                    key={acc.id}
                    className={`flex items-center justify-between p-4 rounded-xl border cursor-pointer transition-all ${
                      selectedAccount === acc.id
                        ? 'bg-bg-surface border-emerald-500 ring-1 ring-emerald-500'
                        : 'bg-bg-card border-fgBorder-subtle hover:border-fgBorder-emerald'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="radio"
                        name="bank_account"
                        value={acc.id}
                        checked={selectedAccount === acc.id}
                        onChange={() => setSelectedAccount(acc.id)}
                        className="text-emerald-500 focus:ring-emerald-500"
                      />
                      <div>
                        <p className="text-xs font-bold text-white">{acc.bankName}</p>
                        <p className="text-xs font-mono text-fgText-secondary">
                          •••• {acc.accountNumber.slice(-4)} • {acc.accountName}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 text-[10px] text-emerald-400 font-medium">
                      <Lock className="w-3 h-3" />
                      <span>KYC Matched</span>
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Security Notice */}
          <div className="p-4 rounded-xl bg-bg-surface border border-fgBorder-subtle flex items-start gap-3 text-xs text-fgText-secondary">
            <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              In accordance with security requirements and banking regulations, withdrawals are permitted only to bank accounts with verified name matching against your FundedGiants KYC record. All payouts are reviewed by compliance before interbank disbursement.
            </p>
          </div>

          {/* Submit CTA */}
          <button
            type="submit"
            disabled={
              loading ||
              fetchingData ||
              !amount ||
              Number(amount) < 5000 ||
              Number(amount) > availableBalanceNgn ||
              boundAccounts.length === 0
            }
            className="w-full py-4 bg-emerald-500 hover:bg-emerald-400 text-bg-base font-heading font-extrabold text-sm rounded-xl transition-all shadow-emeraldGlow disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Submitting Request...</span>
              </>
            ) : (
              <span>Confirm & Withdraw {amount ? formatNaira(Number(amount)) : ''}</span>
            )}
          </button>
        </form>
      )}
    </div>
  );
}