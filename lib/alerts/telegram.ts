import { SignalOutput, AIAnalysisOutput } from '../types';

export async function sendTelegramSignalAlert(
  signal: SignalOutput,
  aiAnalysis?: AIAnalysisOutput
): Promise<{ success: boolean; messageId?: number; error?: string }> {
  const token = process.env.TELEGRAM_BOT_TOKEN || '';
  const chatId = process.env.TELEGRAM_CHAT_ID || '';

  if (!token || !chatId) {
    console.warn('[Telegram Alert] TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID not configured.');
    return { success: false, error: 'Telegram credentials missing' };
  }

  const isBuy = signal.direction.includes('BUY');
  const isSell = signal.direction.includes('SELL');
  const icon = isBuy ? '🚀 🟢' : isSell ? '🔻 🔴' : '⚖️ 🟡';
  const probPercent = (signal.probability_score * 100).toFixed(1);

  let text = `${icon} <b>TRADE SIGNAL ALERT: ${signal.ticker}</b>\n`;
  text += `━━━━━━━━━━━━━━━━━━━━━\n`;
  text += `🎯 <b>Signal:</b> <b>${signal.direction.replace('_', ' ')}</b>\n`;
  text += `📊 <b>Win Probability:</b> <b>${probPercent}%</b> (${signal.confidence_level} Conviction)\n`;
  text += `💵 <b>Market Price:</b> <code>${signal.price || signal.recommended_entry}</code>\n\n`;

  text += `📱 <b>METATRADER 5 (MT5) TRADE SETUP:</b>\n`;
  text += `<i>(แตะที่ตัวเลขเพื่อคัดลอกไปใส่ใน MT5 บนมือถือ)</i>\n`;
  text += `• <b>Action:</b> <b>${isBuy ? 'BUY 🟢' : isSell ? 'SELL 🔴' : 'WAIT 🟡'}</b>\n`;
  text += `• <b>Entry:</b> <code>${signal.recommended_entry}</code>\n`;
  text += `• <b>Stop Loss (SL):</b> <code>${signal.stop_loss}</code>\n`;
  text += `• <b>Take Profit 1 (TP1):</b> <code>${signal.take_profit_1}</code>\n`;
  text += `• <b>Take Profit 2 (TP2):</b> <code>${signal.take_profit_2}</code>\n`;
  text += `• <b>Risk/Reward:</b> 1:${signal.risk_reward_ratio}\n\n`;

  text += `🧠 <b>SIGNALS BREAKDOWN:</b>\n`;
  text += `• Sentiment: <b>${(signal.sentiment_component >= 0 ? '+' : '') + (signal.sentiment_component * 100).toFixed(0)}%</b>\n`;
  text += `• Technicals: <b>${(signal.technical_component >= 0 ? '+' : '') + (signal.technical_component * 100).toFixed(0)}%</b>\n`;
  text += `• Trend: <b>${(signal.trend_component >= 0 ? '+' : '') + (signal.trend_component * 100).toFixed(0)}%</b>\n\n`;

  if (aiAnalysis?.macro_catalyst) {
    text += `🌐 <b>AI Macro Driver:</b>\n${aiAnalysis.macro_catalyst}\n\n`;
  }

  if (aiAnalysis?.trade_thesis) {
    text += `💡 <b>Trade Thesis:</b>\n${aiAnalysis.trade_thesis}\n\n`;
  }

  text += `⏰ <i>${new Date().toUTCString()}</i>\n`;
  text += `⚡ <i>Powered by Forex & Stock Intelligence Engine</i>`;

  try {
    const url = `https://api.telegram.org/bot${token}/sendMessage`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: text,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
      }),
    });

    const data = await res.json();
    if (data.ok) {
      return { success: true, messageId: data.result.message_id };
    }
    return { success: false, error: data.description || 'Failed to send message' };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
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
        text: `🟢 <b>NEXUS INTEL PRO: CONNECTED!</b>\n\nYour Telegram Alert Bot is active and paired with MetaTrader 5 on your mobile device.\n\n⏰ <i>${new Date().toUTCString()}</i>`,
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
