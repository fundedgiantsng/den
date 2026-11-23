'use client';

import React, { useState, useEffect } from 'react';
import { RotateCcw, X, AlertTriangle, CheckCircle2, Loader2, DollarSign, ShieldAlert, Sparkles } from 'lucide-react';
import { formatNaira } from '@/lib/formatters';
import { fetchAdminApi } from '@/lib/api';

interface ReinstateAccountModalProps {
  isOpen: boolean;
  account: {
    id: string;
    accountNumber: string;
    customerName?: string;
    customerEmail?: string;
    productName?: string;
    initialBalanceNgn?: number;
    currentBalanceNgn?: number;
    currentEquityNgn?: number;
    status?: string;
  } | null;
  onClose: () => void;
  onSuccess: () => void;
}

export function ReinstateAccountModal({
  isOpen,
  account,
  onClose,
  onSuccess,
}: ReinstateAccountModalProps) {
  const [resetBalance, setResetBalance] = useState(true);
  const [resetMode, setResetMode] = useState<'initial' | 'custom'>('initial');
  const [customBalance, setCustomBalance] = useState<string>('');
  const [addTestBalance, setAddTestBalance] = useState(false);
  const [testAmount, setTestAmount] = useState<string>('');
  const [reason, setReason] = useState('Admin manual reinstatement & balance reset');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (account) {
      setResetBalance(true);
      setResetMode('initial');
      setCustomBalance(account.initialBalanceNgn?.toString() || '1000000');
      setAddTestBalance(false);
      setTestAmount('');
      setReason('Admin manual reinstatement & balance reset');
      setError(null);
    }
  }, [account, isOpen]);

  if (!isOpen || !account) return null;

  const initialBalance = account.initialBalanceNgn || 1000000;
  const targetStartingBalance = resetMode === 'initial' ? initialBalance : (Number(customBalance) || initialBalance);
  const extraCredit = addTestBalance ? (Number(testAmount) || 0) : 0;
  const projectedTotalBalance = (resetBalance ? targetStartingBalance : (account.currentBalanceNgn || 0)) + extraCredit;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      setError('Please provide an audit reason for reinstatement.');
      return;
    }

    if (resetBalance && resetMode === 'custom' && (!Number(customBalance) || Number(customBalance) <= 0)) {
      setError('Please enter a valid positive custom balance amount.');
      return;
    }

    if (addTestBalance && (!Number(testAmount) || Number(testAmount) <= 0)) {
      setError('Please enter a valid test balance amount or uncheck the test balance option.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const payload: any = {
        reason: reason.trim(),
        resetBalance,
      };

      if (resetBalance) {
        payload.targetBalanceNgn = targetStartingBalance;
      }

      if (addTestBalance && extraCredit > 0) {
        payload.addBalanceNgn = extraCredit;
      }

      const res = await fetchAdminApi(`/admin/trading-accounts/${account.id}/reinstate`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      if (!res.success) {
        throw new Error(res.message || 'Reinstatement failed.');
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to reinstate account. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-lg rounded-2xl bg-[#0f1712] border border-[#1b3322] p-6 shadow-2xl my-8">
        <button
          onClick={onClose}
          disabled={loading}
          className="absolute right-4 top-4 text-slate-400 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div className="p-2.5 rounded-xl border bg-emerald-500/10 border-emerald-500/30 text-emerald-400">
            <RotateCcw className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">
              Reinstate Trading Account #{account.accountNumber}
            </h3>
            <p className="text-xs text-slate-400">
              {account.customerName} ({account.customerEmail})
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
          {/* Account Snapshot Card */}
          <div className="p-3.5 rounded-xl bg-[#070a08] border border-[#1b3322] grid grid-cols-3 gap-2 text-xs">
            <div>
              <span className="text-slate-500 block text-[11px]">Initial Capital</span>
              <span className="font-mono font-bold text-slate-300">{formatNaira(initialBalance)}</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[11px]">Current Balance</span>
              <span className="font-mono font-semibold text-white">{formatNaira(account.currentBalanceNgn || 0)}</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[11px]">Current Status</span>
              <span className="font-bold text-rose-400 uppercase text-[11px]">{account.status}</span>
            </div>
          </div>

          {/* Balance Reset Controls */}
          <div className="p-4 rounded-xl bg-[#070a08]/80 border border-[#1b3322] space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-white block">Reset Account Balance</span>
                <span className="text-[11px] text-slate-400">
                  Resets SteraTrader balance so the reinstated account starts fresh
                </span>
              </div>
              <input
                type="checkbox"
                id="resetBalanceToggle"
                checked={resetBalance}
                onChange={(e) => setResetBalance(e.target.checked)}
                className="w-4 h-4 rounded border-[#1b3322] bg-[#070a08] text-emerald-500 focus:ring-emerald-500/30 cursor-pointer"
              />
            </div>

            {resetBalance && (
              <div className="pt-2 border-t border-[#1b3322]/60 space-y-2.5">
                <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                  <input
                    type="radio"
                    name="resetMode"
                    checked={resetMode === 'initial'}
                    onChange={() => setResetMode('initial')}
                    className="text-emerald-500 focus:ring-0"
                  />
                  <span>Reset to Starting Capital ({formatNaira(initialBalance)})</span>
                </label>

                <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                  <input
                    type="radio"
                    name="resetMode"
                    checked={resetMode === 'custom'}
                    onChange={() => setResetMode('custom')}
                    className="text-emerald-500 focus:ring-0"
                  />
                  <span>Set Custom Starting Balance</span>
                </label>

                {resetMode === 'custom' && (
                  <div className="pl-6 pt-1">
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-mono text-xs">₦</span>
                      <input
                        type="number"
                        min="1"
                        step="any"
                        value={customBalance}
                        onChange={(e) => setCustomBalance(e.target.value)}
                        placeholder="e.g. 1000000"
                        className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-[#0f1712] border border-[#1b3322] text-xs font-mono text-white focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Extra Test Balance (Demo / Withdrawal Testing Purpose) */}
          <div className="p-4 rounded-xl bg-[#070a08]/80 border border-[#1b3322] space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>Add Balance for Demo / Withdrawal Testing</span>
                </span>
                <span className="text-[11px] text-slate-400">
                  Injects test profits to allow user test withdrawal and payout workflows
                </span>
              </div>
              <input
                type="checkbox"
                id="addTestBalanceToggle"
                checked={addTestBalance}
                onChange={(e) => setAddTestBalance(e.target.checked)}
                className="w-4 h-4 rounded border-[#1b3322] bg-[#070a08] text-amber-500 focus:ring-amber-500/30 cursor-pointer"
              />
            </div>

            {addTestBalance && (
              <div className="pt-2 border-t border-[#1b3322]/60 space-y-2">
                <div className="flex items-center gap-1.5">
                  {['25000', '50000', '100000', '250000'].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setTestAmount(preset)}
                      className={`px-2 py-1 rounded text-[10px] font-mono font-semibold border transition-colors ${
                        testAmount === preset
                          ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                          : 'bg-[#0f1712] border-[#1b3322] text-slate-400 hover:text-white'
                      }`}
                    >
                      +{formatNaira(Number(preset))}
                    </button>
                  ))}
                </div>

                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-mono text-xs">₦</span>
                  <input
                    type="number"
                    min="1"
                    step="any"
                    value={testAmount}
                    onChange={(e) => setTestAmount(e.target.value)}
                    placeholder="Enter additional test credit in NGN (e.g. 50000)"
                    className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-[#0f1712] border border-[#1b3322] text-xs font-mono text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Projected Balance Summary */}
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between text-xs">
            <span className="text-emerald-300 font-semibold">Projected Reinstated Balance:</span>
            <span className="font-mono font-bold text-emerald-400 text-sm">
              {formatNaira(projectedTotalBalance)}
            </span>
          </div>

          {/* Audit Reason */}
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-400 mb-1.5">
              Audit Reason / Justification <span className="text-rose-400">*</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Provide reason for reinstatement and balance adjustment..."
              rows={2}
              required
              className="w-full px-3 py-2 rounded-xl bg-[#070a08] border border-[#1b3322] text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Submit Actions */}
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
                  <span>Reinstating Account...</span>
                </>
              ) : (
                <>
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Confirm Reinstatement</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
