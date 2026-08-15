import type { Metadata } from 'next';
import './globals.css';
import { Navbar } from '@/components/common/Navbar';
import { MarketTicker } from '@/components/common/MarketTicker';

export const metadata: Metadata = {
  title: 'Nexus Intel Pro | Real-Time Forex & Stock Intelligence Engine',
  description: 'Institutional-grade real-time market intelligence, news sentiment analysis, and probabilistic trade signal engine for Forex & Stocks.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Prompt:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen bg-[#080b11] text-slate-100 antialiased selection:bg-blue-600 selection:text-white flex flex-col font-sans">
        <Navbar />
        <MarketTicker />
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {children}
        </main>
        <footer className="bg-[#0a0e17] border-t border-[#1e293b] py-4 text-center text-xs text-slate-500 font-mono">
          <p>Nexus Intel Pro • Real-Time Quantitative News & Probability Engine • Powered by Finnhub, Marketaux & Gemini AI</p>
        </footer>
      </body>
    </html>
  );
}
