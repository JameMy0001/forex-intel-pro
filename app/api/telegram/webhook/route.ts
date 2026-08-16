import { NextResponse } from 'next/server';
import { handleTelegramCommand } from '@/lib/alerts/telegramCommandHandler';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';
export const maxDuration = 60; // Allow full serverless processing time

const ALLOWED_CHAT_ID = process.env.TELEGRAM_CHAT_ID || '6270422059';

export async function POST(request: Request) {
  try {
    const secretToken = request.headers.get('x-telegram-bot-api-secret-token');
    const expectedToken = process.env.TELEGRAM_WEBHOOK_SECRET;

    if (expectedToken && secretToken !== expectedToken) {
      console.warn('[Telegram Webhook Error]: Unauthorized webhook access attempt');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const update = await request.json();

    // Handle normal text messages
    if (update.message && update.message.text) {
      const chatId = String(update.message.chat.id);
      const text = update.message.text;
      const firstName = update.message.from?.first_name || 'Trader';
      const username = update.message.from?.username
        ? `@${update.message.from.username}`
        : undefined;

      // Process command for subscriber
      await handleTelegramCommand(text, chatId, firstName, username);
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
