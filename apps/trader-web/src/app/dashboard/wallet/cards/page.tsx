'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { CreditCard, ShieldCheck, Check, Sparkles, AlertCircle } from 'lucide-react';

export default function GiantsSpendCardPage() {
  const [embossedName, setEmbossedName] = useState('JOHN DOE');
  const [includeCustomName, setIncludeCustomName] = useState(false);
  const [cardScheme, setCardScheme] = useState<'VERVE' | 'MASTERCARD'>('MASTERCARD');

  const standardFee = 100000;
  const customNameFee = 50000;
  const totalFee = standardFee + (includeCustomName ? customNameFee : 0);

  return (
    <div className="space-y-8 max-w-5xl pb-12">
      {/* Header */}
      <div>
        <span className="text-xs font-semibold uppercase tracking-wider text-amber-400 block mb-1">
          Giants Vault &bull; Spend Feature
        </span>
        <h1 className="text-2xl md:text-3xl font-heading font-extrabold text-white tracking-tight">
          Giants Spend Card (Custom NGN Card)
        </h1>
        <p className="text-xs text-fgText-secondary mt-1">
          Laser-etched black stainless-steel debit card debited directly from your Giants Vault. Accepted online, on POS terminals, and ATMs anywhere Verve or Mastercard are accepted nationwide.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Card Visualizer */}
        <div className="lg:col-span-6 space-y-4">
          <div className="relative w-full aspect-[1.586/1] rounded-2xl bg-gradient-to-tr from-[#0a0f0d] via-[#14231b] to-[#0d1612] border border-amber-500/30 p-6 shadow-2xl flex flex-col justify-between overflow-hidden">
            {/* Ambient metallic sheen */}
            <div className="absolute inset-0 bg-radial-gradient from-amber-500/10 via-transparent to-transparent pointer-events-none" />

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
              <div className="relative w-8 h-8 opacity-90">
                <Image
                  src="/brand/icon.png"
                  alt="Emblem"
                  fill
                  className="object-contain"
                />
              </div>
            </div>

            {/* Chip & Network Badge */}
            <div className="flex items-center justify-between z-10">
              <div className="w-11 h-8 rounded-md bg-gradient-to-br from-amber-200 via-amber-400 to-amber-600 border border-amber-300 shadow-sm" />
              <div className="px-2.5 py-1 rounded bg-black/40 border border-white/10 font-bold text-[11px] tracking-wider text-white">
                {cardScheme}
              </div>
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
                    Valid Thru
                  </span>
                  <span className="font-mono text-xs text-white">11/29</span>
                </div>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-bg-card border border-fgBorder-subtle flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-fgText-secondary">
              <span className="text-white font-semibold block mb-0.5">Real-Time Giants Vault Settlement</span>
              POS transactions, ATM cash withdrawals, and web checkouts debit directly from your Giants Vault balance without separate manual transfers.
            </div>
          </div>
        </div>

        {/* Order & Customisation Configuration */}
        <div className="lg:col-span-6 p-6 rounded-2xl bg-bg-surface border border-fgBorder-subtle space-y-6">
          <h2 className="text-base font-heading font-bold text-white">Card Configuration</h2>

          {/* Scheme Selection */}
          <div className="space-y-2">
            <label className="block text-xs font-medium text-fgText-secondary">
              Select Card Scheme
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setCardScheme('MASTERCARD')}
                className={`py-3 px-4 rounded-xl text-xs font-bold border transition-all text-center ${
                  cardScheme === 'MASTERCARD'
                    ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                    : 'bg-bg-card border-fgBorder-subtle text-fgText-secondary hover:text-white'
                }`}
              >
                Mastercard (Global & Local)
              </button>
              <button
                type="button"
                onClick={() => setCardScheme('VERVE')}
                className={`py-3 px-4 rounded-xl text-xs font-bold border transition-all text-center ${
                  cardScheme === 'VERVE'
                    ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                    : 'bg-bg-card border-fgBorder-subtle text-fgText-secondary hover:text-white'
                }`}
              >
                Verve (Local Nigeria)
              </button>
            </div>
          </div>

          {/* Pricing Addons */}
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-bg-card border border-fgBorder-subtle flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-white block">Standard Black Stainless Steel</span>
                <span className="text-[11px] text-fgText-muted">Laser-etched physical card issuance</span>
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
                  className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
                />
              </div>

              {includeCustomName && (
                <div>
                  <label className="block text-[11px] font-medium text-fgText-secondary mb-1">
                    Name to Laser-Engrave (Max 24 characters)
                  </label>
                  <input
                    type="text"
                    maxLength={24}
                    value={embossedName}
                    onChange={(e) => setEmbossedName(e.target.value.toUpperCase())}
                    placeholder="ENTER NAME"
                    className="w-full px-3 py-2 bg-bg-surface rounded-lg border border-fgBorder-subtle text-xs text-white uppercase focus:outline-none focus:border-amber-500 font-mono"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Pricing Summary */}
          <div className="pt-4 border-t border-fgBorder-subtle space-y-2">
            <div className="flex justify-between text-xs text-fgText-secondary">
              <span>Standard Issuance Fee ({cardScheme})</span>
              <span>₦{standardFee.toLocaleString()}</span>
            </div>
            {includeCustomName && (
              <div className="flex justify-between text-xs text-fgText-secondary">
                <span>Laser Custom Name Engraving</span>
                <span>₦{customNameFee.toLocaleString()}</span>
              </div>
            )}
            <div className="flex justify-between text-sm font-bold text-white pt-2 border-t border-fgBorder-subtle">
              <span>Total Debited from Giants Vault</span>
              <span className="text-amber-400 font-mono">₦{totalFee.toLocaleString()}</span>
            </div>
          </div>

          <button
            type="button"
            className="w-full py-4 bg-amber-500 hover:bg-amber-400 text-bg-base font-bold rounded-xl flex items-center justify-center gap-2 transition-all shadow-[0_0_20px_rgba(245,158,11,0.3)] text-xs uppercase tracking-wider"
          >
            <CreditCard className="w-4 h-4" />
            <span>Pay ₦{totalFee.toLocaleString()} from Giants Vault</span>
          </button>
        </div>
      </div>
    </div>
  );
}
