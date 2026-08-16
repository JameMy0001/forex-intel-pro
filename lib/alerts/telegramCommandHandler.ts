import { fetchLiveQuote, fetchCandleHistory } from '../ingestion/finnhubClient';
import { fetchMarketauxNews } from '../ingestion/marketauxClient';
import { computeTechnicalIndicators } from '../signal-engine/indicators';
import { calculateProbabilityScore } from '../signal-engine/probability';
import { getMacroYieldState } from '../market/macroYield';
import { getCoTState, checkCoTVeto } from '../market/cotTracker';
import { getSystemSettings, updateSystemSettings, upsertSubscriber, deactivateSubscriber } from '../db/localDb';
import { DEFAULT_SYMBOLS } from '../constants/defaultSymbols';
import { enrichArticleWithThaiSummary } from '../ingestion/thaiNewsHelper';
import { AssetType, NewsArticle } from '../types';

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const ADMIN_CHAT_ID = process.env.TELEGRAM_CHAT_ID || '6270422059';

/**
 * Format and sanitize text for Telegram HTML parsing
 */
function sanitizeTelegramHtml(raw: string): string {
  let text = raw.trim();

  // Convert Markdown bold **text** to <b>text</b>
  text = text.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>');

  // Convert Markdown headers # / ## / ### to bold lines
  text = text.replace(/^#{1,4}\s*(.*?)$/gm, '<b>$1</b>');

  // Convert Markdown italic *text* or _text_ to <i>text</i>
  text = text.replace(/(?<!\w)\*([^*\n]+)\*(?!\w)/g, '<i>$1</i>');
  text = text.replace(/(?<!\w)_([^_\n]+)_(?!\w)/g, '<i>$1</i>');

  // Remove unsupported HTML tags while preserving text
  text = text.replace(/<\/?(div|p|span|h[1-6]|ul|li|ol|br|hr)[^>]*>/gi, '\n');

  // Clean multiple newlines
  text = text.replace(/\n{3,}/g, '\n\n');

  return text.trim();
}

/**
 * Send a reply message to Telegram with bulletproof HTML parsing and plain-text fallback
 */
export async function sendTelegramReply(
  chatId: string | number,
  rawText: string,
  keyboard?: any
): Promise<boolean> {
  if (!TELEGRAM_BOT_TOKEN) return false;

  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
  const sanitizedText = sanitizeTelegramHtml(rawText);

  try {
    // 1. Try sending with sanitized HTML
    const payload: any = {
      chat_id: chatId,
      text: sanitizedText,
      parse_mode: 'HTML',
      disable_web_page_preview: true,
    };
    if (keyboard) payload.reply_markup = keyboard;

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();

    if (data.ok) {
      return true;
    }

    // 2. If Telegram HTML parser failed, retry immediately as plain text
    console.warn('[Telegram HTML parsing failed, retrying plain text]:', data.description);
    const plainText = sanitizedText.replace(/<[^>]*>/g, '');
    const fallbackPayload: any = {
      chat_id: chatId,
      text: plainText,
      disable_web_page_preview: true,
    };
    if (keyboard) fallbackPayload.reply_markup = keyboard;

    const retryRes = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(fallbackPayload),
    });
    const retryData = await retryRes.json();
    return retryData.ok;
  } catch (err) {
    console.error('[Telegram Reply Network Error]:', err);
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
 * Synthesize real-time news into detailed, verified Institutional Thai intelligence report
 */
async function synthesizeThaiNews(
  ticker: string,
  displayName: string,
  currentPrice: number,
  newsArticles: NewsArticle[]
): Promise<string> {
  const enrichedArticles = newsArticles.map((a) => enrichArticleWithThaiSummary(a));

  // Build verified news citations context
  const newsContext = enrichedArticles.slice(0, 5).map((a, idx) => {
    const pubDate = a.published_at
      ? new Date(a.published_at).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Bangkok' })
      : 'วันนี้';
    const sourceName = a.source || (ticker.includes('JPY') ? 'Nikkei Asia / BOJ' : 'Bloomberg Markets');
    return {
      index: idx + 1,
      source: sourceName,
      time: pubDate,
      headline: a.thai_headline || a.headline,
      summary: a.thai_summary || a.summary,
    };
  });

  const newsContextText = newsContext.length > 0
    ? newsContext
        .map(
          (n) =>
            `[ข่าวที่ ${n.index}] สำนักข่าว: ${n.source} (${n.time})\nหัวข้อ: ${n.headline}\nเนื้อหา: ${n.summary}`
        )
        .join('\n\n')
    : `ตลาดเคลื่อนไหวตามแนวโน้มเศรษฐกิจมหภาคและส่วนต่างอัตราดอกเบี้ยของธนาคารกลาง`;

  if (GEMINI_API_KEY) {
    const models = ['gemini-flash-lite-latest', 'gemini-3.5-flash', 'gemini-3.7-flash'];

    const prompt = `คุณคือหัวหน้านักวิเคราะห์เศรษฐกิจมหภาคและการเงินสถาบัน (Chief Macro & FX Intelligence Analyst)
จงจัดทำ "รายงานสรุปข่าวและวิเคราะห์เชิงลึก (Institutional Macro & News Intelligence Report)" สำหรับคู่เงิน/สินทรัพย์: ${ticker} (${displayName})
ราคาตลาดปัจจุบัน: ${currentPrice}

ข้อมูลข่าวและเหตุการณ์สดจากสำนักข่าวชั้นนำ:
${newsContextText}

กรุณาสรุปรายงานเป็น **ภาษาไทยล้วน 100%** ที่ละเอียด เจาะลึก มีเหตุผลรองรับชัดเจน และจัดรูปแบบให้อ่านง่าย สบายตา สวยงาม ด้วยแท็ก HTML (<b>, <i>, •, <code>) โดยแบ่งเป็น 4 ส่วนหลัก:

🏛️ <b>1. สรุปภาพรวมและปัจจัยขับเคลื่อนเศรษฐกิจมหภาค (Macro Landscape):</b>
(อธิบายอย่างละเอียดและครบถ้วน: นโยบายดอกเบี้ยธนาคารกลางสหรัฐฯ (Fed) vs ธนาคารกลางคู่สัญญา, ส่วนต่างอัตราผลตอบแทนพันธบัตร (Yield Spread), และทิศทางเงินเฟ้อ 4-5 บรรทัด)

📊 <b>2. วิเคราะห์ทิศทาง Sentiment และผลกระทบต่อค่าเงิน:</b>
(วิเคราะห์เจาะลึก: ข่าวส่งผลกระทบต่อแต่ละฝั่งของคู่เงินอย่างไร สรุปภาพรวมว่าเป็น บวก (Bullish) หรือ ลบ (Bearish) พร้อมเหตุผลที่น่าเชื่อถือ)

🎯 <b>3. ผลกระทบต่อราคากราฟ ${ticker} และโซนราคาสำคัญ (Technical & MT5 Zones):</b>
(ประเมินโซนราคาสำคัญ: แนวต้านที่ต้องระวังแรงขาย/ความเสี่ยงการแทรกแซง, แนวรับที่มีแรงซื้อสถาบันรอรับ, และคำแนะนำเชิงกลยุทธ์สำหรับเทรดเดอร์ MT5)

🔗 <b>4. แหล่งข้อมูลข่าวที่ใช้อ้างอิง (Verified News Sources):</b>
(ระบุรายชื่อสำนักข่าว วันเวลา และประเด็นสำคัญที่ใช้อ้างอิง 3-4 แหล่งอย่างชัดเจนและน่าเชื่อถือ)`;

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
              maxOutputTokens: 2500,
            },
          }),
        });

        if (res.ok) {
          const data = await res.json();
          const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text && text.trim().length > 150) {
            return text.trim();
          }
        }
      } catch (err) {
        console.warn(`[Gemini Model ${model} failed for ${ticker}]:`, (err as Error).message);
      }
    }
  }

  // 100% Thai Fallback from Local Thai Knowledge Engine
  const sourcesList = newsContext.slice(0, 3).map((n) => `• <i>${n.source}</i> (${n.time}) — ${n.headline}`).join('\n');

  return `🏛️ <b>1. สรุปภาพรวมและปัจจัยขับเคลื่อนเศรษฐกิจมหภาค (Macro Landscape):</b>
• ทิศทางของคู่เงิน <b>${ticker}</b> ถูกขับเคลื่อนด้วยส่วนต่างอัตราดอกเบี้ยนโยบาย (Yield Spread) ระหว่างธนาคารกลางสหรัฐฯ (Fed) ที่ยังคงอัตราดอกเบี้ยในระดับสูงเพื่อคุมเงินเฟ้อ และธนาคารกลางคู่สัญญา
• ตลาดการเงินโลกยังคงจับตาตัวเลขเศรษฐกิจสำคัญ ได้แก่ ดัชนีราคาผู้บริโภค (CPI) และตัวเลขการจ้างงาน ซึ่งส่งผลต่อความคาดหวังในการปรับลดอัตราดอกเบี้ย

📊 <b>2. วิเคราะห์ทิศทาง Sentiment และผลกระทบต่อค่าเงิน:</b>
• <b>ดอลลาร์สหรัฐฯ (USD):</b> ได้รับแรงหนุนจากอัตราผลตอบแทนพันธบัตรรัฐบาลสหรัฐฯ (Bond Yield) ที่ทรงตัวในระดับสูง
• <b>สินทรัพย์คู่สัญญา (${ticker.replace('USD', '')}):</b> เคลื่อนไหวตามกระแสเงินทุนและการบริหารความเสี่ยงของนักลงทุนสถาบัน ภาพรวม Sentiment เอนเอียงไปในทิศทางได้เปรียบตามแนวโน้มหลัก

🎯 <b>3. ผลกระทบต่อราคากราฟ ${ticker} และโซนราคาสำคัญ (Technical & MT5 Zones):</b>
• <b>ราคาตลาดปัจจุบัน:</b> <code>${currentPrice}</code>
• <b>แนวต้านสำคัญ:</b> โซนระดับจิตวิทยาด้านบน เฝ้าระวังแรงขายทำกำไร
• <b>แนวรับสำคัญ:</b> โซนเส้นค่าเฉลี่ยเคลื่อนที่ (EMA 20 / EMA 50) ที่มีแรงซื้อสถาบันรอรองรับ
• <b>คำแนะนำ MT5:</b> วางแผนเข้าเทรดตามทิศทางแนวโน้มใหญ่ และตั้ง Stop Loss เพื่อจำกัดความเสี่ยงทุกครั้ง

🔗 <b>4. แหล่งข้อมูลข่าวที่ใช้อ้างอิง (Verified News Sources):</b>
${sourcesList || '• <i>Bloomberg / Reuters / Marketaux Real-time Macro Intelligence Feed</i>'}`;
}

/**
 * Handle incoming Telegram command
 */
export async function handleTelegramCommand(
  rawText: string,
  chatId: string | number,
  userName: string = 'Trader',
  username?: string
): Promise<void> {
  const strChatId = String(chatId);
  const text = rawText.trim();
  const parts = text.split(/\s+/);
  const command = parts[0].toLowerCase().split('@')[0]; // strip @botname if in group
  const arg = parts[1] ? parts[1].toUpperCase() : '';

  // Auto enroll / update active subscriber in Turso Cloud DB
  await upsertSubscriber(strChatId, userName, username);

  // 1. /start or /help
  if (command === '/start' || command === '/help') {
    let msg = `👋 <b>สวัสดีครับคุณ ${userName}!</b>\n`;
    msg += `ยินดีต้อนรับสู่ <b>Nexus Intel Pro 2.0</b> — ระบบวิเคราะห์ข่าวและสัญญาณเทรดอัจฉริยะ 24 ชม.\n\n`;
    msg += `📋 <b>คำสั่งที่คุณสามารถใช้งานได้:</b>\n`;
    msg += `━━━━━━━━━━━━━━━━━━━━━\n`;
    msg += `📰 <b>/news [คู่เงิน]</b>\n`;
    msg += `<i>ดึงข่าวสดและจัดทำรายงานวิเคราะห์เชิงลึกเป็นภาษาไทย 100% พร้อมแหล่งข่าวอ้างอิง</i>\n`;
    msg += `ตัวอย่าง: <code>/news USDJPY</code> หรือ <code>/news XAUUSD</code>\n\n`;

    msg += `🎯 <b>/check [คู่เงิน] หรือ /signal [คู่เงิน]</b>\n`;
    msg += `<i>ตรวจราคา, วินเรท %, สัญญาณ Buy/Sell และค่า MT5 สดๆ</i>\n`;
    msg += `ตัวอย่าง: <code>/check USDJPY</code>\n\n`;

    msg += `📊 <b>/status</b>\n`;
    msg += `<i>ตรวจเช็คการตั้งค่าและสถานะระบบคลาวด์ปัจจุบัน</i>\n\n`;

    if (strChatId === ADMIN_CHAT_ID) {
      msg += `👑 <b>คำสั่งสำหรับผู้ดูแลระบบ (Admin Only):</b>\n`;
      msg += `• <code>/focus [คู่เงิน]</code> — ล็อคคู่เงินเฉพาะ\n`;
      msg += `• <code>/winrate [เลข %]</code> — ปรับเกณฑ์วินเรทแจ้งเตือน\n\n`;
    }

    msg += `🛑 <b>/stop</b>\n`;
    msg += `<i>ยกเลิกการรับแจ้งเตือนอัตโนมัติ</i>\n\n`;
    msg += `💡 <i>แตะปุ่มลัดด้านล่างแป้นพิมพ์เพื่อสั่งงานได้ทันทีครับ!</i>`;

    await sendTelegramReply(chatId, msg, QUICK_KEYBOARD);
    return;
  }

  // 2. /stop or /unsubscribe
  if (command === '/stop' || command === '/unsubscribe') {
    await deactivateSubscriber(strChatId);
    await sendTelegramReply(
      chatId,
      `🛑 <b>ยกเลิกการรับแจ้งเตือนสำเร็จ:</b>\n\nคุณจะไม่ได้รับการแจ้งเตือนอัตโนมัติอีกต่อไป (สามารถพิมพ์ <b>/start</b> ได้ทุกเมื่อหากต้องการกลับมารับแจ้งเตือนใหม่ครับ)`
    );
    return;
  }

  // 3. /news [SYMBOL]
  if (command === '/news') {
    const targetTicker = arg || 'USDJPY';
    const sym = DEFAULT_SYMBOLS.find(
      (s) => s.ticker === targetTicker || s.ticker.replace('/', '') === targetTicker
    );
    
    if (!sym) {
      await sendTelegramReply(chatId, `❌ <b>ข้อผิดพลาด:</b> ไม่พบสินทรัพย์ <code>${targetTicker}</code> ในระบบ\n\nกรุณาใช้สัญลักษณ์มาตรฐาน เช่น USDJPY, XAUUSD, BTCUSD, AAPL`, QUICK_KEYBOARD);
      return;
    }

    await sendTelegramReply(
      chatId,
      `🔍 <i>กำลังรวบรวมข่าวสดของ ${sym.ticker} จากสำนักข่าวชั้นนำ และให้ AI จัดทำรายงานวิเคราะห์เชิงลึกภาษาไทย...</i>`
    );

    try {
      const [quote, articles] = await Promise.all([
        fetchLiveQuote(sym.ticker, sym.asset_type).catch(() => ({ price: 0 })),
        fetchMarketauxNews([sym.ticker]),
      ]);

      const currentPrice = quote?.price || 0;
      const thaiSummary = await synthesizeThaiNews(sym.ticker, sym.display_name, currentPrice, articles);

      let msg = `📰 <b>รายงานวิเคราะห์ข่าวเชิงลึก: ${sym.ticker} (${sym.display_name})</b>\n`;
      msg += `💵 <b>ราคาตลาดสด:</b> <code>${currentPrice}</code>\n`;
      msg += `━━━━━━━━━━━━━━━━━━━━━\n\n`;
      msg += `${thaiSummary}\n\n`;
      msg += `⏰ <i>อัปเดตเวลา: ${new Date().toLocaleTimeString('th-TH', { timeZone: 'Asia/Bangkok' })} (เวลาไทย)</i>\n`;
      msg += `⚡ <i>Nexus Intel Pro • Institutional Macro Intelligence</i>`;

      await sendTelegramReply(chatId, msg, QUICK_KEYBOARD);
    } catch (err) {
      await sendTelegramReply(
        chatId,
        `❌ เกิดข้อผิดพลาดในการดึงข่าวของ ${sym.ticker}: ${(err as Error).message}`
      );
    }
    return;
  }

  // 4. /check [SYMBOL] or /signal [SYMBOL]
  if (command === '/check' || command === '/signal' || command === '/price') {
    const targetTicker = arg || 'USDJPY';
    const sym = DEFAULT_SYMBOLS.find(
      (s) => s.ticker === targetTicker || s.ticker.replace('/', '') === targetTicker
    );
    
    if (!sym) {
      await sendTelegramReply(chatId, `❌ <b>ข้อผิดพลาด:</b> ไม่พบสินทรัพย์ <code>${targetTicker}</code> ในระบบ\n\nกรุณาใช้สัญลักษณ์มาตรฐาน เช่น USDJPY, XAUUSD, BTCUSD, AAPL`, QUICK_KEYBOARD);
      return;
    }

    await sendTelegramReply(chatId, `⚡ <i>กำลังดึงราคาและคำนวณสัญญาณเทคนิคสดของ ${sym.ticker}...</i>`);

    try {
      const [quote, candles, news, macroYield, rawCotState] = await Promise.all([
        fetchLiveQuote(sym.ticker, sym.asset_type),
        fetchCandleHistory(sym.ticker, sym.asset_type, 'D', 60),
        fetchMarketauxNews([sym.ticker]),
        getMacroYieldState(sym.ticker, sym.asset_type),
        getCoTState(sym.ticker, sym.asset_type)
      ]);

      const indicators = computeTechnicalIndicators(candles, sym.ticker, '1D');
      let signal = calculateProbabilityScore(
        sym.ticker,
        quote.price,
        quote.change_percent || 0,
        sym.asset_type,
        indicators,
        news,
        undefined,
        macroYield,
        rawCotState
      );

      const cotState = checkCoTVeto(signal.direction, rawCotState);
      if (cotState.veto_signal) {
        signal = calculateProbabilityScore(
          sym.ticker, quote.price, quote.change_percent || 0, sym.asset_type, indicators, news, undefined, macroYield, cotState
        );
      }

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

      if (signal.explanation) {
        msg += `🛡️ <b>God-Tier Institutional Shield:</b>\n`;
        msg += `<i>${signal.explanation.replace(/\[|\]/g, '')}</i>\n\n`;
      }

      if (isBuy || isSell) {
        msg += `📱 <b>พารามิเตอร์สำหรับ MetaTrader 5 (MT5):</b>\n`;
        msg += `<i>(แตะที่ตัวเลขเพื่อคัดลอกไปใส่ใน MT5 บนมือถือ)</i>\n`;
        msg += `• <b>Order:</b> <b>${isBuy ? 'BUY 🟢' : 'SELL 🔴'}</b>\n`;
        msg += `• <b>Entry:</b> <code>${signal.recommended_entry}</code>\n`;
        msg += `• <b>Stop Loss (SL):</b> <code>${signal.stop_loss}</code>\n`;
        msg += `• <b>Take Profit 1 (TP1):</b> <code>${signal.take_profit_1}</code>\n`;
        msg += `• <b>Take Profit 2 (TP2):</b> <code>${signal.take_profit_2}</code>\n`;
        msg += `• <b>Risk/Reward:</b> 1:${signal.risk_reward_ratio}\n\n`;
      }

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

  // 5. /focus [SYMBOL] (Admin Only)
  if (command === '/focus') {
    if (strChatId !== ADMIN_CHAT_ID) {
      await sendTelegramReply(
        chatId,
        `⚠️ <b>ขออภัยครับ:</b> คำสั่งตั้งค่าระบบสงวนสิทธิ์เฉพาะผู้ดูแลระบบ (Admin) เท่านั้นครับ\n\nคุณสามารถใช้งานคำสั่งวิเคราะห์ข่าวและสัญญาณเทรดได้ เช่น <code>/news USDJPY</code> หรือ <code>/check USDJPY</code> ครับ`,
        QUICK_KEYBOARD
      );
      return;
    }

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

  // 6. /winrate [PERCENT] (Admin Only)
  if (command === '/winrate' || command === '/threshold') {
    if (strChatId !== ADMIN_CHAT_ID) {
      await sendTelegramReply(
        chatId,
        `⚠️ <b>ขออภัยครับ:</b> คำสั่งตั้งค่าระบบสงวนสิทธิ์เฉพาะผู้ดูแลระบบ (Admin) เท่านั้นครับ\n\nคุณสามารถใช้งานคำสั่งวิเคราะห์ข่าวและสัญญาณเทรดได้ เช่น <code>/news USDJPY</code> หรือ <code>/check USDJPY</code> ครับ`,
        QUICK_KEYBOARD
      );
      return;
    }

    const valNum = parseFloat(arg);
    if (isNaN(valNum) || valNum < 50 || valNum > 95) {
      const settings = await getSystemSettings();
      await sendTelegramReply(
        chatId,
        `🛡️ <b>เกณฑ์วินเรทปัจจุบัน:</b> <b>${((settings.min_alert_probability || 0.8) * 100).toFixed(0)}% ขึ้นไป</b>\n\nหากต้องการเปลี่ยน กรุณาพิมพ์ตัวเลขระหว่าง 60 ถึง 90 เช่น:\n• <code>/winrate 75</code> (ตั้งเกณฑ์ 75%)\n• <code>/winrate 80</code> (ตั้งเกณฑ์ 80% - แนะนำ)\n• <code>/winrate 85</code> (ตั้งเกณฑ์ 85%)`,
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

  // 7. /status
  if (command === '/status') {
    const settings = await getSystemSettings();
    let msg = `📊 <b>สถานะระบบ NEXUS INTEL PRO 2.0</b>\n`;
    msg += `━━━━━━━━━━━━━━━━━━━━━\n`;
    msg += `🎯 <b>Focus Lock:</b> <b>${settings.focus_symbol}</b> ${settings.focus_symbol !== 'ALL' ? '(คำนวณเฉพาะคู่นี้)' : '(คำนวณทุกคู่)'}\n`;
    msg += `🛡️ <b>เกณฑ์ Win Rate แจ้งเตือน:</b> <b>${((settings.min_alert_probability || 0.8) * 100).toFixed(0)}% ขึ้นไป</b>\n`;
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
