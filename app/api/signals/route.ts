import { NextResponse } from 'next/server';
import { DEFAULT_SYMBOLS } from '@/lib/constants/defaultSymbols';
import { fetchLiveQuote, fetchCandleHistory } from '@/lib/ingestion/finnhubClient';
import { fetchMarketauxNews } from '@/lib/ingestion/marketauxClient';
import { computeTechnicalIndicators } from '@/lib/signal-engine/indicators';
import { calculateProbabilityScore } from '@/lib/signal-engine/probability';
import { generateAIAnalysis } from '@/lib/signal-engine/aiAnalyst';
import { getSupabaseServerClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const assetFilter = searchParams.get('type'); // 'forex' | 'stock' | null
    const thresholdFilter = Number(searchParams.get('minProb') || '0');

    // Get system focus and active symbols from DB
    const { getSystemSettings } = await import('@/lib/db/localDb');
    const settings = await getSystemSettings();

    let symbols = DEFAULT_SYMBOLS;

    // Apply Focus Symbol Lock if configured
    if (settings.focus_symbol && settings.focus_symbol !== 'ALL') {
      symbols = symbols.filter((s) => s.ticker === settings.focus_symbol);
    } else if (settings.active_symbols && settings.active_symbols.length > 0) {
      symbols = symbols.filter((s) => settings.active_symbols.includes(s.ticker));
    }

    if (assetFilter) {
      symbols = symbols.filter((s) => s.asset_type === assetFilter);
    }

    // Fetch news for sentiment calculations
    const tickerList = symbols.map((s) => s.ticker);
    const newsArticles = await fetchMarketauxNews(tickerList);

    // Parallel fetch & compute signals
    const signalPromises = symbols.map(async (sym) => {
      try {
        const [quote, candles] = await Promise.all([
          fetchLiveQuote(sym.ticker, sym.asset_type),
          fetchCandleHistory(sym.ticker, sym.asset_type, 'D', 60),
        ]);

        const indicators = computeTechnicalIndicators(candles, sym.ticker, '1D');
        const signal = calculateProbabilityScore(
          sym.ticker,
          quote.price,
          quote.change_percent || 0,
          sym.asset_type,
          indicators,
          newsArticles
        );

        return {
          symbol: sym,
          quote,
          indicators,
          signal,
        };
      } catch (e) {
        console.error(`Error processing signal for ${sym.ticker}:`, e);
        return null;
      }
    });

    const results = (await Promise.all(signalPromises)).filter(Boolean);

    // Filter by probability if requested
    const filteredResults = thresholdFilter > 0
      ? results.filter((r) => r && r.signal.probability_score >= thresholdFilter)
      : results;

    // Sort by conviction strength (highest probability or strongest directional bias)
    filteredResults.sort((a, b) => {
      const aConviction = Math.abs(a!.signal.probability_score - 0.5);
      const bConviction = Math.abs(b!.signal.probability_score - 0.5);
      return bConviction - aConviction;
    });

    // Save to Turso / SQLite Database
    try {
      const { savePriceSnapshot, saveSignal, saveNewsArticles } = await import('@/lib/db/localDb');
      await saveNewsArticles(newsArticles);
      for (const item of results) {
        if (item) {
          await savePriceSnapshot(item.quote);
          await saveSignal(item.signal);
        }
      }
    } catch (dbErr) {
      console.warn('[DB Log Warning]:', dbErr);
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      count: filteredResults.length,
      data: filteredResults,
      newsFeed: newsArticles.slice(0, 10),
    });
  } catch (error) {
    console.error('API /api/signals error:', error);
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
