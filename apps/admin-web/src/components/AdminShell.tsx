'use client';

import React, { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { AdminSidebar } from '@/components/AdminSidebar';
import { AdminMobileNav } from '@/components/AdminMobileNav';
import { getAdminToken, fetchAdminApi } from '@/lib/api';

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  const isPublicRoute = pathname === '/login' || pathname === '/recovery';

  useEffect(() => {
    if (isPublicRoute) {
      setChecking(false);
      return;
    }

    const token = getAdminToken();
    if (!token) {
      router.replace(`/login?redirect=${encodeURIComponent(pathname)}`);
      return;
    }

    // Verify dual-lock clearance with backend
    fetchAdminApi('/admin/auth/me')
      .then(() => setChecking(false))
      .catch(() => {
        router.replace(`/login?redirect=${encodeURIComponent(pathname)}`);
      });
  }, [pathname, isPublicRoute, router]);

  if (isPublicRoute) {
    return <>{children}</>;
  }

  if (checking) {
    return (
      <div className="min-h-screen w-full bg-[#070a08] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-slate-400 font-mono">Verifying dual-lock hardware & administrative clearances...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col md:flex-row min-h-screen w-full">
      <AdminSidebar />
      <div className="flex-1 flex flex-col min-w-0 pb-16 md:pb-0">
        <AdminMobileNav />
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
