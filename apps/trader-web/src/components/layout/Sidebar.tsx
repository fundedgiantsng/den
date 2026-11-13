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
  CreditCard,
  Copy,
  Users,
  Bell,
  LifeBuoy,
  Settings,
  ShieldCheck,
  ChevronDown,
} from 'lucide-react';

interface NavItem {
  name: string;
  href: string;
  icon: any;
  subItems?: { name: string; href: string; icon?: any }[];
}

const navItems: NavItem[] = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  {
    name: 'Wallet & Cards',
    href: '/dashboard/wallet',
    icon: Wallet,
    subItems: [
      { name: 'Wallet Overview', href: '/dashboard/wallet' },
      { name: 'Fund Wallet', href: '/dashboard/wallet/fund' },
      { name: 'Withdraw Funds', href: '/dashboard/wallet/withdraw' },
      { name: 'Physical Cards', href: '/dashboard/wallet/cards', icon: CreditCard },
    ],
  },
  { name: 'Trading Accounts', href: '/dashboard/trading-accounts', icon: TrendingUp },
  { name: 'Buy Challenge', href: '/dashboard/challenges/buy', icon: Award },
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
            const isParentActive =
              pathname === item.href ||
              (item.subItems && item.subItems.some((s) => pathname.startsWith(s.href)));

            return (
              <div key={item.name} className="space-y-1">
                <Link
                  href={item.href}
                  className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all group ${
                    isParentActive
                      ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                      : 'text-fgText-secondary hover:text-white hover:bg-bg-card'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon
                      className={`w-4 h-4 transition-colors ${
                        isParentActive
                          ? 'text-emerald-400'
                          : 'text-fgText-muted group-hover:text-white'
                      }`}
                    />
                    <span>{item.name}</span>
                  </div>
                  {item.subItems && (
                    <ChevronDown
                      className={`w-3.5 h-3.5 text-fgText-muted transition-transform ${
                        isParentActive ? 'rotate-180 text-emerald-400' : ''
                      }`}
                    />
                  )}
                </Link>

                {/* Submenu for Wallet & Cards */}
                {item.subItems && isParentActive && (
                  <div className="pl-9 pr-2 py-1 space-y-1">
                    {item.subItems.map((sub) => {
                      const isSubActive = pathname === sub.href;
                      const SubIcon = sub.icon;
                      return (
                        <Link
                          key={sub.name}
                          href={sub.href}
                          className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all ${
                            isSubActive
                              ? 'text-emerald-400 bg-emerald-500/15 font-semibold'
                              : 'text-fgText-muted hover:text-white hover:bg-bg-card/50'
                          }`}
                        >
                          {SubIcon && <SubIcon className="w-3 h-3" />}
                          <span>{sub.name}</span>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>
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
