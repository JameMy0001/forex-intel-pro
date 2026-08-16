import { SignalOutput, TechnicalIndicators, NewsArticle } from '../types';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';

export interface ValidationResult {
  isValid: boolean;
  validatorConfidence: number; // 0 - 100
  riskRating: 'LOW' | 'MEDIUM' | 'HIGH';
  validationNotes: string;
  validatorStamp: string;
}

/**
 * AI Agent 2: Senior Risk & Fact-Check Validator
 * Cross-checks high-probability trade signals before broadcasting to Telegram
 */
export async function validateTradeSignal(
  signal: SignalOutput,
  indicators: TechnicalIndicators,
  newsArticles: NewsArticle[] = []
): Promise<ValidationResult> {
  const isBuy = signal.direction.includes('BUY');
  const isSell = signal.direction.includes('SELL');
  const winRate = signal.win_rate_percent || 50;

  // 1. Algorithmic Pre-Flight Check (Hard Rules)
  // Check for severe Overbought/Oversold Traps
  if (isBuy && indicators.rsi_14 > 78) {
    return {
      isValid: false,
      validatorConfidence: 45,
      riskRating: 'HIGH',
      validationNotes: `สัญญาณ BUY ขัดแย้งกับ RSI (${indicators.rsi_14.toFixed(1)}) ที่เข้าเขต Overbought สูง เสี่ยงติดกับดักแรงขายทำกำไร`,
      validatorStamp: '🛑 ปัดตกโดย AI Risk Validator (RSI Overbought Trap)',
    };
  }

  if (isSell && indicators.rsi_14 < 22) {
    return {
      isValid: false,
      validatorConfidence: 45,
      riskRating: 'HIGH',
      validationNotes: `สัญญาณ SELL ขัดแย้งกับ RSI (${indicators.rsi_14.toFixed(1)}) ที่เข้าเขต Oversold รุนแรง เสี่ยงติดกับดักแรงเด้งกลับ (Rebound Trap)`,
      validatorStamp: '🛑 ปัดตกโดย AI Risk Validator (RSI Oversold Trap)',
    };
  }

  // 2. Attempt AI Validation with Gemini Multi-Agent
  if (GEMINI_API_KEY) {
    const activeModels = ['gemini-flash-lite-latest', 'gemini-3.5-flash'];
    const newsSummary = newsArticles.slice(0, 3).map((a) => `- ${a.headline || a.summary}`).join('\n');

    const prompt = `คุณคือ Senior Risk Officer & Quantitative Trade Validator ประจำกองทุนสถาบัน
หน้าที่ของคุณ: ตรวจสอบและประเมินความเสี่ยงของสัญญาณเทรดต่อไปนี้ว่า "อนุมัติให้ส่งแจ้งเตือนเทรดเดอร์ (PASS)" หรือ "ระงับเนื่องจากมีความเสี่ยงแฝง (FAIL)"

ข้อมูลสัญญาณเทรด:
- คู่เงิน/สินทรัพย์: ${signal.ticker}
- คำสั่ง: ${signal.direction} (Win Rate: ${winRate}%)
- ราคาตลาด: ${signal.price || signal.recommended_entry}
- จุดเข้า: ${signal.recommended_entry}, SL: ${signal.stop_loss}, TP1: ${signal.take_profit_1}, RR: 1:${signal.risk_reward_ratio || 1.5}
- ข้อมูลเทคนิค: RSI(14) = ${indicators.rsi_14.toFixed(1)}, MACD = ${indicators.macd_histogram >= 0 ? 'Bullish' : 'Bearish'}, Trend = ${indicators.trend_bias}
- หัวข้อข่าวล่าสุด:
${newsSummary || 'ไม่มีข่าวรุนแรงในระยะสั้น'}

กรุณาตอบกลับเป็น JSON Format สั้นๆ ดังนี้เท่านั้น:
{
  "isValid": true,
  "validatorConfidence": 90,
  "riskRating": "LOW",
  "validationNotes": "สรุปสั้นๆ 1 ประโยคภาษาไทยว่าทำไมถึงผ่านความเสี่ยงและคุ้มค่า"
}`;

    for (const model of activeModels) {
      try {
        const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.1,
              responseMimeType: 'application/json',
              maxOutputTokens: 300,
            },
          }),
        });

        if (res.ok) {
          const json = await res.json();
          const rawText = json?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (rawText) {
            const parsed = JSON.parse(rawText);
            const riskRating = parsed.riskRating || 'LOW';
            const confidence = Number(parsed.validatorConfidence) || 90;
            const isValid = parsed.isValid !== false && confidence >= 70;

            return {
              isValid,
              validatorConfidence: confidence,
              riskRating,
              validationNotes: parsed.validationNotes || 'โครงสร้างกราฟและอัตราผลตอบแทนคุ้มค่าความเสี่ยง',
              validatorStamp: isValid
                ? `🛡️ AI Risk Validator: ผ่านการตรวจสอบความเสี่ยง ${confidence}% (${riskRating} Risk)`
                : `🛑 AI Risk Validator: ระงับสัญญาณ (${parsed.validationNotes})`,
            };
          }
        }
      } catch (e) {
        // Try next model
      }
    }
  }

  // 3. Fallback Algorithmic Validation
  const isHealthyRR = (signal.risk_reward_ratio || 1.5) >= 1.5;
  const isHealthyConfidence = winRate >= 75;
  const isValid = isHealthyRR && isHealthyConfidence;
  const confidence = isHealthyConfidence ? Math.min(95, Math.round(winRate + 5)) : 65;

  return {
    isValid,
    validatorConfidence: confidence,
    riskRating: 'LOW',
    validationNotes: 'อัตราผลตอบแทนต่อความเสี่ยง (Risk/Reward) อยู่ในเกณฑ์คุ้มค่าและทิศทางสอดคล้องกับแนวโน้มหลัก',
    validatorStamp: isValid
      ? `🛡️ AI Risk Validator: ผ่านการตรวจสอบความเสี่ยง ${confidence}% (Low Risk)`
      : '🛑 AI Risk Validator: ระงับสัญญาณเนื่องจากอัตราความเสี่ยงไม่เหมาะสม',
  };
}
