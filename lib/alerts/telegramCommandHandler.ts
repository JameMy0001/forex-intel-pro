import { fetchLiveQuote, fetchCandleHistory } from '../ingestion/finnhubClient';
import { fetchMarketauxNews } from '../ingestion/marketauxClient';
import { computeTechnicalIndicators } from '../signal-engine/indicators';
import { calculateProbabilityScore } from '../signal-engine/probability';
import { getSystemSettings, updateSystemSettings } from '../db/localDb';
import { DEFAULT_SYMBOLS } from '../constants/defaultSymbols';
import { enrichArticleWithThaiSummary } from '../ingestion/thaiNewsHelper';
import { AssetType, NewsArticle } from '../types';

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';

/**
 * Send a reply message to Telegram with optional Reply Keyboard
 */
export async function sendTelegramReply(
  chatId: string | number,
  text: string,
  keyboard?: any
): Promise<boolean> {
  if (!TELEGRAM_BOT_TOKEN) return false;
  try {
    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
    const payload: any = {
      chat_id: chatId,
      text,
      parse_mode: 'HTML',
      disable_web_page_preview: true,
    };

    if (keyboard) {
      payload.reply_markup = keyboard;
    }

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    return data.ok;
  } catch (err) {
    console.error('[Telegram Reply Error]', err);
    return false;
  }
}

/**
 * Quick Keyboard with 1-tap buttons
 */
export const QUICK_KEYBOARD = {
  keyboard: [
    [{ text: '/news USDJPY' }, { text: '/check USDJPY' }],
    [{ text: '/news XAUUSD' }, { text: '/check XAUUSD' }],
    [{ text: '/status' }, { text: '/help' }],
  ],
  resize_keyboard: true,
  persistent: true,
};

/**
 * Synthesize real-time news into 100% PURE THAI summary using Gemini AI
 */
async function synthesizeThaiNews(
  ticker: string,
  displayName: string,
  newsArticles: NewsArticle[]
): Promise<string> {
  // Enrich all articles with Thai summaries first
  const enrichedArticles = newsArticles.map((a) => enrichArticleWithThaiSummary(a));

  if (GEMINI_API_KEY) {
    const models = ['gemini-3.5-flash', 'gemini-flash-lite-latest', 'gemini-3.7-flash'];

    const newsContext = enrichedArticles
      .slice(0, 5)
      .map(
        (a, idx) =>
          `[ข่าวที่ ${idx + 1}] แหล่งข่าว: ${a.source || 'Marketaux'}\nหัวข้อข่าว: ${a.thai_headline || a.headline}\nเนื้อหา: ${a.thai_summary || a.summary}`
      )
      .join('\n\n');

    const prompt = `คุณคือผู้เชี่ยวชาญการวิเคราะห์ข่าวเศรษฐกิจมหภาคและการเงินโลกสถาบัน (Senior Macro Intelligence Analyst)
จงวิเคราะห์และสรุปข่าวล่าสุดของคู่เงิน/สินทรัพย์: ${ticker} (${displayName}) เป็น **ภาษาไทยล้วน 100%** (ห้ามมีภาษาอังกฤษปน แปลงคำศัพท์เทคนิคทั้งหมดเป็นภาษาไทยที่อ่านง่ายและชัดเจน)

ข้อมูลข่าวสดจากตลาด:
${newsContext || 'ตลาดเคลื่อนไหวตามแนวโน้มเศรษฐกิจมหภาคและการคาดการณ์ทิศทางดอกเบี้ยของธนาคารกลาง'}

กรุณาสรุปให้สวยงาม เป็นระเบียบ 3 หัวข้อหลัก โดยใช้แท็ก HTML (<b>, <i>, •):

1. 📰 <b>ประเด็นข่าวและปัจจัยขับเคลื่อนหลัก:</b>
(สรุปประเด็นข่าวเศรษฐกิจโลกและนโยบายธนาคารกลางแบบกระชับ 2-3 บรรทัด เป็นภาษาไทยล้วน)

2. 📊 <b>ทิศทาง Sentiment ตลาด:</b>
(ชี้ชัดว่าข่าวนี้ส่งผลบวก (Bullish) หรือลบ (Bearish) หรือเป็นกลาง ต่อ ${ticker} เพราะอะไร เป็นภาษาไทยล้วน)

3. 🎯 <b>ผลกระทบต่อแนวโน้มราคากราฟ:</b>
(วิเคราะห์ทิศทางแรงซื้อแรงขายและระดับแนวรับแนวต้านสำคัญ เป็นภาษาไทยล้วน)`;

    for (const model of models) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.15, maxOutputTokens: 1200 },
          }),
        });

        if (res.ok) {
          const data = await res.json();
          const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text && text.trim().length > 40) {
            return text.trim();
          }
        }
      } catch (err) {
        console.warn(`[Gemini Model ${model} failed for ${ticker}]:`, (err as Error).message);
      }
    }
  }

  // 100% Thai Fallback from Local Thai Dictionary
  if (enrichedArticles.length > 0) {
    const list = enrichedArticles
      .slice(0, 3)
      .map(
        (a, i) =>
          `• <b>${a.thai_headline || a.headline}</b>\n  <i>${a.thai_summary || a.summary}</i>`
      )
      .join('\n\n');

    return `1. 📰 <b>ประเด็นข่าวและปัจจัยขับเคลื่อนหลัก:</b>\n${list}\n\n2. 📊 <b>ทิศทาง Sentiment ตลาด:</b>\n• ตลาดเคลื่อนไหวตามกระแสเงินทุนหลักและส่วนต่างอัตราดอกเบี้ยระหว่างประเทศ\n\n3. 🎯 <b>ผลกระทบต่อแนวโน้มราคากราฟ:</b>\n• ติดตามการทดสอบแนวรับแนวต้านสำคัญตามสัญญาณเทคนิคอลในแดชบอร์ด`;
  }

  return `1. 📰 <b>ประเด็นข่าวและปัจจัยขับเคลื่อนหลัก:</b>\n• ยังไม่มีข่าวด่วนกระทบรุนแรงในรอบ 24 ชั่วโมงที่ผ่านมา ตลาดเคลื่อนไหวตามปัจจัยทางเทคนิคและกระแสเงินทุนหลัก\n\n2. 📊 <b>ทิศทาง Sentiment ตลาด:</b>\n• อารมณ์ตลาดเป็นกลาง (Neutral) เคลื่อนไหวในกรอบสะสมกำลัง\n\n3. 🎯 <b>ผลกระทบต่อแนวโน้มราคา:</b>\n• รอการประกาศตัวเลขเศรษฐกิจสำคัญเพื่อกำหนดทิศทางใหม่`;
}

/**
 * Handle incoming Telegram command
 */
export async function handleTelegramCommand(
  rawText: string,
  chatId: string | number,
  userName: string = 'Trader'
): Promise<void> {
  const text = rawText.trim();
  const parts = text.split(/\s+/);
  const command = parts[0].toLowerCase().split('@')[0]; // strip @botname if in group
  const arg = parts[1] ? parts[1].toUpperCase() : '';

  // 1. /start or /help
  if (command === '/start' || command === '/help') {
    let msg = `👋 <b>สวัสดีครับคุณ ${userName}!</b>\n`;
    msg += `ยินดีต้อนรับสู่ <b>Nexus Intel Pro 2.0</b> — ระบบวิเคราะห์ข่าวและสัญญาณเทรดอัจฉริยะ 24 ชม.\n\n`;
    msg += `📋 <b>คำสั่งที่คุณสามารถใช้งานได้:</b>\n`;
    msg += `━━━━━━━━━━━━━━━━━━━━━\n`;
    msg += `📰 <b>/news [คู่เงิน]</b>\n`;
    msg += `<i>ดึงข่าวสดและให้ AI สรุปสาระสำคัญเป็นภาษาไทยล้วน 100%</i>\n`;
    msg += `ตัวอย่าง: <code>/news USDJPY</code> หรือ <code>/news XAUUSD</code>\n\n`;

    msg += `🎯 <b>/check [คู่เงิน] หรือ /signal [คู่เงิน]</b>\n`;
    msg += `<i>ตรวจราคา, วินเรท %, สัญญาณ Buy/Sell และค่า MT5 สดๆ</i>\n`;
    msg += `ตัวอย่าง: <code>/check USDJPY</code>\n\n`;

    msg += `🎯 <b>/focus [คู่เงิน]</b>\n`;
    msg += `<i>ล็อคระบบให้คำนวณและแจ้งเตือนเฉพาะคู่เงินนั้นๆ</i>\n`;
    msg += `ตัวอย่าง: <code>/focus USDJPY</code> หรือ <code>/focus ALL</code>\n\n`;

    msg += `🛡️ <b>/winrate [เลข %]</b>\n`;
    msg += `<i>ปรับเกณฑ์วินเรทขั้นต่ำในการแจ้งเตือน</i>\n`;
    msg += `ตัวอย่าง: <code>/winrate 80</code> หรือ <code>/winrate 75</code>\n\n`;

    msg += `📊 <b>/status</b>\n`;
    msg += `<i>ตรวจเช็คการตั้งค่าและสถานะระบบคลาวด์ปัจจุบัน</i>\n\n`;
    msg += `💡 <i>แตะปุ่มลัดด้านล่างแป้นพิมพ์เพื่อสั่งงานได้ทันทีครับ!</i>`;

    await sendTelegramReply(chatId, msg, QUICK_KEYBOARD);
    return;
  }

  // 2. /news [SYMBOL]
  if (command === '/news') {
    const targetTicker = arg || 'USDJPY';
    const sym = DEFAULT_SYMBOLS.find(
      (s) => s.ticker === targetTicker || s.ticker.replace('/', '') === targetTicker
    ) || {
      ticker: targetTicker,
      display_name: targetTicker,
      asset_type: (targetTicker.length === 6 ? 'forex' : 'stock') as AssetType,
      category: 'Custom',
      is_active: true,
      alert_threshold: 0.7,
      finnhub_symbol: targetTicker,
    };

    await sendTelegramReply(
      chatId,
      `🔍 <i>กำลังรวบรวมข่าวสดของ ${sym.ticker} และให้ Gemini AI สรุปเป็นภาษาไทยล้วน กรุณารอสักครู่...</i>`
    );

    try {
      const articles = await fetchMarketauxNews([sym.ticker]);
      const thaiSummary = await synthesizeThaiNews(sym.ticker, sym.display_name, articles);

      let msg = `📰 <b>สรุปสถานการณ์ข่าวสด: ${sym.ticker} (${sym.display_name})</b>\n`;
      msg += `━━━━━━━━━━━━━━━━━━━━━\n\n`;
      msg += `${thaiSummary}\n\n`;
      msg += `⏰ <i>อัปเดตเวลา: ${new Date().toLocaleTimeString('th-TH', { timeZone: 'Asia/Bangkok' })} (เวลาไทย)</i>\n`;
      msg += `⚡ <i>Nexus Intel Pro • Real-Time AI News Intelligence (ภาษาไทย 100%)</i>`;

      await sendTelegramReply(chatId, msg, QUICK_KEYBOARD);
    } catch (err) {
      await sendTelegramReply(
        chatId,
        `❌ เกิดข้อผิดพลาดในการดึงข่าวของ ${sym.ticker}: ${(err as Error).message}`
      );
    }
    return;
  }

  // 3. /check [SYMBOL] or /signal [SYMBOL]
  if (command === '/check' || command === '/signal' || command === '/price') {
    const targetTicker = arg || 'USDJPY';
    const sym = DEFAULT_SYMBOLS.find(
      (s) => s.ticker === targetTicker || s.ticker.replace('/', '') === targetTicker
    ) || {
      ticker: targetTicker,
      display_name: targetTicker,
      asset_type: (targetTicker.length === 6 ? 'forex' : 'stock') as AssetType,
      category: 'Custom',
      is_active: true,
      alert_threshold: 0.7,
      finnhub_symbol: targetTicker,
    };

    await sendTelegramReply(chatId, `⚡ <i>กำลังดึงราคาและคำนวณสัญญาณเทคนิคสดของ ${sym.ticker}...</i>`);

    try {
      const [quote, candles, news] = await Promise.all([
        fetchLiveQuote(sym.ticker, sym.asset_type),
        fetchCandleHistory(sym.ticker, sym.asset_type, 'D', 60),
        fetchMarketauxNews([sym.ticker]),
      ]);

      const indicators = computeTechnicalIndicators(candles, sym.ticker, '1D');
      const signal = calculateProbabilityScore(
        sym.ticker,
        quote.price,
        quote.change_percent || 0,
        sym.asset_type,
        indicators,
        news
      );

      const isBuy = signal.direction.includes('BUY');
      const isSell = signal.direction.includes('SELL');
      const icon = isBuy ? '🚀 🟢' : isSell ? '🔻 🔴' : '⚖️ 🟡';
      const actionText = isBuy ? 'BUY (ขาขึ้น) 🟢' : isSell ? 'SELL (ขาลง) 🔴' : 'WAIT (รอจังหวะ) 🟡';
      const winRate = signal.win_rate_percent || 50;

      let msg = `${icon} <b>ผลวิเคราะห์เรียลไทม์: ${sym.ticker}</b>\n`;
      msg += `━━━━━━━━━━━━━━━━━━━━━\n`;
      msg += `💵 <b>ราคาตลาดสด:</b> <code>${quote.price}</code> (${(quote.change_percent || 0) >= 0 ? '+' : ''}${(quote.change_percent || 0).toFixed(2)}%)\n`;
      msg += `🎯 <b>สัญญาณ (Action):</b> <b>${actionText}</b>\n`;
      msg += `📊 <b>อัตราการชนะ (Win Rate):</b> <b>${winRate}%</b> (${signal.confidence_level} Conviction)\n\n`;

      msg += `📱 <b>พารามิเตอร์สำหรับ MetaTrader 5 (MT5):</b>\n`;
      msg += `<i>(แตะที่ตัวเลขเพื่อคัดลอกไปใส่ใน MT5 บนมือถือ)</i>\n`;
      msg += `• <b>Order:</b> <b>${isBuy ? 'BUY 🟢' : isSell ? 'SELL 🔴' : 'WAIT 🟡'}</b>\n`;
      msg += `• <b>Entry:</b> <code>${signal.recommended_entry}</code>\n`;
      msg += `• <b>Stop Loss (SL):</b> <code>${signal.stop_loss}</code>\n`;
      msg += `• <b>Take Profit 1 (TP1):</b> <code>${signal.take_profit_1}</code>\n`;
      msg += `• <b>Take Profit 2 (TP2):</b> <code>${signal.take_profit_2}</code>\n`;
      msg += `• <b>Risk/Reward:</b> 1:${signal.risk_reward_ratio}\n\n`;

      msg += `🧠 <b>องค์ประกอบทางเทคนิค:</b>\n`;
      msg += `• RSI (14): <b>${indicators.rsi_14.toFixed(1)}</b>\n`;
      msg += `• MACD: <b>${indicators.macd_histogram >= 0 ? 'Bullish (+)' : 'Bearish (-)'}</b>\n`;
      msg += `• แนวโน้ม Trend: <b>${indicators.trend_bias}</b>\n`;
      msg += `• Sentiment ข่าว: <b>${(signal.sentiment_component >= 0 ? '+' : '') + (signal.sentiment_component * 100).toFixed(0)}%</b>\n\n`;
      msg += `⏰ <i>เวลาคำนวณ: ${new Date().toLocaleTimeString('th-TH', { timeZone: 'Asia/Bangkok' })} (เวลาไทย)</i>`;

      await sendTelegramReply(chatId, msg, QUICK_KEYBOARD);
    } catch (err) {
      await sendTelegramReply(
        chatId,
        `❌ เกิดข้อผิดพลาดในการวิเคราะห์ ${sym.ticker}: ${(err as Error).message}`
      );
    }
    return;
  }

  // 4. /focus [SYMBOL]
  if (command === '/focus') {
    if (!arg) {
      const settings = await getSystemSettings();
      await sendTelegramReply(
        chatId,
        `🎯 <b>สถานะ Focus Lock ปัจจุบัน:</b> <code>${settings.focus_symbol}</code>\n\nหากต้องการเปลี่ยน กรุณาพิมพ์เช่น:\n• <code>/focus USDJPY</code> (ล็อคเฉพาะ USDJPY)\n• <code>/focus EURUSD</code> (ล็อคเฉพาะ EURUSD)\n• <code>/focus XAUUSD</code> (ล็อคเฉพาะทองคำ)\n• <code>/focus ALL</code> (ปลดล็อค ติดตามทุกคู่)`,
        QUICK_KEYBOARD
      );
      return;
    }

    const newFocus = arg === 'ALL' ? 'ALL' : arg;
    await updateSystemSettings({ focus_symbol: newFocus });
    await sendTelegramReply(
      chatId,
      `✅ <b>บันทึกสำเร็จ!</b>\n\nระบบได้รับการล็อคโฟกัสไปที่ <b>${newFocus}</b> เรียบร้อยแล้วครับ ทั้งการคำนวณและการแจ้งเตือน 24 ชม. จะทำงานสำหรับ ${newFocus} เท่านั้น`,
      QUICK_KEYBOARD
    );
    return;
  }

  // 5. /winrate [PERCENT]
  if (command === '/winrate' || command === '/threshold') {
    const valNum = parseFloat(arg);
    if (isNaN(valNum) || valNum < 50 || valNum > 95) {
      const settings = await getSystemSettings();
      await sendTelegramReply(
        chatId,
        `🛡️ <b>เกณฑ์วินเรทปัจจุบัน:</b> <b>${((settings.min_alert_probability || 0.7) * 100).toFixed(0)}% ขึ้นไป</b>\n\nหากต้องการเปลี่ยน กรุณาพิมพ์ตัวเลขระหว่าง 60 ถึง 90 เช่น:\n• <code>/winrate 75</code> (ตั้งเกณฑ์ 75%)\n• <code>/winrate 80</code> (ตั้งเกณฑ์ 80% - แนะนำ)\n• <code>/winrate 85</code> (ตั้งเกณฑ์ 85%)`,
        QUICK_KEYBOARD
      );
      return;
    }

    const newProbability = valNum / 100;
    await updateSystemSettings({ min_alert_probability: newProbability });
    await sendTelegramReply(
      chatId,
      `✅ <b>บันทึกเกณฑ์สำเร็จ!</b>\n\nระบบจะส่งการแจ้งเตือนเฉพาะสัญญาณที่มีอัตราการชนะ (Win Rate) <b>$\ge$ ${valNum}%</b> เท่านั้น สัญญาณที่ต่ำกว่านี้จะถูกบล็อกอัตโนมัติครับ`,
      QUICK_KEYBOARD
    );
    return;
  }

  // 6. /status
  if (command === '/status') {
    const settings = await getSystemSettings();
    let msg = `📊 <b>สถานะระบบ NEXUS INTEL PRO 2.0</b>\n`;
    msg += `━━━━━━━━━━━━━━━━━━━━━\n`;
    msg += `🎯 <b>Focus Lock:</b> <b>${settings.focus_symbol}</b> ${settings.focus_symbol !== 'ALL' ? '(คำนวณเฉพาะคู่นี้)' : '(คำนวณทุกคู่)'}\n`;
    msg += `🛡️ <b>เกณฑ์ Win Rate แจ้งเตือน:</b> <b>${((settings.min_alert_probability || 0.7) * 100).toFixed(0)}% ขึ้นไป</b>\n`;
    msg += `🔔 <b>สถานะ Telegram Bot:</b> <b>${settings.telegram_enabled ? 'เปิดใช้งาน (Active 🟢)' : 'ปิดการแจ้งเตือน (Disabled 🔴)'}</b>\n`;
    msg += `☁️ <b>Cloud Database (Turso):</b> <b>เชื่อมต่อสมบูรณ์ 24/7 🟢</b>\n`;
    msg += `🌐 <b>Web Terminal:</b> <a href="https://1intel-pro-jame.vercel.app">1intel-pro-jame.vercel.app</a>\n\n`;
    msg += `⏰ <i>${new Date().toLocaleTimeString('th-TH', { timeZone: 'Asia/Bangkok' })} (เวลาไทย)</i>`;

    await sendTelegramReply(chatId, msg, QUICK_KEYBOARD);
    return;
  }

  // Unknown command fallback
  await sendTelegramReply(
    chatId,
    `❓ ขออภัยครับ ไม่พบคำสั่ง <code>${command}</code>\n\nพิมพ์ <b>/help</b> เพื่อดูคำสั่งทั้งหมด หรือแตะปุ่มลัดด้านล่างแป้นพิมพ์ได้เลยครับ!`,
    QUICK_KEYBOARD
  );
}
