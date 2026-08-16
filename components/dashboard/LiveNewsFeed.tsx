'use client';

import React, { useState } from 'react';
import { NewsArticle } from '@/lib/types';
import { ExternalLink, Newspaper, TrendingUp, TrendingDown, Clock, Globe } from 'lucide-react';

interface LiveNewsFeedProps {
  articles: NewsArticle[];
}

export const LiveNewsFeed: React.FC<LiveNewsFeedProps> = ({ articles }) => {
  const [sentimentFilter, setSentimentFilter] = useState<'all' | 'Bullish' | 'Bearish'>('all');
  const [showOriginalLang, setShowOriginalLang] = useState<boolean>(false);
  const [mounted, setMounted] = useState<boolean>(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const filteredArticles = articles.filter((a) => {
    if (sentimentFilter === 'all') return true;
    return a.sentiment_label === sentimentFilter;
  });

  return (
    <div className="terminal-card flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-white/[0.07] flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#0a0f1c]">
        <div className="flex items-center gap-2">
          <Newspaper className="w-4 h-4 text-blue-400" />
          <div>
            <h2 className="text-xs font-bold text-white uppercase tracking-wider font-sans flex items-center gap-1.5">
              <span>ข่าวเศรษฐกิจโลก & SENTIMENT</span>
              <span className="text-[10px] text-emerald-400 font-mono bg-emerald-950/60 px-1.5 py-0.2 rounded border border-emerald-800/60">
                สรุปไทย 🇹🇭
              </span>
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Sentiment Filter Tabs */}
          <div className="flex rounded-lg bg-[#0e1422] p-0.5 border border-white/[0.07] text-xs">
            <button
              onClick={() => setSentimentFilter('all')}
              className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors ${
                sentimentFilter === 'all'
                  ? 'bg-blue-600 text-white shadow-sm font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              ทั้งหมด
            </button>
            <button
              onClick={() => setSentimentFilter('Bullish')}
              className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors ${
                sentimentFilter === 'Bullish'
                  ? 'bg-emerald-600 text-white shadow-sm font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              บวก 🟢
            </button>
            <button
              onClick={() => setSentimentFilter('Bearish')}
              className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors ${
                sentimentFilter === 'Bearish'
                  ? 'bg-rose-600 text-white shadow-sm font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              ลบ 🔴
            </button>
          </div>

          {/* Lang Toggle */}
          <button
            onClick={() => setShowOriginalLang(!showOriginalLang)}
            title="สลับภาษาข่าว"
            className="p-1 rounded bg-[#0e1422] border border-white/[0.07] text-slate-400 hover:text-white transition-colors text-[10px] flex items-center gap-1 px-1.5"
          >
            <Globe className="w-3 h-3" />
            <span>{showOriginalLang ? 'EN' : 'ไทย'}</span>
          </button>
        </div>
      </div>

      {/* News Article List */}
      <div className="divide-y divide-white/[0.05] overflow-y-auto max-h-[580px] p-2 space-y-1.5">
        {filteredArticles.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-xs thai-text">
            ไม่มีข่าวที่ตรงกับตัวกรองในขณะนี้
          </div>
        ) : (
          filteredArticles.map((article) => {
            const isBull = article.sentiment_label === 'Bullish';
            const isBear = article.sentiment_label === 'Bearish';
            const timeAgo = Math.max(
              1,
              Math.floor((Date.now() - new Date(article.published_at).getTime()) / (1000 * 60))
            );

            const displayTitle = showOriginalLang ? article.headline : (article.thai_headline || article.headline);
            const displaySummary = showOriginalLang ? article.summary : (article.thai_summary || article.summary);

            return (
              <div
                key={article.id}
                className="p-3 rounded-lg hover:bg-white/[0.03] transition-all border border-transparent hover:border-white/[0.06]"
              >
                {/* Top Meta Line */}
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded bg-blue-950/80 text-blue-400 border border-blue-800/60 uppercase">
                      {article.ticker}
                    </span>
                    <span className="text-[10px] text-slate-400 truncate max-w-[120px]">
                      {article.source}
                    </span>
                  </div>

                  {/* Sentiment Badge */}
                  <div className="flex items-center gap-1">
                    <span
                      className={`inline-flex items-center gap-1 font-mono text-[10px] font-bold px-1.5 py-0.2 rounded-full border ${
                        isBull
                          ? 'text-emerald-400 bg-emerald-950/60 border-emerald-800/60'
                          : isBear
                          ? 'text-rose-400 bg-rose-950/60 border-rose-800/60'
                          : 'text-amber-400 bg-amber-950/60 border-amber-800/60'
                      }`}
                    >
                      {isBull ? <TrendingUp className="w-3 h-3" /> : isBear ? <TrendingDown className="w-3 h-3" /> : null}
                      <span>
                        {isBull ? 'Bullish (บวก)' : isBear ? 'Bearish (ลบ)' : 'Neutral'}
                      </span>
                    </span>
                  </div>
                </div>

                {/* Headline */}
                <a
                  href={article.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-semibold text-slate-100 hover:text-blue-400 transition-colors line-clamp-2 mb-1 flex items-start gap-1 group thai-text"
                >
                  <span>{displayTitle}</span>
                  <ExternalLink className="w-3 h-3 text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-0.5" />
                </a>

                {/* Thai Summary */}
                <p className="text-[11px] text-slate-400 line-clamp-2 mb-2 leading-relaxed thai-text">
                  {displaySummary}
                </p>

                {/* Footer Time */}
                <div className="flex items-center text-[10px] text-slate-500 gap-1 font-mono">
                  <Clock className="w-3 h-3" />
                  <span>
                    {mounted ? (timeAgo < 60 ? `${timeAgo} นาทีที่แล้ว` : `${Math.floor(timeAgo / 60)} ชม. ที่แล้ว`) : '...'}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
