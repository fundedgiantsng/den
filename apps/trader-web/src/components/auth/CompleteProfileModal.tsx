'use client';

import { API_BASE_URL } from '@/lib/api';
import React, { useState } from 'react';
import { User, Phone, MapPin, Loader2, AlertCircle, ArrowRight } from 'lucide-react';

interface CompleteProfileModalProps {
  isOpen: boolean;
  user: {
    id?: string;
    firstName?: string;
    lastName?: string;
    phone?: string;
    address?: string;
    email?: string;
  };
  onSuccess: (updatedUser: any) => void;
}

export function CompleteProfileModal({
  isOpen,
  user,
  onSuccess,
}: CompleteProfileModalProps) {
  const [firstName, setFirstName] = useState(user.firstName || '');
  const [lastName, setLastName] = useState(user.lastName || '');
  const [phone, setPhone] = useState(user.phone || '');
  const [address, setAddress] = useState(user.address || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!firstName.trim() || !lastName.trim()) {
      setError('Please provide your legal first and last name matching your bank account.');
      return;
    }

    if (!phone.trim() || phone.trim().length < 10) {
      setError('Please provide a valid Nigerian phone number for critical security and account alerts.');
      return;
    }

    if (!address.trim() || address.trim().length < 5) {
      setError('Please provide your residential address for identity compliance.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/auth/me`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          phone: phone.trim(),
          address: address.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to update profile details.');
      }

      onSuccess(data.data || { firstName, lastName, phone, address });
    } catch (err: any) {
      setError(err.message || 'Network error occurred while saving profile.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
      <div className="relative w-full max-w-lg rounded-2xl border border-white/10 bg-[#070e0a] p-6 sm:p-8 shadow-2xl shadow-emerald-950/40">
        <div className="mb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold uppercase tracking-wider mb-3">
            Step 2: Profile Completion
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            Complete Your Trader Profile
          </h2>
          <p className="mt-1 text-sm text-neutral-400">
            Welcome to FundedGiants. Please confirm your legal details to enable account provisioning and vault activation.
          </p>
        </div>

        {error && (
          <div className="mb-5 flex items-center gap-3 rounded-xl border border-red-500/20 bg-red-500/10 p-3.5 text-xs text-red-300">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                First Name (Legal)
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-500" />
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="e.g. Chukwuebuka"
                  required
                  className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 pl-10 pr-4 text-sm text-white placeholder-neutral-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                Last Name (Legal)
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-500" />
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="e.g. Okafor"
                  required
                  className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 pl-10 pr-4 text-sm text-white placeholder-neutral-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-all"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-300 mb-1.5">
              Phone Number
            </label>
            <div className="relative">
              <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-500" />
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g. +234 801 234 5678"
                required
                className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 pl-10 pr-4 text-sm text-white placeholder-neutral-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-all"
              />
            </div>
            <p className="mt-1 text-[11px] text-neutral-500">Used for transaction OTPs and security alerts.</p>
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-300 mb-1.5">
              Residential Address & State
            </label>
            <div className="relative">
              <MapPin className="absolute left-3.5 top-3 h-4 w-4 text-neutral-500" />
              <textarea
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                rows={2}
                placeholder="e.g. 15 Admiralty Way, Lekki Phase 1, Lagos"
                required
                className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 pl-10 pr-4 text-sm text-white placeholder-neutral-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-all resize-none"
              />
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-500 py-3 text-sm font-semibold text-black hover:bg-emerald-400 transition-all duration-200 disabled:opacity-50 shadow-lg shadow-emerald-500/20"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving Profile...
                </>
              ) : (
                <>
                  Save & Proceed to Verification
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
