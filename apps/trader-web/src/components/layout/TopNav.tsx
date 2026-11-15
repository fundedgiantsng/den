'use client';

import React, { useState, useEffect } from 'react';
import { Search, Bell, Menu } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

interface TopNavProps {
  onMobileMenuToggle?: () => void;
}

export function TopNav({ onMobileMenuToggle }: TopNavProps) {
  const [currentUser, setCurrentUser] = useState<{
    firstName?: string;
    lastName?: string;
  } | null>(null);

  useEffect(() => {
    fetch('http://localhost:4000/api/v1/auth/me', {
      credentials: 'include',
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.user) setCurrentUser(data.user);
      })
      .catch(() => {});
  }, []);

  const fullName = currentUser ? `${currentUser.firstName || 'Valued'} ${currentUser.lastName || 'Trader'}` : 'John Doe';
  const initials = currentUser
    ? `${(currentUser.firstName?.[0] || 'V').toUpperCase()}${(currentUser.lastName?.[0] || 'T').toUpperCase()}`
    : 'JD';
  return (
    <header className="h-16 px-4 sm:px-6 lg:px-8 border-b border-fgBorder-subtle bg-bg-surface/50 backdrop-blur-md sticky top-0 z-30 flex items-center justify-between gap-3">
      {/* Mobile Brand & Hamburger Button */}
      <div className="flex items-center gap-3 md:hidden">
        <button
          type="button"
          onClick={onMobileMenuToggle}
          className="p-2 rounded-xl bg-bg-card border border-fgBorder-subtle text-fgText-secondary hover:text-white"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div className="relative h-7 w-32">
          <Image
            src="/brand/logo-white.png"
            alt="FundedGiants"
            fill
            className="object-contain object-left"
            priority
          />
        </div>
      </div>

      {/* Desktop Search Input (Ctrl+K) */}
      <div className="relative w-80 hidden md:block">
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
      <div className="flex items-center gap-2 sm:gap-4">
        {/* Strict NGN Currency Indicator */}
        <div className="px-2.5 sm:px-3 py-1 rounded-lg bg-bg-card border border-fgBorder-subtle flex items-center gap-1.5 sm:gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400" />
          <span className="text-[11px] sm:text-xs font-semibold text-white tracking-wide">NGN (₦)</span>
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
        <Link
          href="/dashboard/profile"
          className="flex items-center gap-2 sm:gap-2.5 pl-1 sm:pl-2 border-l border-fgBorder-subtle hover:opacity-80 transition group"
        >
          <div className="w-7 h-7 sm:w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center text-xs border border-emerald-500/30 group-hover:border-emerald-400 transition-colors">
            {initials}
          </div>
          <span className="text-xs font-medium text-white hidden lg:inline-block group-hover:text-emerald-400 transition-colors">
            {fullName}
          </span>
        </Link>
      </div>
    </header>
  );
}
