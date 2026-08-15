'use client';

import React from 'react';
import { AIAnalysisOutput, SignalOutput } from '@/lib/types';
import {
  Sparkles,
  TrendingUp,
  AlertTriangle,
  Compass,
  RefreshCw,
  Cpu,
  ShieldAlert,
  Target,
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
      <div className="p-4 border-b border-white/[0.07] flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#0a0f1c]">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-md shadow-blue-500/20">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white uppercase tracking-tight font-sans flex items-center gap-2">
              บทวิเคราะห์ AI เชิงลึก & แผนการเทรด (AI Thesis)
              <span className="text-[10px] text-blue-400 font-mono px-1.5 py-0.2 bg-blue-950/80 border border-blue-800/60 rounded">
                {analysis.model_used}
              </span>
            </h2>
            <p className="text-[11px] text-slate-400">Institutional Macro Synthesis & Statistical Probability</p>
          </div>
        </div>

        {onRefreshAI && (
          <button
            onClick={onRefreshAI}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/40 text-xs font-semibold transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>{isRefreshing ? 'กำลังประมวลผล AI...' : 'วิเคราะห์ใหม่ด้วย Gemini AI'}</span>
          </button>
        )}
      </div>

      <div className="p-5 space-y-4 text-xs">
        {/* Dominant Macro Driver */}
        <div className="bg-[#090d18] p-4 rounded-lg border border-white/[0.07]">
          <div className="flex items-center gap-1.5 font-bold font-sans text-blue-400 uppercase text-[11px] mb-1.5">
            <Compass className="w-4 h-4" />
            <span>🌐 ปัจจัยขับเคลื่อนมหภาคหลัก (Dominant Macro Catalyst)</span>
          </div>
          <p className="text-slate-200 leading-relaxed thai-text text-[13px]">{analysis.macro_catalyst}</p>
        </div>

        {/* Bull Case vs Bear Case Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* Bull Case */}
          <div className="bg-emerald-950/30 p-4 rounded-lg border border-emerald-800/40">
            <div className="flex items-center gap-1.5 font-bold font-sans text-emerald-400 uppercase text-[11px] mb-1.5">
              <TrendingUp className="w-4 h-4" />
              <span>🐂 ฝั่งกระทิง: ปัจจัยหนุนขาขึ้น (Bullish Tailwinds)</span>
            </div>
            <p className="text-slate-200 leading-relaxed thai-text">{analysis.bull_case}</p>
          </div>

          {/* Bear Case */}
          <div className="bg-rose-950/30 p-4 rounded-lg border border-rose-800/40">
            <div className="flex items-center gap-1.5 font-bold font-sans text-rose-400 uppercase text-[11px] mb-1.5">
              <AlertTriangle className="w-4 h-4" />
              <span>🐻 ฝั่งหมี: ความเสี่ยงและแนวต้าน (Downside Risks)</span>
            </div>
            <p className="text-slate-200 leading-relaxed thai-text">{analysis.bear_case}</p>
          </div>
        </div>

        {/* Strategic Trade Thesis */}
        <div className="bg-[#0e1526] p-4 rounded-lg border border-blue-900/40 shadow-inner">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5 font-bold font-sans text-white uppercase text-[12px]">
              <Cpu className="w-4 h-4 text-blue-400" />
              <span>💡 แผนการเทรดและกลยุทธ์ (Strategic Trade Thesis)</span>
            </div>
            <span className="text-[11px] font-mono text-emerald-400 font-bold bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800">
              ความน่าจะเป็น: {(signal.probability_score * 100).toFixed(1)}%
            </span>
          </div>
          <p className="text-slate-100 leading-relaxed text-[13px] thai-text">{analysis.trade_thesis}</p>
        </div>

        {/* Key Invalidation & Support/Resistance Levels */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-white/[0.07] text-[11px] font-mono">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-rose-400" />
            <span className="text-slate-400 font-sans">จุดยอมแพ้ (Invalidation / Hard SL):</span>
            <span className="text-rose-400 font-bold font-mono text-xs">{analysis.invalidation_level || signal.stop_loss}</span>
          </div>

          {analysis.key_levels && (
            <div className="flex items-center gap-4 text-slate-400">
              <div>
                <span className="font-sans">แนวรับสำคัญ:</span>{' '}
                <span className="text-emerald-400 font-bold">{analysis.key_levels.support.join(', ')}</span>
              </div>
              <div>
                <span className="font-sans">แนวต้านสำคัญ:</span>{' '}
                <span className="text-rose-400 font-bold">{analysis.key_levels.resistance.join(', ')}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
