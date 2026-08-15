'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  TrendingUp,
  TrendingDown,
  Target,
  ShieldAlert,
  Send,
  Zap,
  ArrowUpRight,
  Copy,
  Check,
  Smartphone,
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

  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const copyToClipboard = (text: string | number | undefined, key: string) => {
    if (!text) return;
    navigator.clipboard.writeText(String(text));
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const thaiDirection = isBull
    ? signal.direction === 'STRONG_BUY' ? 'ซื้อเต็มกำลัง (STRONG BUY)' : 'ซื้อ (BUY)'
    : isBear
    ? signal.direction === 'STRONG_SELL' ? 'ขายเต็มกำลัง (STRONG SELL)' : 'ขาย (SELL)'
    : 'ถือรอดู (NEUTRAL)';

  return (
    <div
      className={`terminal-card-interactive p-5 relative overflow-hidden flex flex-col justify-between ${
        isBull ? 'border-emerald-500/30 glow-bull' : isBear ? 'border-rose-500/30 glow-bear' : 'border-amber-500/30'
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
          <span className="text-[11px] font-sans font-bold tracking-wide uppercase text-slate-200">
            จังหวะเทรดความน่าจะเป็นสูง
          </span>
        </div>
        <span
          className={`text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded-full border ${
            isBull
              ? 'text-emerald-400 bg-emerald-950/70 border-emerald-800/80'
              : isBear
              ? 'text-rose-400 bg-rose-950/70 border-rose-800/80'
              : 'text-amber-400 bg-amber-950/70 border-amber-800/80'
          }`}
        >
          {thaiDirection}
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
          <p className="text-xs text-slate-400 truncate max-w-[170px]">{symbol.display_name}</p>
          <div className="mt-1.5 flex items-baseline gap-2">
            <span className="text-lg font-bold font-mono-numbers text-white">
              {quote.price.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: symbol.asset_type === 'forex' && !symbol.ticker.includes('JPY') ? 4 : 2,
              })}
            </span>
            <span
              className={`text-xs font-mono font-semibold px-1.5 py-0.5 rounded ${
                (quote.change_percent || 0) >= 0 ? 'text-emerald-400 bg-emerald-950/50' : 'text-rose-400 bg-rose-950/50'
              }`}
            >
              {(quote.change_percent || 0) >= 0 ? '+' : ''}
              {(quote.change_percent || 0).toFixed(2)}%
            </span>
          </div>
        </div>

        {/* Modern Gauge */}
        <div className="shrink-0">
          <ProbabilityGauge score={signal.probability_score} direction={signal.direction} size={110} />
        </div>
      </div>

      {/* MetaTrader 5 (MT5) One-Tap Copy Levels */}
      <div className="bg-[#090d18] p-3 rounded-lg border border-white/[0.07] mb-4 space-y-2 text-xs">
        <div className="flex items-center justify-between text-[10px] text-slate-400 font-sans border-b border-white/[0.05] pb-1.5">
          <span className="flex items-center gap-1 text-blue-400 font-semibold">
            <Smartphone className="w-3 h-3" /> แตะตัวเลขเพื่อก็อปปี้ใส่ MT5:
          </span>
          <span className="text-slate-400 font-mono">R:R 1:{signal.risk_reward_ratio}</span>
        </div>

        {/* Entry */}
        <div className="flex justify-between items-center text-slate-300">
          <span className="flex items-center gap-1 text-slate-400">
            <Zap className="w-3.5 h-3.5 text-blue-400" /> ราคาเข้า (Entry):
          </span>
          <button
            onClick={() => copyToClipboard(signal.recommended_entry, 'entry')}
            className="mt5-copy-pill text-white hover:text-blue-400"
            title="แตะเพื่อคัดลอก"
          >
            <span>{signal.recommended_entry}</span>
            {copiedKey === 'entry' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 text-slate-500" />}
          </button>
        </div>

        {/* Stop Loss */}
        <div className="flex justify-between items-center text-slate-300">
          <span className="flex items-center gap-1 text-rose-400">
            <ShieldAlert className="w-3.5 h-3.5 text-rose-400" /> ตัดขาดทุน (SL):
          </span>
          <button
            onClick={() => copyToClipboard(signal.stop_loss, 'sl')}
            className="mt5-copy-pill text-rose-300 hover:text-rose-200"
            title="แตะเพื่อคัดลอก"
          >
            <span>{signal.stop_loss}</span>
            {copiedKey === 'sl' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 text-slate-500" />}
          </button>
        </div>

        {/* Take Profit */}
        <div className="flex justify-between items-center text-slate-300">
          <span className="flex items-center gap-1 text-emerald-400">
            <Target className="w-3.5 h-3.5 text-emerald-400" /> จุดทำกำไร (TP1):
          </span>
          <button
            onClick={() => copyToClipboard(signal.take_profit_1, 'tp1')}
            className="mt5-copy-pill text-emerald-300 hover:text-emerald-200"
            title="แตะเพื่อคัดลอก"
          >
            <span>{signal.take_profit_1}</span>
            {copiedKey === 'tp1' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 text-slate-500" />}
          </button>
        </div>
      </div>

      {/* Summary Narrative */}
      <p className="text-[11px] text-slate-300 line-clamp-2 mb-4 thai-text">
        {signal.explanation}
      </p>

      {/* Bottom Action Buttons */}
      <div className="flex items-center gap-2 pt-2 border-t border-white/[0.07]">
        <Link
          href={`/symbol/${symbol.ticker}`}
          className="flex-1 text-center py-2 px-3 rounded-lg bg-[#141b2a] hover:bg-slate-800 text-xs font-semibold text-white transition-colors"
        >
          ดูกราฟและบทวิเคราะห์ AI
        </Link>
        {onBroadcast && (
          <button
            onClick={onBroadcast}
            disabled={isBroadcasting}
            title="ส่งสัญญาณเข้า Telegram"
            className="flex items-center gap-1.5 py-2 px-3.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-xs font-semibold text-white transition-all shadow-md shadow-blue-600/20 disabled:opacity-50"
          >
            <Send className="w-3.5 h-3.5" />
            <span>ส่ง Alert</span>
          </button>
        )}
      </div>
    </div>
  );
};
