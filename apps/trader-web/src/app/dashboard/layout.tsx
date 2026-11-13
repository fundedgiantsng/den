'use client';

import React, { useState } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { TopNav } from '@/components/layout/TopNav';
import {
  LayoutDashboard,
  Wallet,
  TrendingUp,
  Award,
  Users,
  CreditCard,
  Menu,
  X,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const mobileNavItems = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Vault', href: '/dashboard/wallet', icon: Wallet },
    { name: 'Accounts', href: '/dashboard/trading-accounts', icon: TrendingUp },
    { name: 'Cards', href: '/dashboard/wallet/cards', icon: CreditCard },
  ];

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-bg-base text-white">
      {/* Desktop Persistent Sidebar (Hidden on mobile) */}
      <div className="hidden md:block">
        <Sidebar />
      </div>

      {/* Mobile Drawer Overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="relative z-10 w-4/5 max-w-xs bg-bg-surface border-r border-fgBorder-subtle h-full p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between pb-4 border-b border-fgBorder-subtle">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                Navigation Menu
              </span>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="p-1.5 rounded-lg bg-bg-card border border-fgBorder-subtle text-fgText-secondary hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto py-4" onClick={() => setMobileMenuOpen(false)}>
              <Sidebar />
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 pb-16 md:pb-0">
        <TopNav onMobileMenuToggle={() => setMobileMenuOpen(true)} />
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">{children}</main>
      </div>

      {/* Mobile Bottom Navigation Bar (Native App Style) */}
      <nav className="fixed bottom-0 inset-x-0 z-40 bg-bg-surface/90 backdrop-blur-md border-t border-fgBorder-subtle md:hidden flex items-center justify-around py-2 px-1">
        {mobileNavItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            item.href === '/dashboard'
              ? pathname === '/dashboard'
              : pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex flex-col items-center gap-1 py-1 px-3 rounded-lg text-[10px] font-semibold transition-all ${
                isActive ? 'text-emerald-400' : 'text-fgText-muted hover:text-white'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{item.name}</span>
            </Link>
          );
        })}
        {/* Mobile Buy Challenge Action Button */}
        <Link
          href="/dashboard/challenges/buy"
          className="flex flex-col items-center gap-1 py-1 px-3 rounded-lg text-[10px] font-bold text-amber-400"
        >
          <Award className="w-4 h-4 text-amber-400" />
          <span>Buy Plan</span>
        </Link>
      </nav>
    </div>
  );
}
