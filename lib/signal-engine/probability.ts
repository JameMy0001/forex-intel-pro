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
 * Normalize RSI to [-1.0, 1.0] signal with Trend-Awareness
 * In Uptrend: RSI 60-80 is good momentum (BUY), RSI < 40 is weak
 * In Downtrend: RSI 20-40 is good momentum (SELL), RSI > 60 is weak
 * In Ranging: RSI > 70 is SELL, RSI < 30 is BUY
 */
function normalizeRSI(rsi: number, trendBias: 'BULLISH' | 'BEARISH' | 'RANGING'): number {
  if (trendBias === 'BULLISH') {
    if (rsi >= 55 && rsi <= 75) return 0.6; // momentum sweet spot
    if (rsi < 40) return -0.8;              // trend weakening
    return 0.2;
  } else if (trendBias === 'BEARISH') {
    if (rsi <= 45 && rsi >= 25) return -0.6;
    if (rsi > 60) return 0.8;
    return -0.2;
  } else {
    // Ranging: reversal logic
    if (rsi <= 30) return 0.7;
    if (rsi >= 70) return -0.7;
    return (rsi - 50) / 100;
  }
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
  newsArticles: NewsArticle[],
  indicators4H?: TechnicalIndicators
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
  const rsiSignal = normalizeRSI(indicators.rsi_14, indicators.trend_bias);
  const macdSignal = normalizeMACD(indicators);
  const technicalComponent = Number((rsiSignal * 0.5 + macdSignal * 0.5).toFixed(3));

  // 3. Trend Component
  let trendComponent = Number(normalizeTrend(currentPrice, indicators).toFixed(3));

  // Multi-Timeframe Analysis (MTFA): Align 1D with 4H trend
  let isMtfaAligned = false;
  let isMtfaConflicting = false;
  
  if (indicators4H) {
    const trend4H = normalizeTrend(currentPrice, indicators4H);
    if ((trendComponent > 0 && trend4H > 0) || (trendComponent < 0 && trend4H < 0)) {
      trendComponent += trend4H * 0.35; // Boost if aligned
      isMtfaAligned = true;
    } else {
      trendComponent *= 0.5; // Penalize if conflicting
      isMtfaConflicting = true;
    }
    trendComponent = Math.max(-1.0, Math.min(1.0, Number(trendComponent.toFixed(3))));
  }

  // 4. Weight Allocation by Asset Type & Market Regime
  let wSentiment = 0.40;
  let wTech = 0.30;
  let wTrend = 0.30;

  if (assetType === 'stock') {
    wSentiment = 0.45;
    wTech = 0.35;
    wTrend = 0.20;
  } else if (assetType === 'forex') {
    wSentiment = 0.40;
    wTech = 0.30;
    wTrend = 0.30;
  } else if (assetType === 'commodity') {
    wSentiment = 0.30;
    wTech = 0.35;
    wTrend = 0.35;
  } else if (assetType === 'index') {
    wSentiment = 0.35;
    wTech = 0.30;
    wTrend = 0.35;
  }

  // Adjust weights based on ADX (Market Regime)
  if (indicators.market_regime === 'TRENDING') {
    // In strong trend, reduce sentiment impact, rely on trend/tech
    wSentiment -= 0.10;
    wTrend += 0.10;
  } else if (indicators.market_regime === 'RANGING') {
    // In ranging, trend is useless, rely more on sentiment & tech (mean reversion)
    wTrend -= 0.15;
    wTech += 0.10;
    wSentiment += 0.05;
  }

  // Raw combined directional score (-1.0 to +1.0)
  const rawDirectionalScore =
    sentimentComponent * wSentiment +
    technicalComponent * wTech +
    trendComponent * wTrend;

  // 5. Probability Conversion via Sigmoid (scaled to 0.0 - 1.0)
  // Steeper slope factor (k=2.2) to give distinct probability spread
  const probability = Number(sigmoid(rawDirectionalScore * 2.5).toFixed(3));

  // 6. Direction & Confidence Level Mapping (Initial check for SL calculation)
  let direction: SignalDirection = 'NEUTRAL';
  let confidence: ConfidenceLevel = 'MODERATE';

  if (probability >= 0.72) {
    direction = 'STRONG_BUY';
  } else if (probability >= 0.58) {
    direction = 'BUY';
  } else if (probability <= 0.28) {
    direction = 'STRONG_SELL';
  } else if (probability <= 0.42) {
    direction = 'SELL';
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
    // Structural Stop Loss: below recent low, with ATR buffer
    stopLoss = Number(Math.min(indicators.recent_low - 0.2 * atr, currentPrice - 1.5 * atr).toFixed(decimals));
    tp1 = Number((currentPrice + 2.0 * atr).toFixed(decimals));
    tp2 = Number((currentPrice + 3.5 * atr).toFixed(decimals));
    rr = Number(((tp1 - currentPrice) / (currentPrice - stopLoss)).toFixed(2));
  } else if (isBearish) {
    // Structural Stop Loss: above recent high, with ATR buffer
    stopLoss = Number(Math.max(indicators.recent_high + 0.2 * atr, currentPrice + 1.5 * atr).toFixed(decimals));
    tp1 = Number((currentPrice - 2.0 * atr).toFixed(decimals));
    tp2 = Number((currentPrice - 3.5 * atr).toFixed(decimals));
    rr = Number(((currentPrice - tp1) / (stopLoss - currentPrice)).toFixed(2));
  }

  // Position Sizing (Fixed 1% Risk)
  const stopLossDistancePercent = Math.abs(currentPrice - stopLoss) / currentPrice;
  let positionSizePercent = stopLossDistancePercent > 0 ? Number((0.01 / stopLossDistancePercent).toFixed(4)) : 0;
  // Cap position size to max 15% to prevent infinite leverage display on tight SL
  if (positionSizePercent > 0.15) {
    positionSizePercent = 0.15;
  }

  // --- Micro-Account Sniper Guard ---
  let finalProbability = probability;
  let riskPenaltyText = '';
  // Threshold: 0.15% price move (~15 pips on EURUSD)
  const maxSafeDistance = 0.0015;
  
  if (stopLossDistancePercent > maxSafeDistance && direction !== 'NEUTRAL') {
    const excess = stopLossDistancePercent - maxSafeDistance;
    // Heavy penalty for every 0.1% excess
    const penaltyMultiplier = Math.max(0.1, 1 - (excess * 200)); 
    if (finalProbability > 0.5) {
      finalProbability = 0.5 + (finalProbability - 0.5) * penaltyMultiplier;
    } else {
      finalProbability = 0.5 - (0.5 - finalProbability) * penaltyMultiplier;
    }
    finalProbability = Number(finalProbability.toFixed(3));
    riskPenaltyText = ` [⚠️ โดนหักคะแนน: ความผันผวนสูงเกินลิมิตทุน $10]`;
  }

  // Recalculate Final Direction (Sniper Mode Thresholds)
  if (finalProbability >= 0.80) {
    direction = 'STRONG_BUY';
    confidence = 'VERY_HIGH';
  } else if (finalProbability >= 0.70) {
    direction = 'BUY';
    confidence = 'HIGH';
  } else if (finalProbability <= 0.20) {
    direction = 'STRONG_SELL';
    confidence = 'VERY_HIGH';
  } else if (finalProbability <= 0.30) {
    direction = 'SELL';
    confidence = 'HIGH';
  } else {
    direction = 'NEUTRAL';
    confidence = 'MODERATE';
  }

  // Directional Win Rate
  const winRate = (direction === 'SELL' || direction === 'STRONG_SELL')
    ? Number(((1 - finalProbability) * 100).toFixed(1))
    : (direction === 'BUY' || direction === 'STRONG_BUY')
    ? Number((finalProbability * 100).toFixed(1))
    : 50.0;

  // Expected Value (EV)
  const winProb = winRate / 100;
  const expectedValue = Number((winProb * rr - (1 - winProb) * 1).toFixed(2));

  // Explanation Narrative
  const thaiAction = (direction === 'BUY' || direction === 'STRONG_BUY') ? 'ขาขึ้น (BUY)' : (direction === 'SELL' || direction === 'STRONG_SELL') ? 'ขาลง (SELL)' : 'ไซด์เวย์ (NEUTRAL)';
  const mtfaText = isMtfaAligned ? ' (MTFA Aligned)' : isMtfaConflicting ? ' (MTFA Conflicting)' : '';
  const explanation = `${direction.replace('_', ' ')} (${thaiAction}): วินเรท ${winRate}% (EV: ${expectedValue > 0 ? '+' : ''}${expectedValue}). ข่าว (${(sentimentComponent >= 0 ? '+' : '') + (sentimentComponent * 100).toFixed(0)}%), ตลาด ${indicators.market_regime}${mtfaText}, RSI (${indicators.rsi_14.toFixed(1)}). SL ใต้โครงสร้างล่าสุด${riskPenaltyText}`;

  return {
    ticker,
    probability_score: finalProbability,
    win_rate_percent: winRate,
    expected_value: expectedValue,
    position_size_percent: positionSizePercent * 100, // as percentage
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

/**
 * Recalculate signal attributes (direction, confidence, win_rate, ev) after a probability penalty
 */
export function applyProbabilityPenalty(signal: SignalOutput, multiplier: number, penaltyReason: string): SignalOutput {
  const newProb = Number((signal.probability_score * multiplier).toFixed(3));
  signal.probability_score = newProb;
  
  if (newProb >= 0.72) {
    signal.direction = 'STRONG_BUY';
    signal.confidence_level = 'VERY_HIGH';
  } else if (newProb >= 0.58) {
    signal.direction = 'BUY';
    signal.confidence_level = 'HIGH';
  } else if (newProb <= 0.28) {
    signal.direction = 'STRONG_SELL';
    signal.confidence_level = 'VERY_HIGH';
  } else if (newProb <= 0.42) {
    signal.direction = 'SELL';
    signal.confidence_level = 'HIGH';
  } else {
    signal.direction = 'NEUTRAL';
    signal.confidence_level = 'MODERATE';
  }

  const isBullish = signal.direction === 'BUY' || signal.direction === 'STRONG_BUY';
  const isBearish = signal.direction === 'SELL' || signal.direction === 'STRONG_SELL';

  signal.win_rate_percent = isBearish
    ? Number(((1 - newProb) * 100).toFixed(1))
    : isBullish
    ? Number((newProb * 100).toFixed(1))
    : 50.0;

  const winProb = signal.win_rate_percent / 100;
  signal.expected_value = Number((winProb * (signal.risk_reward_ratio || 2.0) - (1 - winProb) * 1).toFixed(2));
  signal.explanation += ` ${penaltyReason}`;

  return signal;
}
