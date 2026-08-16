import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * Economic Calendar API — fetches upcoming high-impact economic events
 * from Finnhub's free economic calendar endpoint.
 * Used for the dashboard's Event Risk widget.
 */
export async function GET() {
  const FINNHUB_API_KEY = process.env.FINNHUB_API_KEY || '';

  // Get date range: today to +7 days
  const today = new Date();
  const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
  const from = today.toISOString().split('T')[0];
  const to = nextWeek.toISOString().split('T')[0];

  try {
    const url = `https://finnhub.io/api/v1/calendar/economic?from=${from}&to=${to}&token=${FINNHUB_API_KEY}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });

    if (!res.ok) {
      return NextResponse.json({ success: false, events: [], error: `Finnhub HTTP ${res.status}` });
    }

    const raw = await res.json();
    const events: any[] = Array.isArray(raw?.economicCalendar) ? raw.economicCalendar : [];

    // Filter and normalize — only HIGH impact events, max 20
    const highImpact = events
      .filter((e) => e.impact === 'high' || e.impact === 'medium')
      .slice(0, 20)
      .map((e) => ({
        event: e.event || 'Economic Event',
        country: e.country || 'US',
        impact: e.impact || 'medium',
        date: e.time || e.date || '',
        actual: e.actual ?? null,
        estimate: e.estimate ?? null,
        previous: e.prev ?? null,
        unit: e.unit || '',
      }));

    return NextResponse.json({ success: true, events: highImpact, from, to });
  } catch (err) {
    // Return empty array gracefully — not a critical failure
    console.warn('[EconCalendar API] Error:', err);
    return NextResponse.json({ success: true, events: [], error: 'Calendar temporarily unavailable' });
  }
}
