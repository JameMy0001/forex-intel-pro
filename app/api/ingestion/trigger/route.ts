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
import { isAlertOnCooldown, logAlertSent } from '@/lib/alerts/alertCooldown';
import { getMacroYieldState } from '@/lib/market/macroYield';
import { getCoTState, checkCoTVeto } from '@/lib/market/cotTracker';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';
export const maxDuration = 60; // Allow full execution time on Vercel Serverless

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    
    // Allow if CRON_SECRET matches (for Vercel Cron)
    const isCronAuthorized = cronSecret && authHeader === `Bearer ${cronSecret}`;
    // Or if accessing via browser/tool during dev, allow via query param for testing (only if explicitly set in env)
    const url = new URL(request.url);
    const token = url.searchParams.get('token');
    const isTokenAuthorized = cronSecret && token === cronSecret;

    if (!isCronAuthorized && !isTokenAuthorized && process.env.NODE_ENV === 'production') {
      console.warn('[Ingestion Trigger] Unauthorized access attempt');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const settings = await getSystemSettings();

    let targetSymbols = DEFAULT_SYMBOLS;
    if (settings.focus_symbol && settings.focus_symbol !== 'ALL') {
      targetSymbols = DEFAULT_SYMBOLS.filter((s) => s.ticker === settings.focus_symbol);
    } else if (settings.active_symbols && settings.active_symbols.length > 0) {
      targetSymbols = DEFAULT_SYMBOLS.filter((s) => settings.active_symbols.includes(s.ticker));
    }

    // 1. Smart Daily News Caching (12-24h TTL)
    const news = await getCachedDailyNews(targetSymbols.map((s) => s.ticker));

    // Process all symbols concurrently to avoid Vercel 60s timeout
    const processed = await Promise.all(targetSymbols.map(async (sym) => {
      try {
        // 2. Market Schedule Guard (Check if market is open)
        const marketStatus = getMarketStatus(sym.asset_type, sym.ticker);

        // Fetch Real-time Live Price & Data Concurrently
        const [quote, candles, macroYield, rawCotState] = await Promise.all([
          fetchLiveQuote(sym.ticker, sym.asset_type),
          fetchCandleHistory(sym.ticker, sym.asset_type, 'D', 60),
          getMacroYieldState(sym.ticker, sym.asset_type as any),
          getCoTState(sym.ticker, sym.asset_type as any)
        ]);

        const indicators = computeTechnicalIndicators(candles, sym.ticker, '1D');
        let signal = calculateProbabilityScore(
          sym.ticker, quote.price, quote.change_percent || 0, sym.asset_type as any, indicators, news, undefined, macroYield, rawCotState
        );

        const cotState = checkCoTVeto(signal.direction, rawCotState);
        if (cotState.veto_signal) {
          signal = calculateProbabilityScore(
            sym.ticker, quote.price, quote.change_percent || 0, sym.asset_type as any, indicators, news, undefined, macroYield, cotState
          );
        }

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
        // 5. Not on cooldown (last alert for this ticker+direction < 4h ago)
        if (
          marketStatus.isOpen &&
          settings.telegram_enabled &&
          isActionable &&
          currentWinRate >= alertThreshold
        ) {
          // Check cooldown — prevent duplicate alerts within 4 hours
          const onCooldown = await isAlertOnCooldown(sym.ticker, signal.direction, 240);

          if (onCooldown) {
            await savePriceSnapshot(quote);
            await saveSignal(signal);
            return {
              ticker: sym.ticker,
              price: quote.price,
              direction: signal.direction,
              winRate: currentWinRate,
              alertThreshold: alertThreshold,
              marketStatus: marketStatus.isOpen ? 'OPEN' : 'CLOSED',
              marketSession: marketStatus.sessionName,
              alertSent: false,
              alertReason: `Cooldown active — duplicate ${signal.direction} alert suppressed (< 4h since last alert)`,
              validator: null,
              alertResult: null,
            };
          }

          // 3. Dual-Agent AI Validator (Agent 2 Cross-Checks Risk)
          validatorResult = await validateTradeSignal(signal, indicators, news);

          if (validatorResult.isValid) {
            alertResult = await sendTelegramSignalAlert(signal, undefined, validatorResult);
            alertSent = alertResult.success;
            if (alertSent) {
              await logAlertSent(sym.ticker, signal.direction, signal.probability_score, `${signal.direction} @ ${signal.recommended_entry}`, 'sent');
            }
          } else {
            await logAlertSent(sym.ticker, signal.direction, signal.probability_score, `BLOCKED: ${validatorResult.validationNotes}`, 'blocked');
          }
        }

        // Persist to Turso Cloud Database
        await savePriceSnapshot(quote);
        await saveSignal(signal);

        return {
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
            ? `Win rate ${currentWinRate}% < ${alertThreshold}%`
            : validatorResult && !validatorResult.isValid
            ? `AI Validator Blocked: ${validatorResult.validationNotes}`
            : 'Alert triggered successfully',
          validator: validatorResult,
          alertResult,
        };
      } catch (err) {
        console.error(`[Ingestion Trigger] Error processing ${sym.ticker}:`, err);
        return {
          ticker: sym.ticker,
          error: (err as Error).message,
        };
      }
    }));

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
