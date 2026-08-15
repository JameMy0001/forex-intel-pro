'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  ChevronLeft,
  TrendingUp,
  TrendingDown,
  Zap,
  ShieldAlert,
  Target,
  Send,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';
import { InteractivePriceChart } from '@/components/charts/InteractivePriceChart';
import { ProbabilityGauge } from '@/components/dashboard/ProbabilityGauge';
import { AINarrativeCard } from '@/components/symbol/AINarrativeCard';
import { TechnicalMetricsGrid } from '@/components/symbol/TechnicalMetricsGrid';
import {
  SymbolInfo,
  PriceSnapshot,
  CandleData,
  TechnicalIndicators,
  SignalOutput,
  AIAnalysisOutput,
  NewsArticle,
} from '@/lib/types';

export default function SymbolDetailPage() {
  const params = useParams();
  const ticker = (params?.ticker as string)?.toUpperCase() || 'EURUSD';

  const [symbol, setSymbol] = useState<SymbolInfo | null>(null);
  const [quote, setQuote] = useState<PriceSnapshot | null>(null);
  const [candles, setCandles] = useState<CandleData[]>([]);
  const [indicators, setIndicators] = useState<TechnicalIndicators | null>(null);
  const [signal, setSignal] = useState<SignalOutput | null>(null);
  const [aiAnalysis, setAiAnalysis] = useState<AIAnalysisOutput | null>(null);
  const [newsArticles, setNewsArticles] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isRefreshingAI, setIsRefreshingAI] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const fetchSymbolData = useCallback(async () => {
    try {
      const res = await fetch(`/api/signals/${ticker}`);
      const json = await res.json();

      if (json.success) {
        setSymbol(json.symbol);
        setQuote(json.quote);
        setCandles(json.candles || []);
        setIndicators(json.indicators);
        setSignal(json.signal);
        setAiAnalysis(json.aiAnalysis);
        setNewsArticles(json.newsArticles || []);
      }
    } catch (err) {
      console.error('Failed to load symbol data:', err);
    } finally {
      setLoading(false);
    }
  }, [ticker]);

  useEffect(() => {
    fetchSymbolData();
  }, [fetchSymbolData]);

  const handleRefreshAI = async () => {
    setIsRefreshingAI(true);
    try {
      const res = await fetch('/api/ai/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticker }),
      });
      const json = await res.json();
      if (json.success && json.aiAnalysis) {
        setAiAnalysis(json.aiAnalysis);
        setToastMessage({ text: 'AI analysis synthesized successfully with Gemini!', type: 'success' });
      } else {
        setToastMessage({ text: 'Failed to synthesize AI analysis', type: 'error' });
      }
    } catch (err) {
      setToastMessage({ text: (err as Error).message, type: 'error' });
    } finally {
      setIsRefreshingAI(false);
      setTimeout(() => setToastMessage(null), 4000);
    }
  };

  const handleBroadcastAlert = async () => {
    if (!signal) return;
    try {
      const res = await fetch('/api/alerts/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ signal, aiAnalysis }),
      });
      const json = await res.json();
      if (json.success) {
        setToastMessage({ text: `Alert for ${ticker} sent to Telegram!`, type: 'success' });
      } else {
        setToastMessage({ text: json.error || 'Failed to send alert', type: 'error' });
      }
    } catch (err) {
      setToastMessage({ text: (err as Error).message, type: 'error' });
    } finally {
      setTimeout(() => setToastMessage(null), 4000);
    }
  };

  if (loading || !quote || !signal || !indicators) {
    return (
      <div className="space-y-4 animate-fade-in">
        <div className="h-8 w-36 bg-slate-800 rounded animate-pulse"></div>
        <div className="h-96 bg-slate-900/50 rounded-lg border border-slate-800 animate-pulse"></div>
      </div>
    );
  }

  const isUp = (quote.change_percent || 0) >= 0;
  const isBull = signal.direction.includes('BUY');
  const isBear = signal.direction.includes('SELL');

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

      {/* Navigation Back & Symbol Title Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#0d1320] p-5 rounded-lg border border-[#1e293b]">
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard"
            className="p-2 rounded-md bg-[#131b2c] hover:bg-[#1e293b] border border-slate-700 text-slate-300 transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-black font-mono text-white">{ticker}</h1>
              <span className="text-xs font-mono uppercase px-2 py-0.5 rounded bg-blue-950/80 text-blue-400 border border-blue-800/60">
                {symbol?.asset_type} • {symbol?.category}
              </span>
            </div>
            <p className="text-xs text-slate-400">{symbol?.display_name}</p>
          </div>
        </div>

        {/* Live Price & Action Buttons */}
        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="text-2xl font-black font-mono-numbers text-white">
              {quote.price.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: symbol?.asset_type === 'forex' && !ticker.includes('JPY') ? 4 : 2,
              })}
            </div>
            <div
              className={`inline-flex items-center gap-0.5 font-mono text-xs font-semibold px-2 py-0.5 rounded ${
                isUp
                  ? 'text-emerald-400 bg-emerald-950/50 border border-emerald-900/60'
                  : 'text-rose-400 bg-rose-950/50 border border-rose-900/60'
              }`}
            >
              {isUp ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
              {isUp ? '+' : ''}
              {(quote.change_percent || 0).toFixed(2)}% ({quote.change_amount?.toFixed(4)})
            </div>
          </div>

          <button
            onClick={handleBroadcastAlert}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-md bg-blue-600 hover:bg-blue-500 text-xs font-bold text-white shadow-lg transition-colors"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Send Alert</span>
          </button>
        </div>
      </div>

      {/* Top Grid: Interactive Chart + Probability Verdict */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Chart (2 cols) */}
        <div className="lg:col-span-2 terminal-card p-4">
          <InteractivePriceChart
            candles={candles}
            ticker={ticker}
            assetType={symbol?.asset_type}
          />
        </div>

        {/* Probability & Execution Card (1 col) */}
        <div className="lg:col-span-1 terminal-card p-5 flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-sans font-bold text-slate-300 uppercase">
                ระดับความน่าจะเป็น (Probability)
              </span>
              <span
                className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border uppercase ${
                  isBull
                    ? 'text-emerald-400 bg-emerald-950/70 border-emerald-800/80'
                    : isBear
                    ? 'text-rose-400 bg-rose-950/70 border-rose-800/80'
                    : 'text-amber-400 bg-amber-950/70 border-amber-800/80'
                }`}
              >
                {signal.confidence_level}
              </span>
            </div>

            {/* Dial Gauge */}
            <div className="my-2 flex justify-center">
              <ProbabilityGauge
                score={signal.probability_score}
                direction={signal.direction}
                size={140}
              />
            </div>

            {/* Decomposition Factor Bars */}
            <div className="space-y-2 mt-4 text-xs font-sans">
              <div>
                <div className="flex justify-between text-slate-400 text-[11px] mb-0.5">
                  <span>Sentiment ข่าวการเงิน:</span>
                  <span className="text-white font-bold font-mono">
                    {(signal.sentiment_component >= 0 ? '+' : '') + (signal.sentiment_component * 100).toFixed(0)}%
                  </span>
                </div>
                <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-blue-500 h-full"
                    style={{ width: `${Math.max(10, Math.abs(signal.sentiment_component) * 100)}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-slate-400 text-[11px] mb-0.5">
                  <span>โมเมนตัมเทคนิค (RSI/MACD):</span>
                  <span className="text-white font-bold font-mono">
                    {(signal.technical_component >= 0 ? '+' : '') + (signal.technical_component * 100).toFixed(0)}%
                  </span>
                </div>
                <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-purple-500 h-full"
                    style={{ width: `${Math.max(10, Math.abs(signal.technical_component) * 100)}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-slate-400 text-[11px] mb-0.5">
                  <span>ความสอดคล้องของ Trend:</span>
                  <span className="text-white font-bold font-mono">
                    {(signal.trend_component >= 0 ? '+' : '') + (signal.trend_component * 100).toFixed(0)}%
                  </span>
                </div>
                <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-emerald-500 h-full"
                    style={{ width: `${Math.max(10, Math.abs(signal.trend_component) * 100)}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Trade Execution Levels Box */}
          <div className="bg-[#090d18] p-3.5 rounded-lg border border-white/[0.07] space-y-2 text-xs">
            <div className="flex justify-between items-center text-slate-300">
              <span className="flex items-center gap-1 text-slate-400 font-sans">
                <Zap className="w-3.5 h-3.5 text-blue-400" /> จุดเข้าแนะนำ (Entry):
              </span>
              <span className="font-mono font-bold text-white mt5-copy-pill">{signal.recommended_entry}</span>
            </div>
            <div className="flex justify-between items-center text-slate-300">
              <span className="flex items-center gap-1 text-rose-400 font-sans">
                <ShieldAlert className="w-3.5 h-3.5 text-rose-400" /> ตัดขาดทุน (Stop Loss):
              </span>
              <span className="font-mono font-bold text-rose-300 mt5-copy-pill">{signal.stop_loss}</span>
            </div>
            <div className="flex justify-between items-center text-slate-300">
              <span className="flex items-center gap-1 text-emerald-400 font-sans">
                <Target className="w-3.5 h-3.5 text-emerald-400" /> ทำกำไร (TP1 / TP2):
              </span>
              <span className="font-mono font-bold text-emerald-300 mt5-copy-pill">
                {signal.take_profit_1} / {signal.take_profit_2}
              </span>
            </div>
            <div className="flex justify-between text-slate-400 border-t border-white/[0.06] pt-1.5 text-[11px] font-sans">
              <span>อัตราผลตอบแทนต่อความเสี่ยง:</span>
              <span className="font-mono font-bold text-white">1:{signal.risk_reward_ratio}</span>
            </div>
          </div>
        </div>
      </div>

      {/* AI Deep Narrative Card */}
      {aiAnalysis && (
        <AINarrativeCard
          ticker={ticker}
          analysis={aiAnalysis}
          signal={signal}
          onRefreshAI={handleRefreshAI}
          isRefreshing={isRefreshingAI}
        />
      )}

      {/* Technical Indicators Matrix */}
      <TechnicalMetricsGrid
        indicators={indicators}
        currentPrice={quote.price}
      />

      {/* Specific News Articles for this Ticker */}
      <div className="terminal-card p-5">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono mb-4">
          RECENT NEWS & CATALYSTS FOR {ticker}
        </h3>
        {newsArticles.length === 0 ? (
          <p className="text-xs text-slate-500 font-mono">No specific news articles recorded for {ticker} in the last 24h.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {newsArticles.map((article) => (
              <div key={article.id} className="p-3.5 rounded-lg bg-[#0b101c] border border-[#1a2336] text-xs">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-[10px] font-mono text-slate-400">{article.source}</span>
                  <span
                    className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                      article.sentiment_label === 'Bullish'
                        ? 'text-emerald-400 bg-emerald-950/60'
                        : article.sentiment_label === 'Bearish'
                        ? 'text-rose-400 bg-rose-950/60'
                        : 'text-amber-400 bg-amber-950/60'
                    }`}
                  >
                    {article.sentiment_label} ({article.sentiment_score >= 0 ? '+' : ''}{article.sentiment_score.toFixed(2)})
                  </span>
                </div>
                <a
                  href={article.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-slate-200 hover:text-blue-400 transition-colors line-clamp-2 mb-1 flex items-start gap-1 group"
                >
                  <span>{article.headline}</span>
                  <ExternalLink className="w-3 h-3 text-slate-500 group-hover:text-blue-400 transition-colors shrink-0 mt-0.5" />
                </a>
                <p className="text-[11px] text-slate-400 line-clamp-2">{article.summary}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
