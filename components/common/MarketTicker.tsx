'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { getMarketStatus } from '@/lib/market/marketSchedule';

interface TickerItem {
  ticker: string;
  name: string;
  price: number;
  changePercent: number;
}

const FALLBACK_ITEMS: TickerItem[] = [
  { ticker: 'EURUSD', name: 'EUR/USD', price: 1.0845, changePercent: 0.22 },
  { ticker: 'GBPUSD', name: 'GBP/USD', price: 1.2930, changePercent: -0.15 },
  { ticker: 'USDJPY', name: 'USD/JPY', price: 154.20, changePercent: 0.45 },
  { ticker: 'XAUUSD', name: 'Gold Spot', price: 2745.50, changePercent: 0.68 },
  { ticker: 'NVDA', name: 'NVIDIA', price: 138.25, changePercent: 2.84 },
  { ticker: 'AAPL', name: 'Apple', price: 232.50, changePercent: 0.75 },
  { ticker: 'TSLA', name: 'Tesla', price: 248.60, changePercent: -1.32 },
  { ticker: 'SPY', name: 'S&P 500', price: 586.20, changePercent: 0.41 },
];

export const MarketTicker: React.FC = () => {
  const marketStatus = getMarketStatus('forex');
  const [items, setItems] = useState<TickerItem[]>(FALLBACK_ITEMS);

  useEffect(() => {
    const controller = new AbortController();

    async function loadLivePrices() {
      try {
        const res = await fetch('/api/signals', { cache: 'no-store', signal: controller.signal });
        if (!res.ok) return;
        const json = await res.json();
        
        if (controller.signal.aborted) return;

        if (json.success && Array.isArray(json.data) && json.data.length > 0) {
          const liveItems: TickerItem[] = json.data
            .filter((d: any) => d?.quote?.price && d?.symbol?.ticker)
            .slice(0, 12)
            .map((d: any) => ({
              ticker: d.symbol.ticker,
              name: d.symbol.display_name?.replace(/\(.*?\)/, '').trim() || d.symbol.ticker,
              price: d.quote.price,
              changePercent: d.quote.change_percent || 0,
            }));
          if (liveItems.length >= 3) {
            setItems(liveItems);
          }
        }
      } catch (err: any) {
        // Keep fallback items on error, unless it's an abort
        if (err.name !== 'AbortError') {
          // silently ignore
        }
      }
    }
    loadLivePrices();
    const interval = setInterval(loadLivePrices, 60000); // refresh every 60s
    return () => {
      controller.abort();
      clearInterval(interval);
    };
  }, []);

  return (
    <div className="w-full bg-[#0c101a] border-b border-[#1a2333] py-2 px-4 overflow-x-auto scrollbar-none">
      <div className="flex items-center space-x-6 min-w-max text-xs">
        <div className="flex items-center gap-2 text-slate-400 font-mono text-[10px] uppercase font-bold tracking-wider pl-2 border-r border-slate-800 pr-4">
          <span className={`w-2 h-2 rounded-full ${marketStatus.isOpen ? 'bg-emerald-400 animate-pulse' : 'bg-amber-500'}`}></span>
          <span>{marketStatus.isOpen ? marketStatus.sessionName : '💤 ตลาดปิดทำการ (Weekend Standby)'}</span>
        </div>
        {items.map((item) => {
          const isUp = item.changePercent >= 0;
          return (
            <Link
              key={item.ticker}
              href={`/symbol/${item.ticker}`}
              className="flex items-center gap-2 hover:bg-[#151d2c] px-2 py-0.5 rounded transition-colors group cursor-pointer"
            >
              <span className="font-semibold text-slate-300 group-hover:text-white font-mono">{item.ticker}</span>
              <span className="font-mono text-slate-400">{item.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}</span>
              <span className={`flex items-center gap-0.5 font-mono text-[11px] font-medium px-1 rounded ${isUp ? 'text-emerald-400 bg-emerald-950/40' : 'text-rose-400 bg-rose-950/40'}`}>
                {isUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                {isUp ? '+' : ''}{item.changePercent.toFixed(2)}%
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
};
