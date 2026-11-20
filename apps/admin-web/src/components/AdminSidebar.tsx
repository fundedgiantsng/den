'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import clsx from 'clsx';
import {
  LayoutDashboard,
  Users,
  Trophy,
  Activity,
  ShieldAlert,
  Wallet,
  ArrowDownLeft,
  Share2,
  Tag,
  ClipboardList,
  Cpu,
  ExternalLink,
  LifeBuoy,
  Radio,
  ArrowLeftRight,
} from 'lucide-react';

const NAV_ITEMS = [
  { label: 'Overview', href: '/', icon: LayoutDashboard },
  { label: 'Customers', href: '/customers', icon: Users },
  { label: 'Challenges', href: '/challenges', icon: Trophy },
  { label: 'Trading Accounts', href: '/trading-accounts', icon: Activity },
  { label: 'Risk Monitor', href: '/risk', icon: ShieldAlert },
  { label: 'A-Book Router', href: '/abook', icon: ArrowLeftRight },
  { label: 'General Ledger', href: '/finance/ledger', icon: Wallet },
  { label: 'Withdrawals Log', href: '/finance/withdrawals', icon: ArrowDownLeft },
  { label: 'Affiliates', href: '/affiliates', icon: Share2 },
  { label: 'Discount Coupons', href: '/affiliates/coupons', icon: Tag },
  { label: 'Support Desk', href: '/support', icon: LifeBuoy },
  { label: 'Broadcasts', href: '/notifications', icon: Radio },
  { label: 'Audit Trail', href: '/audit-logs', icon: ClipboardList },
  { label: 'Device & API Config', href: '/settings', icon: Cpu },
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex w-64 min-h-screen bg-[#070a08] border-r border-[#1b3322] flex-col justify-between shrink-0">
      <div>
        {/* Brand Header */}
        <div className="h-16 px-6 flex items-center gap-3 border-b border-[#1b3322]">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold">
            FG
          </div>
          <div>
            <div className="text-sm font-bold tracking-tight text-white flex items-center gap-1.5">
              <span>FUNDEDGIANTS</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-400 font-mono">
                ADMIN
              </span>
            </div>
            <div className="text-[10px] text-slate-400">Control Panel • v1.0</div>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="p-3 space-y-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.href === '/'
                ? pathname === '/'
                : item.href === '/affiliates'
                ? pathname === '/affiliates'
                : pathname === item.href || pathname.startsWith(`${item.href}/`);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={clsx(
                  'flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all',
                  isActive
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-[#0f1712] border border-transparent',
                )}
              >
                <Icon className={clsx('w-4 h-4', isActive ? 'text-emerald-400' : 'text-slate-400')} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Footer Info */}
      <div className="p-4 border-t border-[#1b3322] bg-[#090e0b]">
        <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            System Live
          </span>
          <span className="font-mono text-[10px]">GMT+1</span>
        </div>
        <a
          href={process.env.NEXT_PUBLIC_APP_URL || 'https://trader.fundedgiants.ng'}
          target="_blank"
          rel="noreferrer"
          className="flex items-center justify-between px-3 py-2 rounded-lg bg-[#0f1712] border border-[#1b3322] text-xs text-slate-300 hover:text-white hover:border-emerald-500/40 transition-colors"
        >
          <span>Trader Portal</span>
          <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
        </a>
      </div>
    </aside>
  );
}
