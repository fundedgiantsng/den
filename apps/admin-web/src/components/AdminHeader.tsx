'use client';

import React from 'react';
import { ShieldCheck, LogOut } from 'lucide-react';
import { clearAdminAuth, fetchAdminApi } from '@/lib/api';

interface AdminHeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export function AdminHeader({ title, subtitle, actions }: AdminHeaderProps) {
  const handleLogout = async () => {
    try {
      await fetchAdminApi('/admin/auth/logout', { method: 'POST' });
    } catch {}
    clearAdminAuth();
    window.location.href = '/login';
  };

  return (
    <header className="h-16 px-8 border-b border-[#1b3322] bg-[#070a08]/80 backdrop-blur-md flex items-center justify-between sticky top-0 z-30">
      <div>
        <h1 className="text-base font-bold text-white tracking-tight">{title}</h1>
        {subtitle && <p className="text-xs text-slate-400">{subtitle}</p>}
      </div>

      <div className="flex items-center gap-4">
        {actions}

        {/* Bound Hardware Badge */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs font-medium text-emerald-400">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span className="hidden sm:inline">Bound Hardware:</span>
          <span className="font-mono text-[10px]">AUTHORIZED</span>
        </div>

        {/* Admin Avatar & Role */}
        <div className="flex items-center gap-2.5 pl-3 border-l border-slate-800">
          <div className="w-8 h-8 rounded-full bg-emerald-600/20 border border-emerald-500/40 flex items-center justify-center text-xs font-bold text-emerald-400">
            SA
          </div>
          <div className="hidden md:block text-left">
            <div className="text-xs font-semibold text-white">Super Admin</div>
            <div className="text-[10px] text-slate-400">Level 5 Clearance</div>
          </div>
        </div>

        {/* Sign Out Button */}
        <button
          onClick={handleLogout}
          title="Sign out of Admin Station"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-xs font-semibold text-rose-400 hover:bg-rose-500/20 hover:text-rose-300 transition-colors"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Sign Out</span>
        </button>
      </div>
    </header>
  );
}
