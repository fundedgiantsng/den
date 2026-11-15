'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Wallet,
  TrendingUp,
  Award,
  Copy,
  Users,
  Bell,
  LifeBuoy,
  User,
  ShieldCheck,
  ChevronRight,
  Sparkles,
} from 'lucide-react';

interface NavItem {
  name: string;
  href: string;
  icon: any;
  badge?: string;
}

const navItems: NavItem[] = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Wallet', href: '/dashboard/wallet', icon: Wallet },
  { name: 'Trading Accounts', href: '/dashboard/trading-accounts', icon: TrendingUp },
  { name: 'IB Program', href: '/dashboard/affiliate', icon: Users },
  { name: 'Certificates', href: '/dashboard/certificates', icon: Award },
];

const secondaryNav: NavItem[] = [
  { name: 'Notifications', href: '/dashboard/notifications', icon: Bell, badge: '3' },
  { name: 'Help & Support', href: '/dashboard/support', icon: LifeBuoy },
  { name: 'Profile', href: '/dashboard/profile', icon: User },
];

export function Sidebar() {
  const pathname = usePathname();
  const [currentUser, setCurrentUser] = useState<{
    firstName?: string;
    lastName?: string;
    kycStatus?: string;
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
  const isVerified = currentUser?.kycStatus === 'APPROVED';

  return (
    <aside className="w-64 h-screen sticky top-0 flex flex-col justify-between bg-[#080f0c] border-r border-white/[0.08] p-4 select-none overflow-y-auto">
      <div className="space-y-4">
        {/* Brand Header: Official FundedGiants White Logo */}
        <Link href="/dashboard" className="flex items-center px-2 py-2">
          <div className="relative h-9 w-44">
            <Image
              src="/brand/logo-white.png"
              alt="FundedGiants"
              fill
              className="object-contain object-left"
              priority
            />
          </div>
        </Link>

        {/* Primary Navigation */}
        <nav className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            // Exact match for dashboard root, prefix match for specific subroutes
            const isActive =
              item.href === '/dashboard'
                ? pathname === '/dashboard'
                : pathname === item.href || (pathname.startsWith(item.href + '/') && item.href !== '/dashboard');

            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all group ${
                  isActive
                    ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-inner'
                    : 'text-fgText-secondary hover:text-white hover:bg-white/[0.03]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={`w-4 h-4 transition-colors ${
                      isActive ? 'text-emerald-400' : 'text-fgText-muted group-hover:text-white'
                    }`}
                  />
                  <span>{item.name}</span>
                </div>
                {item.badge && (
                  <span className="px-1.5 py-0.5 text-[9px] rounded-full bg-emerald-500/20 text-emerald-400 font-mono font-bold">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Buy New Account Action Button */}
        <div className="px-1">
          <Link
            href="/dashboard/challenges/buy"
            className="w-full py-2.5 px-3.5 rounded-xl bg-[#f5a623] hover:bg-[#e0961f] text-black font-heading font-extrabold text-xs shadow-lg shadow-amber-500/20 flex items-center justify-between transition-all group active:scale-95"
          >
            <div className="flex items-center gap-2">
              <Award className="w-4 h-4 text-black" />
              <span>Buy New Account</span>
            </div>
            <ChevronRight className="w-3.5 h-3.5 stroke-[3] group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>

        {/* Secondary Navigation */}
        <div className="pt-2 border-t border-white/[0.06] space-y-1">
          {secondaryNav.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center justify-between px-3.5 py-2 rounded-xl text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-white/[0.06] text-white font-semibold'
                    : 'text-fgText-muted hover:text-white hover:bg-white/[0.03]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className="w-4 h-4" />
                  <span>{item.name}</span>
                </div>
                {item.badge && (
                  <span className="px-1.5 py-0.5 text-[10px] rounded-full bg-rose-500 text-white font-bold">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      </div>

      {/* Bottom Area: Visual Bull Banner & User Profile Chip */}
      <div className="pt-4 space-y-3">
        {/* Visual Bull Box (Snapshot Match) */}
        <div className="rounded-xl p-3 bg-gradient-to-br from-[#0c1a14] to-[#050d0a] border border-emerald-500/20 relative overflow-hidden">
          <div className="relative z-10 flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
              {/* Bull Head Icon */}
              <svg className="w-5 h-5 text-emerald-400" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="3">
                <path d="M 20 25 C 25 15, 35 15, 45 30 C 50 35, 50 40, 50 45 C 50 40, 50 35, 55 30 C 65 15, 75 15, 80 25 C 75 35, 70 45, 60 48 C 65 55, 68 65, 65 75 C 60 85, 40 85, 35 75 C 32 65, 35 55, 40 48 C 30 45, 25 35, 20 25 Z" />
              </svg>
            </div>
            <div>
              <span className="text-[10px] font-heading font-extrabold text-[#00f59b] tracking-wider block">
                TRADE • GROW • EARN.
              </span>
              <p className="text-[9px] text-fgText-muted leading-tight mt-0.5">
                Your Journey to Funded Capital Starts Here.
              </p>
            </div>
          </div>
        </div>

        {/* User Profile Chip (Bottom of Sidebar) */}
        <Link
          href="/dashboard/profile"
          className="p-2 rounded-xl bg-black/40 border border-white/[0.06] hover:border-emerald-500/30 flex items-center justify-between transition-colors group"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 font-bold flex items-center justify-center text-xs">
              {initials}
            </div>
            <div className="text-left">
              <span className="text-xs font-bold text-white block group-hover:text-emerald-400 transition-colors">
                {fullName}
              </span>
              <span
                className={`inline-flex items-center gap-1 text-[10px] font-mono ${
                  isVerified ? 'text-emerald-400' : 'text-amber-400'
                }`}
              >
                <ShieldCheck className="w-2.5 h-2.5" />
                <span>{isVerified ? 'Verified' : 'Unverified'}</span>
              </span>
            </div>
          </div>
          <ChevronRight className="w-3.5 h-3.5 text-fgText-muted group-hover:text-white group-hover:translate-x-0.5 transition" />
        </Link>
      </div>
    </aside>
  );
}
