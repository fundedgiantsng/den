'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  CreditCard,
  ShieldCheck,
  Check,
  Sparkles,
  AlertCircle,
  Download,
  Lock,
  Unlock,
  RefreshCw,
  Sliders,
  ShoppingBag,
  ExternalLink,
  ChevronRight,
  ArrowDownLeft,
  ArrowUpRight,
  Truck,
  CheckCircle2,
  X,
  XCircle,
  AlertTriangle,
  Building2,
} from 'lucide-react';
import { formatNaira } from '@/lib/format';

interface CardTransaction {
  id: string;
  merchant: string;
  category: string;
  amountNgn: number;
  date: string;
  type: 'POS' | 'ATM' | 'WEB';
  status: 'Completed' | 'Pending' | 'Declined';
  ref: string;
}

export default function GiantsCardDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [myCardData, setMyCardData] = useState<{
    hasCard: boolean;
    cardOrder?: any;
    previewUrl: string;
    stampedUrl?: string;
  } | null>(null);

  // Card Controls
  const [isCardFrozen, setIsCardFrozen] = useState(false);
  const [allowOnline, setAllowOnline] = useState(true);
  const [allowPos, setAllowPos] = useState(true);
  const [allowAtm, setAllowAtm] = useState(true);

  // Modals
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);

  // Request form state
  const [cardFullName, setCardFullName] = useState('OLUGBENGA OLAMIDE');
  const [cardStreet, setCardStreet] = useState('14 Admiralty Way, Lekki Phase 1');
  const [cardCity, setCardCity] = useState('Lekki');
  const [cardState, setCardState] = useState('Lagos State');
  const [cardPhone, setCardPhone] = useState('+234 803 123 4567');
  const [submittingRequest, setSubmittingRequest] = useState(false);
  const [cancelReason, setCancelReason] = useState('Lost Card');
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Transactions mock data
  const [transactions, setTransactions] = useState<CardTransaction[]>([
    {
      id: 'ctx-1',
      merchant: 'Jumia Nigeria (Web Checkout)',
      category: 'Online Shopping',
      amountNgn: 45000,
      date: 'May 14, 2026 • 02:15 PM',
      type: 'WEB',
      status: 'Completed',
      ref: 'TXN-MC-88192',
    },
    {
      id: 'ctx-2',
      merchant: 'Shoprite Lekki Mall (POS Terminal)',
      category: 'Groceries & Retail',
      amountNgn: 82500,
      date: 'May 12, 2026 • 06:40 PM',
      type: 'POS',
      status: 'Completed',
      ref: 'TXN-MC-88191',
    },
    {
      id: 'ctx-3',
      merchant: 'GTBank ATM Cash Withdrawal',
      category: 'Cash Withdrawal',
      amountNgn: 50000,
      date: 'May 10, 2026 • 11:20 AM',
      type: 'ATM',
      status: 'Completed',
      ref: 'TXN-MC-88190',
    },
    {
      id: 'ctx-4',
      merchant: 'Uber Nigeria Ride Fare',
      category: 'Transportation',
      amountNgn: 12400,
      date: 'May 08, 2026 • 09:10 PM',
      type: 'WEB',
      status: 'Completed',
      ref: 'TXN-MC-88189',
    },
  ]);

  const fetchCardData = async () => {
    setLoading(true);
    try {
      const res = await fetch('http://localhost:4000/api/v1/cards/my-card', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setMyCardData(data);
        if (data.cardOrder?.fullName) {
          setCardFullName(data.cardOrder.fullName);
        }
        if (data.cardOrder?.status === 'FROZEN') {
          setIsCardFrozen(true);
        }
      }
    } catch (err) {
      console.warn('Failed to load card info', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCardData();
  }, []);

  const handleRequestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingRequest(true);
    setActionError(null);
    setActionSuccess(null);
    try {
      const res = await fetch('http://localhost:4000/api/v1/cards/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          fullName: cardFullName,
          deliveryAddress: {
            street: cardStreet,
            city: cardCity,
            state: cardState,
            country: 'Nigeria',
            phone: cardPhone,
          },
        }),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.message || 'Failed to submit card request');

      setMyCardData({
        hasCard: true,
        cardOrder: result.cardOrder,
        previewUrl: '/cards/card-verve-perspective.png',
        stampedUrl: result.downloadUrl,
      });

      setActionSuccess('Giants Verve Card requested and stamped successfully! Ready for download and physical dispatch.');
      setTimeout(() => {
        setIsRequestModalOpen(false);
        setActionSuccess(null);
      }, 2000);
    } catch (err: any) {
      setActionError(err.message || 'Card request failed.');
    } finally {
      setSubmittingRequest(false);
    }
  };

  const handleToggleFreeze = () => {
    const nextState = !isCardFrozen;
    setIsCardFrozen(nextState);
    setActionSuccess(nextState ? 'Card has been temporarily FROZEN. All transactions will be declined.' : 'Card has been UNFROZEN and is ready for use.');
    setTimeout(() => setActionSuccess(null), 3500);
  };

  const handleCancelCard = () => {
    setIsCardFrozen(true);
    setIsCancelModalOpen(false);
    setActionSuccess(`Card has been CANCELLED and blacklisted (${cancelReason}). A replacement can now be requested.`);
    setTimeout(() => setActionSuccess(null), 4000);
  };

  return (
    <div className="space-y-8 max-w-7xl pb-12">
      {/* Breadcrumb & Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-fgText-muted mb-1 font-mono">
            <Link href="/dashboard/wallet" className="hover:text-white transition">
              Giants Vault
            </Link>
            <span>/</span>
            <span className="text-[#00f59b]">Giants Verve Card Dashboard</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-heading font-extrabold text-white tracking-tight">
            Giants Verve Card Dashboard
          </h1>
          <p className="text-xs text-fgText-secondary mt-1">
            Physical laser-etched Verve debit card debited directly from your Giants Vault balance for ATMs, POS, and online checkouts.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsRequestModalOpen(true)}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-[#00f59b] hover:from-emerald-400 hover:to-[#00ffaa] text-black font-heading font-extrabold text-xs shadow-lg shadow-emerald-500/20 active:scale-95 transition flex items-center gap-2"
          >
            <Sparkles className="w-4 h-4 stroke-[2.5]" />
            <span>Request New Giants Card</span>
          </button>
        </div>
      </div>

      {actionSuccess && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2.5 animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* ======================================================== */}
        {/* LEFT COLUMN: VISUAL CARD & CORE CONTROLS (lg:col-span-5) */}
        {/* ======================================================== */}
        <div className="lg:col-span-5 space-y-6">
          {/* Card Showcase Container */}
          <div className="rounded-2xl bg-gradient-to-br from-[#0c1813] via-[#08120d] to-[#040806] border border-emerald-500/30 p-6 shadow-2xl relative overflow-hidden space-y-5">
            {/* Ambient metallic gradient background */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

            <div className="flex items-center justify-between">
              <span className="text-xs font-heading font-extrabold text-white tracking-wider flex items-center gap-1.5">
                <CreditCard className="w-4 h-4 text-emerald-400" />
                <span>FUNDEDGIANTS VERVE CARD</span>
              </span>
              <span
                className={`text-[10px] px-2.5 py-0.5 rounded-full font-mono font-bold uppercase tracking-wider ${
                  isCardFrozen
                    ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                    : 'bg-emerald-500/20 text-[#00f59b] border border-emerald-500/30'
                }`}
              >
                {isCardFrozen ? 'FROZEN / LOCKED' : 'ACTIVE / OPERATIONAL'}
              </span>
            </div>

            {/* Official 3D Perspective Verve Card Graphic */}
            <div className="relative rounded-2xl overflow-hidden border border-emerald-500/40 shadow-2xl group bg-black/60 p-3 flex items-center justify-center">
              <Image
                src={myCardData?.hasCard && myCardData?.stampedUrl ? myCardData.stampedUrl : '/cards/card-verve-perspective.png'}
                alt="FundedGiants Verve Spend Card"
                width={1024}
                height={748}
                className={`w-full h-auto object-contain rounded-xl transition duration-500 ${
                  isCardFrozen ? 'grayscale opacity-60' : 'group-hover:scale-[1.02]'
                }`}
                priority
              />
              {isCardFrozen && (
                <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center gap-2">
                  <Lock className="w-10 h-10 text-rose-400 stroke-[2.5]" />
                  <span className="text-xs font-heading font-extrabold text-rose-400 tracking-wider">
                    CARD IS TEMPORARILY FROZEN
                  </span>
                </div>
              )}
            </div>

            {/* Primary Action Buttons */}
            <div className="space-y-2.5 pt-1">
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  onClick={handleToggleFreeze}
                  className={`py-2.5 px-3 rounded-xl text-xs font-semibold border transition text-center flex items-center justify-center gap-1.5 active:scale-95 ${
                    isCardFrozen
                      ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/25'
                      : 'bg-rose-500/15 border-rose-500/30 text-rose-400 hover:bg-rose-500/25'
                  }`}
                >
                  {isCardFrozen ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                  <span>{isCardFrozen ? 'Unfreeze Card' : 'Freeze Card'}</span>
                </button>

                <a
                  href={myCardData?.stampedUrl || '/cards/generated/sample-stamped-card.jpg'}
                  download="FundedGiants-Spend-Card.jpg"
                  className="py-2.5 px-3 rounded-xl text-xs font-semibold bg-white/[0.05] border border-white/[0.1] text-white hover:bg-white/[0.1] transition text-center flex items-center justify-center gap-1.5 active:scale-95"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download JPEG</span>
                </a>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <button
                  onClick={() => setIsRequestModalOpen(true)}
                  className="py-2.5 px-3 rounded-xl text-xs font-semibold bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 hover:bg-emerald-500/20 transition text-center flex items-center justify-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Customize Print Name</span>
                </button>

                <button
                  onClick={() => setIsCancelModalOpen(true)}
                  className="py-2.5 px-3 rounded-xl text-xs font-semibold bg-black/40 border border-white/[0.08] text-slate-400 hover:text-rose-400 hover:border-rose-500/30 transition text-center flex items-center justify-center gap-1.5"
                >
                  <XCircle className="w-3.5 h-3.5" />
                  <span>Report / Cancel</span>
                </button>
              </div>
            </div>
          </div>

          {/* Security & Transaction Channels */}
          <div className="rounded-2xl bg-[#09120e] border border-white/[0.08] p-5 space-y-4 shadow-xl">
            <h3 className="text-xs font-heading font-bold text-white uppercase tracking-wider border-b border-white/[0.08] pb-3 flex items-center justify-between">
              <span>Card Channel Controls</span>
              <span className="text-[10px] text-emerald-400 font-mono">Real-Time Protection</span>
            </h3>

            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between p-3 rounded-xl bg-black/40 border border-white/[0.06]">
                <div>
                  <div className="font-semibold text-white">POS Terminal Transactions</div>
                  <div className="text-[10px] text-fgText-secondary">In-store card swipe and contactless payments</div>
                </div>
                <input
                  type="checkbox"
                  checked={allowPos}
                  onChange={(e) => setAllowPos(e.target.checked)}
                  className="w-4 h-4 accent-emerald-500 rounded cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-black/40 border border-white/[0.06]">
                <div>
                  <div className="font-semibold text-white">Online E-Commerce Payments</div>
                  <div className="text-[10px] text-fgText-secondary">Web shopping and digital subscriptions</div>
                </div>
                <input
                  type="checkbox"
                  checked={allowOnline}
                  onChange={(e) => setAllowOnline(e.target.checked)}
                  className="w-4 h-4 accent-emerald-500 rounded cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-black/40 border border-white/[0.06]">
                <div>
                  <div className="font-semibold text-white">ATM Cash Withdrawals</div>
                  <div className="text-[10px] text-fgText-secondary">Domestic ATM cash dispensing nationwide</div>
                </div>
                <input
                  type="checkbox"
                  checked={allowAtm}
                  onChange={(e) => setAllowAtm(e.target.checked)}
                  className="w-4 h-4 accent-emerald-500 rounded cursor-pointer"
                />
              </div>
            </div>
          </div>
        </div>

        {/* ======================================================== */}
        {/* RIGHT COLUMN: FULFILLMENT TRACKER & TRANSACTIONS (lg:col-span-7) */}
        {/* ======================================================== */}
        <div className="lg:col-span-7 space-y-6">
          {/* Physical Delivery & Fulfillment Tracker */}
          <div className="rounded-2xl bg-[#09120e] border border-white/[0.08] p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center text-emerald-400">
                  <Truck className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h3 className="text-xs font-heading font-bold text-white uppercase tracking-wider">
                    Physical Card Printing & Delivery Tracker
                  </h3>
                  <p className="text-[10px] text-fgText-secondary">
                    Courier: DHL Express &bull; Tracking: FG-NGN-99412
                  </p>
                </div>
              </div>
              <span className="text-[9px] px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-mono font-bold">
                In Production
              </span>
            </div>

            {/* Step Progress */}
            <div className="grid grid-cols-4 gap-2 pt-1 text-center font-mono">
              <div className="space-y-1.5">
                <div className="w-7 h-7 mx-auto rounded-full bg-emerald-500 text-black flex items-center justify-center font-bold text-xs">
                  ✓
                </div>
                <div className="text-[10px] font-bold text-white">Requested</div>
                <div className="text-[8px] text-slate-500">Vault Verified</div>
              </div>
              <div className="space-y-1.5">
                <div className="w-7 h-7 mx-auto rounded-full bg-emerald-500 text-black flex items-center justify-center font-bold text-xs">
                  ✓
                </div>
                <div className="text-[10px] font-bold text-white">Laser Stamped</div>
                <div className="text-[8px] text-slate-500">Gold Foil Applied</div>
              </div>
              <div className="space-y-1.5">
                <div className="w-7 h-7 mx-auto rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center font-bold text-xs animate-pulse">
                  3
                </div>
                <div className="text-[10px] font-bold text-emerald-400">NFC Encoded</div>
                <div className="text-[8px] text-slate-500">Verve Smart Chip</div>
              </div>
              <div className="space-y-1.5 opacity-40">
                <div className="w-7 h-7 mx-auto rounded-full bg-black/40 text-slate-500 border border-white/10 flex items-center justify-center font-bold text-xs">
                  4
                </div>
                <div className="text-[10px] font-bold text-slate-400">Dispatched</div>
                <div className="text-[8px] text-slate-500">To Doorstep</div>
              </div>
            </div>
          </div>

          {/* Card Transactions Log */}
          <div className="rounded-2xl bg-[#09120e] border border-white/[0.08] p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
              <div>
                <h3 className="text-xs font-heading font-bold text-white uppercase tracking-wider">
                  Card Transactions Log
                </h3>
                <p className="text-[10px] text-fgText-secondary">
                  Direct debit activity from your FundedGiants Verve Card
                </p>
              </div>
              <span className="text-[10px] font-mono text-emerald-400">
                Debited from Vault
              </span>
            </div>

            <div className="space-y-2.5">
              {transactions.map((tx) => (
                <div
                  key={tx.id}
                  className="p-3.5 rounded-xl bg-black/40 border border-white/[0.06] flex items-center justify-between hover:border-emerald-500/30 transition text-xs"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 font-bold font-mono text-[10px]">
                      {tx.type}
                    </div>
                    <div>
                      <div className="font-bold text-white text-xs">{tx.merchant}</div>
                      <div className="text-[10px] text-fgText-muted font-mono">
                        {tx.date} &bull; Ref: {tx.ref}
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="font-mono font-bold text-white text-xs">
                      -{formatNaira(tx.amountNgn)}
                    </div>
                    <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-emerald-500/15 text-emerald-400 font-mono font-medium">
                      {tx.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* MODAL 1: REQUEST GIANTS VERVE CARD                       */}
      {/* ======================================================== */}
      {isRequestModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#0b1612] border border-emerald-500/30 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-5 relative">
            <button
              onClick={() => setIsRequestModalOpen(false)}
              className="absolute top-4 right-4 text-fgText-muted hover:text-white transition"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="space-y-1">
              <h3 className="text-lg font-heading font-bold text-white flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-emerald-400" />
                <span>Request Giants Verve Card</span>
              </h3>
              <p className="text-xs text-fgText-secondary">
                Personalized metallic gold foil stamping on your physical debit card.
              </p>
            </div>

            {actionError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{actionError}</span>
              </div>
            )}

            <form onSubmit={handleRequestSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-fgText-secondary font-medium mb-1">
                  Name Desired on Card (For Physical Printing & Digital JPEG)
                </label>
                <input
                  type="text"
                  value={cardFullName}
                  onChange={(e) => setCardFullName(e.target.value.toUpperCase())}
                  required
                  placeholder="e.g. OLUGBENGA OLAMIDE"
                  className="w-full p-2.5 rounded-xl bg-black/40 border border-emerald-500/30 text-[#00f59b] font-heading font-extrabold text-xs tracking-wider focus:outline-none focus:border-emerald-400"
                />
                <span className="text-[10px] text-fgText-muted block mt-1 leading-relaxed">
                  Note: This custom name is exclusively for physical card printing and digital JPEG stamping. The legal cardholder profile submitted to the card provider and banking network will remain your KYC-verified legal identity.
                </span>
              </div>

              <div>
                <label className="block text-fgText-secondary font-medium mb-1">
                  Delivery Street Address
                </label>
                <input
                  type="text"
                  value={cardStreet}
                  onChange={(e) => setCardStreet(e.target.value)}
                  required
                  placeholder="Street and house number"
                  className="w-full p-2.5 rounded-xl bg-black/40 border border-white/[0.1] text-white focus:outline-none focus:border-emerald-500 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-fgText-secondary font-medium mb-1">City</label>
                  <input
                    type="text"
                    value={cardCity}
                    onChange={(e) => setCardCity(e.target.value)}
                    required
                    placeholder="City"
                    className="w-full p-2.5 rounded-xl bg-black/40 border border-white/[0.1] text-white focus:outline-none focus:border-emerald-500 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-fgText-secondary font-medium mb-1">State</label>
                  <input
                    type="text"
                    value={cardState}
                    onChange={(e) => setCardState(e.target.value)}
                    required
                    placeholder="State"
                    className="w-full p-2.5 rounded-xl bg-black/40 border border-white/[0.1] text-white focus:outline-none focus:border-emerald-500 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-fgText-secondary font-medium mb-1">Phone Number</label>
                <input
                  type="tel"
                  value={cardPhone}
                  onChange={(e) => setCardPhone(e.target.value)}
                  required
                  placeholder="+234..."
                  className="w-full p-2.5 rounded-xl bg-black/40 border border-white/[0.1] text-white font-mono focus:outline-none focus:border-emerald-500 text-xs"
                />
              </div>

              <button
                type="submit"
                disabled={submittingRequest}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-[#00f59b] hover:from-emerald-400 hover:to-[#00ffaa] disabled:opacity-50 text-black font-heading font-extrabold text-xs shadow-lg shadow-emerald-500/20 active:scale-95 transition flex items-center justify-center gap-1.5 pt-2.5 mt-2"
              >
                {submittingRequest ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4 stroke-[2.5]" />
                )}
                <span>{submittingRequest ? 'Stamping Luxury Card...' : 'Confirm & Request Card'}</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 2: CANCEL / REPORT LOST CARD                       */}
      {/* ======================================================== */}
      {isCancelModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#0b1612] border border-rose-500/40 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4 relative">
            <button
              onClick={() => setIsCancelModalOpen(false)}
              className="absolute top-4 right-4 text-fgText-muted hover:text-white transition"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2.5 text-rose-400">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <h3 className="text-base font-heading font-bold text-white">
                Cancel or Report Card
              </h3>
            </div>

            <p className="text-xs text-fgText-secondary leading-relaxed">
              Cancelling your card will permanently disable POS, ATM, and web transactions. You can immediately request a replacement card.
            </p>

            <div className="space-y-1">
              <label className="block text-[11px] font-semibold uppercase text-slate-400">
                Reason for Cancellation
              </label>
              <select
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="w-full p-2.5 rounded-xl bg-black/40 border border-white/[0.1] text-white text-xs focus:outline-none focus:border-rose-500"
              >
                <option value="Lost Card">Lost Card</option>
                <option value="Stolen Card">Stolen Card</option>
                <option value="Damaged Card">Damaged Magnetic Stripe / Chip</option>
                <option value="Suspicious Activity">Suspected Compromise</option>
              </select>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-white/[0.08]">
              <button
                onClick={() => setIsCancelModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-white/[0.04] text-slate-400 hover:text-white text-xs"
              >
                Go Back
              </button>
              <button
                onClick={handleCancelCard}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-lg shadow-rose-900/40 active:scale-95 transition"
              >
                Confirm Cancellation
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
