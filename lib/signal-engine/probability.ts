import {
  SignalOutput,
  SignalDirection,
  ConfidenceLevel,
  TechnicalIndicators,
  NewsArticle,
  AssetType,
} from '../types';

/**
 * Standard Sigmoid Function
 */
function sigmoid(z: number): number {
  return 1 / (1 + Math.exp(-z));
}

/**
 * Normalize RSI to [-1.0, 1.0] signal
 * RSI < 30 -> oversold (bullish reversal signal: +0.6 to +1.0)
 * RSI > 70 -> overbought (bearish reversal signal: -0.6 to -1.0)
 * 45-55 -> neutral
 */
function normalizeRSI(rsi: number): number {
  if (rsi <= 30) {
    return 0.6 + ((30 - rsi) / 30) * 0.4; // +0.6 to +1.0
  }
  if (rsi >= 70) {
    return -0.6 - ((rsi - 70) / 30) * 0.4; // -0.6 to -1.0
  }
  if (rsi > 50) {
    return ((rsi - 50) / 20) * 0.5; // +0.0 to +0.5
  }
  return -((50 - rsi) / 20) * 0.5; // -0.5 to -0.0
}

/**
 * Normalize MACD to [-1.0, 1.0] signal
 */
function normalizeMACD(indicators: TechnicalIndicators): number {
  const { macd_value, macd_signal, macd_histogram } = indicators;
  let score = 0;

  // Bullish / Bearish Crossover
  if (macd_value > macd_signal) {
    score += 0.5;
  } else {
    score -= 0.5;
  }

  // Momentum histogram strength
  if (macd_histogram > 0) {
    score += 0.5;
  } else {
    score -= 0.5;
  }

  return Math.max(-1.0, Math.min(1.0, score));
}

/**
 * Normalize Trend based on EMA alignment and Bollinger Position
 */
function normalizeTrend(price: number, indicators: TechnicalIndicators): number {
  let score = 0;
  const { ema_20, ema_50, ema_200, bollinger_upper, bollinger_lower } = indicators;

  // EMA Structure
  if (price > ema_20) score += 0.3;
  else score -= 0.3;

  if (price > ema_50) score += 0.3;
  else score -= 0.3;

  if (price > ema_200) score += 0.4;
  else score -= 0.4;

  // Bollinger Band Overextension Guard
  if (bollinger_upper > bollinger_lower) {
    if (price >= bollinger_upper) score -= 0.2; // overstretched top
    if (price <= bollinger_lower) score += 0.2; // overstretched bottom
  }

  return Math.max(-1.0, Math.min(1.0, score));
}

/**
 * Multi-Factor Probability Engine Calculation
 */
export function calculateProbabilityScore(
  ticker: string,
  currentPrice: number,
  changePercent: number,
  assetType: AssetType,
  indicators: TechnicalIndicators,
  newsArticles: NewsArticle[]
): SignalOutput {
  // 1. Sentiment Component Calculation (Average of recent articles)
  const tickerArticles = newsArticles.filter(
    (a) => a.ticker === ticker || a.headline.toUpperCase().includes(ticker)
  );
  const relevantArticles = tickerArticles.length > 0 ? tickerArticles : newsArticles.slice(0, 5);

  let sentimentScore = 0;
  if (relevantArticles.length > 0) {
    const totalSentiment = relevantArticles.reduce((acc, curr) => acc + (curr.sentiment_score || 0), 0);
    sentimentScore = totalSentiment / relevantArticles.length;
  }
  const sentimentComponent = Math.max(-1.0, Math.min(1.0, Number(sentimentScore.toFixed(3))));

  // 2. Technical Momentum Component
  const rsiSignal = normalizeRSI(indicators.rsi_14);
  const macdSignal = normalizeMACD(indicators);
  const technicalComponent = Number((rsiSignal * 0.5 + macdSignal * 0.5).toFixed(3));

  // 3. Trend Component
  const trendComponent = Number(normalizeTrend(currentPrice, indicators).toFixed(3));

  // 4. Weight Allocation by Asset Type
  let wSentiment = 0.40;
  let wTech = 0.30;
  let wTrend = 0.30;

  if (assetType === 'stock') {
    // Stocks: News & earnings drive price more than technicals
    wSentiment = 0.45;
    wTech = 0.35;
    wTrend = 0.20;
  } else if (assetType === 'forex') {
    // Forex: Macro policy & trend are key drivers
    wSentiment = 0.40;
    wTech = 0.30;
    wTrend = 0.30;
  } else if (assetType === 'commodity') {
    // Gold/Commodities: Fear index, DXY correlation — trend & tech dominant
    wSentiment = 0.30;
    wTech = 0.35;
    wTrend = 0.35;
  } else if (assetType === 'index') {
    // Indices (SPY): Broad sentiment and trend-following
    wSentiment = 0.35;
    wTech = 0.30;
    wTrend = 0.35;
  }

  // Raw combined directional score (-1.0 to +1.0)
  const rawDirectionalScore =
    sentimentComponent * wSentiment +
    technicalComponent * wTech +
    trendComponent * wTrend;

  // 5. Probability Conversion via Sigmoid (scaled to 0.0 - 1.0)
  // Steeper slope factor (k=2.2) to give distinct probability spread
  const probability = Number(sigmoid(rawDirectionalScore * 2.5).toFixed(3));

  // 6. Direction & Confidence Level Mapping
  let direction: SignalDirection = 'NEUTRAL';
  let confidence: ConfidenceLevel = 'MODERATE';

  if (probability >= 0.72) {
    direction = 'STRONG_BUY';
    confidence = 'VERY_HIGH';
  } else if (probability >= 0.58) {
    direction = 'BUY';
    confidence = 'HIGH';
  } else if (probability <= 0.28) {
    direction = 'STRONG_SELL';
    confidence = 'VERY_HIGH';
  } else if (probability <= 0.42) {
    direction = 'SELL';
    confidence = 'HIGH';
  } else {
    direction = 'NEUTRAL';
    confidence = 'MODERATE';
  }

  // 7. Calculate Suggested Trade Setup (Entry, Stop Loss, Take Profit via ATR)
  const atr = indicators.atr_14 > 0 ? indicators.atr_14 : currentPrice * 0.012;
  const isBullish = direction === 'BUY' || direction === 'STRONG_BUY';
  const isBearish = direction === 'SELL' || direction === 'STRONG_SELL';

  const entry = currentPrice;
  let stopLoss = currentPrice;
  let tp1 = currentPrice;
  let tp2 = currentPrice;
  let rr = 2.0;

  const decimals = assetType === 'forex' && !ticker.includes('JPY') ? 4 : 2;

  if (isBullish) {
    stopLoss = Number((currentPrice - 1.5 * atr).toFixed(decimals));
    tp1 = Number((currentPrice + 2.0 * atr).toFixed(decimals));
    tp2 = Number((currentPrice + 3.5 * atr).toFixed(decimals));
    rr = 2.0;
  } else if (isBearish) {
    stopLoss = Number((currentPrice + 1.5 * atr).toFixed(decimals));
    tp1 = Number((currentPrice - 2.0 * atr).toFixed(decimals));
    tp2 = Number((currentPrice - 3.5 * atr).toFixed(decimals));
    rr = 2.0;
  }

  // Directional Win Rate (e.g. 72% for STRONG_SELL instead of 28%)
  const winRate = isBearish
    ? Number(((1 - probability) * 100).toFixed(1))
    : isBullish
    ? Number((probability * 100).toFixed(1))
    : 50.0;

  // Explanation Narrative
  const thaiAction = isBullish ? 'ขาขึ้น (BUY)' : isBearish ? 'ขาลง (SELL)' : 'ไซด์เวย์ (NEUTRAL)';
  const explanation = `${direction.replace('_', ' ')} (${thaiAction}): วินเรท ${winRate}% Conviction. ข่าว Sentiment (${(sentimentComponent >= 0 ? '+' : '') + (sentimentComponent * 100).toFixed(0)}%), RSI (${indicators.rsi_14.toFixed(1)}), MACD (${indicators.macd_histogram >= 0 ? 'Bullish' : 'Bearish'}), แนวโน้ม Trend (${indicators.trend_bias}).`;

  return {
    ticker,
    probability_score: probability,
    win_rate_percent: winRate,
    confidence_level: confidence,
    direction,
    sentiment_component: sentimentComponent,
    technical_component: technicalComponent,
    trend_component: trendComponent,
    recommended_entry: entry,
    stop_loss: stopLoss,
    take_profit_1: tp1,
    take_profit_2: tp2,
    risk_reward_ratio: rr,
    explanation,
    computed_at: new Date().toISOString(),
    price: currentPrice,
    change_percent: changePercent,
  };
}
