import { PriceSnapshot, CandleData } from '../types';
import { resilientFetch } from './rateLimiter';

const FINNHUB_API_KEY = process.env.FINNHUB_API_KEY || '';

/**
 * Format ticker to Finnhub symbol
 * e.g. EURUSD -> OANDA:EUR_USD
 * XAUUSD -> OANDA:XAU_USD
 * AAPL -> AAPL
 */
export function formatFinnhubSymbol(ticker: string, assetType: string): string {
  if (assetType === 'forex' || ticker.includes('EUR') || ticker.includes('GBP') || ticker.includes('JPY') || ticker.includes('AUD') || ticker.includes('CHF') || ticker.includes('CAD')) {
    if (ticker.includes(':')) return ticker;
    // Split 6-letter FX symbol (e.g. EURUSD -> OANDA:EUR_USD)
    if (ticker.length === 6) {
      return `OANDA:${ticker.substring(0, 3)}_${ticker.substring(3)}`;
    }
    return `OANDA:${ticker}`;
  }
  if (ticker === 'XAUUSD') return 'OANDA:XAU_USD';
  return ticker;
}

/**
 * Fetch real-time live quote from Finnhub or real public FX/Stock feeds
 */
export async function fetchLiveQuote(ticker: string, assetType: string = 'stock'): Promise<PriceSnapshot> {
  const finnhubSymbol = formatFinnhubSymbol(ticker, assetType);
  const nowStr = new Date().toISOString();

  if (FINNHUB_API_KEY) {
    try {
      return await resilientFetch('finnhub', async () => {
        const url = `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(finnhubSymbol)}&token=${FINNHUB_API_KEY}`;
        const res = await fetch(url);
        if (!res.ok) {
          throw new Error(`Finnhub HTTP ${res.status}: ${res.statusText}`);
        }
        const data = await res.json();
        
        // Finnhub quote format: c (current), d (change), dp (percent change), h (high), l (low), o (open), pc (prev close)
        if (data.c !== undefined && data.c !== 0) {
          const currentPrice = Number(data.c);
          const prevClose = Number(data.pc) || currentPrice;
          const changeAmount = Number(data.d) || (currentPrice - prevClose);
          const changePercent = Number(data.dp) || ((changeAmount / prevClose) * 100);

          return {
            ticker,
            price: currentPrice,
            open_price: Number(data.o) || currentPrice,
            high_price: Number(data.h) || currentPrice,
            low_price: Number(data.l) || currentPrice,
            previous_close: prevClose,
            change_amount: changeAmount,
            change_percent: changePercent,
            bid: currentPrice * 0.9998,
            ask: currentPrice * 1.0002,
            volume: 0,
            source: 'finnhub',
            captured_at: nowStr,
          };
        }
        throw new Error('Empty quote returned by Finnhub');
      });
    } catch (err) {
      console.warn(`[Finnhub Live Quote] Failed for ${ticker}: ${(err as Error).message}. Trying secondary live source...`);
    }
  }

  // Secondary Live Public Quote (Real Live Market Feeds via Yahoo Finance / Free FX API)
  try {
    const yahooSymbol = ticker.includes('EURUSD') ? 'EURUSD=X' :
                        ticker.includes('GBPUSD') ? 'GBPUSD=X' :
                        ticker.includes('USDJPY') ? 'JPY=X' :
                        ticker.includes('AUDUSD') ? 'AUDUSD=X' :
                        ticker.includes('USDCHF') ? 'CHF=X' :
                        ticker.includes('USDCAD') ? 'CAD=X' :
                        ticker.includes('XAUUSD') ? 'GC=F' :
                        ticker;

    const yfUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSymbol)}?interval=1m&range=1d`;
    const res = await fetch(yfUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
      },
    });

    if (res.ok) {
      const data = await res.json();
      const result = data.chart?.result?.[0];
      if (result && result.meta) {
        const meta = result.meta;
        const currentPrice = Number(meta.regularMarketPrice || meta.chartPreviousClose || 0);
        const prevClose = Number(meta.chartPreviousClose || meta.previousClose || currentPrice);
        const changeAmount = currentPrice - prevClose;
        const changePercent = prevClose !== 0 ? (changeAmount / prevClose) * 100 : 0;

        return {
          ticker,
          price: currentPrice,
          open_price: Number(meta.regularMarketOpen || currentPrice),
          high_price: Number(meta.regularMarketDayHigh || currentPrice),
          low_price: Number(meta.regularMarketDayLow || currentPrice),
          previous_close: prevClose,
          change_amount: changeAmount,
          change_percent: changePercent,
          bid: currentPrice * 0.9999,
          ask: currentPrice * 1.0001,
          volume: Number(meta.regularMarketVolume || 0),
          source: 'yahoo_live',
          captured_at: nowStr,
        };
      }
    }
  } catch (secErr) {
    console.warn(`[Secondary Live Quote] Failed for ${ticker}: ${(secErr as Error).message}`);
  }

  throw new Error(`Failed to fetch live quote for ${ticker} from any available source.`);
}

/**
 * Fetch real historical candlestick data for technical calculations and charts
 */
export async function fetchCandleHistory(
  ticker: string,
  assetType: string = 'stock',
  resolution: string = 'D',
  count: number = 60
): Promise<CandleData[]> {
  const finnhubSymbol = formatFinnhubSymbol(ticker, assetType);
  const to = Math.floor(Date.now() / 1000);
  const from = to - (count * 24 * 60 * 60);

  // Try Finnhub Candles if API Key available
  if (FINNHUB_API_KEY) {
    try {
      const endpoint = assetType === 'forex' ? 'forex/candle' : 'stock/candle';
      const url = `https://finnhub.io/api/v1/${endpoint}?symbol=${encodeURIComponent(finnhubSymbol)}&resolution=${resolution}&from=${from}&to=${to}&token=${FINNHUB_API_KEY}`;
      
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        if (data.s === 'ok' && data.c && data.c.length > 0) {
          const candles: CandleData[] = [];
          for (let i = 0; i < data.c.length; i++) {
            const date = new Date(data.t[i] * 1000);
            candles.push({
              timestamp: data.t[i] * 1000,
              open: data.o[i],
              high: data.h[i],
              low: data.l[i],
              close: data.c[i],
              volume: data.v ? data.v[i] : 0,
              timeStr: date.toISOString().split('T')[0],
            });
          }
          return candles;
        }
      }
    } catch (err) {
      console.warn(`[Finnhub Candles] Failed for ${ticker}: ${(err as Error).message}`);
    }
  }

  // Map resolution to Yahoo interval & range
  let yfInterval = '1d';
  let yfRange = '3mo';
  let isIntraday = false;

  if (resolution === '15' || resolution === '15M') {
    yfInterval = '15m';
    yfRange = '5d';
    isIntraday = true;
  } else if (resolution === '60' || resolution === '1H') {
    yfInterval = '60m';
    yfRange = '1mo';
    isIntraday = true;
  } else if (resolution === '240' || resolution === '4H') {
    yfInterval = '60m';
    yfRange = '2mo';
    isIntraday = true;
  }

  // Try Yahoo Finance Historical Candles
  try {
    const yahooSymbol = ticker.includes('EURUSD') ? 'EURUSD=X' :
                        ticker.includes('GBPUSD') ? 'GBPUSD=X' :
                        ticker.includes('USDJPY') ? 'JPY=X' :
                        ticker.includes('GBPJPY') ? 'GBPJPY=X' :
                        ticker.includes('EURJPY') ? 'EURJPY=X' :
                        ticker.includes('AUDUSD') ? 'AUDUSD=X' :
                        ticker.includes('USDCHF') ? 'CHF=X' :
                        ticker.includes('USDCAD') ? 'CAD=X' :
                        ticker.includes('XAUUSD') ? 'GC=F' :
                        ticker;

    const yfUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSymbol)}?interval=${yfInterval}&range=${yfRange}`;
    const res = await fetch(yfUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
      },
    });

    if (res.ok) {
      const data = await res.json();
      const result = data.chart?.result?.[0];
      if (result && result.timestamp && result.indicators?.quote?.[0]) {
        const timestamps = result.timestamp;
        const quotes = result.indicators.quote[0];
        const candles: CandleData[] = [];

        for (let i = 0; i < timestamps.length; i++) {
          const c = quotes.close[i];
          const o = quotes.open[i] || c;
          const h = quotes.high[i] || Math.max(o, c);
          const l = quotes.low[i] || Math.min(o, c);
          const v = quotes.volume ? quotes.volume[i] : 0;

          if (c !== null && c !== undefined && !isNaN(c)) {
            const date = new Date(timestamps[i] * 1000);
            const timeStr = isIntraday
              ? `${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`
              : date.toISOString().split('T')[0];

            candles.push({
              timestamp: timestamps[i] * 1000,
              open: Number(o.toFixed(4)),
              high: Number(h.toFixed(4)),
              low: Number(l.toFixed(4)),
              close: Number(c.toFixed(4)),
              volume: v || 0,
              timeStr,
            });
          }
        }
        if (candles.length > 0) {
          return candles.slice(-count);
        }
      }
    }
  } catch (yfErr) {
    console.warn(`[Yahoo Candles] Failed for ${ticker}: ${(yfErr as Error).message}`);
  }

  throw new Error(`Failed to fetch historical candles for ${ticker} from any available source.`);
}
