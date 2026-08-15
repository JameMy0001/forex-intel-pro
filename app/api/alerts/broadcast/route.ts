import { NextResponse } from 'next/server';
import { sendTelegramSignalAlert } from '@/lib/alerts/telegram';
import { SignalOutput, AIAnalysisOutput } from '@/lib/types';
import { getSupabaseServerClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { signal, aiAnalysis } = body as { signal: SignalOutput; aiAnalysis?: AIAnalysisOutput };

    if (!signal || !signal.ticker) {
      return NextResponse.json({ success: false, error: 'Signal payload required' }, { status: 400 });
    }

    const result = await sendTelegramSignalAlert(signal, aiAnalysis);

    // Log to Turso / SQLite Database
    try {
      const { logAlert } = await import('@/lib/db/localDb');
      await logAlert(
        signal.ticker,
        signal.direction,
        signal.probability_score,
        signal.explanation,
        result.success ? 'sent' : 'failed',
        result.error
      );
    } catch (e) {}

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: `Alert broadcasted for ${signal.ticker}`,
        messageId: result.messageId,
      });
    } else {
      return NextResponse.json(
        { success: false, error: result.error || 'Failed to broadcast alert' },
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
