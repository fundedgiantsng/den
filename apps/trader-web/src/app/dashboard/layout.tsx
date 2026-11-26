'use client';

import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '@/lib/api';
import { Sidebar } from '@/components/layout/Sidebar';
import { TopNav } from '@/components/layout/TopNav';
import {
  LayoutDashboard,
  Wallet,
  TrendingUp,
  Award,
  Users,
  CreditCard,
  LifeBuoy,
  Menu,
  X,
  MoreHorizontal,
  Monitor,
  GraduationCap,
  Bell,
  UserCheck,
  LogOut,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [isMoreDrawerOpen, setIsMoreDrawerOpen] = useState(false);

  // Automatically bind any pre-login guest chat history on this device to the authenticated user account
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const deviceId = localStorage.getItem('fg_chat_device_id');
      if (deviceId) {
        fetch(`${API_BASE_URL}/support/bind-device`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ deviceId }),
        }).catch(() => {});
      }
    } catch {}
  }, []);

  // All deployed platform features for the Slide-Up "More" Mobile Drawer (Pure Cards, No Descriptions)
  const allFeatureCards = [
    { name: 'Giants Vault', href: '/dashboard/wallet', icon: Wallet, color: 'text-emerald-400', bg: 'bg-emerald-500/15' },
    { name: 'Trading Accounts', href: '/dashboard/trading-accounts', icon: TrendingUp, color: 'text-blue-400', bg: 'bg-blue-500/15' },
    { name: 'SteraTrader Web', href: '/dashboard/trading-platform', icon: Monitor, color: 'text-teal-400', bg: 'bg-teal-500/15' },
    { name: 'Buy Challenge', href: '/dashboard/challenges/buy', icon: Award, color: 'text-amber-400', bg: 'bg-amber-500/15', highlight: true },
    { name: 'Affiliate Portal', href: '/dashboard/affiliate', icon: Users, color: 'text-purple-400', bg: 'bg-purple-500/15' },
    { name: 'Certificates', href: '/dashboard/certificates', icon: GraduationCap, color: 'text-yellow-400', bg: 'bg-yellow-500/15' },
    { name: 'Vault Cards', href: '/dashboard/wallet/cards', icon: CreditCard, color: 'text-cyan-400', bg: 'bg-cyan-500/15' },
    { name: 'Support Desk', href: '/dashboard/support', icon: LifeBuoy, color: 'text-emerald-400', bg: 'bg-emerald-500/15' },
    { name: 'Notifications', href: '/dashboard/settings/notifications', icon: Bell, color: 'text-rose-400', bg: 'bg-rose-500/15' },
    { name: 'Profile & KYC', href: '/dashboard/profile', icon: UserCheck, color: 'text-indigo-400', bg: 'bg-indigo-500/15' },
  ];

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[#050906] text-white">
      {/* Desktop Persistent Sidebar (Hidden on mobile) */}
      <div className="hidden md:block">
        <Sidebar />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 pb-20 md:pb-0">
        <TopNav onMobileMenuToggle={() => setIsMoreDrawerOpen(true)} />
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">{children}</main>
      </div>

      {/* Slide-Up Bottom Drawer ("More" Menu for Mobile) */}
      {isMoreDrawerOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex flex-col justify-end">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-md transition-opacity animate-in fade-in"
            onClick={() => setIsMoreDrawerOpen(false)}
          />

          {/* Drawer Body */}
          <div className="relative z-10 w-full max-h-[85vh] bg-[#070e0a] border-t border-emerald-500/25 rounded-t-3xl p-5 shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-300">
            {/* Pull handle & Header */}
            <div className="flex items-center justify-between pb-4 border-b border-white/[0.08]">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-sm">
                  FG
                </div>
                <h3 className="text-base font-heading font-extrabold text-white">FundedGiants Features</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsMoreDrawerOpen(false)}
                className="p-1.5 rounded-lg bg-white/5 border border-white/10 text-neutral-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Feature Cards Grid (Pure mobile tiles, no descriptions) */}
            <div className="grid grid-cols-2 gap-3 py-4 overflow-y-auto max-h-[60vh]">
              {allFeatureCards.map((feat) => {
                const Icon = feat.icon;
                const isActive = pathname === feat.href || pathname.startsWith(feat.href + '/');
                return (
                  <Link
                    key={feat.name}
                    href={feat.href}
                    onClick={() => setIsMoreDrawerOpen(false)}
                    className={`flex flex-col items-center justify-center p-4 rounded-2xl border transition-all active:scale-95 text-center gap-2.5 ${
                      isActive
                        ? 'bg-emerald-500/15 border-emerald-500 ring-1 ring-emerald-500/50'
                        : feat.highlight
                        ? 'bg-amber-500/10 border-amber-500/30 hover:border-amber-500'
                        : 'bg-white/[0.02] border-white/[0.08] hover:border-emerald-500/40 hover:bg-white/[0.04]'
                    }`}
                  >
                    <div className={`w-11 h-11 rounded-xl ${feat.bg} ${feat.color} flex items-center justify-center shadow-inner`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-bold text-white tracking-tight">{feat.name}</span>
                  </Link>
                );
              })}
            </div>

            {/* Quick Actions Footer */}
            <div className="pt-3 border-t border-white/[0.08] flex items-center justify-between text-xs text-neutral-400">
              <span className="text-[11px] font-mono">FundedGiants Mobile</span>
              <Link
                href="/login"
                onClick={() => setIsMoreDrawerOpen(false)}
                className="inline-flex items-center gap-1.5 text-red-400 hover:text-red-300 font-semibold"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Native Bottom Navigation Bar */}
      {/* Layout: Wallet, Accounts, HOME (Central Prominent Icon), Affiliate, Support, More */}
      <nav className="fixed bottom-0 inset-x-0 z-40 bg-[#070e0a]/95 backdrop-blur-xl border-t border-emerald-500/20 md:hidden flex items-center justify-around py-1.5 px-2">
        {/* 1. Wallet */}
        <Link
          href="/dashboard/wallet"
          className={`flex-1 flex flex-col items-center gap-0.5 py-1 rounded-lg text-[10px] font-semibold transition-all ${
            pathname.startsWith('/dashboard/wallet') ? 'text-emerald-400' : 'text-neutral-400 hover:text-white'
          }`}
        >
          <Wallet className="w-4 h-4" />
          <span>Wallet</span>
        </Link>

        {/* 2. Accounts */}
        <Link
          href="/dashboard/trading-accounts"
          className={`flex-1 flex flex-col items-center gap-0.5 py-1 rounded-lg text-[10px] font-semibold transition-all ${
            pathname.startsWith('/dashboard/trading-accounts') ? 'text-emerald-400' : 'text-neutral-400 hover:text-white'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          <span>Accounts</span>
        </Link>

        {/* 3. HOME (Central Icon) */}
        <Link
          href="/dashboard"
          className="flex flex-col items-center justify-center -mt-5 mx-1 focus:outline-none"
        >
          <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-emerald-600 to-emerald-400 text-black flex items-center justify-center shadow-lg shadow-emerald-500/40 border-2 border-[#070e0a] active:scale-95 transition-transform">
            <LayoutDashboard className="w-6 h-6 stroke-[2.5]" />
          </div>
          <span className="text-[10px] font-bold text-white mt-0.5">Home</span>
        </Link>

        {/* 4. Affiliate */}
        <Link
          href="/dashboard/affiliate"
          className={`flex-1 flex flex-col items-center gap-0.5 py-1 rounded-lg text-[10px] font-semibold transition-all ${
            pathname.startsWith('/dashboard/affiliate') ? 'text-emerald-400' : 'text-neutral-400 hover:text-white'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Affiliate</span>
        </Link>

        {/* 5. Support */}
        <Link
          href="/dashboard/support"
          className={`flex-1 flex flex-col items-center gap-0.5 py-1 rounded-lg text-[10px] font-semibold transition-all ${
            pathname.startsWith('/dashboard/support') ? 'text-emerald-400' : 'text-neutral-400 hover:text-white'
          }`}
        >
          <LifeBuoy className="w-4 h-4" />
          <span>Support</span>
        </Link>

        {/* 6. More (Opens Bottom Drawer) */}
        <button
          type="button"
          onClick={() => setIsMoreDrawerOpen(true)}
          className={`flex-1 flex flex-col items-center gap-0.5 py-1 rounded-lg text-[10px] font-semibold transition-all ${
            isMoreDrawerOpen ? 'text-emerald-400' : 'text-neutral-400 hover:text-white'
          }`}
        >
          <MoreHorizontal className="w-4 h-4" />
          <span>More</span>
        </button>
      </nav>
    </div>
  );
}
