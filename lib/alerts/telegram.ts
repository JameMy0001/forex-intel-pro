import { SignalOutput, AIAnalysisOutput } from '../types';

import { getActiveSubscribers } from '../db/localDb';

export async function sendTelegramSignalAlert(
  signal: SignalOutput,
  aiAnalysis?: AIAnalysisOutput
): Promise<{ success: boolean; messageId?: number; count?: number; error?: string }> {
  const token = process.env.TELEGRAM_BOT_TOKEN || '';
  const defaultChatId = process.env.TELEGRAM_CHAT_ID || '6270422059';

  if (!token) {
    console.warn('[Telegram Alert] TELEGRAM_BOT_TOKEN not configured.');
    return { success: false, error: 'Telegram credentials missing' };
  }

  // Get all active subscribers from Turso Cloud DB
  let subscribers = await getActiveSubscribers();
  if (subscribers.length === 0 && defaultChatId) {
    subscribers = [{ chat_id: defaultChatId, is_active: true, subscribed_at: new Date().toISOString(), last_active_at: new Date().toISOString() }];
  }

  const isBuy = signal.direction.includes('BUY');
  const isSell = signal.direction.includes('SELL');
  const icon = isBuy ? '🚀 🟢' : isSell ? '🔻 🔴' : '⚖️ 🟡';

  // Calculate true directional win rate % (e.g. 72.5% for STRONG_SELL instead of 27.5%)
  const directionalWinRate = isSell
    ? (1 - signal.probability_score) * 100
    : (isBuy ? signal.probability_score * 100 : 50);

  const probPercent = directionalWinRate.toFixed(1);

  let text = `${icon} <b>แจ้งเตือนสัญญาณเทรด (HIGH CONVICTION): ${signal.ticker}</b>\n`;
  text += `━━━━━━━━━━━━━━━━━━━━━\n`;
  text += `🎯 <b>ฝั่งคำสั่ง (Action):</b> <b>${isBuy ? 'BUY (เปิดสถานะซื้อ) 🟢' : isSell ? 'SELL (เปิดสถานะขาย) 🔴' : 'WAIT (รอจังหวะ) 🟡'}</b>\n`;
  text += `📊 <b>อัตราการชนะ (Win Rate):</b> <b>${probPercent}%</b> (${signal.confidence_level} Conviction)\n`;
  text += `💵 <b>ราคาตลาดปัจจุบัน (Price):</b> <code>${signal.price || signal.recommended_entry}</code>\n\n`;

  text += `📱 <b>พารามิเตอร์สำหรับ MetaTrader 5 (MT5):</b>\n`;
  text += `<i>(แตะที่ตัวเลขเพื่อคัดลอกไปใส่ใน MT5 บนมือถือได้ทันที)</i>\n`;
  text += `• <b>Order Type:</b> <b>${isBuy ? 'BUY 🟢' : isSell ? 'SELL 🔴' : 'WAIT 🟡'}</b>\n`;
  text += `• <b>Entry:</b> <code>${signal.recommended_entry}</code>\n`;
  text += `• <b>Stop Loss (SL):</b> <code>${signal.stop_loss}</code>\n`;
  text += `• <b>Take Profit 1 (TP1):</b> <code>${signal.take_profit_1}</code>\n`;
  text += `• <b>Take Profit 2 (TP2):</b> <code>${signal.take_profit_2}</code>\n`;
  text += `• <b>Risk/Reward Ratio:</b> 1:${signal.risk_reward_ratio}\n\n`;

  text += `🧠 <b>องค์ประกอบการวิเคราะห์ (Signals Breakdown):</b>\n`;
  text += `• Sentiment ข่าวการเงิน: <b>${(signal.sentiment_component >= 0 ? '+' : '') + (signal.sentiment_component * 100).toFixed(0)}%</b>\n`;
  text += `• โมเมนตัมเทคนิค (RSI/MACD): <b>${(signal.technical_component >= 0 ? '+' : '') + (signal.technical_component * 100).toFixed(0)}%</b>\n`;
  text += `• ความสอดคล้องของ Trend: <b>${(signal.trend_component >= 0 ? '+' : '') + (signal.trend_component * 100).toFixed(0)}%</b>\n\n`;

  if (aiAnalysis?.macro_catalyst) {
    text += `🌐 <b>ปัจจัยมหภาคขับเคลื่อน (Macro Catalyst):</b>\n${aiAnalysis.macro_catalyst}\n\n`;
  }

  if (aiAnalysis?.trade_thesis) {
    text += `💡 <b>แผนการเทรดโดย AI (Trade Thesis):</b>\n${aiAnalysis.trade_thesis}\n\n`;
  }

  text += `⏰ <i>เวลาบันทึกสัญญาณ: ${new Date().toLocaleTimeString('th-TH', { timeZone: 'Asia/Bangkok' })} (เวลาไทย)</i>\n`;
  text += `⚡ <i>Nexus Intel Pro • Institutional Quantitative Engine</i>`;

  const url = `https://api.telegram.org/bot${token}/sendMessage`;
  let successCount = 0;
  let lastMessageId: number | undefined;

  // Broadcast to all active subscribers concurrently
  await Promise.all(
    subscribers.map(async (sub) => {
      try {
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: sub.chat_id,
            text: text,
            parse_mode: 'HTML',
            disable_web_page_preview: true,
          }),
        });
        const data = await res.json();
        if (data.ok) {
          successCount++;
          lastMessageId = data.result?.message_id;
        }
      } catch (err) {
        console.error(`[Telegram Broadcast Error to ${sub.chat_id}]:`, err);
      }
    })
  );

  return { success: successCount > 0, count: successCount, messageId: lastMessageId };
}

/**
 * Send a custom test ping message to Telegram
 */
export async function sendTelegramTestPing(): Promise<{ success: boolean; error?: string }> {
  const token = process.env.TELEGRAM_BOT_TOKEN || '';
  const chatId = process.env.TELEGRAM_CHAT_ID || '';

  if (!token || !chatId) {
    return { success: false, error: 'Telegram BOT Token or Chat ID not configured in .env.local' };
  }

  try {
    const url = `https://api.telegram.org/bot${token}/sendMessage`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: `🟢 <b>NEXUS INTEL PRO: เชื่อมต่อสำเร็จ!</b>\n\nบอทแจ้งเตือนสัญญาณเทรดพร้อมทำงานคู่กับ MetaTrader 5 บนมือถือของคุณ 24 ชั่วโมงแล้วครับ\n\n⏰ <i>${new Date().toLocaleTimeString('th-TH', { timeZone: 'Asia/Bangkok' })} (เวลาไทย)</i>`,
        parse_mode: 'HTML',
      }),
    });

    const data = await res.json();
    if (data.ok) return { success: true };
    return { success: false, error: data.description };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}
