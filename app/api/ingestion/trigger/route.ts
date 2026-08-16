import { NextResponse } from 'next/server';
import { getSystemSettings, savePriceSnapshot, saveSignal, pruneOldRecords } from '@/lib/db/localDb';
import { DEFAULT_SYMBOLS } from '@/lib/constants/defaultSymbols';
import { fetchLiveQuote, fetchCandleHistory } from '@/lib/ingestion/finnhubClient';
import { computeTechnicalIndicators } from '@/lib/signal-engine/indicators';
import { calculateProbabilityScore } from '@/lib/signal-engine/probability';
import { getCachedDailyNews } from '@/lib/ingestion/newsCache';
import { validateTradeSignal } from '@/lib/signal-engine/aiValidator';
import { getMarketStatus } from '@/lib/market/marketSchedule';
import { sendTelegramSignalAlert } from '@/lib/alerts/telegram';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';
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

    // 1. Smart Daily News Caching (12-24h TTL)
    const news = await getCachedDailyNews(targetSymbols.map((s) => s.ticker));
    const processed = [];

    for (const sym of targetSymbols) {
      try {
        // 2. Market Schedule Guard (Check if market is open)
        const marketStatus = getMarketStatus(sym.asset_type, sym.ticker);

        // Fetch Real-time Live Price & 100% Real-time Technical Indicators
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

        // Check Win Rate Threshold (e.g. >= 80%)
        const alertThreshold = (settings.min_alert_probability || sym.alert_threshold || 0.70) * 100;
        let alertSent = false;
        let alertResult = null;
        let validatorResult = null;

        const isActionable = signal.direction !== 'NEUTRAL';
        const currentWinRate = signal.win_rate_percent || 50;

        // ONLY trigger alert if:
        // 1. Market is OPEN (Not Weekend / Closed hours)
        // 2. Telegram is enabled
        // 3. Direction is BUY or SELL
        // 4. Win Rate >= Threshold (e.g. >= 80%)
        if (
          marketStatus.isOpen &&
          settings.telegram_enabled &&
          isActionable &&
          currentWinRate >= alertThreshold
        ) {
          // 3. Dual-Agent AI Validator (Agent 2 Cross-Checks Risk)
          validatorResult = await validateTradeSignal(signal, indicators, news);

          if (validatorResult.isValid) {
            alertResult = await sendTelegramSignalAlert(signal, undefined, validatorResult);
            alertSent = alertResult.success;
          }
        }

        // Persist to Turso Cloud Database
        await savePriceSnapshot(quote);
        await saveSignal(signal);

        processed.push({
          ticker: sym.ticker,
          price: quote.price,
          direction: signal.direction,
          winRate: currentWinRate,
          alertThreshold: alertThreshold,
          marketStatus: marketStatus.isOpen ? 'OPEN' : 'CLOSED',
          marketSession: marketStatus.sessionName,
          alertSent,
          alertReason: !marketStatus.isOpen
            ? `Market is CLOSED (${marketStatus.reason}) — Alert suppressed`
            : !isActionable
            ? 'Direction is NEUTRAL'
            : currentWinRate < alertThreshold
            ? `Win rate ${currentWinRate}% is below minimum threshold ${alertThreshold}%`
            : validatorResult && !validatorResult.isValid
            ? `Blocked by AI Risk Validator: ${validatorResult.validationNotes}`
            : 'Alert validated by Dual-Agent and broadcasted to Telegram',
          validator: validatorResult,
          alertResult,
        });
      } catch (itemErr) {
        processed.push({
          ticker: sym.ticker,
          error: (itemErr as Error).message,
        });
      }
    }

    // 4. Auto-Pruning: Clean records older than 7 days
    const pruneResult = await pruneOldRecords(7).catch(() => ({ deletedSignals: 0, deletedPrices: 0, deletedNews: 0 }));

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      focusSymbol: settings.focus_symbol,
      processedCount: processed.length,
      autoPruning: pruneResult,
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
