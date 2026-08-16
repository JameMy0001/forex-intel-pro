import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '8810668462:AAFsC93MEg0iq2Lu-U2YcevJ7sDNXWCh7dE';
const WEBHOOK_URL = 'https://1intel-pro-jame.vercel.app/api/telegram/webhook';

export async function GET() {
  try {
    // 1. Set Webhook
    const setWebhookUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setWebhook?url=${encodeURIComponent(WEBHOOK_URL)}&drop_pending_updates=true`;
    const resWebhook = await fetch(setWebhookUrl);
    const webhookData = await resWebhook.json();

    // 2. Set Bot Commands list for Telegram Autocomplete
    const setCommandsUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setMyCommands`;
    const commandsPayload = {
      commands: [
        { command: 'news', description: '📰 ดึงข่าวสดและสรุปภาษาไทยโดย AI' },
        { command: 'check', description: '🎯 เช็คราคาสด, วินเรท % และระดับราคา MT5' },
        { command: 'focus', description: '🎯 ล็อคคู่เงินที่ต้องการโฟกัส (เช่น USDJPY)' },
        { command: 'winrate', description: '🛡️ ปรับเกณฑ์วินเรทขั้นต่ำในการแจ้งเตือน' },
        { command: 'status', description: '📊 ตรวจสอบสถานะและการตั้งค่าระบบ' },
        { command: 'help', description: '📋 แสดงคู่มือและปุ่มลัดคำสั่งทั้งหมด' },
      ],
    };

    const resCommands = await fetch(setCommandsUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(commandsPayload),
    });
    const commandsData = await resCommands.json();

    return NextResponse.json({
      success: webhookData.ok && commandsData.ok,
      webhook: webhookData,
      commands: commandsData,
      targetUrl: WEBHOOK_URL,
    });
  } catch (err) {
    return NextResponse.json({ success: false, error: (err as Error).message }, { status: 500 });
  }
}
