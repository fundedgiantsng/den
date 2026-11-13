import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'FundedGiants — Trading Platform & Portal',
  description: 'Naira-denominated proprietary trading firm and trader ecosystem.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-bg-base text-fgText-primary antialiased">
        {children}
      </body>
    </html>
  );
}
