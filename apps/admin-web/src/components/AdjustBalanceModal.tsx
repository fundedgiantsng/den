'use client';

import React, { useState, useEffect } from 'react';
import { ArrowDownLeft, X, AlertTriangle, Loader2, ShieldAlert } from 'lucide-react';
import { formatNaira } from '@/lib/formatters';
import { fetchAdminApi } from '@/lib/api';

interface AdjustBalanceModalProps {
  isOpen: boolean;
  account: {
    id: string;
    accountNumber: string;
    customerName?: string;
    customerEmail?: string;
    currentBalanceNgn?: number;
    initialBalanceNgn?: number;
  } | null;
  onClose: () => void;
  onSuccess: () => void;
}

export function AdjustBalanceModal({
  isOpen,
  account,
  onClose,
  onSuccess,
}: AdjustBalanceModalProps) {
  const [amount, setAmount] = useState<string>('');
  const [reason, setReason] = useState('Manual debit adjustment');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (account) {
      setAmount('');
      setReason('Manual debit adjustment');
      setError(null);
    }
  }, [account, isOpen]);

  if (!isOpen || !account) return null;

  const currentBal = account.currentBalanceNgn || 0;
  const numAmount = Number(amount) || 0;
  const projectedBal = Math.max(0, currentBal - numAmount);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!numAmount || numAmount <= 0) {
      setError('Please enter a valid amount greater than 0.');
      return;
    }

    if (!reason.trim()) {
      setError('Please provide a reason for the deduction.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetchAdminApi(`/admin/trading-accounts/${account.id}/adjust-balance`, {
        method: 'POST',
        body: JSON.stringify({
          amountNgn: numAmount,
          type: 'withdrawal',
          reason: reason.trim(),
        }),
      });

      if (!res.success) {
        throw new Error(res.message || 'Balance debit failed.');
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to debit balance. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-md rounded-2xl bg-[#0f1712] border border-[#1b3322] p-6 shadow-2xl my-8">
        <button
          onClick={onClose}
          disabled={loading}
          className="absolute right-4 top-4 text-slate-400 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div className="p-2.5 rounded-xl border bg-rose-500/10 border-rose-500/30 text-rose-400">
            <ArrowDownLeft className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">
              Debit Balance — #{account.accountNumber}
            </h3>
            <p className="text-xs text-slate-400">
              {account.customerName} • Current: {formatNaira(currentBal)}
            </p>
          </div>
        </div>

        {/* Anti-inflation Notice */}
        <div className="mb-4 rounded-xl bg-amber-500/10 border border-amber-500/30 p-3 text-xs text-amber-300 flex items-start gap-2">
          <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
          <span>
            <strong>Trading balances can only increase via live trading.</strong> Manual balance credits are strictly disabled. Only genuine debits / deductions are supported.
          </span>
        </div>

        {error && (
          <div className="mb-4 rounded-xl bg-rose-500/10 border border-rose-500/30 p-3 text-xs text-rose-400 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Quick Amount Presets */}
          <div>
            <label className="block text-[11px] font-semibold uppercase text-slate-400 mb-1.5">
              Quick Deduction Presets
            </label>
            <div className="grid grid-cols-4 gap-1.5">
              {['20000', '50000', '100000', '500000'].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setAmount(preset)}
                  className={`py-1.5 px-2 rounded-lg text-[11px] font-mono font-semibold border transition-colors ${
                    amount === preset
                      ? 'bg-rose-500/20 border-rose-500 text-rose-300'
                      : 'bg-[#070a08] border-[#1b3322] text-slate-400 hover:text-white'
                  }`}
                >
                  -{formatNaira(Number(preset))}
                </button>
              ))}
            </div>
          </div>

          {/* Amount Input */}
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-400 mb-1.5">
              Deduction Amount (NGN) <span className="text-rose-400">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-mono text-sm">₦</span>
              <input
                type="number"
                min="1"
                step="any"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="e.g. 50000"
                required
                className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-[#070a08] border border-[#1b3322] text-sm font-mono text-white focus:outline-none focus:border-rose-500"
              />
            </div>
          </div>

          {/* Projected Balance Preview */}
          <div className="p-3 rounded-xl bg-[#070a08] border border-[#1b3322] flex items-center justify-between text-xs">
            <span className="text-slate-400">Projected Balance After Deduction:</span>
            <span className="font-mono font-bold text-sm text-amber-400">
              {formatNaira(projectedBal)}
            </span>
          </div>

          {/* Reason */}
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-400 mb-1.5">
              Reason / Reference <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Manual balance debit"
              required
              className="w-full px-3 py-2 rounded-xl bg-[#070a08] border border-[#1b3322] text-xs text-white placeholder-slate-600 focus:outline-none focus:border-rose-500"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 rounded-xl border border-[#1b3322] text-xs font-semibold text-slate-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-xs font-semibold text-white transition-colors disabled:opacity-50 shadow-lg shadow-rose-600/20"
            >
              {loading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <ArrowDownLeft className="w-3.5 h-3.5" />
                  <span>Deduct Balance</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
