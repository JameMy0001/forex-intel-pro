'use client';

import React from 'react';
import { TechnicalIndicators } from '@/lib/types';
import { Activity, Gauge, TrendingUp, Sliders, Layers } from 'lucide-react';

interface TechnicalMetricsGridProps {
  indicators: TechnicalIndicators;
  currentPrice: number;
}

export const TechnicalMetricsGrid: React.FC<TechnicalMetricsGridProps> = ({
  indicators,
  currentPrice,
}) => {
  const rsi = indicators.rsi_14;
  const isOverbought = rsi >= 70;
  const isOversold = rsi <= 30;

  return (
    <div className="terminal-card overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-[#1e293b] flex items-center justify-between bg-[#0d1320]">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-blue-400" />
          <h2 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
            QUANTITATIVE TECHNICAL METRICS
          </h2>
        </div>
        <span className="text-[11px] font-mono text-slate-400">Timeframe: {indicators.timeframe}</span>
      </div>

      <div className="p-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 text-xs">
        {/* RSI (14) */}
        <div className="bg-[#0b101c] p-3 rounded-lg border border-[#1a2336]">
          <span className="text-slate-400 font-mono text-[10px] uppercase">RSI (14)</span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-lg font-mono font-bold text-white">{rsi.toFixed(1)}</span>
            <span
              className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                isOverbought
                  ? 'text-rose-400 bg-rose-950/60'
                  : isOversold
                  ? 'text-emerald-400 bg-emerald-950/60'
                  : 'text-slate-400 bg-slate-900'
              }`}
            >
              {isOverbought ? 'OVERBOUGHT' : isOversold ? 'OVERSOLD' : 'NEUTRAL'}
            </span>
          </div>
        </div>

        {/* MACD Histogram */}
        <div className="bg-[#0b101c] p-3 rounded-lg border border-[#1a2336]">
          <span className="text-slate-400 font-mono text-[10px] uppercase">MACD (12, 26, 9)</span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-lg font-mono font-bold text-white">{indicators.macd_value}</span>
            <span
              className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                indicators.macd_histogram >= 0
                  ? 'text-emerald-400 bg-emerald-950/60'
                  : 'text-rose-400 bg-rose-950/60'
              }`}
            >
              Hist: {indicators.macd_histogram >= 0 ? '+' : ''}{indicators.macd_histogram}
            </span>
          </div>
        </div>

        {/* EMA 20 */}
        <div className="bg-[#0b101c] p-3 rounded-lg border border-[#1a2336]">
          <span className="text-slate-400 font-mono text-[10px] uppercase">EMA 20</span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-lg font-mono font-bold text-blue-400">{indicators.ema_20}</span>
            <span className="text-[10px] text-slate-500 font-mono">
              {currentPrice > indicators.ema_20 ? 'Above' : 'Below'}
            </span>
          </div>
        </div>

        {/* EMA 50 */}
        <div className="bg-[#0b101c] p-3 rounded-lg border border-[#1a2336]">
          <span className="text-slate-400 font-mono text-[10px] uppercase">EMA 50</span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-lg font-mono font-bold text-amber-400">{indicators.ema_50}</span>
            <span className="text-[10px] text-slate-500 font-mono">
              {currentPrice > indicators.ema_50 ? 'Above' : 'Below'}
            </span>
          </div>
        </div>

        {/* EMA 200 */}
        <div className="bg-[#0b101c] p-3 rounded-lg border border-[#1a2336]">
          <span className="text-slate-400 font-mono text-[10px] uppercase">EMA 200 (Macro)</span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-lg font-mono font-bold text-indigo-400">{indicators.ema_200}</span>
            <span className="text-[10px] text-slate-500 font-mono">
              {currentPrice > indicators.ema_200 ? 'Bullish Regime' : 'Bearish Regime'}
            </span>
          </div>
        </div>

        {/* Bollinger Upper / Lower */}
        <div className="bg-[#0b101c] p-3 rounded-lg border border-[#1a2336]">
          <span className="text-slate-400 font-mono text-[10px] uppercase">Bollinger Bands (20,2)</span>
          <div className="mt-1 flex flex-col gap-0.5 font-mono text-[11px]">
            <div className="flex justify-between text-slate-400">
              <span>Upper:</span> <span className="text-rose-300 font-bold">{indicators.bollinger_upper}</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Lower:</span> <span className="text-emerald-300 font-bold">{indicators.bollinger_lower}</span>
            </div>
          </div>
        </div>

        {/* ATR (14) */}
        <div className="bg-[#0b101c] p-3 rounded-lg border border-[#1a2336]">
          <span className="text-slate-400 font-mono text-[10px] uppercase">ATR (14) Volatility</span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-lg font-mono font-bold text-white">{indicators.atr_14}</span>
            <span className="text-[10px] text-slate-500 font-mono">Average Range</span>
          </div>
        </div>

        {/* Trend Bias */}
        <div className="bg-[#0b101c] p-3 rounded-lg border border-[#1a2336]">
          <span className="text-slate-400 font-mono text-[10px] uppercase">Trend Bias</span>
          <div className="mt-1">
            <span
              className={`text-xs font-mono font-bold px-2 py-1 rounded inline-block uppercase ${
                indicators.trend_bias === 'BULLISH'
                  ? 'text-emerald-400 bg-emerald-950/60 border border-emerald-800/60'
                  : indicators.trend_bias === 'BEARISH'
                  ? 'text-rose-400 bg-rose-950/60 border border-rose-800/60'
                  : 'text-amber-400 bg-amber-950/60 border border-amber-800/60'
              }`}
            >
              {indicators.trend_bias}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
