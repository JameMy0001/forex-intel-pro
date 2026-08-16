import { NewsArticle } from '../types';
import { saveNewsArticles, ensureTables, getDbClient } from '../db/localDb';
import { fetchAggregatedNews } from './googleNewsClient';
import { fetchMarketauxNews } from './marketauxClient'; // kept as final fallback

/**
 * Get cached daily news articles or fetch fresh if stale.
 * Priority:
 *   1. DB Cache (12h TTL)
 *   2. Google News RSS + Finnhub (unlimited, no rate limits)
 *   3. Marketaux (fallback if Marketaux key has remaining quota)
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
        SELECT * FROM news_articles
        WHERE published_at >= datetime('now', '-12 hours')
        ORDER BY published_at DESC 
        LIMIT 30
      `);

      if (res.rows.length >= 3) {
        console.log(`[NewsCache] Cache HIT — serving ${res.rows.length} cached articles`);
        return res.rows.map((r: any) => ({
          id: String(r.id),
          ticker: String(r.ticker || tickers[0] || 'MARKET'),
          headline: String(r.headline || 'Market Update'),
          summary: String(r.summary || ''),
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

    // Cache MISS — fetch fresh: Google News RSS + Finnhub first (unlimited)
    console.log('[NewsCache] Cache MISS — fetching fresh from Google News RSS + Finnhub...');
    const freshNews = await fetchAggregatedNews(tickers);
    if (freshNews.length >= 1) {
      return freshNews; // saveNewsArticles is already called inside fetchAggregatedNews
    }

    // Last resort fallback: Marketaux (if quota remains)
    console.log('[NewsCache] Google News returned 0 articles — trying Marketaux fallback...');
    const marketauxNews = await fetchMarketauxNews(tickers).catch(() => []);
    if (marketauxNews.length > 0) {
      await saveNewsArticles(marketauxNews).catch(() => {});
    }
    return marketauxNews;

  } catch (err) {
    console.warn('[NewsCache] Error — attempting emergency fallback:', err);
    return await fetchAggregatedNews(tickers).catch(() => []);
  }
}

