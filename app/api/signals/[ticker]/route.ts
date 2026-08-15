import { NextResponse } from 'next/server';
import { DEFAULT_SYMBOLS } from '@/lib/constants/defaultSymbols';
import { fetchLiveQuote, fetchCandleHistory } from '@/lib/ingestion/finnhubClient';
import { fetchMarketauxNews } from '@/lib/ingestion/marketauxClient';
import { computeTechnicalIndicators } from '@/lib/signal-engine/indicators';
import { calculateProbabilityScore } from '@/lib/signal-engine/probability';
import { generateAIAnalysis } from '@/lib/signal-engine/aiAnalyst';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: { ticker: string } }
) {
  try {
    const ticker = params.ticker.toUpperCase();
    const symbolInfo = DEFAULT_SYMBOLS.find(
      (s) => s.ticker === ticker || s.ticker.replace('/', '') === ticker
    ) || {
      ticker,
      finnhub_symbol: ticker,
      display_name: ticker,
      asset_type: ticker.length === 6 ? 'forex' : 'stock',
      category: 'Custom',
      is_active: true,
      alert_threshold: 0.70,
    };

    // Parallel fetch of Quote, Candles, and News
    const [quote, candles, newsArticles] = await Promise.all([
      fetchLiveQuote(ticker, symbolInfo.asset_type),
      fetchCandleHistory(ticker, symbolInfo.asset_type, 'D', 60),
      fetchMarketauxNews([ticker]),
    ]);

    const indicators = computeTechnicalIndicators(candles, ticker, '1D');
    const signal = calculateProbabilityScore(
      ticker,
      quote.price,
      quote.change_percent || 0,
      symbolInfo.asset_type,
      indicators,
      newsArticles
    );

    const aiAnalysis = await generateAIAnalysis(
      ticker,
      quote.price,
      signal,
      indicators,
      newsArticles
    );

    return NextResponse.json({
      success: true,
      ticker,
      symbol: symbolInfo,
      quote,
      candles,
      indicators,
      signal,
      aiAnalysis,
      newsArticles: newsArticles.filter(
        (a) => a.ticker === ticker || a.headline.toUpperCase().includes(ticker)
      ),
    });
  } catch (error) {
    console.error(`API /api/signals/[ticker] error for ${params.ticker}:`, error);
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
