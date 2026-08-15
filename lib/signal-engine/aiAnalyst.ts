import { AIAnalysisOutput, SignalOutput, TechnicalIndicators, NewsArticle } from '../types';
import { resilientFetch } from '../ingestion/rateLimiter';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';

/**
 * Generate deep AI Market Synthesis & Trade Thesis in THAI language using Google Gemini API
 */
export async function generateAIAnalysis(
  ticker: string,
  price: number,
  signal: SignalOutput,
  indicators: TechnicalIndicators,
  newsArticles: NewsArticle[]
): Promise<AIAnalysisOutput> {
  const newsContext = newsArticles
    .slice(0, 5)
    .map((a, i) => `${i + 1}. [${a.source}] ${a.headline} (Sentiment: ${a.sentiment_score}): ${a.summary}`)
    .join('\n');

  if (GEMINI_API_KEY) {
    try {
      const prompt = `คุณคือ Senior Macro & Quantitative Hedge Fund Trader ระดับโลก 
กรุณาวิเคราะห์สินทรัพย์ต่อไปนี้ และสรุปมุมมองเชิงลึก แผนการเทรด และปัจจัยมหภาคเป็น "ภาษาไทยที่เข้าใจง่าย กระชับ ตรงประเด็นสำหรับ Trader มืออาชีพ" ในรูปแบบ JSON:

ข้อมูลสินทรัพย์:
- สินทรัพย์: ${ticker}
- ราคาปัจจุบัน: ${price}
- ทิศทางสัญญาณ: ${signal.direction} (ความน่าจะเป็นชนะ: ${(signal.probability_score * 100).toFixed(1)}%)
- จุดเข้าแนะนำ (Entry): ${signal.recommended_entry}
- จุดตัดขาดทุน (Stop Loss): ${signal.stop_loss}
- จุดทำกำไร (TP1 / TP2): ${signal.take_profit_1} / ${signal.take_profit_2}

อินดิเคเตอร์ทางเทคนิค:
- RSI (14): ${indicators.rsi_14}
- MACD: Value ${indicators.macd_value}, Signal ${indicators.macd_signal}, Hist ${indicators.macd_histogram}
- Bollinger Bands: บน ${indicators.bollinger_upper}, กลาง ${indicators.bollinger_middle}, ล่าง ${indicators.bollinger_lower}
- EMA 20: ${indicators.ema_20}, EMA 50: ${indicators.ema_50}, EMA 200: ${indicators.ema_200}
- ATR (ความผันผวน): ${indicators.atr_14}
- แนวโน้ม Trend: ${indicators.trend_bias}

ข่าวสารและปัจจัยล่าสุด:
${newsContext || 'ไม่มีข่าวเฉพาะเจาะจง ตลาดเคลื่อนไหวตาม Technical & Yields'}

ตอบกลับเป็น JSON ภาษาไทยตามโครงสร้างนี้เท่านั้น (ห้ามมีคำอธิบายอื่นนอก JSON):
{
  "macro_catalyst": "สรุปปัจจัยมหภาคหลัก 1-2 ประโยคภาษาไทย (เช่น ดอกเบี้ย Fed, ข้อมูลเศรษฐกิจ, ค่าเงินดอลลาร์ หรือแรงซื้อสถาบัน)",
  "bull_case": "มุมมองฝั่งซื้อ/ขึ้น: เหตุผลและปัจจัยหนุนเชิงบวก (1-2 ประโยคสั้นๆ)",
  "bear_case": "มุมมองฝั่งขาย/ลง: ความเสี่ยงและแนวต้านที่ต้องระวัง (1-2 ประโยคสั้นๆ)",
  "trade_thesis": "แผนการเทรดสรุป: อธิบายเหตุผลที่ความน่าจะเป็นนี้เกิดขึ้น และคำแนะนำเชิงกลยุทธ์สำหรับเทรดเดอร์ใน MT5 (2-3 ประโยคภาษาไทยที่ชัดเจน)",
  "invalidation_level": ${signal.stop_loss || price * 0.98},
  "support_levels": [${indicators.bollinger_lower}, ${indicators.ema_50}],
  "resistance_levels": [${indicators.bollinger_upper}, ${indicators.ema_20}]
}`;

      const aiResponse = await resilientFetch('gemini', async () => {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.2,
              responseMimeType: 'application/json',
            },
          }),
        });

        if (!res.ok) {
          throw new Error(`Gemini API HTTP ${res.status}: ${res.statusText}`);
        }

        const data = await res.json();
        const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!rawText) throw new Error('Empty response from Gemini');
        return JSON.parse(rawText);
      });

      return {
        ticker,
        macro_catalyst: aiResponse.macro_catalyst || 'ทิศทางนโยบายการเงินของธนาคารกลางและอัตราผลตอบแทนพันธบัตรสหรัฐฯ เป็นตัวขับเคลื่อนหลัก',
        bull_case: aiResponse.bull_case || 'ราคายังรักษาระดับเหนือเส้นค่าเฉลี่ยสำคัญ พร้อมแรงซื้อหนุนเชิงโครงสร้าง',
        bear_case: aiResponse.bear_case || 'ระวังความผันผวนจากตัวเลขเศรษฐกิจ และแรงขายทำกำไรบริเวณแนวต้าน',
        trade_thesis: aiResponse.trade_thesis || `สัญญาณ ${signal.direction} ความน่าจะเป็น ${(signal.probability_score * 100).toFixed(1)}% มีความได้เปรียบทางสถิติ แนะนำวาง Stop Loss ที่ ${signal.stop_loss} เพื่อคุมความเสี่ยง`,
        invalidation_level: Number(aiResponse.invalidation_level) || signal.stop_loss,
        key_levels: {
          support: Array.isArray(aiResponse.support_levels) ? aiResponse.support_levels : [indicators.bollinger_lower, indicators.ema_50],
          resistance: Array.isArray(aiResponse.resistance_levels) ? aiResponse.resistance_levels : [indicators.bollinger_upper, indicators.ema_20],
        },
        model_used: 'gemini-2.0-flash (Thai Deep Intelligence)',
        generated_at: new Date().toISOString(),
      };
    } catch (err) {
      console.warn(`[Gemini AI Synthesis] Failed for ${ticker}: ${(err as Error).message}. Using Thai analytical fallback...`);
    }
  }

  // Analytical Synthesis Engine in Thai (Fallback if API quota is exceeded)
  const isBull = signal.direction.includes('BUY');
  const isBear = signal.direction.includes('SELL');

  let macroCatalyst = '';
  let bullCase = '';
  let bearCase = '';
  let thesis = '';
  let invalidation = signal.stop_loss || price * (isBull ? 0.985 : 1.015);

  if (ticker.includes('JPY')) {
    macroCatalyst = `นโยบายดอกเบี้ยของธนาคารกลางญี่ปุ่น (BOJ) ควบคู่กับ Yields สหรัฐฯ กำหนดทิศทางการไหลของเงินทุนในคู่เงินเยน`;
    bullCase = `หากดอลลาร์สหรัฐฯ แข็งค่าต่อเนื่อง จะผลักดันให้เกิดแรงซื้อดันราคาขึ้นทดสอบ ${indicators.bollinger_upper.toFixed(3)}`;
    bearCase = `ความกังวลการแทรกแซงค่าเงินจากทางการญี่ปุ่นอาจทำให้เกิดแรงเทขายรวดเร็วลงสู่แนวรับ ${indicators.bollinger_lower.toFixed(3)}`;
    thesis = `โมเดลคำนวณความน่าจะเป็น ${signal.direction} อยู่ที่ ${(signal.probability_score * 100).toFixed(1)}% ตามแนวโน้มโมเมนตัม RSI (${indicators.rsi_14.toFixed(1)}) แนะนำเข้าเทรดโดยตั้ง Stop Loss ที่ ${invalidation.toFixed(3)}`;
  } else if (ticker.includes('EUR') || ticker.includes('GBP')) {
    macroCatalyst = `ส่วนต่างอัตราดอกเบี้ยระหว่าง Fed และ ECB/BOE รวมถึงตัวเลขเงินเฟ้อ CPI กำหนดทิศทางค่าเงินหลัก`;
    bullCase = `ราคาทรงตัวเหนือ EMA 50 พร้อมสัญญาณ Sentiment บวก (+${(Math.abs(signal.sentiment_component) * 100).toFixed(0)}%)`;
    bearCase = `หากหลุดแนวรับสำคัญที่ ${indicators.bollinger_lower.toFixed(4)} อาจเกิดคลื่นแรงขายต่อเนื่อง`;
    thesis = `ระบบให้คะแนนความน่าจะเป็น ${(signal.probability_score * 100).toFixed(1)}% ในทิศทาง ${signal.direction} แนะนำบริหาร Reward ต่อ Risk อย่างน้อย 1:2`;
  } else if (ticker === 'XAUUSD') {
    macroCatalyst = `แรงซื้อสะสมทองคำของธนาคารกลางโลก ความเสี่ยงภูมิรัฐศาสตร์ และการป้องกันความเสี่ยงเงินเฟ้อ`;
    bullCase = `แรงซื้อหนุนอย่างแข็งแกร่งเมื่อราคาย่อตัว โมเมนตัมยืนเหนือ EMA 20 ($${indicators.ema_20.toFixed(2)})`;
    bearCase = `หาก Bond Yields สหรัฐฯ ดีดตัวขึ้นแรง อาจกดดันให้เกิดแรงขายทำกำไรระยะสั้นลงหา $${indicators.ema_50.toFixed(2)}`;
    thesis = `ทองคำมีคะแนนความน่าจะเป็น ${(signal.probability_score * 100).toFixed(1)}% ในฝั่ง ${signal.direction} หาจังหวะเข้าใกล้ $${price.toFixed(2)} วางเป้าหมายแรกที่ $${signal.take_profit_1?.toFixed(2)}`;
  } else {
    macroCatalyst = `กระแสการลงทุนในกลุ่มเทคโนโลยีและ AI ควบคู่กับผลประกอบการไตรมาสล่าสุดของบริษัท`;
    bullCase = `กระแสเงินสดแข็งแกร่งและราคายืนเหนือเส้นค่าเฉลี่ย 50 วัน ($${indicators.ema_50.toFixed(2)})`;
    bearCase = `แรงกดดันจากการประเมินมูลค่า (Valuation) บริเวณแนวต้าน $${indicators.bollinger_upper.toFixed(2)}`;
    thesis = `${ticker} มีสัญญาณ ${signal.direction} ความน่าจะเป็น ${(signal.probability_score * 100).toFixed(1)}% จุดยอมแพ้คุมความเสี่ยงอยู่ที่ $${invalidation.toFixed(2)}`;
  }

  return {
    ticker,
    macro_catalyst: macroCatalyst,
    bull_case: bullCase,
    bear_case: bearCase,
    trade_thesis: thesis,
    invalidation_level: Number(invalidation.toFixed(4)),
    key_levels: {
      support: [Number(indicators.bollinger_lower.toFixed(4)), Number(indicators.ema_50.toFixed(4))],
      resistance: [Number(indicators.bollinger_upper.toFixed(4)), Number(indicators.ema_20.toFixed(4))],
    },
    model_used: 'AI Macro Engine (Thai)',
    generated_at: new Date().toISOString(),
  };
}
