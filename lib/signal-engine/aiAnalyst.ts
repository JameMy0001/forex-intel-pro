import { AIAnalysisOutput, SignalOutput, TechnicalIndicators, NewsArticle } from '../types';
import { resilientFetch } from '../ingestion/rateLimiter';
import { getMarketStatus } from '../market/marketSchedule';

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
    .map((a, i) => `${i + 1}. [${a.source}] ${a.thai_headline || a.headline} (Sentiment: ${a.sentiment_score}): ${a.thai_summary || a.summary}`)
    .join('\n');

  const assetType = ticker.includes('USD') || ticker.includes('JPY') || ticker.includes('EUR') || ticker.includes('GBP') ? 'forex' : 'stock';
  const marketStatus = getMarketStatus(assetType as any, ticker);
  const spreadWarningText = marketStatus.spread_warning 
    ? `\n⚠️ ข้อมูลฉุกเฉิน: ขณะนี้อยู่ในช่วงตลาดสภาพคล่องต่ำ (Spread กว้าง) ต้องเตือนผู้ใช้ทุน $10 ให้ระวังการติดลบหนักทันทีที่เข้าออเดอร์` 
    : '';

  if (GEMINI_API_KEY) {
    try {
      const prompt = `คุณคือ Senior Quantitative Risk Manager ระดับโลก
ข้อมูลสำคัญ: ผู้ใช้งานมีทุนการเทรดจำกัดมากเพียง $10 และใช้ Leverage 1:200 (เทรดได้สูงสุด 0.01 หลอด) การขยับผิดทางเพียง 20-30 pips จะทำให้พอร์ตแตกทันที (Stop Out)${spreadWarningText}
กรุณาวิเคราะห์สินทรัพย์ต่อไปนี้ และสรุปมุมมองเชิงลึก แผนการเทรดแบบ "สไนเปอร์ (Sniper / Scalping) เท่านั้น ห้ามทนลากเด็ดขาด" เป็น "ภาษาไทยที่เข้าใจง่าย กระชับ" ในรูปแบบ JSON:

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
  "trade_thesis": "แผนการเทรดสรุป: เน้นย้ำว่าผู้ใช้ทุน $10 ต้องเก็บสั้นหนีเร็ว (Scalping) วาง SL แคบๆ ห้ามถือข้ามวัน แนะนำกลยุทธ์สำหรับ MT5 แบบจำกัดความเสี่ยงสูงสุด (2-3 ประโยค)",
  "invalidation_level": ${signal.stop_loss || price * 0.98},
  "support_levels": [${indicators.bollinger_lower}, ${indicators.ema_50}],
  "resistance_levels": [${indicators.bollinger_upper}, ${indicators.ema_20}]
}`;

      const aiResponse = await resilientFetch('gemini', async () => {
        const models = ['gemini-3.7-flash', 'gemini-3.5-flash', 'gemini-2.5-pro', 'gemini-2.0-pro'];
        for (const model of models) {
          try {
            const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;
            const res = await fetch(url, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: {
                  temperature: 0.15,
                  responseMimeType: 'application/json',
                },
              }),
            });

            if (res.ok) {
              const data = await res.json();
              const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
              if (rawText) {
                const match = rawText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
                const jsonStr = match ? match[1] : rawText.trim();
                try {
                  return JSON.parse(jsonStr);
                } catch (parseErr) {
                  const err = new Error('Gemini returned malformed JSON');
                  (err as any).status = 422;
                  throw err;
                }
              }
            }
          } catch (mErr) {}
        }
        throw new Error('All Gemini model endpoints failed');
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
        model_used: 'gemini-3.7-flash (High Intelligence)',
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
    thesis = `(โหมดสไนเปอร์ $10) ความน่าจะเป็น ${signal.direction} อยู่ที่ ${(signal.probability_score * 100).toFixed(1)}% แนะนำ Scalping เก็บสั้นๆ ตั้ง SL แน่นๆ ที่ ${invalidation.toFixed(3)} ห้ามทนลากเด็ดขาด`;
  } else if (ticker.includes('EUR') || ticker.includes('GBP')) {
    macroCatalyst = `ส่วนต่างอัตราดอกเบี้ยระหว่าง Fed และ ECB/BOE รวมถึงตัวเลขเงินเฟ้อ CPI กำหนดทิศทางค่าเงินหลัก`;
    bullCase = `ราคาทรงตัวเหนือ EMA 50 พร้อมสัญญาณ Sentiment บวก (+${(Math.abs(signal.sentiment_component) * 100).toFixed(0)}%)`;
    bearCase = `หากหลุดแนวรับสำคัญที่ ${indicators.bollinger_lower.toFixed(4)} อาจเกิดคลื่นแรงขายต่อเนื่อง`;
    thesis = `(โหมดสไนเปอร์ $10) โอกาสชนะ ${(signal.probability_score * 100).toFixed(1)}% ทิศทาง ${signal.direction} บริหาร Margin ให้ดี ตั้งจุดยอมแพ้หนีให้ไวที่สุด`;
  } else if (ticker === 'XAUUSD') {
    macroCatalyst = `แรงซื้อสะสมทองคำของธนาคารกลางโลก ความเสี่ยงภูมิรัฐศาสตร์ และการป้องกันความเสี่ยงเงินเฟ้อ`;
    bullCase = `แรงซื้อหนุนอย่างแข็งแกร่งเมื่อราคาย่อตัว โมเมนตัมยืนเหนือ EMA 20 ($${indicators.ema_20.toFixed(2)})`;
    bearCase = `หาก Bond Yields สหรัฐฯ ดีดตัวขึ้นแรง อาจกดดันให้เกิดแรงขายทำกำไรระยะสั้นลงหา $${indicators.ema_50.toFixed(2)}`;
    thesis = `(โหมดสไนเปอร์ $10) ทองคำผันผวนสูงมาก! โอกาส ${(signal.probability_score * 100).toFixed(1)}% ไปทาง ${signal.direction} เข้าไวออกไวที่ $${price.toFixed(2)} ห้ามถือข้ามคืนเด็ดขาด`;
  } else {
    macroCatalyst = `กระแสการลงทุนในกลุ่มเทคโนโลยีและ AI ควบคู่กับผลประกอบการไตรมาสล่าสุดของบริษัท`;
    bullCase = `กระแสเงินสดแข็งแกร่งและราคายืนเหนือเส้นค่าเฉลี่ย 50 วัน ($${indicators.ema_50.toFixed(2)})`;
    bearCase = `แรงกดดันจากการประเมินมูลค่า (Valuation) บริเวณแนวต้าน $${indicators.bollinger_upper.toFixed(2)}`;
    thesis = `(โหมดสไนเปอร์ $10) ${ticker} สัญญาณ ${signal.direction} ${(signal.probability_score * 100).toFixed(1)}% ตัดขาดทุนทันทีเมื่อผิดทางที่ $${invalidation.toFixed(2)}`;
  }

  if (marketStatus.spread_warning) {
    thesis += ` [⚠️ ระวัง! ช่วงนี้ Spread กว้างมาก ทุน $10 อาจติดลบหนักตั้งแต่เปิดออเดอร์]`;
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

/**
 * Batch analyze news sentiment using Gemini AI
 * Solves the issue where keyword heuristics fail on context (e.g. "NO rate cut")
 */
export async function enrichArticlesWithAISentiment(articles: NewsArticle[]): Promise<NewsArticle[]> {
  if (!GEMINI_API_KEY || articles.length === 0) return articles;

  // Process in batches of 15 to avoid overloading the model
  const BATCH_SIZE = 15;
  const enrichedArticles = [...articles];

  for (let i = 0; i < enrichedArticles.length; i += BATCH_SIZE) {
    const batch = enrichedArticles.slice(i, i + BATCH_SIZE);
    
    const headlinesList = batch.map((a, idx) => `[ID: ${idx}] Asset: ${a.ticker} | Headline: ${a.headline}`).join('\n');
    
    const prompt = `You are a professional quantitative financial analyst. 
Analyze the following news headlines and determine the sentiment impact specifically on the listed Asset (e.g., if Asset is EURUSD, how does it affect EUR vs USD? If Asset is Gold, how does it affect Gold?). 
Return a JSON array of objects with the exact structure below, matching the ID. 
Sentiment Score must be a float between -1.0 (very bearish) and 1.0 (very bullish). 0 is neutral.

Headlines to analyze:
${headlinesList}

Output JSON format only:
[
  { "id": 0, "score": 0.5 },
  { "id": 1, "score": -0.8 }
]`;

    try {
      const aiResponse = await resilientFetch('gemini', async () => {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.7-flash:generateContent?key=${GEMINI_API_KEY}`;
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.1, responseMimeType: 'application/json' },
          }),
        });

        if (!res.ok) throw new Error('Gemini API Error');
        const data = await res.json();
        const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (rawText) {
          const match = rawText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
          const jsonStr = match ? match[1] : rawText.trim();
          try {
            return JSON.parse(jsonStr);
          } catch (parseErr) {
            const err = new Error('Gemini returned malformed JSON for batch');
            (err as any).status = 422;
            throw err;
          }
        }
        return null;
      });

      if (Array.isArray(aiResponse)) {
        aiResponse.forEach((resItem) => {
          if (typeof resItem.id === 'number' && typeof resItem.score === 'number') {
            const article = batch[resItem.id];
            if (article) {
              const score = Math.max(-1.0, Math.min(1.0, resItem.score));
              article.sentiment_score = score;
              article.sentiment_label = score >= 0.15 ? 'Bullish' : score <= -0.15 ? 'Bearish' : 'Neutral';
            }
          }
        });
      }
    } catch (err) {
      console.warn(`[Gemini Sentiment] Batch ${i / BATCH_SIZE} failed, falling back to heuristic.`);
    }
  }

  return enrichedArticles;
}
