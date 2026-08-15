'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Activity,
  Filter,
  Send,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  Sparkles,
  Zap,
  Target,
  ShieldAlert,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { WatchlistRowData } from '@/components/dashboard/WatchlistTable';

export default function SignalsMatrixPage() {
  const [data, setData] = useState<WatchlistRowData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [minProb, setMinProb] = useState<number>(0);
  const [directionFilter, setDirectionFilter] = useState<string>('all');
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/signals');
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          setData(json.data);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const handleBroadcast = async (row: WatchlistRowData) => {
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
        setToastMessage({ text: json.error || 'Failed to send alert', type: 'error' });
      }
    } catch (err) {
      setToastMessage({ text: (err as Error).message, type: 'error' });
    } finally {
      setTimeout(() => setToastMessage(null), 4000);
    }
  };

  const filteredData = data.filter((row) => {
    const prob = row.signal.probability_score;
    const passesProb = minProb === 0 || prob >= minProb || prob <= (1 - minProb);
    const passesDirection =
      directionFilter === 'all' ||
      (directionFilter === 'bull' && row.signal.direction.includes('BUY')) ||
      (directionFilter === 'bear' && row.signal.direction.includes('SELL')) ||
      (directionFilter === 'neutral' && row.signal.direction === 'NEUTRAL');

    return passesProb && passesDirection;
  });

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

      {/* Header Banner */}
      <div className="bg-[#0d1320] p-5 rounded-lg border border-[#1e293b] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-white font-mono uppercase tracking-tight flex items-center gap-2">
            <Activity className="w-5 h-5 text-emerald-400" />
            <span>QUANTITATIVE PROBABILITY MATRIX</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Statistical Confluence Ranking • Mathematical Risk/Reward • Algorithmic Signals
          </p>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Min Conviction Filter */}
          <div className="flex rounded-md bg-[#131b2c] p-0.5 border border-slate-800 text-xs">
            <button
              onClick={() => setMinProb(0)}
              className={`px-2.5 py-1 rounded font-medium transition-colors ${
                minProb === 0 ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              All Convictions
            </button>
            <button
              onClick={() => setMinProb(0.65)}
              className={`px-2.5 py-1 rounded font-medium transition-colors ${
                minProb === 0.65 ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              &gt; 65% Conviction
            </button>
            <button
              onClick={() => setMinProb(0.72)}
              className={`px-2.5 py-1 rounded font-medium transition-colors ${
                minProb === 0.72 ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              &gt; 72% High Conviction
            </button>
          </div>

          {/* Direction Filter */}
          <div className="flex rounded-md bg-[#131b2c] p-0.5 border border-slate-800 text-xs">
            {['all', 'bull', 'bear', 'neutral'].map((dir) => (
              <button
                key={dir}
                onClick={() => setDirectionFilter(dir)}
                className={`px-2.5 py-1 rounded font-medium capitalize transition-colors ${
                  directionFilter === dir ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {dir}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Signals Grid Cards */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="terminal-card p-6 h-72 animate-pulse-subtle bg-slate-900/40"></div>
          ))}
        </div>
      ) : filteredData.length === 0 ? (
        <div className="terminal-card p-12 text-center text-xs font-mono text-slate-400">
          No signals matching the selected probability threshold.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredData.map((row) => {
            const isBull = row.signal.direction.includes('BUY');
            const isBear = row.signal.direction.includes('SELL');
            const prob = (row.signal.probability_score * 100).toFixed(1);

            return (
              <div
                key={row.symbol.ticker}
                className="terminal-card p-5 flex flex-col justify-between space-y-4 hover:border-slate-700 transition-colors"
              >
                <div>
                  {/* Top Bar */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-lg text-white">{row.symbol.ticker}</span>
                      <span className="text-[10px] font-mono text-slate-400 px-1.5 py-0.5 bg-slate-900 rounded uppercase">
                        {row.symbol.asset_type}
                      </span>
                    </div>

                    <span
                      className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border uppercase ${
                        isBull
                          ? 'text-emerald-400 bg-emerald-950/60 border-emerald-800/60'
                          : isBear
                          ? 'text-rose-400 bg-rose-950/60 border-rose-800/60'
                          : 'text-amber-400 bg-amber-950/60 border-amber-800/60'
                      }`}
                    >
                      {row.signal.direction.replace('_', ' ')}
                    </span>
                  </div>

                  {/* Price & Probability Bar */}
                  <div className="bg-[#0b101c] p-3 rounded-lg border border-[#1a2336] mb-3">
                    <div className="flex justify-between items-baseline mb-2">
                      <span className="text-xs text-slate-400 font-mono">Current Price:</span>
                      <span className="font-mono font-bold text-white text-base">
                        {row.quote.price.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: row.symbol.asset_type === 'forex' && !row.symbol.ticker.includes('JPY') ? 4 : 2,
                        })}
                      </span>
                    </div>

                    <div className="flex justify-between items-center text-xs font-mono mb-1">
                      <span className="text-slate-400">Statistical Win Probability:</span>
                      <span className="font-bold text-white">{prob}%</span>
                    </div>

                    <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all ${
                          isBull ? 'bg-emerald-500' : isBear ? 'bg-rose-500' : 'bg-amber-500'
                        }`}
                        style={{ width: `${prob}%` }}
                      />
                    </div>
                  </div>

                  {/* Execution Levels */}
                  <div className="space-y-1.5 text-xs font-mono text-slate-300">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Entry:</span>
                      <span className="text-white font-bold">{row.signal.recommended_entry}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-rose-400">Stop Loss:</span>
                      <span className="text-rose-300 font-bold">{row.signal.stop_loss}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-emerald-400">Target 1:</span>
                      <span className="text-emerald-300 font-bold">{row.signal.take_profit_1}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-emerald-400">Target 2:</span>
                      <span className="text-emerald-300 font-bold">{row.signal.take_profit_2}</span>
                    </div>
                  </div>
                </div>

                {/* Bottom Buttons */}
                <div className="flex items-center gap-2 pt-3 border-t border-[#1a2336]">
                  <Link
                    href={`/symbol/${row.symbol.ticker}`}
                    className="flex-1 text-center py-2 px-3 rounded bg-[#162033] hover:bg-slate-700 text-xs font-semibold text-white transition-colors"
                  >
                    Deep Chart
                  </Link>
                  <button
                    onClick={() => handleBroadcast(row)}
                    className="flex items-center gap-1.5 py-2 px-3 rounded bg-blue-600 hover:bg-blue-500 text-xs font-semibold text-white transition-colors"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Telegram</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
