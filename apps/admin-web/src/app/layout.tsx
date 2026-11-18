import React from 'react';
import type { Metadata } from 'next';
import './globals.css';
import { AdminShell } from '@/components/AdminShell';

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
      <body className="bg-[#070a08] text-slate-100 min-h-screen">
        <AdminShell>{children}</AdminShell>
      </body>
    </html>
  );
}
