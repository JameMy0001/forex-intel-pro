import { NextResponse } from 'next/server';
import { DEFAULT_SYMBOLS } from '@/lib/constants/defaultSymbols';
import { fetchLiveQuote, fetchCandleHistory } from '@/lib/ingestion/finnhubClient';
import { getCachedDailyNews } from '@/lib/ingestion/newsCache';
import { computeTechnicalIndicators } from '@/lib/signal-engine/indicators';
import { calculateProbabilityScore, applyProbabilityPenalty } from '@/lib/signal-engine/probability';
import { generateAIAnalysis } from '@/lib/signal-engine/aiAnalyst';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

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
    const newsArticles = await getCachedDailyNews(tickerList);

    // Parallel fetch & compute signals
    const signalPromises = symbols.map(async (sym) => {
      try {
        const [quote, candles1D, candles4H] = await Promise.all([
          fetchLiveQuote(sym.ticker, sym.asset_type),
          fetchCandleHistory(sym.ticker, sym.asset_type, 'D', 60),
          fetchCandleHistory(sym.ticker, sym.asset_type, '240', 80), // 4H timeframe
        ]);

        const indicators = computeTechnicalIndicators(candles1D, sym.ticker, '1D');
        const indicators4H = candles4H.length > 30 ? computeTechnicalIndicators(candles4H, sym.ticker, '4H') : undefined;

        const signal = calculateProbabilityScore(
          sym.ticker,
          quote.price,
          quote.change_percent || 0,
          sym.asset_type,
          indicators,
          newsArticles,
          indicators4H
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

    // Portfolio Correlation Risk Adjustments
    let usdBullCount = 0;
    let usdBearCount = 0;
    
    // 1st Pass: Count USD correlation direction
    for (const item of filteredResults) {
      if (item && item.signal.ticker.includes('USD')) {
        const isUsdBase = item.signal.ticker.startsWith('USD'); // e.g. USDJPY
        const isBullish = item.signal.direction.includes('BUY');
        
        if ((isUsdBase && isBullish) || (!isUsdBase && !isBullish)) {
          usdBullCount++;
        } else {
          usdBearCount++;
        }
      }
    }

    // 2nd Pass: Penalize if over-exposed to USD
    for (const item of filteredResults) {
      if (item && item.signal.ticker.includes('USD')) {
        const isUsdBase = item.signal.ticker.startsWith('USD');
        const isBullish = item.signal.direction.includes('BUY');
        const isUsdBullTrade = (isUsdBase && isBullish) || (!isUsdBase && !isBullish);
        
        if (isUsdBullTrade && usdBullCount >= 3) {
           item.signal = applyProbabilityPenalty(item.signal, 0.9, '[⚠️ High USD Correlation Risk: Reduced Size]');
        } else if (!isUsdBullTrade && usdBearCount >= 3) {
           item.signal = applyProbabilityPenalty(item.signal, 0.9, '[⚠️ High USD Correlation Risk: Reduced Size]');
        }
      }
    }

    // Save to Turso / SQLite Database
    try {
      const { savePriceSnapshot, saveSignal, saveNewsArticles, getRecentSignals } = await import('@/lib/db/localDb');
      await saveNewsArticles(newsArticles);
      for (const item of results) {
        if (item) {
          await savePriceSnapshot(item.quote);
          
          const recent = await getRecentSignals(item.signal.ticker, 1);
          const lastSignal = recent[0];
          const lastComputedAt = lastSignal?.computed_at ? new Date(String(lastSignal.computed_at)).getTime() : 0;
          const isRecent = Date.now() - lastComputedAt < 30 * 60 * 1000; // 30 min
          const sameDirection = lastSignal?.direction === item.signal.direction;
          
          if (!isRecent || !sameDirection) {
            await saveSignal(item.signal);
          }
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
