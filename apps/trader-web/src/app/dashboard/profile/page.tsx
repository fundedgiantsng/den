'use client';

import { API_BASE_URL } from '@/lib/api';
import React, { useState, useEffect } from 'react';
import {
  User,
  ShieldCheck,
  Phone,
  Mail,
  MapPin,
  AtSign,
  Building2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Save,
  Lock,
  Calendar,
  Sparkles,
  RefreshCw,
} from 'lucide-react';
import { FundedGiantsKycModal } from '@/components/auth/FundedGiantsKycModal';

export default function ProfilePage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [syncingKyc, setSyncingKyc] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [isKycModalOpen, setIsKycModalOpen] = useState(false);

  const [profile, setProfile] = useState({
    id: '',
    email: '',
    username: '',
    firstName: '',
    lastName: '',
    phone: '',
    address: '',
    role: 'CUSTOMER',
    kycStatus: 'UNVERIFIED',
    wallet: null as any,
    kycRecord: null as any,
  });

  const fetchProfile = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/auth/me`, {
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        if (data?.user) {
          setProfile({
            id: data.user.id || '',
            email: data.user.email || '',
            username: data.user.username || '',
            firstName: data.user.firstName || '',
            lastName: data.user.lastName || '',
            phone: data.user.phone || '',
            address: data.user.address || '',
            role: data.user.role || 'CUSTOMER',
            kycStatus: data.user.kycStatus || 'UNVERIFIED',
            wallet: data.user.wallet || null,
            kycRecord: data.user.kycRecord || null,
          });
        }
      }
    } catch (err: any) {
      console.error('Failed to fetch profile', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();

    // Check if returning from Ninja KYC callback
    if (typeof window !== 'undefined') {
      const fullUrl = window.location.href;
      const vsMatch = fullUrl.match(/vs_[a-zA-Z0-9_-]+/);
      const isCallback = fullUrl.includes('kyc=callback') || fullUrl.includes('status=success') || !!vsMatch;

      if (isCallback) {
        const vsId = vsMatch ? vsMatch[0] : undefined;
        fetch(`${API_BASE_URL}/auth/ninja-sync-status`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ verificationId: vsId }),
        })
          .then((res) => (res.ok ? res.json() : null))
          .then((resData) => {
            if (resData?.kycStatus === 'APPROVED') {
              setSuccess('KYC verification confirmed and approved! Your deposit vault is active.');
              fetchProfile();
              window.history.replaceState({}, document.title, window.location.pathname);
            }
          })
          .catch(() => {});
      }
    }
  }, []);

  const handleSyncKyc = async () => {
    setSyncingKyc(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/auth/ninja-sync-status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email: profile.email }),
      });
      const data = await res.json();
      if (res.ok && data?.kycStatus === 'APPROVED') {
        setSuccess('Identity verified and approved! Your dedicated deposit vault is active.');
        await fetchProfile();
      } else {
        setError(data?.message || 'Verification is not yet confirmed by Ninja.');
      }
    } catch (err: any) {
      setError(err.message || 'Error checking verification status.');
    } finally {
      setSyncingKyc(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch(`${API_BASE_URL}/auth/me`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          firstName: profile.firstName,
          lastName: profile.lastName,
          username: profile.username || undefined,
          phone: profile.phone,
          address: profile.address,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to update profile.');
      }

      setSuccess('Profile updated successfully!');
      setTimeout(() => setSuccess(null), 4000);
    } catch (err: any) {
      setError(err.message || 'Error updating profile');
    } finally {
      setSaving(false);
    }
  };

  const isKycApproved = profile.kycStatus === 'APPROVED';

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-4xl pb-16">
      {/* Modal for FundedGiants KYC */}
      <FundedGiantsKycModal
        isOpen={isKycModalOpen}
        onClose={() => setIsKycModalOpen(false)}
        user={{
          firstName: profile.firstName,
          lastName: profile.lastName,
          email: profile.email,
          kycStatus: profile.kycStatus,
        }}
        onSuccess={() => {
          fetchProfile();
          setIsKycModalOpen(false);
        }}
      />

      {/* Page Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-heading font-extrabold text-white tracking-tight flex items-center gap-2.5">
          <User className="w-7 h-7 text-emerald-400" />
          <span>Profile & Account Details</span>
        </h1>
        <p className="text-xs sm:text-sm text-fgText-secondary mt-1">
          Manage your personal details, contact number, address, and FundedGiants KYC identity verification.
        </p>
      </div>

      {/* Feedback Messages */}
      {success && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center gap-3 text-xs text-emerald-400">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
          <span>{success}</span>
        </div>
      )}
      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center gap-3 text-xs text-red-400">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Profile Overview Card */}
      <div className="p-6 rounded-2xl bg-[#09120e] border border-white/[0.08] flex flex-col sm:flex-row sm:items-center justify-between gap-6 shadow-xl">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 font-extrabold text-xl flex items-center justify-center shadow-inner">
            {(profile.firstName?.[0] || 'T').toUpperCase()}
            {(profile.lastName?.[0] || 'G').toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-white">
                {profile.firstName || 'Valued'} {profile.lastName || 'Trader'}
              </h2>
              {isKycApproved ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  <ShieldCheck className="w-3 h-3" />
                  <span>Verified Trader</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
                  <AlertCircle className="w-3 h-3" />
                  <span>Unverified</span>
                </span>
              )}
            </div>
            <p className="text-xs text-fgText-muted mt-0.5">
              {profile.username ? `@${profile.username}` : 'No username set'} • {profile.email}
            </p>
          </div>
        </div>

        {!isKycApproved && (
          <button
            type="button"
            onClick={() => setIsKycModalOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-black text-xs font-bold transition-all shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 self-start sm:self-auto"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Complete KYC</span>
          </button>
        )}
      </div>

      {/* Personal Information Form */}
      <div className="p-6 sm:p-8 rounded-2xl bg-bg-surface border border-fgBorder-subtle space-y-6">
        <div className="border-b border-fgBorder-subtle pb-4">
          <h3 className="text-base font-bold text-white">Personal Information</h3>
          <p className="text-xs text-fgText-secondary mt-0.5">
            Your legal contact details as verified on your banking profile.
          </p>
        </div>

        <form onSubmit={handleSave} className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* First Name */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-fgText-secondary">
                  First Name
                </label>
                {isKycApproved && (
                  <span className="text-[10px] text-emerald-400 font-mono flex items-center gap-1 font-semibold">
                    <ShieldCheck className="w-3 h-3" />
                    <span>Locked (KYC Verified)</span>
                  </span>
                )}
              </div>
              <input
                type="text"
                value={profile.firstName}
                onChange={(e) => !isKycApproved && setProfile({ ...profile, firstName: e.target.value })}
                disabled={isKycApproved}
                placeholder="Enter first name"
                className={`w-full px-4 py-2.5 rounded-xl border border-fgBorder-subtle text-xs transition-colors ${
                  isKycApproved
                    ? 'bg-bg-card/50 text-fgText-muted cursor-not-allowed'
                    : 'bg-bg-card text-white placeholder-fgText-muted focus:outline-none focus:border-emerald-500'
                }`}
                required
              />
            </div>

            {/* Last Name */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-fgText-secondary">
                  Last Name
                </label>
                {isKycApproved && (
                  <span className="text-[10px] text-emerald-400 font-mono flex items-center gap-1 font-semibold">
                    <ShieldCheck className="w-3 h-3" />
                    <span>Locked (KYC Verified)</span>
                  </span>
                )}
              </div>
              <input
                type="text"
                value={profile.lastName}
                onChange={(e) => !isKycApproved && setProfile({ ...profile, lastName: e.target.value })}
                disabled={isKycApproved}
                placeholder="Enter last name"
                className={`w-full px-4 py-2.5 rounded-xl border border-fgBorder-subtle text-xs transition-colors ${
                  isKycApproved
                    ? 'bg-bg-card/50 text-fgText-muted cursor-not-allowed'
                    : 'bg-bg-card text-white placeholder-fgText-muted focus:outline-none focus:border-emerald-500'
                }`}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Username */}
            <div>
              <label className="block text-xs font-semibold text-fgText-secondary mb-1.5">
                Username / Trader Handle
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-fgText-muted">
                  <AtSign className="w-3.5 h-3.5" />
                </div>
                <input
                  type="text"
                  value={profile.username}
                  onChange={(e) => setProfile({ ...profile, username: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '') })}
                  placeholder="e.g. giantstrader"
                  className="w-full pl-9 pr-4 py-2.5 bg-bg-card rounded-xl border border-fgBorder-subtle text-xs text-white placeholder-fgText-muted focus:outline-none focus:border-emerald-500 transition-colors"
                />
              </div>
              <p className="text-[10px] text-fgText-muted mt-1">
                3–20 characters. Letters, numbers, and underscores only.
              </p>
            </div>

            {/* Phone (WhatsApp) */}
            <div>
              <label className="block text-xs font-semibold text-fgText-secondary mb-1.5">
                Phone Number (WhatsApp)
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-fgText-muted">
                  <Phone className="w-3.5 h-3.5" />
                </div>
                <input
                  type="tel"
                  value={profile.phone}
                  onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                  placeholder="+2348012345678"
                  className="w-full pl-9 pr-4 py-2.5 bg-bg-card rounded-xl border border-fgBorder-subtle text-xs text-white placeholder-fgText-muted focus:outline-none focus:border-emerald-500 transition-colors"
                  required
                />
              </div>
              <p className="text-[10px] text-fgText-muted mt-1">
                Used for instant trade milestone alerts and OTP verification fallback.
              </p>
            </div>
          </div>

          {/* Email Address (Read Only) */}
          <div>
            <label className="block text-xs font-semibold text-fgText-secondary mb-1.5">
              Email Address (Login Identifier)
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-fgText-muted">
                <Mail className="w-3.5 h-3.5" />
              </div>
              <input
                type="email"
                value={profile.email}
                disabled
                className="w-full pl-9 pr-4 py-2.5 bg-bg-card/50 rounded-xl border border-fgBorder-subtle text-xs text-fgText-muted cursor-not-allowed"
              />
            </div>
            <p className="text-[10px] text-fgText-muted mt-1">
              Your primary security email. Tied to passwordless OTP access.
            </p>
          </div>

          {/* Residential Address */}
          <div>
            <label className="block text-xs font-semibold text-fgText-secondary mb-1.5">
              Residential Address
            </label>
            <div className="relative">
              <div className="absolute top-3 left-3.5 pointer-events-none text-fgText-muted">
                <MapPin className="w-3.5 h-3.5" />
              </div>
              <textarea
                rows={2}
                value={profile.address}
                onChange={(e) => setProfile({ ...profile, address: e.target.value })}
                placeholder="14 Admiralty Way, Lekki Phase 1, Lagos, Nigeria"
                className="w-full pl-9 pr-4 py-2.5 bg-bg-card rounded-xl border border-fgBorder-subtle text-xs text-white placeholder-fgText-muted focus:outline-none focus:border-emerald-500 transition-colors resize-none"
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-black text-xs font-bold rounded-xl transition-all shadow-lg shadow-emerald-500/20 flex items-center gap-2"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Save Profile Changes</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* FundedGiants KYC & Identity Verification Section */}
      <div className="p-6 sm:p-8 rounded-2xl bg-bg-surface border border-fgBorder-subtle space-y-6">
        <div className="border-b border-fgBorder-subtle pb-4 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
              <span>FundedGiants KYC Identity Status</span>
            </h3>
            <p className="text-xs text-fgText-secondary mt-0.5">
              Authoritative KYC verification powering your dedicated deposit vault and profit disbursements.
            </p>
          </div>
          <span
            className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${
              isKycApproved
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
            }`}
          >
            {profile.kycStatus}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl bg-bg-card border border-fgBorder-subtle space-y-1">
            <span className="text-[11px] font-semibold text-fgText-secondary block">
              Identity System
            </span>
            <span className="text-xs font-bold text-white flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              FundedGiants Security Gateway
            </span>
          </div>

          <div className="p-4 rounded-xl bg-bg-card border border-fgBorder-subtle space-y-1">
            <span className="text-[11px] font-semibold text-fgText-secondary block">
              Verified BVN Status
            </span>
            <span className="text-xs font-bold text-white">
              {isKycApproved ? 'Encrypted & Validated' : 'Not Yet Provided'}
            </span>
          </div>

          <div className="p-4 rounded-xl bg-bg-card border border-fgBorder-subtle space-y-1">
            <span className="text-[11px] font-semibold text-fgText-secondary block">
              Dedicated Vault Account
            </span>
            <span className="text-xs font-bold text-emerald-400">
              {profile.wallet?.nombaAccountNumber || profile.wallet?.lencoAccountNumber ? 'Active (Interbank Vault)' : 'Pending Verification'}
            </span>
          </div>
        </div>

        {!isKycApproved && (
          <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => setIsKycModalOpen(true)}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-emerald-500 text-black font-semibold text-xs hover:bg-emerald-400 transition-colors flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Complete Identity Verification</span>
            </button>
            <button
              type="button"
              onClick={handleSyncKyc}
              disabled={syncingKyc}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white font-semibold text-xs hover:bg-white/10 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {syncingKyc ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
                  <span>Checking Ninja Status...</span>
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 text-emerald-400" />
                  <span>Sync Verification Status</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Dedicated Bank Account (FundedGiants Deposit Vault) */}
      {(profile.wallet?.nombaAccountNumber || profile.wallet?.lencoAccountNumber) && (
        <div className="p-6 sm:p-8 rounded-2xl bg-bg-surface border border-fgBorder-subtle space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">FundedGiants Dedicated Deposit Account</h3>
              <p className="text-xs text-fgText-secondary">
                Auto-provisioned via Nomba Banking upon successful NinjaKYC verification
              </p>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-[#09120e] border border-emerald-500/20 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <span className="text-[11px] text-fgText-muted block">Bank Name</span>
              <span className="text-xs font-bold text-white">
                {profile.wallet.nombaVirtualBankName || profile.wallet.lencoVirtualBankName || 'Nombank MFB'}
              </span>
            </div>
            <div>
              <span className="text-[11px] text-fgText-muted block">Account Number</span>
              <span className="text-sm font-mono font-bold text-emerald-400 tracking-wider">
                {profile.wallet.nombaAccountNumber || profile.wallet.lencoAccountNumber}
              </span>
            </div>
            <div>
              <span className="text-[11px] text-fgText-muted block">Account Name</span>
              <span className="text-xs font-bold text-white truncate block">
                {profile.wallet.nombaAccountName || profile.wallet.lencoAccountName || `Fundedgiants/${profile.firstName} ${profile.lastName}`}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
