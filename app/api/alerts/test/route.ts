import { NextResponse } from 'next/server';
import { sendTelegramTestPing } from '@/lib/alerts/telegram';

export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    const result = await sendTelegramTestPing();
    if (result.success) {
      return NextResponse.json({
        success: true,
        message: 'Telegram test alert delivered successfully!',
      });
    } else {
      return NextResponse.json(
        { success: false, error: result.error || 'Failed to send Telegram test message' },
        { status: 400 }
      );
    }
  } catch (error) {
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
