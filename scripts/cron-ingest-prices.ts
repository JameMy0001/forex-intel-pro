import path from 'path';
import * as dotenv from 'dotenv';
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });
dotenv.config();

import { DEFAULT_SYMBOLS } from '../lib/constants/defaultSymbols';
import { fetchLiveQuote, fetchCandleHistory } from '../lib/ingestion/finnhubClient';
import { computeTechnicalIndicators } from '../lib/signal-engine/indicators';
import { calculateProbabilityScore } from '../lib/signal-engine/probability';
import { fetchMarketauxNews } from '../lib/ingestion/marketauxClient';
import { sendTelegramSignalAlert } from '../lib/alerts/telegram';
import { getSupabaseServerClient } from '../lib/supabase/server';

async function runPricesIngestion() {
  console.log(`[${new Date().toISOString()}] Starting Real-time Prices Ingestion & Signal Evaluation...`);

  const { getSystemSettings, savePriceSnapshot, saveSignal } = await import('../lib/db/localDb');
  const settings = await getSystemSettings();

  let targetSymbols = DEFAULT_SYMBOLS;
  if (settings.focus_symbol && settings.focus_symbol !== 'ALL') {
    targetSymbols = DEFAULT_SYMBOLS.filter((s) => s.ticker === settings.focus_symbol);
    console.log(`[Focus Mode Active] Ingesting ONLY locked symbol: ${settings.focus_symbol}`);
  } else if (settings.active_symbols && settings.active_symbols.length > 0) {
    targetSymbols = DEFAULT_SYMBOLS.filter((s) => settings.active_symbols.includes(s.ticker));
  }

  const news = await fetchMarketauxNews(targetSymbols.map((s) => s.ticker));

  for (const sym of targetSymbols) {
    try {
      console.log(`-> Fetching live quote for ${sym.ticker}...`);
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

      const winRate = signal.win_rate_percent || 50;
      console.log(`   [${sym.ticker}] Price: ${quote.price} | Action: ${signal.direction} | Win Rate: ${winRate}%`);

      // Check alert trigger threshold based on custom settings (e.g. >= 70%)
      const alertThreshold = (settings.min_alert_probability || sym.alert_threshold || 0.70) * 100;
      const isActionable = signal.direction !== 'NEUTRAL';

      if (settings.telegram_enabled && isActionable && winRate >= alertThreshold) {
        console.log(`   🚨 High conviction threshold triggered for ${sym.ticker} (Win Rate: ${winRate}% >= ${alertThreshold}%)! Sending Telegram Alert...`);
        const alertRes = await sendTelegramSignalAlert(signal);
        console.log(`   Telegram Alert Result:`, alertRes);
      }

      // Save to Turso / Local SQLite Database
      await savePriceSnapshot(quote);
      await saveSignal(signal);
    } catch (err) {
      console.error(`Error processing ${sym.ticker}:`, (err as Error).message);
    }
  }

  console.log(`[${new Date().toISOString()}] Price ingestion completed successfully.`);
}

runPricesIngestion().catch(console.error);
