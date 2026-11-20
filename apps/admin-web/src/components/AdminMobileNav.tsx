'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
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
  LifeBuoy,
  Radio,
  X,
  MoreHorizontal,
  ChevronRight,
  ShieldCheck,
  RefreshCw,
  ArrowLeftRight,
} from 'lucide-react';
import clsx from 'clsx';

export function AdminMobileNav() {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const bottomTabs = [
    { label: 'Overview', href: '/', icon: LayoutDashboard },
    { label: 'Risk', href: '/risk', icon: ShieldAlert },
    { label: 'Payouts', href: '/finance/withdrawals', icon: ArrowDownLeft },
    { label: 'Support', href: '/support', icon: LifeBuoy },
  ];

  const drawerCards = [
    { label: 'Dashboard Overview', href: '/', icon: LayoutDashboard, color: 'text-emerald-400', bg: 'bg-emerald-500/15' },
    { label: 'Customer Directory', href: '/customers', icon: Users, color: 'text-blue-400', bg: 'bg-blue-500/15' },
    { label: 'Challenge Plans', href: '/challenges', icon: Trophy, color: 'text-amber-400', bg: 'bg-amber-500/15' },
    { label: 'Trading Accounts', href: '/trading-accounts', icon: Activity, color: 'text-cyan-400', bg: 'bg-cyan-500/15' },
    { label: 'Risk & Breach Engine', href: '/risk', icon: ShieldAlert, color: 'text-red-400', bg: 'bg-red-500/15' },
    { label: 'A-Book Trade Router', href: '/abook', icon: ArrowLeftRight, color: 'text-indigo-400', bg: 'bg-indigo-500/15' },
    { label: 'Financial Ledger', href: '/finance/ledger', icon: Wallet, color: 'text-emerald-400', bg: 'bg-emerald-500/15' },
    { label: 'Withdrawal Approvals', href: '/finance/withdrawals', icon: ArrowDownLeft, color: 'text-rose-400', bg: 'bg-rose-500/15' },
    { label: 'Affiliates Network', href: '/affiliates', icon: Share2, color: 'text-purple-400', bg: 'bg-purple-500/15' },
    { label: 'Discount Coupons', href: '/affiliates/coupons', icon: Tag, color: 'text-yellow-400', bg: 'bg-yellow-500/15' },
    { label: 'Live Support Desk', href: '/support', icon: LifeBuoy, color: 'text-teal-400', bg: 'bg-teal-500/15' },
    { label: 'Broadcast Dispatches', href: '/notifications', icon: Radio, color: 'text-violet-400', bg: 'bg-violet-500/15' },
    { label: 'System Audit Logs', href: '/audit-logs', icon: ClipboardList, color: 'text-slate-400', bg: 'bg-slate-500/15' },
    { label: 'API & Gateway Config', href: '/settings', icon: Cpu, color: 'text-orange-400', bg: 'bg-orange-500/15' },
  ];

  return (
    <>
      {/* Mobile Top Header */}
      <header className="md:hidden sticky top-0 z-30 flex items-center justify-between px-4 py-3 bg-[#070a08]/95 backdrop-blur-md border-b border-[#1b3322]">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold text-xs">
            FG
          </div>
          <div>
            <div className="text-xs font-bold text-white flex items-center gap-1.5">
              <span>FUNDEDGIANTS</span>
              <span className="text-[9px] px-1 py-0.2 rounded bg-emerald-500/20 text-emerald-400 font-mono">
                ADMIN
              </span>
            </div>
            <div className="text-[9px] text-slate-400">Mobile Management App</div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>Online</span>
          </span>
        </div>
      </header>

      {/* Slide-Up Bottom Drawer ("More" Sheet) */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex flex-col justify-end">
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm"
            onClick={() => setDrawerOpen(false)}
          />
          <div className="relative z-10 w-full max-h-[85vh] bg-[#0c1610] border-t border-[#1b3322] rounded-t-3xl p-5 shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-300">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-[#1b3322]">
              <div>
                <h3 className="text-sm font-bold text-white tracking-tight">Admin Operations Suite</h3>
                <p className="text-[10px] text-slate-400">Select management module</p>
              </div>
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                className="p-1.5 rounded-lg bg-white/5 border border-white/10 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Grid of Modular Feature Cards */}
            <div className="grid grid-cols-2 gap-2.5 py-4 overflow-y-auto max-h-[60vh]">
              {drawerCards.map((card) => {
                const Icon = card.icon;
                const isActive = pathname === card.href || pathname.startsWith(card.href + '/');
                return (
                  <Link
                    key={card.label}
                    href={card.href}
                    onClick={() => setDrawerOpen(false)}
                    className={clsx(
                      'flex flex-col items-center justify-center p-3.5 rounded-xl border transition-all active:scale-95 text-center gap-2',
                      isActive
                        ? 'bg-emerald-500/15 border-emerald-500/50 shadow-sm'
                        : 'bg-[#070e0a] border-[#1b3322] hover:border-emerald-500/30'
                    )}
                  >
                    <div className={clsx('w-9 h-9 rounded-lg flex items-center justify-center shadow-inner', card.bg, card.color)}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <span className="text-[11px] font-bold text-white leading-tight">
                      {card.label}
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Mobile Bottom Navigation Bar */}
      <nav className="fixed bottom-0 inset-x-0 z-40 bg-[#070a08]/95 backdrop-blur-xl border-t border-[#1b3322] md:hidden flex items-center justify-around py-1.5 px-2">
        {bottomTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = tab.href === '/' ? pathname === '/' : pathname.startsWith(tab.href);
          return (
            <Link
              key={tab.label}
              href={tab.href}
              className={clsx(
                'flex-1 flex flex-col items-center gap-0.5 py-1 rounded-lg text-[10px] font-semibold transition-all',
                isActive ? 'text-emerald-400 font-bold' : 'text-slate-400 hover:text-white'
              )}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </Link>
          );
        })}

        {/* More Button */}
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          className={clsx(
            'flex-1 flex flex-col items-center gap-0.5 py-1 rounded-lg text-[10px] font-semibold transition-all',
            drawerOpen ? 'text-emerald-400 font-bold' : 'text-slate-400 hover:text-white'
          )}
        >
          <MoreHorizontal className="w-4 h-4" />
          <span>More</span>
        </button>
      </nav>
    </>
  );
}
