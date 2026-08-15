'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  TrendingUp,
  TrendingDown,
  ChevronRight,
  Send,
  Sparkles,
  Search,
  Filter,
  CheckCircle2,
} from 'lucide-react';
import { SymbolInfo, PriceSnapshot, TechnicalIndicators, SignalOutput } from '@/lib/types';
import { ProbabilityGauge } from './ProbabilityGauge';

export interface WatchlistRowData {
  symbol: SymbolInfo;
  quote: PriceSnapshot;
  indicators: TechnicalIndicators;
  signal: SignalOutput;
}

interface WatchlistTableProps {
  data: WatchlistRowData[];
  onBroadcastAlert?: (row: WatchlistRowData) => void;
  broadcastingTicker?: string | null;
}

export const WatchlistTable: React.FC<WatchlistTableProps> = ({
  data,
  onBroadcastAlert,
  broadcastingTicker,
}) => {
  const [filterType, setFilterType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<'prob' | 'change' | 'ticker'>('prob');

  const filteredData = data.filter((row) => {
    const matchesType =
      filterType === 'all' ||
      (filterType === 'forex' && row.symbol.asset_type === 'forex') ||
      (filterType === 'stock' && row.symbol.asset_type === 'stock') ||
      (filterType === 'commodity' && row.symbol.asset_type === 'commodity');

    const matchesSearch =
      row.symbol.ticker.toLowerCase().includes(searchQuery.toLowerCase()) ||
      row.symbol.display_name.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesType && matchesSearch;
  });

  // Sort
  filteredData.sort((a, b) => {
    if (sortBy === 'prob') {
      const aConviction = Math.abs(a.signal.probability_score - 0.5);
      const bConviction = Math.abs(b.signal.probability_score - 0.5);
      return bConviction - aConviction;
    }
    if (sortBy === 'change') {
      return (b.quote.change_percent || 0) - (a.quote.change_percent || 0);
    }
    return a.symbol.ticker.localeCompare(b.symbol.ticker);
  });

  return (
    <div className="terminal-card overflow-hidden">
      {/* Table Header & Controls */}
      <div className="p-4 border-b border-[#1e293b] flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#0d1320]">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-blue-500"></div>
          <h2 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
            LIVE ASSET WATCHLIST & PROBABILITY MATRIX
          </h2>
          <span className="text-xs text-slate-500 font-mono">({filteredData.length} symbols)</span>
        </div>

        {/* Filters & Search */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Asset Category Filters */}
          <div className="flex rounded-md bg-[#131b2c] p-0.5 border border-slate-800 text-xs">
            {['all', 'forex', 'stock', 'commodity'].map((type) => (
              <button
                key={type}
                onClick={() => setFilterType(type)}
                className={`px-2.5 py-1 rounded text-xs font-medium capitalize transition-colors ${
                  filterType === type
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {type}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search ticker..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-[#131b2c] border border-slate-800 rounded-md pl-8 pr-3 py-1 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 w-36 sm:w-44"
            />
          </div>
        </div>
      </div>

      {/* Table Content */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-[#0b101b] border-b border-[#1e293b] text-slate-400 font-mono uppercase text-[11px]">
              <th className="py-3 px-4 font-semibold">Symbol / Asset</th>
              <th className="py-3 px-4 font-semibold text-right">Price</th>
              <th className="py-3 px-4 font-semibold text-right">24h Change</th>
              <th className="py-3 px-4 font-semibold text-center">RSI (14)</th>
              <th className="py-3 px-4 font-semibold text-center">Trend Bias</th>
              <th className="py-3 px-4 font-semibold text-center">Win Probability</th>
              <th className="py-3 px-4 font-semibold text-center">Direction Bias</th>
              <th className="py-3 px-4 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#172033]">
            {filteredData.map((row) => {
              const isUp = (row.quote.change_percent || 0) >= 0;
              const isBull = row.signal.direction.includes('BUY');
              const isBear = row.signal.direction.includes('SELL');
              const prob = (row.signal.probability_score * 100).toFixed(1);
              const isBroadcasting = broadcastingTicker === row.symbol.ticker;

              return (
                <tr
                  key={row.symbol.ticker}
                  className="hover:bg-[#131d2e] transition-colors group cursor-pointer"
                >
                  {/* Symbol */}
                  <td className="py-3.5 px-4">
                    <Link href={`/symbol/${row.symbol.ticker}`} className="flex items-center gap-2.5">
                      <div
                        className={`w-7 h-7 rounded flex items-center justify-center font-bold text-[10px] font-mono border ${
                          row.symbol.asset_type === 'forex'
                            ? 'bg-blue-950/80 text-blue-400 border-blue-800/60'
                            : row.symbol.asset_type === 'commodity'
                            ? 'bg-amber-950/80 text-amber-400 border-amber-800/60'
                            : 'bg-indigo-950/80 text-indigo-400 border-indigo-800/60'
                        }`}
                      >
                        {row.symbol.ticker.substring(0, 3)}
                      </div>
                      <div>
                        <div className="font-bold text-white group-hover:text-blue-400 flex items-center gap-1.5 transition-colors">
                          <span>{row.symbol.ticker}</span>
                          <span className="text-[10px] text-slate-500 font-normal px-1 py-0.2 bg-slate-900 rounded border border-slate-800 uppercase">
                            {row.symbol.asset_type}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 truncate max-w-[140px] sm:max-w-[180px]">
                          {row.symbol.display_name}
                        </p>
                      </div>
                    </Link>
                  </td>

                  {/* Price */}
                  <td className="py-3.5 px-4 text-right font-mono-numbers text-white font-semibold text-[13px]">
                    {row.quote.price.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: row.symbol.asset_type === 'forex' && !row.symbol.ticker.includes('JPY') ? 4 : 2,
                    })}
                  </td>

                  {/* 24h Change */}
                  <td className="py-3.5 px-4 text-right">
                    <span
                      className={`inline-flex items-center gap-0.5 font-mono text-[11px] font-medium px-2 py-0.5 rounded ${
                        isUp
                          ? 'text-emerald-400 bg-emerald-950/50 border border-emerald-900/60'
                          : 'text-rose-400 bg-rose-950/50 border border-rose-900/60'
                      }`}
                    >
                      {isUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                      {isUp ? '+' : ''}
                      {(row.quote.change_percent || 0).toFixed(2)}%
                    </span>
                  </td>

                  {/* RSI (14) */}
                  <td className="py-3.5 px-4 text-center">
                    <span
                      className={`font-mono text-xs font-semibold px-2 py-0.5 rounded ${
                        row.indicators.rsi_14 >= 70
                          ? 'text-rose-400 bg-rose-950/60 border border-rose-800/60'
                          : row.indicators.rsi_14 <= 30
                          ? 'text-emerald-400 bg-emerald-950/60 border border-emerald-800/60'
                          : 'text-slate-300 bg-slate-900 border border-slate-800'
                      }`}
                    >
                      {row.indicators.rsi_14.toFixed(1)}
                    </span>
                  </td>

                  {/* Trend Bias */}
                  <td className="py-3.5 px-4 text-center">
                    <span
                      className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded uppercase ${
                        row.indicators.trend_bias === 'BULLISH'
                          ? 'text-emerald-400 bg-emerald-950/40'
                          : row.indicators.trend_bias === 'BEARISH'
                          ? 'text-rose-400 bg-rose-950/40'
                          : 'text-slate-400 bg-slate-900/60'
                      }`}
                    >
                      {row.indicators.trend_bias}
                    </span>
                  </td>

                  {/* Win Probability */}
                  <td className="py-3.5 px-4 text-center">
                    <div className="flex flex-col items-center gap-1">
                      <span className="font-mono font-bold text-white text-xs">{prob}%</span>
                      {/* Mini Bar */}
                      <div className="w-20 bg-slate-800 h-1.5 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            isBull ? 'bg-emerald-500' : isBear ? 'bg-rose-500' : 'bg-amber-500'
                          }`}
                          style={{ width: `${prob}%` }}
                        />
                      </div>
                    </div>
                  </td>

                  {/* Direction Bias */}
                  <td className="py-3.5 px-4 text-center">
                    <span
                      className={`text-[10px] font-mono font-bold uppercase tracking-wide px-2.5 py-1 rounded-md border ${
                        isBull
                          ? 'text-emerald-300 bg-emerald-950/60 border-emerald-700/60'
                          : isBear
                          ? 'text-rose-300 bg-rose-950/60 border-rose-700/60'
                          : 'text-amber-300 bg-amber-950/60 border-amber-700/60'
                      }`}
                    >
                      {row.signal.direction.replace('_', ' ')}
                    </span>
                  </td>

                  {/* Actions */}
                  <td className="py-3.5 px-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      {onBroadcastAlert && (
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            onBroadcastAlert(row);
                          }}
                          disabled={isBroadcasting}
                          title="Broadcast to Telegram"
                          className="p-1.5 rounded bg-[#151e30] hover:bg-blue-600/30 text-slate-300 hover:text-blue-400 border border-slate-700/60 transition-colors disabled:opacity-50"
                        >
                          <Send className="w-3.5 h-3.5" />
                        </button>
                      )}

                      <Link
                        href={`/symbol/${row.symbol.ticker}`}
                        className="p-1.5 rounded bg-[#151e30] hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/60 transition-colors"
                        title="Open Deep Analysis"
                      >
                        <ChevronRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
