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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#0a0f1c] p-4 rounded-xl border border-white/[0.07] shadow-lg">
        <div>
          <h1 className="text-lg font-black text-white font-sans tracking-tight flex items-center gap-2">
            <span>แดชบอร์ดวิเคราะห์การเทรดแบบเรียลไทม์ (REAL-TIME TERMINAL)</span>
            <span className="flex items-center gap-1 text-[10px] font-medium text-emerald-400 bg-emerald-950/80 border border-emerald-800/80 px-2 py-0.5 rounded-full">
              <Radio className="w-2.5 h-2.5 animate-pulse" /> กำลังสตรีมข้อมูลสด
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5 thai-text">
            คำนวณความน่าจะเป็นเชิงสถิติ • วิเคราะห์ Sentiment ข่าวการเงินโลก • สัญญาณเทรดแบบ Multi-Factor
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs text-slate-400 font-mono">
            <Clock className="w-3.5 h-3.5 text-slate-500" />
            <span>อัปเดตล่าสุด: {lastUpdated || 'กำลังโหลด...'}</span>
          </div>

          <button
            onClick={() => fetchSignals(true)}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-xs font-semibold text-white transition-all shadow-md shadow-blue-600/20 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>ดึงข้อมูลสด</span>
          </button>
        </div>
      </div>

      {/* Focus Mode Banner (If locked to USDJPY, etc.) */}
      {focusSymbol !== 'ALL' && (
        <div className="bg-blue-950/40 border border-blue-500/40 rounded-xl p-3.5 flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5 text-blue-200">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-400 animate-ping" />
            <span className="font-bold font-sans text-white uppercase text-xs">
              🎯 กำลังล็อคโฟกัสเฉพาะ: {focusSymbol}
            </span>
            <span className="hidden sm:inline text-slate-400 thai-text">
              — ระบบกำลังคำนวณและส่งแจ้งเตือน Telegram เฉพาะคู่เงิน {focusSymbol} เท่านั้น
            </span>
          </div>
          <a
            href="/settings"
            className="px-3 py-1 rounded-md bg-blue-600 hover:bg-blue-500 text-white font-semibold transition-colors shrink-0 text-xs"
          >
            เปลี่ยน / ปลดล็อค
          </a>
        </div>
      )}

      {/* Section 1: High-Conviction Setups (Top Signals) */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-400" />
            <h2 className="text-xs font-bold text-white uppercase tracking-wider font-sans">
              🎯 จังหวะเทรดความน่าจะเป็นสูง (HIGH CONVICTION SETUPS)
            </h2>
          </div>
          <span className="text-[11px] text-slate-400 font-mono">กรองความน่าจะเป็น &gt; 65% หรือ &lt; 35%</span>
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
