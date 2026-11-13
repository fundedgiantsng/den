'use client';

import React from 'react';
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
  Settings,
  ShieldCheck,
  ChevronRight,
} from 'lucide-react';

interface NavItem {
  name: string;
  href: string;
  icon: any;
}

const navItems: NavItem[] = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Wallet', href: '/dashboard/wallet', icon: Wallet },
  { name: 'Trading Accounts', href: '/dashboard/trading-accounts', icon: TrendingUp },
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
        {/* Brand Header: Official FundedGiants White Logo */}
        <Link href="/dashboard" className="flex items-center px-3 py-3 mb-4">
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
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');

            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all group ${
                  isActive
                    ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                    : 'text-fgText-secondary hover:text-white hover:bg-bg-card'
                }`}
              >
                <Icon
                  className={`w-4 h-4 transition-colors ${
                    isActive ? 'text-emerald-400' : 'text-fgText-muted group-hover:text-white'
                  }`}
                />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* Buy Challenge Action Button right below Affiliate tab */}
        <div className="mt-4 px-1">
          <Link
            href="/dashboard/challenges/buy"
            className="w-full py-2.5 px-3.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-bg-base font-heading font-extrabold text-xs shadow-lg flex items-center justify-between transition-all group"
          >
            <div className="flex items-center gap-2">
              <Award className="w-4 h-4 text-bg-base" />
              <span>Buy Challenge</span>
            </div>
            <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>
      </div>

      {/* Secondary Bottom Links */}
      <div className="pt-4 border-t border-fgBorder-subtle space-y-1">
        {secondaryNav.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center justify-between px-3.5 py-2 rounded-xl text-xs font-medium transition-all ${
                isActive
                  ? 'bg-bg-card text-white'
                  : 'text-fgText-muted hover:text-white hover:bg-bg-card/50'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className="w-4 h-4" />
                <span>{item.name}</span>
              </div>
              {item.badge && (
                <span className="px-1.5 py-0.5 text-[10px] rounded-full bg-emerald-500/20 text-emerald-400 font-semibold">
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}

        {/* Security Badge */}
        <div className="mt-4 p-3 rounded-xl bg-bg-card border border-fgBorder-subtle flex items-center gap-2.5">
          <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <div className="text-[11px] leading-tight">
            <span className="text-white font-medium block">ASVS Level 2</span>
            <span className="text-fgText-muted text-[10px]">Strict Device & IP Isolation</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
