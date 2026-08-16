// =================================================================
// TYPE DEFINITIONS: Forex & Stock Intelligence Engine
// =================================================================

export type AssetType = 'forex' | 'stock' | 'commodity' | 'index';

export type SignalDirection = 'STRONG_BUY' | 'BUY' | 'NEUTRAL' | 'SELL' | 'STRONG_SELL';

export type ConfidenceLevel = 'VERY_HIGH' | 'HIGH' | 'MODERATE' | 'LOW';

export type SentimentLabel = 'Bullish' | 'Bearish' | 'Neutral';

export interface SymbolInfo {
  id?: number;
  ticker: string;
  finnhub_symbol: string;
  display_name: string;
  asset_type: AssetType;
  category: string;
  is_active: boolean;
  alert_threshold: number;
  created_at?: string;
  updated_at?: string;
}

export interface PriceSnapshot {
  id?: number;
  symbol_id?: number;
  ticker: string;
  price: number;
  open_price?: number;
  high_price?: number;
  low_price?: number;
  previous_close?: number;
  change_amount?: number;
  change_percent?: number;
  bid?: number;
  ask?: number;
  volume?: number;
  source: string;
  captured_at: string;
}

export interface CandleData {
  timestamp: number; // Unix timestamp (ms or s)
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
  timeStr?: string;
}

export interface NewsArticle {
  id?: string;
  source: string;
  external_id?: string;
  symbol_id?: number;
  ticker: string;
  headline: string;
  summary: string;
  thai_headline?: string;
  thai_summary?: string;
  url: string;
  image_url?: string;
  published_at: string;
  sentiment_score: number; // -1.0 to 1.0
  sentiment_label: SentimentLabel;
  raw_payload?: any;
}

export interface TechnicalIndicators {
  id?: number;
  symbol_id?: number;
  ticker: string;
  timeframe: string;
  rsi_14: number;
  macd_value: number;
  macd_signal: number;
  macd_histogram: number;
  bollinger_upper: number;
  bollinger_middle: number;
  bollinger_lower: number;
  ema_20: number;
  ema_50: number;
  ema_200: number;
  atr_14: number;
  adx_14: number;
  recent_high: number;
  recent_low: number;
  market_regime: 'TRENDING' | 'RANGING' | 'VOLATILE';
  trend_bias: 'BULLISH' | 'BEARISH' | 'RANGING';
  smc_fvg_type?: 'BULLISH' | 'BEARISH' | 'NONE'; // Fair Value Gap
  smc_liquidity_sweep?: 'BULLISH' | 'BEARISH' | 'NONE'; // Liquidity Sweep
  computed_at: string;
}

export interface SignalOutput {
  id?: number;
  symbol_id?: number;
  ticker: string;
  probability_score: number; // 0.00 to 1.00 (e.g., 0.78 for 78% conviction)
  confidence_level: ConfidenceLevel;
  direction: SignalDirection;
  sentiment_component: number; // -1.0 to 1.0
  technical_component: number; // -1.0 to 1.0
  trend_component: number; // -1.0 to 1.0
  recommended_entry?: number;
  stop_loss?: number;
  take_profit_1?: number;
  take_profit_2?: number;
  risk_reward_ratio?: number;
  explanation: string;
  computed_at: string;
  price?: number;
  change_percent?: number;
  win_rate_percent?: number;
  expected_value?: number;
  position_size_percent?: number;
}

export interface AIAnalysisOutput {
  id?: string;
  symbol_id?: number;
  ticker: string;
  macro_catalyst: string;
  bull_case: string;
  bear_case: string;
  trade_thesis: string;
  invalidation_level?: number;
  key_levels?: {
    support: number[];
    resistance: number[];
  };
  model_used: string;
  generated_at: string;
}

export interface AlertLog {
  id?: number;
  symbol_id?: number;
  signal_id?: number;
  channel: 'telegram' | 'webhook' | 'email';
  recipient_id?: string;
  direction: SignalDirection;
  probability_score: number;
  message: string;
  status: 'sent' | 'failed';
  error_message?: string;
  sent_at?: string;
}

export interface MarketOverviewItem {
  ticker: string;
  name: string;
  price: number;
  changePercent: number;
  assetType: AssetType;
}
