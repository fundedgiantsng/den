'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Building2,
  AlertCircle,
  Plus,
  ShieldCheck,
  CheckCircle2,
  Lock,
} from 'lucide-react';
import { formatNaira } from '@/lib/format';

export default function WithdrawFundsPage() {
  const [amount, setAmount] = useState('');
  const [selectedAccount, setSelectedAccount] = useState<string>('acc-1');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const availableBalanceNgn = 18450000;

  // Bound Accounts verified through Ninja KYC + Lenco Resolve (Max 3)
  const boundAccounts = [
    {
      id: 'acc-1',
      bankName: 'Moniepoint Microfinance Bank',
      accountNumber: '•••• 5678',
      accountName: 'JOHN DOE',
      isDefault: true,
    },
    {
      id: 'acc-2',
      bankName: 'Guaranty Trust Bank (GTBank)',
      accountNumber: '•••• 1234',
      accountName: 'JOHN DOE',
      isDefault: false,
    },
  ];

  const handleWithdraw = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setSuccess(true);
    }, 1200);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <Link
          href="/dashboard/wallet"
          className="inline-flex items-center gap-1.5 text-xs text-fgText-secondary hover:text-white mb-2"
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
            Your withdrawal of <span className="text-white font-mono font-bold">{formatNaira(Number(amount))}</span> has been initiated via the Lenco disbursement network to your bound bank account.
          </p>
          <div className="pt-4">
            <Link
              href="/dashboard/wallet"
              className="px-6 py-2.5 rounded-xl bg-emerald-500 text-bg-base font-bold text-xs inline-block"
            >
              Return to Wallet
            </Link>
          </div>
        </div>
      ) : (
        <form onSubmit={handleWithdraw} className="space-y-6">
          {/* Available Balance Indicator */}
          <div className="p-4 rounded-xl bg-bg-card border border-fgBorder-subtle flex items-center justify-between">
            <div>
              <p className="text-[10px] text-fgText-muted uppercase tracking-wider font-semibold">
                Available Withdrawable Balance
              </p>
              <p className="text-xl font-heading font-extrabold text-emerald-400 mt-0.5">
                {formatNaira(availableBalanceNgn)}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setAmount(availableBalanceNgn.toString())}
              className="text-xs text-emerald-400 hover:text-emerald-300 font-bold"
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
                <span>Add Bank Account (Max 3)</span>
              </Link>
            </div>

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
                        {acc.accountNumber} • {acc.accountName}
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
          </div>

          {/* Security Notice */}
          <div className="p-4 rounded-xl bg-bg-surface border border-fgBorder-subtle flex items-start gap-3 text-xs text-fgText-secondary">
            <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              In accordance with security requirements and Lenco regulatory guidelines, withdrawals are permitted only to bank accounts with verified name matching against your Ninja KYC record. Destination accounts cannot be altered once verified.
            </p>
          </div>

          {/* Submit CTA */}
          <button
            type="submit"
            disabled={loading || !amount || Number(amount) < 5000}
            className="w-full py-4 bg-emerald-500 hover:bg-emerald-400 text-bg-base font-heading font-extrabold text-sm rounded-xl transition-all shadow-emeraldGlow disabled:opacity-50"
          >
            {loading ? 'Processing via Lenco...' : `Confirm & Withdraw ${amount ? formatNaira(Number(amount)) : ''}`}
          </button>
        </form>
      )}
    </div>
  );
}
