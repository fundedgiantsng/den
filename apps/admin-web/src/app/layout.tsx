import React from 'react';
import type { Metadata } from 'next';
import './globals.css';
import { AdminSidebar } from '@/components/AdminSidebar';

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
      <body className="bg-[#070a08] text-slate-100 flex min-h-screen">
        <AdminSidebar />
        <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
          {children}
        </main>
      </body>
    </html>
  );
}
