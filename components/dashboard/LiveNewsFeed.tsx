'use client';

import React, { useState } from 'react';
import { NewsArticle } from '@/lib/types';
import { ExternalLink, Newspaper, TrendingUp, TrendingDown, Clock } from 'lucide-react';

interface LiveNewsFeedProps {
  articles: NewsArticle[];
}

export const LiveNewsFeed: React.FC<LiveNewsFeedProps> = ({ articles }) => {
  const [sentimentFilter, setSentimentFilter] = useState<'all' | 'Bullish' | 'Bearish'>('all');

  const filteredArticles = articles.filter((a) => {
    if (sentimentFilter === 'all') return true;
    return a.sentiment_label === sentimentFilter;
  });

  return (
    <div className="terminal-card flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-[#1e293b] flex items-center justify-between bg-[#0d1320]">
        <div className="flex items-center gap-2">
          <Newspaper className="w-4 h-4 text-emerald-400" />
          <h2 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
            LIVE FINANCIAL NEWS & SENTIMENT STREAM
          </h2>
        </div>

        {/* Sentiment Filter Tabs */}
        <div className="flex rounded-md bg-[#131b2c] p-0.5 border border-slate-800 text-xs">
          {(['all', 'Bullish', 'Bearish'] as const).map((label) => (
            <button
              key={label}
              onClick={() => setSentimentFilter(label)}
              className={`px-2.5 py-0.5 rounded text-[11px] font-medium capitalize transition-colors ${
                sentimentFilter === label
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* News Article List */}
      <div className="divide-y divide-[#172033] overflow-y-auto max-h-[580px] p-2 space-y-2">
        {filteredArticles.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-xs">
            No news articles found for current filter.
          </div>
        ) : (
          filteredArticles.map((article) => {
            const isBull = article.sentiment_label === 'Bullish';
            const isBear = article.sentiment_label === 'Bearish';
            const timeAgo = Math.max(
              1,
              Math.floor((Date.now() - new Date(article.published_at).getTime()) / (1000 * 60))
            );

            return (
              <div
                key={article.id}
                className="p-3 rounded-md hover:bg-[#131b2c] transition-colors border border-transparent hover:border-slate-800"
              >
                {/* Top Meta Line */}
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-blue-950/80 text-blue-400 border border-blue-800/60 uppercase">
                      {article.ticker}
                    </span>
                    <span className="text-[11px] text-slate-400 font-medium truncate max-w-[120px]">
                      {article.source}
                    </span>
                  </div>

                  {/* Sentiment Badge */}
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`inline-flex items-center gap-1 font-mono text-[10px] font-bold px-2 py-0.5 rounded border ${
                        isBull
                          ? 'text-emerald-400 bg-emerald-950/60 border-emerald-800/60'
                          : isBear
                          ? 'text-rose-400 bg-rose-950/60 border-rose-800/60'
                          : 'text-amber-400 bg-amber-950/60 border-amber-800/60'
                      }`}
                    >
                      {isBull ? <TrendingUp className="w-3 h-3" /> : isBear ? <TrendingDown className="w-3 h-3" /> : null}
                      {article.sentiment_label} ({article.sentiment_score >= 0 ? '+' : ''}
                      {article.sentiment_score.toFixed(2)})
                    </span>
                  </div>
                </div>

                {/* Headline */}
                <a
                  href={article.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-semibold text-slate-200 hover:text-blue-400 transition-colors line-clamp-2 mb-1 flex items-start gap-1 group"
                >
                  <span>{article.headline}</span>
                  <ExternalLink className="w-3 h-3 text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-0.5" />
                </a>

                {/* Summary */}
                <p className="text-[11px] text-slate-400 line-clamp-2 mb-2 leading-relaxed">
                  {article.summary}
                </p>

                {/* Footer Time */}
                <div className="flex items-center text-[10px] text-slate-500 gap-1 font-mono">
                  <Clock className="w-3 h-3" />
                  <span>
                    {timeAgo < 60 ? `${timeAgo}m ago` : `${Math.floor(timeAgo / 60)}h ago`} •{' '}
                    {new Date(article.published_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
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
