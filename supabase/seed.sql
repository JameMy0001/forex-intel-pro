-- =================================================================
-- INITIAL SEED DATA: Forex & Stock Symbols
-- =================================================================

INSERT INTO symbols (ticker, finnhub_symbol, display_name, asset_type, category, is_active, alert_threshold)
VALUES
  -- Forex Major Pairs & Gold
  ('EURUSD', 'OANDA:EUR_USD', 'EUR / USD (Euro / US Dollar)', 'forex', 'Major FX', true, 0.70),
  ('GBPUSD', 'OANDA:GBP_USD', 'GBP / USD (British Pound / US Dollar)', 'forex', 'Major FX', true, 0.70),
  ('USDJPY', 'OANDA:USD_JPY', 'USD / JPY (US Dollar / Japanese Yen)', 'forex', 'Major FX', true, 0.70),
  ('AUDUSD', 'OANDA:AUD_USD', 'AUD / USD (Aussie / US Dollar)', 'forex', 'Major FX', true, 0.70),
  ('USDCHF', 'OANDA:USD_CHF', 'USD / CHF (US Dollar / Swiss Franc)', 'forex', 'Major FX', true, 0.70),
  ('USDCAD', 'OANDA:USD_CAD', 'USD / CAD (US Dollar / Canadian Dollar)', 'forex', 'Major FX', true, 0.70),
  ('XAUUSD', 'OANDA:XAU_USD', 'XAU / USD (Gold / US Dollar)', 'commodity', 'Precious Metal', true, 0.72),
  
  -- Major Stocks & Indices
  ('AAPL', 'AAPL', 'Apple Inc.', 'stock', 'Tech MegaCap', true, 0.70),
  ('NVDA', 'NVDA', 'NVIDIA Corporation', 'stock', 'Semiconductors / AI', true, 0.72),
  ('TSLA', 'TSLA', 'Tesla, Inc.', 'stock', 'EV & Auto Tech', true, 0.70),
  ('MSFT', 'MSFT', 'Microsoft Corporation', 'stock', 'Cloud & AI Software', true, 0.70),
  ('AMZN', 'AMZN', 'Amazon.com Inc.', 'stock', 'E-Commerce & Cloud', true, 0.70),
  ('GOOGL', 'GOOGL', 'Alphabet Inc.', 'stock', 'Internet & AI Search', true, 0.70),
  ('SPY', 'SPY', 'SPDR S&P 500 ETF Trust', 'index', 'Broad Market Index', true, 0.68)
ON CONFLICT (ticker) DO UPDATE 
SET finnhub_symbol = EXCLUDED.finnhub_symbol,
    display_name = EXCLUDED.display_name,
    category = EXCLUDED.category;
