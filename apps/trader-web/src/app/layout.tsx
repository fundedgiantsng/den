import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'FundedGiants — Trading Platform & Portal',
  description: 'Naira-denominated proprietary trading firm and trader ecosystem.',
  manifest: '/manifest.json',
  themeColor: '#050906',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'FundedGiants',
  },
  icons: {
    icon: '/icon.png',
    shortcut: '/icon.png',
    apple: '/icon.png',
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
        <link rel="manifest" href="/manifest.json" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="FundedGiants" />
        <link rel="apple-touch-icon" href="/icon.png" />
      </head>
      <body className="min-h-screen bg-bg-base text-fgText-primary font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
