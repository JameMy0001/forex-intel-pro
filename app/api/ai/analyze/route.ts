import { NextResponse } from 'next/server';
import { generateAIAnalysis } from '@/lib/signal-engine/aiAnalyst';
import { fetchLiveQuote, fetchCandleHistory } from '@/lib/ingestion/finnhubClient';
import { fetchMarketauxNews } from '@/lib/ingestion/marketauxClient';
import { computeTechnicalIndicators } from '@/lib/signal-engine/indicators';
import { calculateProbabilityScore } from '@/lib/signal-engine/probability';
import { DEFAULT_SYMBOLS } from '@/lib/constants/defaultSymbols';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const ticker = (body.ticker || 'EURUSD').toUpperCase();
    const symbolInfo = DEFAULT_SYMBOLS.find((s) => s.ticker === ticker) || {
      ticker,
      finnhub_symbol: ticker,
      display_name: ticker,
      asset_type: ticker.length === 6 ? 'forex' : 'stock',
      category: 'General',
      is_active: true,
      alert_threshold: 0.70,
    };

    const [quote, candles, newsArticles] = await Promise.all([
      fetchLiveQuote(ticker, symbolInfo.asset_type),
      fetchCandleHistory(ticker, symbolInfo.asset_type, 'D', 60),
      fetchMarketauxNews([ticker]).catch((err) => {
        console.warn(`[AI Analyze API] Failed to fetch news for ${ticker}:`, err.message);
        return [];
      }),
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
      aiAnalysis,
      signal,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
