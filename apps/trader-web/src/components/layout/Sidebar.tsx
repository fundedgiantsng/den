'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Wallet,
  TrendingUp,
  Award,
  CreditCard,
  Copy,
  Users,
  Bell,
  LifeBuoy,
  Settings,
  ShieldCheck,
} from 'lucide-react';

const navItems = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Wallet', href: '/dashboard/wallet', icon: Wallet },
  { name: 'Trading Accounts', href: '/dashboard/trading-accounts', icon: TrendingUp },
  { name: 'Challenges', href: '/dashboard/challenges', icon: Award },
  { name: 'Cards', href: '/dashboard/cards', icon: CreditCard },
  { name: 'CopyTrading', href: '/dashboard/copytrading', icon: Copy },
  { name: 'Affiliate Program', href: '/dashboard/affiliate', icon: Users },
];

const secondaryNav = [
  { name: 'Notifications', href: '/dashboard/notifications', icon: Bell, badge: '3' },
  { name: 'Help & Support', href: '/dashboard/support', icon: LifeBuoy },
  { name: 'Settings', href: '/dashboard/settings', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 h-screen sticky top-0 flex flex-col justify-between bg-bg-surface border-r border-fgBorder-subtle p-4 select-none">
      <div>
        {/* Brand Header: Clean FundedGiants without any subtitle */}
        <Link href="/dashboard" className="flex items-center gap-3 px-3 py-4 mb-4">
          <div className="w-9 h-9 rounded-xl bg-bg-card card-border-glow flex items-center justify-center">
            <span className="text-emerald-400 font-bold text-lg font-heading">FG</span>
          </div>
          <div>
            <span className="text-lg font-heading font-extrabold tracking-tight text-white block leading-tight">
              FundedGiants
            </span>
          </div>
        </Link>

        {/* Primary Navigation */}
        <nav className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                    : 'text-fgText-secondary hover:text-white hover:bg-bg-card'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-400' : 'text-fgText-muted'}`} />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Secondary & User Profile Badge */}
      <div className="space-y-4 pt-4 border-t border-fgBorder-subtle">
        <nav className="space-y-1">
          {secondaryNav.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center justify-between px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-emerald-500/15 text-emerald-400'
                    : 'text-fgText-secondary hover:text-white hover:bg-bg-card'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className="w-4 h-4 text-fgText-muted" />
                  <span>{item.name}</span>
                </div>
                {item.badge && (
                  <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-red-500/20 text-red-400 border border-red-500/30">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* User Profile Mini-Pill */}
        <div className="p-3 rounded-xl bg-bg-card border border-fgBorder-subtle flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center text-xs">
            JD
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-white truncate">John Doe</p>
            <div className="flex items-center gap-1 text-[10px] text-emerald-400">
              <ShieldCheck className="w-3 h-3" />
              <span>Verified Trader</span>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
