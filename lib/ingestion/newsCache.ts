import { NewsArticle } from '../types';
import { saveNewsArticles, ensureTables, getDbClient } from '../db/localDb';
import { fetchMarketauxNews } from './marketauxClient';

/**
 * Get cached daily news articles or fetch fresh if stale
 */
export async function getCachedDailyNews(
  tickers: string[],
  forceFresh = false
): Promise<NewsArticle[]> {
  try {
    if (!forceFresh) {
      await ensureTables();
      const db = getDbClient();
      
      // Check if we have recent news in DB within 12 hours
      const res = await db.execute(`
        SELECT * FROM news 
        WHERE published_at >= datetime('now', '-12 hours')
        ORDER BY published_at DESC 
        LIMIT 30
      `);

      if (res.rows.length >= 3) {
        return res.rows.map((r: any) => ({
          id: String(r.id),
          ticker: String(r.ticker || tickers[0] || 'MARKET'),
          headline: String(r.headline || r.title || 'Market Update'),
          summary: String(r.summary || r.description || ''),
          thai_headline: r.thai_headline ? String(r.thai_headline) : undefined,
          thai_summary: r.thai_summary ? String(r.thai_summary) : undefined,
          url: String(r.url || ''),
          source: String(r.source || 'Financial News'),
          published_at: String(r.published_at),
          sentiment_score: Number(r.sentiment_score || 0),
          sentiment_label: (r.sentiment_label || 'Neutral') as any,
        }));
      }
    }

    // Otherwise fetch fresh news from Marketaux / Finnhub
    const freshNews = await fetchMarketauxNews(tickers);
    if (freshNews.length > 0) {
      await saveNewsArticles(freshNews);
    }
    return freshNews;
  } catch (err) {
    console.warn('[NewsCache] Failed to load cached news, falling back to live fetch:', err);
    return await fetchMarketauxNews(tickers).catch(() => []);
  }
}
