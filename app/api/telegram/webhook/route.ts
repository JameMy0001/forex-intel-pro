import { NextResponse } from 'next/server';
import { handleTelegramCommand } from '@/lib/alerts/telegramCommandHandler';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';
export const maxDuration = 60; // Allow full serverless processing time

const ALLOWED_CHAT_ID = process.env.TELEGRAM_CHAT_ID || '6270422059';

export async function POST(request: Request) {
  try {
    const update = await request.json();

    // Handle normal text messages
    if (update.message && update.message.text) {
      const chatId = String(update.message.chat.id);
      const text = update.message.text;
      const firstName = update.message.from?.first_name || 'Trader';

      // Security check: Only allow the authorized user/chat
      if (ALLOWED_CHAT_ID && chatId !== ALLOWED_CHAT_ID && !ALLOWED_CHAT_ID.includes(chatId)) {
        console.warn(`[Telegram Webhook] Unauthorized message from chat_id ${chatId}`);
        return NextResponse.json({ ok: true, ignored: true });
      }

      // Process command
      await handleTelegramCommand(text, chatId, firstName);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[Telegram Webhook Error]:', error);
    return NextResponse.json({ ok: true, error: (error as Error).message });
  }
}

export async function GET() {
  return NextResponse.json({
    status: 'online',
    service: 'Nexus Intel Pro Telegram Webhook Service',
    timestamp: new Date().toISOString(),
  });
}
