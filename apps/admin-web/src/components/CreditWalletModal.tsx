'use client';

import React, { useState } from 'react';
import { Wallet, X, AlertTriangle, Loader2, Sparkles } from 'lucide-react';
import { formatNaira } from '@/lib/formatters';
import { fetchAdminApi } from '@/lib/api';

interface CreditWalletModalProps {
  isOpen: boolean;
  customer: {
    id: string;
    name?: string;
    email?: string;
    availableBalanceNgn?: number;
  } | null;
  onClose: () => void;
  onSuccess: () => void;
}

export function CreditWalletModal({
  isOpen,
  customer,
  onClose,
  onSuccess,
}: CreditWalletModalProps) {
  const [amount, setAmount] = useState<string>('50000');
  const [reason, setReason] = useState('Admin demo / withdrawal testing credit');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !customer) return null;

  const currentBal = customer.availableBalanceNgn || 0;
  const numAmount = Number(amount) || 0;
  const projectedBal = currentBal + numAmount;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!numAmount || numAmount <= 0) {
      setError('Please enter a valid credit amount.');
      return;
    }

    if (!reason.trim()) {
      setError('Please provide a reason for the credit.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetchAdminApi(`/admin/customers/${customer.id}/wallet/adjust-balance`, {
        method: 'POST',
        body: JSON.stringify({
          amountNgn: numAmount,
          reason: reason.trim(),
        }),
      });

      if (!res.success) {
        throw new Error(res.message || 'Failed to credit wallet.');
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to credit wallet.');
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
          <div className="p-2.5 rounded-xl border bg-emerald-500/10 border-emerald-500/30 text-emerald-400">
            <Wallet className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">
              Credit Giants Vault (Test Balance)
            </h3>
            <p className="text-xs text-slate-400">
              {customer.name} ({customer.email})
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-4 rounded-xl bg-rose-500/10 border border-rose-500/30 p-3 text-xs text-rose-400 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="p-3.5 rounded-xl bg-[#070a08] border border-[#1b3322] flex items-center justify-between text-xs">
            <span className="text-slate-400">Current Vault Balance:</span>
            <span className="font-mono font-bold text-emerald-400">{formatNaira(currentBal)}</span>
          </div>

          <div>
            <label className="block text-[11px] font-semibold uppercase text-slate-400 mb-1.5">
              Quick Preset Amounts
            </label>
            <div className="grid grid-cols-4 gap-1.5">
              {['20000', '50000', '100000', '500000'].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setAmount(preset)}
                  className={`py-1.5 px-2 rounded-lg text-[11px] font-mono font-semibold border transition-colors ${
                    amount === preset
                      ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                      : 'bg-[#070a08] border-[#1b3322] text-slate-400 hover:text-white'
                  }`}
                >
                  +{formatNaira(Number(preset))}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-slate-400 mb-1.5">
              Credit Amount (NGN) <span className="text-emerald-400">*</span>
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
                className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-[#070a08] border border-[#1b3322] text-sm font-mono text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between text-xs">
            <span className="text-emerald-300">Projected Available Balance:</span>
            <span className="font-mono font-bold text-emerald-400 text-sm">
              {formatNaira(projectedBal)}
            </span>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-slate-400 mb-1.5">
              Audit Reason <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Admin demo / withdrawal testing credit"
              required
              className="w-full px-3 py-2 rounded-xl bg-[#070a08] border border-[#1b3322] text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
            />
          </div>

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
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white transition-colors disabled:opacity-50 shadow-lg shadow-emerald-600/20"
            >
              {loading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Crediting Vault...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Credit Vault Balance</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
