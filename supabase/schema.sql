-- =================================================================
-- PRODUCTION DATABASE SCHEMA: Forex & Stock News Intelligence Engine
-- Target Database: Supabase / PostgreSQL 15+
-- =================================================================

-- 1. Enable Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Clean up old tables if needed
-- DROP TABLE IF EXISTS alerts_log CASCADE;
-- DROP TABLE IF EXISTS ai_analyses CASCADE;
-- DROP TABLE IF EXISTS signals CASCADE;
-- DROP TABLE IF EXISTS technical_indicators CASCADE;
-- DROP TABLE IF EXISTS price_snapshots CASCADE;
-- DROP TABLE IF EXISTS news_articles CASCADE;
-- DROP TABLE IF EXISTS symbols CASCADE;

-- 3. Symbols Table (Forex & Stocks Watchlist)
CREATE TABLE IF NOT EXISTS symbols (
  id SERIAL PRIMARY KEY,
  ticker TEXT UNIQUE NOT NULL,                          -- e.g. 'EURUSD', 'GBPUSD', 'USDJPY', 'XAUUSD', 'AAPL', 'NVDA'
  finnhub_symbol TEXT NOT NULL,                         -- e.g. 'OANDA:EUR_USD', 'AAPL'
  display_name TEXT NOT NULL,                           -- e.g. 'Euro / US Dollar', 'Apple Inc.'
  asset_type TEXT NOT NULL CHECK (asset_type IN ('forex', 'stock', 'commodity', 'index')),
  category TEXT DEFAULT 'Major',                        -- e.g. 'Major FX', 'Tech', 'Semiconductors', 'Precious Metal'
  is_active BOOLEAN DEFAULT true,
  alert_threshold NUMERIC DEFAULT 0.70,                 -- Probability threshold to trigger alerts (0.70 = 70%)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. News Articles & Sentiment Table
CREATE TABLE IF NOT EXISTS news_articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source TEXT NOT NULL,                                 -- 'marketaux' | 'finnhub' | 'rss'
  external_id TEXT,
  symbol_id INT REFERENCES symbols(id) ON DELETE CASCADE,
  ticker TEXT NOT NULL,
  headline TEXT NOT NULL,
  summary TEXT,
  url TEXT,
  image_url TEXT,
  published_at TIMESTAMPTZ NOT NULL,
  sentiment_score NUMERIC DEFAULT 0,                    -- -1.0 (Very Bearish) to +1.0 (Very Bullish)
  sentiment_label TEXT,                                 -- 'Bullish', 'Bearish', 'Neutral'
  raw_payload JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Real-Time Price Snapshots Table
CREATE TABLE IF NOT EXISTS price_snapshots (
  id BIGSERIAL PRIMARY KEY,
  symbol_id INT REFERENCES symbols(id) ON DELETE CASCADE,
  ticker TEXT NOT NULL,
  price NUMERIC NOT NULL,
  open_price NUMERIC,
  high_price NUMERIC,
  low_price NUMERIC,
  previous_close NUMERIC,
  change_amount NUMERIC,
  change_percent NUMERIC,
  bid NUMERIC,
  ask NUMERIC,
  volume NUMERIC,
  source TEXT NOT NULL DEFAULT 'finnhub',               -- 'finnhub' | 'mt5' | 'alphavantage'
  captured_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. Technical Indicators History Table
CREATE TABLE IF NOT EXISTS technical_indicators (
  id BIGSERIAL PRIMARY KEY,
  symbol_id INT REFERENCES symbols(id) ON DELETE CASCADE,
  ticker TEXT NOT NULL,
  timeframe TEXT NOT NULL DEFAULT '1D',                 -- '15M', '1H', '4H', '1D'
  rsi_14 NUMERIC,
  macd_value NUMERIC,
  macd_signal NUMERIC,
  macd_histogram NUMERIC,
  bollinger_upper NUMERIC,
  bollinger_middle NUMERIC,
  bollinger_lower NUMERIC,
  ema_20 NUMERIC,
  ema_50 NUMERIC,
  ema_200 NUMERIC,
  atr_14 NUMERIC,
  trend_bias TEXT,                                      -- 'BULLISH' | 'BEARISH' | 'RANGING'
  computed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. Signals & Multi-Factor Probability Engine Output
CREATE TABLE IF NOT EXISTS signals (
  id BIGSERIAL PRIMARY KEY,
  symbol_id INT REFERENCES symbols(id) ON DELETE CASCADE,
  ticker TEXT NOT NULL,
  probability_score NUMERIC NOT NULL,                   -- 0.00 to 1.00 (e.g. 0.78 = 78% probability)
  confidence_level TEXT NOT NULL,                       -- 'VERY_HIGH', 'HIGH', 'MODERATE', 'LOW'
  direction TEXT NOT NULL CHECK (direction IN ('STRONG_BUY', 'BUY', 'NEUTRAL', 'SELL', 'STRONG_SELL')),
  sentiment_component NUMERIC NOT NULL,                 -- -1.0 to +1.0
  technical_component NUMERIC NOT NULL,                 -- -1.0 to +1.0
  trend_component NUMERIC NOT NULL,                     -- -1.0 to +1.0
  recommended_entry NUMERIC,
  stop_loss NUMERIC,
  take_profit_1 NUMERIC,
  take_profit_2 NUMERIC,
  risk_reward_ratio NUMERIC,
  explanation TEXT,                                     -- Short mathematical thesis summary
  computed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. AI Deep Synthesis Analyses (Gemini LLM)
CREATE TABLE IF NOT EXISTS ai_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  symbol_id INT REFERENCES symbols(id) ON DELETE CASCADE,
  ticker TEXT NOT NULL,
  macro_catalyst TEXT,                                  -- Major economic driver (Fed rates, CPI, yields, earnings)
  bull_case TEXT,                                       -- Bullish thesis points
  bear_case TEXT,                                       -- Bearish risk factors
  trade_thesis TEXT NOT NULL,                           -- Strategic trade rationale
  invalidation_level NUMERIC,                           -- Price level where trade thesis is void
  key_levels JSONB,                                     -- Support & Resistance key price levels
  model_used TEXT DEFAULT 'gemini-2.0-flash',
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. Alerts Log Table (Telegram & Push Notifications)
CREATE TABLE IF NOT EXISTS alerts_log (
  id BIGSERIAL PRIMARY KEY,
  symbol_id INT REFERENCES symbols(id) ON DELETE CASCADE,
  signal_id BIGINT REFERENCES signals(id) ON DELETE SET NULL,
  channel TEXT NOT NULL DEFAULT 'telegram',             -- 'telegram' | 'webhook' | 'email'
  recipient_id TEXT,
  direction TEXT NOT NULL,
  probability_score NUMERIC NOT NULL,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'sent',                  -- 'sent' | 'failed'
  error_message TEXT,
  sent_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. High-Performance Indexes for Real-time Queries
CREATE INDEX IF NOT EXISTS idx_symbols_ticker ON symbols(ticker);
CREATE INDEX IF NOT EXISTS idx_symbols_active ON symbols(is_active);
CREATE INDEX IF NOT EXISTS idx_news_symbol_time ON news_articles(symbol_id, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_news_ticker_time ON news_articles(ticker, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_price_symbol_time ON price_snapshots(symbol_id, captured_at DESC);
CREATE INDEX IF NOT EXISTS idx_price_ticker_time ON price_snapshots(ticker, captured_at DESC);
CREATE INDEX IF NOT EXISTS idx_indicators_ticker_time ON technical_indicators(ticker, computed_at DESC);
CREATE INDEX IF NOT EXISTS idx_signals_symbol_time ON signals(symbol_id, computed_at DESC);
CREATE INDEX IF NOT EXISTS idx_signals_ticker_time ON signals(ticker, computed_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_ticker_time ON ai_analyses(ticker, generated_at DESC);
CREATE INDEX IF NOT EXISTS idx_alerts_time ON alerts_log(sent_at DESC);

-- 11. Row Level Security (RLS) Setup
ALTER TABLE symbols ENABLE ROW LEVEL SECURITY;
ALTER TABLE news_articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE technical_indicators ENABLE ROW LEVEL SECURITY;
ALTER TABLE signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts_log ENABLE ROW LEVEL SECURITY;

-- Public Read-Only Policies (For Frontend Dashboard)
CREATE POLICY "Public Read Symbols" ON symbols FOR SELECT USING (true);
CREATE POLICY "Public Read News" ON news_articles FOR SELECT USING (true);
CREATE POLICY "Public Read Prices" ON price_snapshots FOR SELECT USING (true);
CREATE POLICY "Public Read Indicators" ON technical_indicators FOR SELECT USING (true);
CREATE POLICY "Public Read Signals" ON signals FOR SELECT USING (true);
CREATE POLICY "Public Read AI Analyses" ON ai_analyses FOR SELECT USING (true);
CREATE POLICY "Public Read Alerts" ON alerts_log FOR SELECT USING (true);

-- Service Role Full Access (For Ingestion Scripts & Backend API)
CREATE POLICY "Service Role All Symbols" ON symbols FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service Role All News" ON news_articles FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service Role All Prices" ON price_snapshots FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service Role All Indicators" ON technical_indicators FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service Role All Signals" ON signals FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service Role All AI Analyses" ON ai_analyses FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service Role All Alerts" ON alerts_log FOR ALL USING (auth.role() = 'service_role');
