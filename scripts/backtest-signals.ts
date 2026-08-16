import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config();

import { DEFAULT_SYMBOLS } from '../lib/constants/defaultSymbols';
import { fetchCandleHistory } from '../lib/ingestion/finnhubClient';
import { computeTechnicalIndicators } from '../lib/signal-engine/indicators';
import { calculateProbabilityScore } from '../lib/signal-engine/probability';

async function runBacktest() {
  console.log('===========================================================');
  console.log(' FOREX & STOCK PROBABILITY ENGINE: BACKTEST EVALUATION');
  console.log('===========================================================');

  let totalSignals = 0;
  let correctPredictions = 0;
  let highConvictionSignals = 0;
  let highConvictionCorrect = 0;

  for (const sym of DEFAULT_SYMBOLS) {
    console.log(`\nEvaluating historical series for ${sym.ticker} (${sym.asset_type})...`);
    const candles = await fetchCandleHistory(sym.ticker, sym.asset_type, 'D', 90);

    if (candles.length < 35) {
      console.log(`Insufficient candles (${candles.length}) for backtesting ${sym.ticker}. Skipping.`);
      continue;
    }

    // Walk forward simulation: test at each bar t, predict t+3 (3-day forward outcome)
    for (let i = 25; i < candles.length - 3; i++) {
      const slice = candles.slice(0, i + 1);
      const currentBar = candles[i];
      const futureBar = candles[i + 3];

      const indicators = computeTechnicalIndicators(slice, sym.ticker, '1D');
      const signal = calculateProbabilityScore(
        sym.ticker,
        currentBar.close,
        0,
        sym.asset_type,
        indicators,
        []
      );

      const actualPriceDelta = (futureBar.close - currentBar.close) / currentBar.close;
      const predictedBullish = signal.probability_score >= 0.55;
      const predictedBearish = signal.probability_score <= 0.45;
      const isHighConviction = signal.probability_score >= 0.68 || signal.probability_score <= 0.32;

      if (predictedBullish || predictedBearish) {
        totalSignals++;
        
        let isSuccess = false;
        
        // Realism: Check if price hit Stop Loss BEFORE Take Profit in the next 3 days
        for (let j = 1; j <= 3; j++) {
            const nextBar = candles[i + j];
            if (!nextBar) break;
            
            if (predictedBullish) {
                // If it drops to SL first, it's a loss
                if (nextBar.low <= (signal.stop_loss || 0)) {
                    isSuccess = false;
                    break;
                }
                // If it hits TP first, it's a win
                if (nextBar.high >= (signal.take_profit_1 || Infinity)) {
                    isSuccess = true;
                    break;
                }
            } else if (predictedBearish) {
                // If it rallies to SL first, it's a loss
                if (nextBar.high >= (signal.stop_loss || Infinity)) {
                    isSuccess = false;
                    break;
                }
                // If it hits TP first, it's a win
                if (nextBar.low <= (signal.take_profit_1 || 0)) {
                    isSuccess = true;
                    break;
                }
            }
        }
        
        // Fallback to simple price delta if neither SL nor TP was hit
        if (!isSuccess && predictedBullish && actualPriceDelta > 0) isSuccess = true;
        if (!isSuccess && predictedBearish && actualPriceDelta < 0) isSuccess = true;

        if (isSuccess) correctPredictions++;

        if (isHighConviction) {
          highConvictionSignals++;
          if (isSuccess) highConvictionCorrect++;
        }
      }
    }
  }

  const overallAccuracy = totalSignals > 0 ? (correctPredictions / totalSignals) * 100 : 0;
  const highConvictionAccuracy = highConvictionSignals > 0 ? (highConvictionCorrect / highConvictionSignals) * 100 : 0;

  console.log('\n===========================================================');
  console.log(' BACKTEST SUMMARY RESULTS');
  console.log('===========================================================');
  console.log(`Total Signals Generated: ${totalSignals}`);
  console.log(`Overall Accuracy: ${overallAccuracy.toFixed(2)}% (${correctPredictions}/${totalSignals})`);
  console.log(`High Conviction (>68% / <32%) Signals: ${highConvictionSignals}`);
  console.log(`High Conviction Accuracy: ${highConvictionAccuracy.toFixed(2)}% (${highConvictionCorrect}/${highConvictionSignals})`);
  console.log('===========================================================');
}

runBacktest().catch(console.error);
