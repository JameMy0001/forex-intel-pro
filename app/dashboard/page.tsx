'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { WatchlistTable, WatchlistRowData } from '@/components/dashboard/WatchlistTable';
import { TopConvictionCard } from '@/components/dashboard/TopConvictionCard';
import { LiveNewsFeed } from '@/components/dashboard/LiveNewsFeed';
import { NewsArticle } from '@/lib/types';
import {
  Activity,
  Zap,
  TrendingUp,
  RefreshCw,
  Clock,
  Radio,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';

export default function DashboardPage() {
  const [data, setData] = useState<WatchlistRowData[]>([]);
  const [newsFeed, setNewsFeed] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [focusSymbol, setFocusSymbol] = useState<string>('ALL');
  const [lastUpdated, setLastUpdated] = useState<string>('');
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [broadcastingTicker, setBroadcastingTicker] = useState<string | null>(null);

  const fetchSignals = useCallback(async (isManual = false) => {
    if (isManual) setIsRefreshing(true);
    try {
      const [res, settingsRes] = await Promise.all([
        fetch('/api/signals'),
        fetch('/api/settings'),
      ]);
      const json = await res.json();
      const settingsJson = await settingsRes.json();

      if (json.success && Array.isArray(json.data)) {
        setData(json.data);
        if (json.newsFeed) setNewsFeed(json.newsFeed);
        setLastUpdated(new Date().toLocaleTimeString());
      }
      if (settingsJson.success && settingsJson.settings) {
        setFocusSymbol(settingsJson.settings.focus_symbol || 'ALL');
      }
    } catch (err) {
      console.error('Failed to load signals:', err);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchSignals();

    // Auto refresh interval every 30 seconds
    const interval = setInterval(() => {
      fetchSignals();
    }, 30000);

    return () => clearInterval(interval);
  }, [fetchSignals]);

  const handleBroadcastAlert = async (row: WatchlistRowData) => {
    setBroadcastingTicker(row.symbol.ticker);
    try {
      const res = await fetch('/api/alerts/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ signal: row.signal }),
      });
      const json = await res.json();

      if (json.success) {
        setToastMessage({ text: `Alert for ${row.symbol.ticker} sent to Telegram!`, type: 'success' });
      } else {
        setToastMessage({ text: json.error || 'Failed to send Telegram alert', type: 'error' });
      }
    } catch (err) {
      setToastMessage({ text: (err as Error).message, type: 'error' });
    } finally {
      setBroadcastingTicker(null);
      setTimeout(() => setToastMessage(null), 4000);
    }
  };

  const highConvictionList = data
    .filter((d) => d.signal.probability_score >= 0.65 || d.signal.probability_score <= 0.35)
    .slice(0, 3);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-lg shadow-2xl border text-xs font-mono transition-all ${
            toastMessage.type === 'success'
              ? 'bg-emerald-950/95 text-emerald-300 border-emerald-700/80'
              : 'bg-rose-950/95 text-rose-300 border-rose-700/80'
          }`}
        >
          {toastMessage.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-400" />
          )}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Dashboard Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#0d1320] p-4 rounded-lg border border-[#1e293b]">
        <div>
          <h1 className="text-xl font-black text-white font-mono tracking-tight flex items-center gap-2">
            <span>REAL-TIME TRADING TERMINAL</span>
            <span className="flex items-center gap-1 text-[11px] font-normal text-emerald-400 bg-emerald-950/80 border border-emerald-800 px-2 py-0.5 rounded-full">
              <Radio className="w-3 h-3 animate-pulse" /> Live Streaming
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Statistical Probability Engine • Macro News Sentiment Correlation • Multi-Factor Signals
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs text-slate-400 font-mono">
            <Clock className="w-3.5 h-3.5 text-slate-500" />
            <span>Updated: {lastUpdated || 'Loading...'}</span>
          </div>

          <button
            onClick={() => fetchSignals(true)}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-blue-600 hover:bg-blue-500 text-xs font-semibold text-white transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>Sync Live</span>
          </button>
        </div>
      </div>

      {/* Focus Mode Banner (If locked to USDJPY, etc.) */}
      {focusSymbol !== 'ALL' && (
        <div className="bg-blue-950/60 border border-blue-600/60 rounded-lg p-3.5 flex items-center justify-between gap-3 text-xs font-mono">
          <div className="flex items-center gap-2 text-blue-300">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-400 animate-ping" />
            <span className="font-bold text-white uppercase">
              🎯 FOCUS LOCK ACTIVE: {focusSymbol} ONLY
            </span>
            <span className="hidden sm:inline text-slate-400">
              — The engine is calculating and sending alerts exclusively for {focusSymbol}.
            </span>
          </div>
          <a
            href="/settings"
            className="px-2.5 py-1 rounded bg-blue-600 hover:bg-blue-500 text-white font-semibold transition-colors shrink-0"
          >
            Change / Unlock
          </a>
        </div>
      )}

      {/* Section 1: High-Conviction Setups (Top Signals) */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-400" />
            <h2 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
              HIGH CONVICTION TRADE SETUPS
            </h2>
          </div>
          <span className="text-xs text-slate-400 font-mono">Filtered: Win Probability &gt; 65% / &lt; 35%</span>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="terminal-card p-6 h-64 animate-pulse-subtle bg-slate-900/40"></div>
            ))}
          </div>
        ) : highConvictionList.length === 0 ? (
          <div className="terminal-card p-6 text-center text-xs text-slate-400 font-mono">
            Scanning markets for extreme conviction setups... Market currently in balanced consolidation.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {highConvictionList.map((row) => (
              <TopConvictionCard
                key={row.symbol.ticker}
                data={row}
                onBroadcast={() => handleBroadcastAlert(row)}
                isBroadcasting={broadcastingTicker === row.symbol.ticker}
              />
            ))}
          </div>
        )}
      </div>

      {/* Section 2: Main Grid (Watchlist Table + Live News Stream) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Watchlist Table (2 cols on large screen) */}
        <div className="lg:col-span-2">
          {loading ? (
            <div className="terminal-card p-8 h-96 animate-pulse-subtle bg-slate-900/40"></div>
          ) : (
            <WatchlistTable
              data={data}
              onBroadcastAlert={handleBroadcastAlert}
              broadcastingTicker={broadcastingTicker}
            />
          )}
        </div>

        {/* Live News Stream (1 col) */}
        <div className="lg:col-span-1">
          {loading ? (
            <div className="terminal-card p-8 h-96 animate-pulse-subtle bg-slate-900/40"></div>
          ) : (
            <LiveNewsFeed articles={newsFeed} />
          )}
        </div>
      </div>
    </div>
  );
}
