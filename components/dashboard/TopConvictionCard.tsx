'use client';

import React from 'react';
import Link from 'next/link';
import {
  TrendingUp,
  TrendingDown,
  Target,
  ShieldAlert,
  Send,
  Zap,
  ArrowUpRight,
  Sparkles,
} from 'lucide-react';
import { WatchlistRowData } from './WatchlistTable';
import { ProbabilityGauge } from './ProbabilityGauge';

interface TopConvictionCardProps {
  data: WatchlistRowData;
  onBroadcast?: () => void;
  isBroadcasting?: boolean;
}

export const TopConvictionCard: React.FC<TopConvictionCardProps> = ({
  data,
  onBroadcast,
  isBroadcasting = false,
}) => {
  const { symbol, quote, indicators, signal } = data;
  const isBull = signal.direction.includes('BUY');
  const isBear = signal.direction.includes('SELL');
  const prob = (signal.probability_score * 100).toFixed(1);

  return (
    <div
      className={`terminal-card-interactive p-5 relative overflow-hidden flex flex-col justify-between ${
        isBull ? 'border-emerald-900/50 glow-bull' : isBear ? 'border-rose-900/50 glow-bear' : 'border-amber-900/50'
      }`}
    >
      {/* Top Banner Tag */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="flex h-2 w-2 relative">
            <span
              className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                isBull ? 'bg-emerald-400' : isBear ? 'bg-rose-400' : 'bg-amber-400'
              }`}
            ></span>
            <span
              className={`relative inline-flex rounded-full h-2 w-2 ${
                isBull ? 'bg-emerald-500' : isBear ? 'bg-rose-500' : 'bg-amber-500'
              }`}
            ></span>
          </span>
          <span className="text-[11px] font-mono font-bold tracking-wider uppercase text-slate-300">
            HIGH CONVICTION SETUP
          </span>
        </div>
        <span
          className={`text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded border ${
            isBull
              ? 'text-emerald-400 bg-emerald-950/60 border-emerald-800/60'
              : isBear
              ? 'text-rose-400 bg-rose-950/60 border-rose-800/60'
              : 'text-amber-400 bg-amber-950/60 border-amber-800/60'
          }`}
        >
          {signal.confidence_level} CONFIDENCE
        </span>
      </div>

      {/* Asset Name, Price & Probability Gauge */}
      <div className="flex items-center justify-between gap-4 mb-4">
        <div>
          <Link href={`/symbol/${symbol.ticker}`} className="group flex items-center gap-1.5">
            <h3 className="text-xl font-black font-mono text-white group-hover:text-blue-400 transition-colors">
              {symbol.ticker}
            </h3>
            <ArrowUpRight className="w-4 h-4 text-slate-500 group-hover:text-blue-400 transition-colors" />
          </Link>
          <p className="text-xs text-slate-400 truncate max-w-[180px]">{symbol.display_name}</p>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-lg font-bold font-mono-numbers text-white">
              {quote.price.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: symbol.asset_type === 'forex' && !symbol.ticker.includes('JPY') ? 4 : 2,
              })}
            </span>
            <span
              className={`text-xs font-mono font-medium ${
                (quote.change_percent || 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {(quote.change_percent || 0) >= 0 ? '+' : ''}
              {(quote.change_percent || 0).toFixed(2)}%
            </span>
          </div>
        </div>

        {/* Gauge */}
        <div className="shrink-0">
          <ProbabilityGauge score={signal.probability_score} direction={signal.direction} size={110} />
        </div>
      </div>

      {/* Trade Execution Levels (Entry, SL, TP) */}
      <div className="bg-[#0b0f1a] p-3 rounded-lg border border-[#1a2336] mb-4 space-y-2 text-xs">
        <div className="flex justify-between items-center text-slate-300">
          <span className="flex items-center gap-1 text-slate-400">
            <Zap className="w-3.5 h-3.5 text-blue-400" /> Recommended Entry:
          </span>
          <span className="font-mono font-bold text-white">{signal.recommended_entry}</span>
        </div>

        <div className="flex justify-between items-center text-slate-300">
          <span className="flex items-center gap-1 text-rose-400">
            <ShieldAlert className="w-3.5 h-3.5 text-rose-400" /> Stop Loss (Risk Guard):
          </span>
          <span className="font-mono font-bold text-rose-300">{signal.stop_loss}</span>
        </div>

        <div className="flex justify-between items-center text-slate-300">
          <span className="flex items-center gap-1 text-emerald-400">
            <Target className="w-3.5 h-3.5 text-emerald-400" /> Take Profit 1 & 2:
          </span>
          <span className="font-mono font-bold text-emerald-300">
            {signal.take_profit_1} / {signal.take_profit_2}
          </span>
        </div>
      </div>

      {/* Summary Narrative */}
      <p className="text-[11px] text-slate-400 line-clamp-2 mb-4 italic">
        "{signal.explanation}"
      </p>

      {/* Bottom Action Buttons */}
      <div className="flex items-center gap-2 pt-2 border-t border-[#1a2336]">
        <Link
          href={`/symbol/${symbol.ticker}`}
          className="flex-1 text-center py-2 px-3 rounded-md bg-[#162033] hover:bg-slate-700 text-xs font-semibold text-white transition-colors"
        >
          View Full Deep Analysis
        </Link>
        {onBroadcast && (
          <button
            onClick={onBroadcast}
            disabled={isBroadcasting}
            title="Broadcast Alert to Telegram"
            className="flex items-center gap-1.5 py-2 px-3 rounded-md bg-blue-600 hover:bg-blue-500 text-xs font-semibold text-white transition-colors disabled:opacity-50"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Alert</span>
          </button>
        )}
      </div>
    </div>
  );
};
