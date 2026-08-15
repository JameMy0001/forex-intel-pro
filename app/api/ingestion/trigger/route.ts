import { NextResponse } from 'next/server';
import { getSystemSettings, savePriceSnapshot, saveSignal } from '@/lib/db/localDb';
import { DEFAULT_SYMBOLS } from '@/lib/constants/defaultSymbols';
import { fetchLiveQuote, fetchCandleHistory } from '@/lib/ingestion/finnhubClient';
import { computeTechnicalIndicators } from '@/lib/signal-engine/indicators';
import { calculateProbabilityScore } from '@/lib/signal-engine/probability';
import { fetchMarketauxNews } from '@/lib/ingestion/marketauxClient';
import { sendTelegramSignalAlert } from '@/lib/alerts/telegram';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // Allow full execution time on Vercel Serverless

export async function GET(request: Request) {
  try {
    const settings = await getSystemSettings();

    let targetSymbols = DEFAULT_SYMBOLS;
    if (settings.focus_symbol && settings.focus_symbol !== 'ALL') {
      targetSymbols = DEFAULT_SYMBOLS.filter((s) => s.ticker === settings.focus_symbol);
    } else if (settings.active_symbols && settings.active_symbols.length > 0) {
      targetSymbols = DEFAULT_SYMBOLS.filter((s) => settings.active_symbols.includes(s.ticker));
    }

    const news = await fetchMarketauxNews(targetSymbols.map((s) => s.ticker));
    const processed = [];

    for (const sym of targetSymbols) {
      try {
        const quote = await fetchLiveQuote(sym.ticker, sym.asset_type);
        const candles = await fetchCandleHistory(sym.ticker, sym.asset_type, 'D', 60);
        const indicators = computeTechnicalIndicators(candles, sym.ticker, '1D');
        const signal = calculateProbabilityScore(
          sym.ticker,
          quote.price,
          quote.change_percent || 0,
          sym.asset_type,
          indicators,
          news
        );

        // Check and send Telegram Alert
        const alertThreshold = settings.min_alert_probability || sym.alert_threshold;
        let alertSent = false;
        let alertResult = null;

        if (
          settings.telegram_enabled &&
          (signal.probability_score >= alertThreshold || signal.probability_score <= (1 - alertThreshold))
        ) {
          alertResult = await sendTelegramSignalAlert(signal);
          alertSent = alertResult.success;
        }

        // Persist to Turso Cloud Database
        await savePriceSnapshot(quote);
        await saveSignal(signal);

        processed.push({
          ticker: sym.ticker,
          price: quote.price,
          probability: signal.probability_score,
          direction: signal.direction,
          alertSent,
          alertResult,
        });
      } catch (itemErr) {
        processed.push({
          ticker: sym.ticker,
          error: (itemErr as Error).message,
        });
      }
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      focusSymbol: settings.focus_symbol,
      processedCount: processed.length,
      results: processed,
    });
  } catch (error) {
    console.error('Ingestion Trigger Error:', error);
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
