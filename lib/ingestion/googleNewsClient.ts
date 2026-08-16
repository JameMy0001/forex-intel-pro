import { NewsArticle, SentimentLabel } from '../types';
import { calculateTextSentiment, getSentimentLabel } from './marketauxClient';
import { saveNewsArticles } from '../db/localDb';

/**
 * Google News RSS Feed — Zero rate limit, no API key needed.
 * Aggregates news from Bloomberg, Reuters, CNBC, FT, MarketWatch,
 * FXStreet, DailyFX, Investing.com based on ticker-aware search queries.
 */

const TICKER_QUERIES: Record<string, string[]> = {
  EURUSD: ['EUR/USD forex', 'Euro Dollar ECB Fed'],
  GBPUSD: ['GBP/USD pound sterling', 'Bank of England BOE forex'],
  USDJPY: ['USD/JPY dollar yen', 'Bank of Japan BOJ intervention'],
  AUDUSD: ['AUD/USD aussie dollar', 'Reserve Bank Australia RBA'],
  USDCHF: ['USD/CHF dollar franc', 'SNB Swiss National Bank'],
  USDCAD: ['USD/CAD dollar loonie', 'Bank of Canada oil'],
  GBPJPY: ['GBP/JPY pound yen', 'sterling yen cross'],
  EURJPY: ['EUR/JPY euro yen', 'ECB BOJ policy'],
  XAUUSD: ['gold price XAUUSD', 'gold bullion Fed inflation'],
  AAPL: ['Apple Inc AAPL stock earnings'],
  NVDA: ['NVIDIA NVDA GPU AI earnings'],
  TSLA: ['Tesla TSLA EV earnings'],
  MSFT: ['Microsoft MSFT Azure cloud AI'],
  AMZN: ['Amazon AMZN AWS ecommerce'],
  GOOGL: ['Alphabet Google GOOGL AI search'],
  SPY: ['S&P 500 SPY market stocks Fed'],
};

const TRUSTED_SOURCES_PRIORITY = [
  'Reuters', 'Bloomberg', 'Financial Times', 'CNBC', 'MarketWatch',
  'FXStreet', 'DailyFX', 'Investing.com', 'Forexlive', 'The Wall Street Journal',
  'Barron\'s', 'Benzinga', 'Yahoo Finance',
];

/**
 * Parse Google News RSS XML and extract article metadata
 */
function parseGoogleNewsRSS(xml: string, ticker: string): NewsArticle[] {
  const articles: NewsArticle[] = [];

  const items = xml.match(/<item>([\s\S]*?)<\/item>/g) || [];

  for (const item of items.slice(0, 10)) {
    try {
      const rawTitle = item.match(/<title>([\s\S]*?)<\/title>/)?.[1] || '';
      const link = item.match(/<link>([\s\S]*?)<\/link>/)?.[1] || '';
      const pubDate = item.match(/<pubDate>([\s\S]*?)<\/pubDate>/)?.[1] || '';
      const sourceTag = item.match(/<source[^>]*>([\s\S]*?)<\/source>/)?.[1] || 'Google News';

      // Clean HTML entities
      const title = rawTitle
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/\s*-\s*[\w\s]+$/, '') // Remove " - Source Name" suffix
        .trim();

      if (!title || title.length < 10) continue;

      // Parse publish date
      const publishedAt = pubDate ? new Date(pubDate).toISOString() : new Date().toISOString();
      if (isNaN(new Date(publishedAt).getTime())) continue;

      // Skip articles older than 48 hours
      const ageHours = (Date.now() - new Date(publishedAt).getTime()) / 3600000;
      if (ageHours > 48) continue;

      const sentimentScore = calculateTextSentiment(title);
      const sentimentLabel = getSentimentLabel(sentimentScore);
      const articleId = `gnews-${ticker}-${Buffer.from(link).toString('base64').slice(0, 16)}`;

      articles.push({
        id: articleId,
        ticker,
        headline: title,
        summary: title, // Google News RSS doesn't include full body
        source: sourceTag,
        url: link,
        published_at: publishedAt,
        sentiment_score: sentimentScore,
        sentiment_label: sentimentLabel,
      });
    } catch {
      // Skip malformed items
    }
  }

  return articles;
}

/**
 * Build a Google News RSS URL for a given search query
 */
function buildGoogleNewsUrl(query: string): string {
  const encoded = encodeURIComponent(query);
  return `https://news.google.com/rss/search?q=${encoded}&hl=en-US&gl=US&ceid=US:en`;
}

/**
 * Fetch news for a single ticker from Google News RSS
 */
async function fetchTickerNewsFromGoogle(ticker: string): Promise<NewsArticle[]> {
  const queries = TICKER_QUERIES[ticker] || [`${ticker} market news`];
  const articles: NewsArticle[] = [];
  const seenTitles = new Set<string>();

  for (const query of queries.slice(0, 2)) {
    try {
      const url = buildGoogleNewsUrl(query);
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; NewsBot/1.0)',
          'Accept': 'application/rss+xml, application/xml, text/xml',
        },
        signal: AbortSignal.timeout(8000),
      });

      if (!res.ok) continue;

      const xml = await res.text();
      const parsed = parseGoogleNewsRSS(xml, ticker);

      for (const article of parsed) {
        const normalizedTitle = article.headline.toLowerCase().substring(0, 60);
        if (!seenTitles.has(normalizedTitle)) {
          seenTitles.add(normalizedTitle);
          articles.push(article);
        }
      }
    } catch {
      // Network timeout or parse error — continue to next query
    }
  }

  return articles;
}

/**
 * Fetch Finnhub general market news as additional source
 */
async function fetchFinnhubNewsForTicker(ticker: string, assetType: string): Promise<NewsArticle[]> {
  const FINNHUB_API_KEY = process.env.FINNHUB_API_KEY;
  if (!FINNHUB_API_KEY) return [];

  try {
    const category = assetType === 'stock' ? 'general' : 'forex';
    const url = `https://finnhub.io/api/v1/news?category=${category}&minId=0&token=${FINNHUB_API_KEY}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
    if (!res.ok) return [];

    const data: any[] = await res.json();
    if (!Array.isArray(data)) return [];

    return data
      .filter(item => item.headline && item.datetime)
      .slice(0, 5)
      .map(item => {
        const headline = String(item.headline || '');
        const sentimentScore = calculateTextSentiment(headline + ' ' + (item.summary || ''));
        return {
          id: `finnhub-${ticker}-${item.id}`,
          ticker,
          headline,
          summary: String(item.summary || headline),
          source: String(item.source || 'Finnhub'),
          url: String(item.url || ''),
          published_at: new Date(item.datetime * 1000).toISOString(),
          sentiment_score: sentimentScore,
          sentiment_label: getSentimentLabel(sentimentScore) as SentimentLabel,
        };
      });
  } catch {
    return [];
  }
}

/**
 * Main multi-source news aggregator.
 * Priority: Google News RSS (unlimited) → Finnhub → Marketaux (fallback if key available)
 * Deduplicates by title similarity before returning.
 */
export async function fetchAggregatedNews(tickers: string[]): Promise<NewsArticle[]> {
  const allArticles: NewsArticle[] = [];
  const seenTitles = new Set<string>();

  // Fetch concurrently for all tickers (max 4 concurrent to avoid network strain)
  const batchSize = 4;
  for (let i = 0; i < tickers.length; i += batchSize) {
    const batch = tickers.slice(i, i + batchSize);
    const results = await Promise.allSettled(
      batch.map(ticker => fetchTickerNewsFromGoogle(ticker))
    );

    for (const result of results) {
      if (result.status === 'fulfilled') {
        for (const article of result.value) {
          const key = article.headline.toLowerCase().substring(0, 50);
          if (!seenTitles.has(key)) {
            seenTitles.add(key);
            allArticles.push(article);
          }
        }
      }
    }
  }

  // Add Finnhub general + forex news for breadth (one call covers all tickers)
  const finnhubNews = await fetchFinnhubNewsForTicker('MARKET', 'forex').catch(() => []);
  for (const article of finnhubNews) {
    const key = article.headline.toLowerCase().substring(0, 50);
    if (!seenTitles.has(key)) {
      seenTitles.add(key);
      allArticles.push(article);
    }
  }

  // Sort by recency
  allArticles.sort((a, b) => new Date(b.published_at).getTime() - new Date(a.published_at).getTime());

  // Persist to DB for caching
  if (allArticles.length > 0) {
    await saveNewsArticles(allArticles).catch(() => {});
  }

  console.log(`[NewsAggregator] Fetched ${allArticles.length} deduplicated articles from Google News RSS + Finnhub`);
  return allArticles;
}
