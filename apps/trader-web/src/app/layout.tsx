import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'FundedGiants — Trading Platform & Portal',
  description: 'Naira-denominated proprietary trading firm and trader ecosystem.',
  icons: {
    icon: '/brand/icon.png',
    shortcut: '/brand/icon.png',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen bg-bg-base text-fgText-primary font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
