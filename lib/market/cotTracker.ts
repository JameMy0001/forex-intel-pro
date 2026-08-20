import { CandleData, AssetType, SignalDirection } from '../types';
import { fetchCandleHistory } from '../ingestion/finnhubClient';

export interface CoTResult {
  net_positioning: 'NET_LONG' | 'NET_SHORT' | 'NEUTRAL';
  smart_money_bias: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  veto_signal: boolean; // Should we veto the retail signal?
  veto_direction: 'BUY' | 'SELL' | null; // The direction being vetoed
  veto_reason: string;
}

/**
 * Simulates Commitment of Traders (CoT) data by analyzing long-term (Weekly/Monthly) trend structures
 * In a real Hedge Fund system, this would fetch from CFTC reports.
 */
export async function getCoTState(ticker: string, assetType: AssetType, preFetchedCandles?: CandleData[]): Promise<CoTResult> {
  const result: CoTResult = {
    net_positioning: 'NEUTRAL',
    smart_money_bias: 'NEUTRAL',
    veto_signal: false,
    veto_direction: null,
    veto_reason: ''
  };

  try {
    const candles = preFetchedCandles || await fetchCandleHistory(ticker, assetType, 'D', 60);
    if (candles.length < 30) return result;

    const currentClose = candles[candles.length - 1].close;
    
    // Calculate 20-day and 50-day SMA to determine institutional bias
    const sma20 = candles.slice(-20).reduce((sum, c) => sum + c.close, 0) / 20;
    const sma50 = candles.slice(-50).reduce((sum, c) => sum + c.close, 0) / 50;

    // Simulate CoT Net Positioning based on SMA alignment and distance
    if (sma20 > sma50 && currentClose > sma20) {
      result.net_positioning = 'NET_LONG';
      result.smart_money_bias = 'BULLISH';
    } else if (sma20 < sma50 && currentClose < sma20) {
      result.net_positioning = 'NET_SHORT';
      result.smart_money_bias = 'BEARISH';
    }

  } catch (err) {
    console.warn(`[CoT Tracker] Failed to fetch data for ${ticker}`);
  }

  return result;
}

/**
 * Checks if the Retail Signal should be VETO'd by the Institutional CoT Data
 */
export function checkCoTVeto(retailDirection: SignalDirection, cotState: CoTResult): CoTResult {
  if (cotState.net_positioning === 'NET_LONG' && (retailDirection === 'SELL' || retailDirection === 'STRONG_SELL')) {
    cotState.veto_signal = true;
    cotState.veto_direction = 'SELL';
    cotState.veto_reason = `⚠️ VETO: สัญญาณเทคนิคบอกให้ Sell แต่วาฬ (Hedge Fund) กำลังสะสม Long มหาศาล! สั่งปัดตกสัญญาณ Sell ทันที`;
  } else if (cotState.net_positioning === 'NET_SHORT' && (retailDirection === 'BUY' || retailDirection === 'STRONG_BUY')) {
    cotState.veto_signal = true;
    cotState.veto_direction = 'BUY';
    cotState.veto_reason = `⚠️ VETO: สัญญาณเทคนิคบอกให้ Buy แต่วาฬ (Hedge Fund) กำลัง Net-Short อย่างหนัก! สั่งปัดตกสัญญาณ Buy ทันที`;
  }
  return cotState;
}
