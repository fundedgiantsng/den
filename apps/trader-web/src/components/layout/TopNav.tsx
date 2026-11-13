'use client';

import React from 'react';
import { Search, Bell } from 'lucide-react';

export function TopNav() {
  return (
    <header className="h-16 px-8 border-b border-fgBorder-subtle bg-bg-surface/50 backdrop-blur-md sticky top-0 z-30 flex items-center justify-between">
      {/* Search Input (Ctrl+K) */}
      <div className="relative w-80">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-fgText-muted">
          <Search className="w-4 h-4" />
        </div>
        <input
          type="text"
          placeholder="Search accounts, trades, transactions..."
          className="w-full pl-9 pr-12 py-1.5 bg-bg-card rounded-lg border border-fgBorder-subtle text-xs text-white placeholder-fgText-muted focus:outline-none focus:border-emerald-500 transition-all"
        />
        <div className="absolute inset-y-0 right-0 pr-2.5 flex items-center pointer-events-none">
          <kbd className="px-1.5 py-0.5 text-[10px] text-fgText-muted bg-bg-surface rounded border border-fgBorder-subtle">
            ⌘K
          </kbd>
        </div>
      </div>

      {/* Right Controls: Notifications & Currency Indicator (Fixed NGN) */}
      <div className="flex items-center gap-4">
        {/* Strict NGN Currency Indicator - No Switcher */}
        <div className="px-3 py-1 rounded-lg bg-bg-card border border-fgBorder-subtle flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400" />
          <span className="text-xs font-semibold text-white tracking-wide">NGN (₦)</span>
        </div>

        {/* Notification Bell */}
        <button
          type="button"
          className="relative p-2 rounded-lg bg-bg-card border border-fgBorder-subtle text-fgText-secondary hover:text-white transition-all"
        >
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
        </button>

        {/* User Avatar */}
        <div className="flex items-center gap-2.5 pl-2 border-l border-fgBorder-subtle">
          <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center text-xs">
            JD
          </div>
          <span className="text-xs font-medium text-white hidden md:inline-block">John Doe</span>
        </div>
      </div>
    </header>
  );
}
