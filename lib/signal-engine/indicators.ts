import { CandleData, TechnicalIndicators } from '../types';
import { RSI, MACD, BollingerBands, EMA, ATR, ADX } from 'technicalindicators';

/**
 * Compute all technical indicators from raw OHLCV candle series
 */
export function computeTechnicalIndicators(
  candles: CandleData[],
  ticker: string,
  timeframe: string = '1D'
): TechnicalIndicators {
  if (!candles || candles.length < 20) {
    // Return safe default indicator baseline if candle history is short
    return {
      ticker,
      timeframe,
      rsi_14: 50,
      macd_value: 0,
      macd_signal: 0,
      macd_histogram: 0,
      bollinger_upper: 0,
      bollinger_middle: 0,
      bollinger_lower: 0,
      ema_20: 0,
      ema_50: 0,
      ema_200: 0,
      atr_14: 0,
      adx_14: 0,
      recent_high: 0,
      recent_low: 0,
      market_regime: 'RANGING',
      trend_bias: 'RANGING',
      computed_at: new Date().toISOString(),
    };
  }

  const closes = candles.map((c) => c.close);
  const highs = candles.map((c) => c.high);
  const lows = candles.map((c) => c.low);
  const currentPrice = closes[closes.length - 1];

  // 1. RSI (14)
  const rsiResults = RSI.calculate({
    values: closes,
    period: 14,
  });
  const latestRSI = rsiResults.length > 0 ? rsiResults[rsiResults.length - 1] : 50;

  // 2. MACD (12, 26, 9)
  const macdResults = MACD.calculate({
    values: closes,
    fastPeriod: 12,
    slowPeriod: 26,
    signalPeriod: 9,
    SimpleMAOscillator: false,
    SimpleMASignal: false,
  });
  const latestMACD = macdResults.length > 0
    ? macdResults[macdResults.length - 1]
    : { MACD: 0, signal: 0, histogram: 0 };

  // 3. Bollinger Bands (20, 2)
  const bbResults = BollingerBands.calculate({
    values: closes,
    period: 20,
    stdDev: 2,
  });
  const latestBB = bbResults.length > 0
    ? bbResults[bbResults.length - 1]
    : { upper: currentPrice * 1.02, middle: currentPrice, lower: currentPrice * 0.98 };

  // 4. EMAs (20, 50, 200)
  const ema20Results = EMA.calculate({ values: closes, period: Math.min(20, closes.length - 1) });
  const ema50Results = closes.length >= 50
    ? EMA.calculate({ values: closes, period: 50 })
    : ema20Results;
  // When candle history < 200 bars, use last known price as EMA-200 proxy.
  // This avoids the critical bug where EMA-50 was used as EMA-200,
  // causing trend_bias to always appear BULLISH on short datasets.
  const ema200Results = closes.length >= 200
    ? EMA.calculate({ values: closes, period: 200 })
    : [];

  const latestEMA20 = ema20Results.length > 0 ? ema20Results[ema20Results.length - 1] : currentPrice;
  const latestEMA50 = ema50Results.length > 0 ? ema50Results[ema50Results.length - 1] : currentPrice * 0.99;
  // EMA-200 fallback: if not enough data, use current price (flat / neutral baseline)
  const latestEMA200 = ema200Results.length > 0 ? ema200Results[ema200Results.length - 1] : currentPrice;

  // 5. ATR (14) - Average True Range for volatility & stop loss / take profit
  const atrResults = ATR.calculate({
    high: highs,
    low: lows,
    close: closes,
    period: 14,
  });
  const latestATR = atrResults.length > 0
    ? atrResults[atrResults.length - 1]
    : Math.abs(currentPrice * 0.012);

  // 6. ADX (14) - Average Directional Index for Market Regime
  const adxResults = ADX.calculate({
    high: highs,
    low: lows,
    close: closes,
    period: 14,
  });
  const latestADX = adxResults.length > 0
    ? adxResults[adxResults.length - 1].adx ?? 0
    : 0;

  // 7. Trend Bias Detection
  let trendBias: 'BULLISH' | 'BEARISH' | 'RANGING' = 'RANGING';
  if (currentPrice > latestEMA50 && latestEMA20 > latestEMA50) {
    trendBias = 'BULLISH';
  } else if (currentPrice < latestEMA50 && latestEMA20 < latestEMA50) {
    trendBias = 'BEARISH';
  }

  // 8. Market Regime Detection
  let marketRegime: 'TRENDING' | 'RANGING' | 'VOLATILE' = 'RANGING';
  if (latestATR > currentPrice * 0.02) { // Example threshold for high volatility
    marketRegime = 'VOLATILE';
  } else if (latestADX > 25) {
    marketRegime = 'TRENDING';
  }

  // 9. Structural Support / Resistance (last 5 bars)
  const recentHigh = Math.max(...highs.slice(-5));
  const recentLow = Math.min(...lows.slice(-5));

  return {
    ticker,
    timeframe,
    rsi_14: Number(latestRSI.toFixed(2)),
    macd_value: Number((latestMACD.MACD ?? 0).toFixed(4)),
    macd_signal: Number((latestMACD.signal ?? 0).toFixed(4)),
    macd_histogram: Number((latestMACD.histogram ?? 0).toFixed(4)),
    bollinger_upper: Number(latestBB.upper.toFixed(4)),
    bollinger_middle: Number(latestBB.middle.toFixed(4)),
    bollinger_lower: Number(latestBB.lower.toFixed(4)),
    ema_20: Number(latestEMA20.toFixed(4)),
    ema_50: Number(latestEMA50.toFixed(4)),
    ema_200: Number(latestEMA200.toFixed(4)),
    atr_14: Number(latestATR.toFixed(4)),
    adx_14: Number(latestADX.toFixed(4)),
    recent_high: Number(recentHigh.toFixed(4)),
    recent_low: Number(recentLow.toFixed(4)),
    market_regime: marketRegime,
    trend_bias: trendBias,
    computed_at: new Date().toISOString(),
  };
}
