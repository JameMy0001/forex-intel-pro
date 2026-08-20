import { SymbolInfo } from '../types';

export const DEFAULT_SYMBOLS: SymbolInfo[] = [
  // Forex Major Pairs & Gold
  {
    ticker: 'EURUSD',
    finnhub_symbol: 'OANDA:EUR_USD',
    display_name: 'EUR / USD (Euro / US Dollar)',
    asset_type: 'forex',
    category: 'Major FX',
    is_active: false, // User requested USDJPY ONLY
    alert_threshold: 0.70,
  },
  {
    ticker: 'GBPUSD',
    finnhub_symbol: 'OANDA:GBP_USD',
    display_name: 'GBP / USD (British Pound / US Dollar)',
    asset_type: 'forex',
    category: 'Major FX',
    is_active: false, // Too volatile for $10
    alert_threshold: 0.70,
  },
  {
    ticker: 'USDJPY',
    finnhub_symbol: 'OANDA:USD_JPY',
    display_name: 'USD / JPY (US Dollar / Japanese Yen)',
    asset_type: 'forex',
    category: 'Major FX',
    is_active: true,
    alert_threshold: 0.75, // Increased from 0.70 to ensure ultra-high precision trades only
  },
  {
    ticker: 'AUDUSD',
    finnhub_symbol: 'OANDA:AUD_USD',
    display_name: 'AUD / USD (Aussie / US Dollar)',
    asset_type: 'forex',
    category: 'Major FX',
    is_active: false, // User requested USDJPY ONLY
    alert_threshold: 0.70,
  },
  {
    ticker: 'USDCHF',
    finnhub_symbol: 'OANDA:USD_CHF',
    display_name: 'USD / CHF (US Dollar / Swiss Franc)',
    asset_type: 'forex',
    category: 'Major FX',
    is_active: false, // User requested USDJPY ONLY
    alert_threshold: 0.70,
  },
  {
    ticker: 'USDCAD',
    finnhub_symbol: 'OANDA:USD_CAD',
    display_name: 'USD / CAD (US Dollar / Canadian Dollar)',
    asset_type: 'forex',
    category: 'Major FX',
    is_active: false, // User requested USDJPY ONLY
    alert_threshold: 0.70,
  },
  {
    ticker: 'GBPJPY',
    finnhub_symbol: 'OANDA:GBP_JPY',
    display_name: 'GBP / JPY (British Pound / Japanese Yen)',
    asset_type: 'forex',
    category: 'Cross FX',
    is_active: false, // Too volatile for $10
    alert_threshold: 0.72,
  },
  {
    ticker: 'EURJPY',
    finnhub_symbol: 'OANDA:EUR_JPY',
    display_name: 'EUR / JPY (Euro / Japanese Yen)',
    asset_type: 'forex',
    category: 'Cross FX',
    is_active: false, // High spread risk for $10
    alert_threshold: 0.70,
  },
  {
    ticker: 'XAUUSD',
    finnhub_symbol: 'OANDA:XAU_USD',
    display_name: 'XAU / USD (Gold / US Dollar)',
    asset_type: 'commodity',
    category: 'Precious Metal',
    is_active: false, // EXTREME DANGER FOR $10 ACCOUNT
    alert_threshold: 0.72,
  },

  // US Stocks & ETFs
  {
    ticker: 'AAPL',
    finnhub_symbol: 'AAPL',
    display_name: 'Apple Inc.',
    asset_type: 'stock',
    category: 'Tech MegaCap',
    is_active: false,
    alert_threshold: 0.70,
  },
  {
    ticker: 'NVDA',
    finnhub_symbol: 'NVDA',
    display_name: 'NVIDIA Corporation',
    asset_type: 'stock',
    category: 'Semiconductors / AI',
    is_active: false,
    alert_threshold: 0.72,
  },
  {
    ticker: 'TSLA',
    finnhub_symbol: 'TSLA',
    display_name: 'Tesla, Inc.',
    asset_type: 'stock',
    category: 'EV & Auto Tech',
    is_active: false,
    alert_threshold: 0.70,
  },
  {
    ticker: 'MSFT',
    finnhub_symbol: 'MSFT',
    display_name: 'Microsoft Corporation',
    asset_type: 'stock',
    category: 'Cloud & AI Software',
    is_active: false,
    alert_threshold: 0.70,
  },
  {
    ticker: 'AMZN',
    finnhub_symbol: 'AMZN',
    display_name: 'Amazon.com Inc.',
    asset_type: 'stock',
    category: 'E-Commerce & Cloud',
    is_active: false,
    alert_threshold: 0.70,
  },
  {
    ticker: 'GOOGL',
    finnhub_symbol: 'GOOGL',
    display_name: 'Alphabet Inc.',
    asset_type: 'stock',
    category: 'Internet & Search',
    is_active: false,
    alert_threshold: 0.70,
  },
  {
    ticker: 'SPY',
    finnhub_symbol: 'SPY',
    display_name: 'SPDR S&P 500 ETF Trust',
    asset_type: 'index',
    category: 'Broad Market Index',
    is_active: false,
    alert_threshold: 0.68,
  },
];
