import React from 'react';
import type { Metadata } from 'next';
import './globals.css';
import { AdminSidebar } from '@/components/AdminSidebar';
import { AdminMobileNav } from '@/components/AdminMobileNav';

export const metadata: Metadata = {
  title: 'FundedGiants Control Panel | Production Administration',
  description: 'Enterprise Administrative and Risk Control Operations for FundedGiants',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-[#070a08] text-slate-100 flex flex-col md:flex-row min-h-screen">
        <AdminSidebar />
        <div className="flex-1 flex flex-col min-w-0 pb-16 md:pb-0">
          <AdminMobileNav />
          <main className="flex-1 overflow-y-auto">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
