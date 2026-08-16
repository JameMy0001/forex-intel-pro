import { AssetType } from '../types';

export interface MacroYieldResult {
  us10y_rate: number;
  us10y_change: number; // percentage change today
  dxy_rate: number;
  dxy_change: number;
  arbitrage_signal: 'BUY_OPPORTUNITY' | 'SELL_OPPORTUNITY' | 'NEUTRAL';
  warning_text: string;
}

export async function getMacroYieldState(ticker: string, assetType: AssetType): Promise<MacroYieldResult> {
  const result: MacroYieldResult = {
    us10y_rate: 4.5,
    us10y_change: 0,
    dxy_rate: 104.0,
    dxy_change: 0,
    arbitrage_signal: 'NEUTRAL',
    warning_text: ''
  };

  if (assetType !== 'forex' && ticker !== 'XAUUSD') {
    return result; // Yield arb is mainly for FX/Gold
  }

  try {
    // 1. Fetch US10Y (^TNX)
    const tnxRes = await fetch('https://query1.finance.yahoo.com/v8/finance/chart/^TNX?interval=1d&range=1d', {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      next: { revalidate: 300 } // cache 5 min
    });
    if (tnxRes.ok) {
      const tnxData = await tnxRes.json();
      const meta = tnxData.chart?.result?.[0]?.meta;
      if (meta) {
        result.us10y_rate = Number(meta.regularMarketPrice || 4.5);
        const prevClose = Number(meta.chartPreviousClose || result.us10y_rate);
        result.us10y_change = ((result.us10y_rate - prevClose) / prevClose) * 100;
      }
    }

    // 2. Fetch DXY (DX-Y.NYB)
    const dxyRes = await fetch('https://query1.finance.yahoo.com/v8/finance/chart/DX-Y.NYB?interval=1d&range=1d', {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      next: { revalidate: 300 }
    });
    if (dxyRes.ok) {
      const dxyData = await dxyRes.json();
      const meta = dxyData.chart?.result?.[0]?.meta;
      if (meta) {
        result.dxy_rate = Number(meta.regularMarketPrice || 104.0);
        const prevClose = Number(meta.chartPreviousClose || result.dxy_rate);
        result.dxy_change = ((result.dxy_rate - prevClose) / prevClose) * 100;
      }
    }

    // 3. Analyze Arbitrage Logic
    const isUsdBase = ticker.startsWith('USD'); // USDJPY, USDCAD, USDCHF
    const isUsdQuote = ticker.endsWith('USD'); // EURUSD, GBPUSD, XAUUSD

    // Yield Spike: USD Bullish
    if (result.us10y_change > 1.0 || result.dxy_change > 0.3) {
      if (isUsdBase) {
        result.arbitrage_signal = 'BUY_OPPORTUNITY';
        result.warning_text = `⚠️ Macro Arbitrage: ยีลด์พันธบัตร 10 ปีสหรัฐพุ่งขึ้นแรง (${result.us10y_change.toFixed(2)}%) ค่าเงินดอลลาร์กำลังแข็งค่า หนุนให้ ${ticker} ปรับตัวขึ้น`;
      } else if (isUsdQuote) {
        result.arbitrage_signal = 'SELL_OPPORTUNITY';
        result.warning_text = `⚠️ Macro Arbitrage: ยีลด์พันธบัตร 10 ปีสหรัฐพุ่งขึ้นแรง (${result.us10y_change.toFixed(2)}%) กดดันให้ ${ticker} มีโอกาสร่วงหนัก`;
      }
    } 
    // Yield Crash: USD Bearish
    else if (result.us10y_change < -1.0 || result.dxy_change < -0.3) {
      if (isUsdBase) {
        result.arbitrage_signal = 'SELL_OPPORTUNITY';
        result.warning_text = `⚠️ Macro Arbitrage: ยีลด์สหรัฐร่วงหนัก (${result.us10y_change.toFixed(2)}%) ดอลลาร์อ่อนค่าฉับพลัน กดดันให้ ${ticker} ปรับตัวลง`;
      } else if (isUsdQuote) {
        result.arbitrage_signal = 'BUY_OPPORTUNITY';
        result.warning_text = `⚠️ Macro Arbitrage: ยีลด์สหรัฐร่วงหนัก (${result.us10y_change.toFixed(2)}%) ดอลลาร์อ่อนค่าฉับพลัน หนุนให้ ${ticker} พุ่งขึ้น`;
      }
    }

  } catch (error) {
    console.warn(`[MacroYield] Failed to fetch macro data:`, error);
  }

  return result;
}
