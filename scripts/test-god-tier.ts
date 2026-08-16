import { calculateProbabilityScore } from '../lib/signal-engine/probability';
import { generateAIAnalysis } from '../lib/signal-engine/aiAnalyst';
import { TechnicalIndicators, SignalOutput } from '../lib/types';
import { MacroYieldResult } from '../lib/market/macroYield';
import { CoTResult, checkCoTVeto } from '../lib/market/cotTracker';

async function testGodTier() {
  const ticker = 'XAUUSD';
  const currentPrice = 2450.00;
  
  // 1. Mock Indicators with SMC Liquidity Sweep & FVG
  const mockIndicators: TechnicalIndicators = {
    ticker,
    timeframe: '1D',
    rsi_14: 35.5,
    macd_value: -0.5,
    macd_signal: -0.2,
    macd_histogram: -0.3,
    bollinger_upper: 2500,
    bollinger_middle: 2470,
    bollinger_lower: 2440,
    ema_20: 2465,
    ema_50: 2480,
    ema_200: 2300,
    atr_14: 25,
    adx_14: 30,
    recent_high: 2500,
    recent_low: 2445,
    market_regime: 'VOLATILE',
    trend_bias: 'BEARISH',
    smc_liquidity_sweep: 'BULLISH', // ⚠️ Swept the low and rejecting
    smc_fvg_type: 'BULLISH', // ⚠️ Bullish FVG forming
    computed_at: new Date().toISOString()
  };

  // 2. Mock God-Tier Data (Whales vs Retail)
  const mockMacroYield: MacroYieldResult = {
    us10y_rate: 4.10,
    us10y_change: -1.5, // Yield crashing -> USD weak -> Gold Bullish
    dxy_rate: 103.5,
    dxy_change: -0.8,
    arbitrage_signal: 'BUY_OPPORTUNITY',
    warning_text: '⚠️ Macro Arbitrage: ยีลด์พันธบัตรสหรัฐ 10 ปีร่วงหนัก กดดันดอลลาร์ หนุนราคาทองคำฟื้นตัวแรง'
  };

  const rawCotState: CoTResult = {
    net_positioning: 'NET_LONG',
    smart_money_bias: 'BULLISH',
    veto_signal: false,
    veto_direction: null,
    veto_reason: ''
  };

  // 3. Calculate Signal (Initial)
  console.log('--- 1. CALCULATING RETAIL SIGNAL ---');
  let signal = calculateProbabilityScore(
    ticker, currentPrice, -0.5, 'stock', mockIndicators, [], undefined, mockMacroYield, rawCotState
  );
  
  // 4. Apply VETO Shield
  console.log('\\n--- 2. APPLYING VETO SHIELD ---');
  // For the sake of demonstration, let's pretend Retail Indicators were strongly bearish (RSI 30, MACD bearish), but CoT is NET_LONG.
  // We'll force a retail SELL signal to trigger the VETO.
  const forcedRetailDirection = 'SELL';
  const cotState = checkCoTVeto(forcedRetailDirection, rawCotState);
  
  if (cotState.veto_signal) {
    console.log(cotState.veto_reason);
    signal = calculateProbabilityScore(
      ticker, currentPrice, -0.5, 'stock', mockIndicators, [], undefined, mockMacroYield, cotState
    );
  }

  console.log('\\nSignal Result:', {
    direction: signal.direction,
    probability: signal.probability_score,
    confidence: signal.confidence_level,
    penalty_text: signal.risk_penalty_text
  });

  // 5. Generate AI Analyst Output
  console.log('\\n--- 3. GENERATING AI ANALYSIS (GOD-TIER PROMPT) ---');
  try {
    const aiOutput = await generateAIAnalysis(
      ticker, currentPrice, signal, mockIndicators, [], mockMacroYield, cotState
    );
    console.log(JSON.stringify(aiOutput, null, 2));
  } catch (err) {
    console.error('AI Error:', err);
  }
}

testGodTier();
