'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { CreditCard, ShieldCheck, Check, Sparkles, AlertCircle } from 'lucide-react';

export default function WalletCardsPage() {
  const [embossedName, setEmbossedName] = useState('JOHN DOE');
  const [includeCustomName, setIncludeCustomName] = useState(false);

  const standardFee = 100000;
  const customNameFee = 50000;
  const totalFee = standardFee + (includeCustomName ? customNameFee : 0);

  return (
    <div className="space-y-8 max-w-5xl">
      {/* Header */}
      <div>
        <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400 block mb-1">
          Wallet Add-on
        </span>
        <h1 className="text-2xl md:text-3xl font-heading font-extrabold text-white tracking-tight">
          Physical Stainless-Steel Cards
        </h1>
        <p className="text-xs text-fgText-secondary mt-1">
          Spend your funded trading profits directly anywhere with your laser-etched black metal card linked to your Central NGN Wallet.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Card Mockup / Visualizer */}
        <div className="lg:col-span-6 space-y-4">
          <div className="relative w-full aspect-[1.586/1] rounded-2xl bg-gradient-to-tr from-[#0a0f0d] via-[#14231b] to-[#0d1612] border border-emerald-500/30 p-6 shadow-2xl flex flex-col justify-between overflow-hidden">
            {/* Ambient metallic sheen */}
            <div className="absolute inset-0 bg-radial-gradient from-emerald-500/10 via-transparent to-transparent pointer-events-none" />

            {/* Top row */}
            <div className="flex items-center justify-between z-10">
              <div className="relative h-6 w-32">
                <Image
                  src="/brand/logo-white.png"
                  alt="FundedGiants"
                  fill
                  className="object-contain object-left"
                />
              </div>
              <div className="relative w-8 h-8 opacity-80">
                <Image
                  src="/brand/icon.png"
                  alt="Emblem"
                  fill
                  className="object-contain"
                />
              </div>
            </div>

            {/* Chip & Contactless */}
            <div className="flex items-center gap-4 z-10">
              <div className="w-11 h-8 rounded-md bg-gradient-to-br from-amber-200 via-amber-400 to-amber-600 border border-amber-300 shadow-sm" />
              <div className="text-emerald-400/80 text-xs font-mono">Debit</div>
            </div>

            {/* Bottom details */}
            <div className="space-y-1 z-10">
              <div className="font-mono text-sm tracking-widest text-white/90">
                •••• •••• •••• 8842
              </div>
              <div className="flex items-end justify-between pt-2">
                <div>
                  <span className="text-[9px] uppercase tracking-wider text-fgText-muted block">
                    Cardholder
                  </span>
                  <span className="font-mono text-xs uppercase tracking-wider text-white font-bold">
                    {includeCustomName && embossedName ? embossedName : 'JOHN DOE'}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[9px] uppercase tracking-wider text-fgText-muted block">
                    Expires
                  </span>
                  <span className="font-mono text-xs text-white">11/29</span>
                </div>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-bg-card border border-fgBorder-subtle flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-fgText-secondary">
              <span className="text-white font-semibold block mb-0.5">Direct Wallet Spend</span>
              Every card swipe or ATM withdrawal is debited in real-time from your Central NGN Wallet balance.
            </div>
          </div>
        </div>

        {/* Order & Customisation Panel */}
        <div className="lg:col-span-6 p-6 rounded-2xl bg-bg-surface border border-fgBorder-subtle space-y-6">
          <h2 className="text-base font-heading font-bold text-white">Order Your Card</h2>

          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-bg-card border border-fgBorder-subtle flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-white block">Standard Metal Card</span>
                <span className="text-[11px] text-fgText-muted">Laser-etched black stainless-steel</span>
              </div>
              <span className="text-sm font-extrabold text-white">₦100,000</span>
            </div>

            {/* Custom Name Engraving Option */}
            <div className="p-4 rounded-xl bg-bg-card border border-fgBorder-subtle space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-white block">Custom Name Engraving</span>
                  <span className="text-[11px] text-fgText-muted">+₦50,000 laser customization</span>
                </div>
                <input
                  type="checkbox"
                  checked={includeCustomName}
                  onChange={(e) => setIncludeCustomName(e.target.checked)}
                  className="w-4 h-4 accent-emerald-500 rounded cursor-pointer"
                />
              </div>

              {includeCustomName && (
                <div>
                  <label className="block text-[11px] font-medium text-fgText-secondary mb-1">
                    Custom Name on Card (Max 24 characters)
                  </label>
                  <input
                    type="text"
                    maxLength={24}
                    value={embossedName}
                    onChange={(e) => setEmbossedName(e.target.value.toUpperCase())}
                    placeholder="ENTER NAME"
                    className="w-full px-3 py-2 bg-bg-surface rounded-lg border border-fgBorder-subtle text-xs text-white uppercase focus:outline-none focus:border-emerald-500"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Pricing Summary */}
          <div className="pt-4 border-t border-fgBorder-subtle space-y-2">
            <div className="flex justify-between text-xs text-fgText-secondary">
              <span>Standard Issuance Fee</span>
              <span>₦{standardFee.toLocaleString()}</span>
            </div>
            {includeCustomName && (
              <div className="flex justify-between text-xs text-fgText-secondary">
                <span>Laser Custom Name Engraving</span>
                <span>₦{customNameFee.toLocaleString()}</span>
              </div>
            )}
            <div className="flex justify-between text-sm font-bold text-white pt-2 border-t border-fgBorder-subtle">
              <span>Total Debited from Wallet</span>
              <span className="text-emerald-400 font-mono">₦{totalFee.toLocaleString()}</span>
            </div>
          </div>

          <button
            type="button"
            className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-400 text-bg-base font-bold rounded-xl flex items-center justify-center gap-2 transition-all shadow-emeraldGlow text-xs"
          >
            <CreditCard className="w-4 h-4" />
            <span>Pay ₦{totalFee.toLocaleString()} from Wallet</span>
          </button>
        </div>
      </div>
    </div>
  );
}
