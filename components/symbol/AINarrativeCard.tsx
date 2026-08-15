'use client';

import React, { useState } from 'react';
import { AIAnalysisOutput, SignalOutput } from '@/lib/types';
import {
  Sparkles,
  TrendingUp,
  AlertTriangle,
  Compass,
  RefreshCw,
  Cpu,
  ShieldAlert,
} from 'lucide-react';

interface AINarrativeCardProps {
  ticker: string;
  analysis: AIAnalysisOutput;
  signal: SignalOutput;
  onRefreshAI?: () => void;
  isRefreshing?: boolean;
}

export const AINarrativeCard: React.FC<AINarrativeCardProps> = ({
  ticker,
  analysis,
  signal,
  onRefreshAI,
  isRefreshing = false,
}) => {
  return (
    <div className="terminal-card overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-[#1e293b] flex items-center justify-between bg-[#0d1320]">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-md bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2">
              AI DEEP MARKET INTELLIGENCE & THESIS
              <span className="text-[10px] text-blue-400 font-mono px-1.5 py-0.5 bg-blue-950/80 border border-blue-800/60 rounded">
                {analysis.model_used}
              </span>
            </h2>
            <p className="text-[11px] text-slate-400">Institutional Macro Synthesis & Quantitative Narrative</p>
          </div>
        </div>

        {onRefreshAI && (
          <button
            onClick={onRefreshAI}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/40 text-xs font-semibold transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>{isRefreshing ? 'Synthesizing...' : 'Re-Analyze with Gemini AI'}</span>
          </button>
        )}
      </div>

      <div className="p-5 space-y-4 text-xs">
        {/* Dominant Macro Driver */}
        <div className="bg-[#0b101c] p-3.5 rounded-lg border border-[#1a2336]">
          <div className="flex items-center gap-1.5 font-bold font-mono text-blue-400 uppercase text-[11px] mb-1">
            <Compass className="w-3.5 h-3.5" />
            <span>Dominant Macro Driver & Catalyst</span>
          </div>
          <p className="text-slate-200 leading-relaxed">{analysis.macro_catalyst}</p>
        </div>

        {/* Bull Case vs Bear Case Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* Bull Case */}
          <div className="bg-emerald-950/20 p-3.5 rounded-lg border border-emerald-900/40">
            <div className="flex items-center gap-1.5 font-bold font-mono text-emerald-400 uppercase text-[11px] mb-1">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Bullish Tailwinds (Structural Upside)</span>
            </div>
            <p className="text-slate-300 leading-relaxed">{analysis.bull_case}</p>
          </div>

          {/* Bear Case */}
          <div className="bg-rose-950/20 p-3.5 rounded-lg border border-rose-900/40">
            <div className="flex items-center gap-1.5 font-bold font-mono text-rose-400 uppercase text-[11px] mb-1">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Downside Vulnerabilities & Risk Headwinds</span>
            </div>
            <p className="text-slate-300 leading-relaxed">{analysis.bear_case}</p>
          </div>
        </div>

        {/* Strategic Trade Thesis */}
        <div className="bg-[#121929] p-4 rounded-lg border border-[#23314d]">
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-1.5 font-bold font-mono text-white uppercase text-[11px]">
              <Cpu className="w-3.5 h-3.5 text-blue-400" />
              <span>Strategic Trade Rationale & Conviction Thesis</span>
            </div>
            <span className="text-[10px] font-mono text-emerald-400 font-bold">
              {(signal.probability_score * 100).toFixed(1)}% Conviction Probability
            </span>
          </div>
          <p className="text-slate-200 leading-relaxed text-[12px]">{analysis.trade_thesis}</p>
        </div>

        {/* Key Invalidation & Support/Resistance Levels */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-[#1a2336] text-[11px] font-mono">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
            <span className="text-slate-400">Invalidation Level (Hard Exit):</span>
            <span className="text-rose-400 font-bold">{analysis.invalidation_level || signal.stop_loss}</span>
          </div>

          {analysis.key_levels && (
            <div className="flex items-center gap-4 text-slate-400">
              <div>
                Key Support: <span className="text-emerald-400 font-bold">{analysis.key_levels.support.join(', ')}</span>
              </div>
              <div>
                Key Resistance: <span className="text-rose-400 font-bold">{analysis.key_levels.resistance.join(', ')}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
