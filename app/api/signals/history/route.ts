import { NextResponse } from 'next/server';
import { getRecentSignals, ensureTables, getDbClient } from '@/lib/db/localDb';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * Signal History Analytics API
 * Returns historical signal performance stats:
 * - Total alerts sent (from alerts_log)
 * - Directional distribution (BUY vs SELL vs NEUTRAL)
 * - Top performing symbols by signal frequency
 * - Recent 50 signals with metadata
 */
export async function GET(request: Request) {
  try {
    await ensureTables();
    const db = getDbClient();
    const { searchParams } = new URL(request.url);
    const ticker = searchParams.get('ticker') || undefined;
    const days = Math.min(Number(searchParams.get('days') || '30'), 90);

    // Recent signals
    const signals = await getRecentSignals(ticker, 100);

    // Alerts sent from alerts_log (auditable history)
    const alertsRes = await db.execute({
      sql: `SELECT ticker, direction, probability_score, status, sent_at
            FROM alerts_log
            WHERE sent_at >= datetime('now', ?)
            ORDER BY sent_at DESC
            LIMIT 100`,
      args: [`-${days} days`],
    });

    const alertHistory = alertsRes.rows.map((r: any) => ({
      ticker: String(r.ticker),
      direction: String(r.direction),
      probability_score: Number(r.probability_score || 0),
      status: String(r.status),
      sent_at: String(r.sent_at),
    }));

    // Stats: direction distribution
    const dirCounts: Record<string, number> = {};
    for (const s of signals) {
      const dir = String(s.direction || 'NEUTRAL');
      dirCounts[dir] = (dirCounts[dir] || 0) + 1;
    }

    // Stats: top tickers by signal count
    const tickerCounts: Record<string, number> = {};
    for (const s of signals) {
      const t = String(s.ticker);
      tickerCounts[t] = (tickerCounts[t] || 0) + 1;
    }
    const topTickers = Object.entries(tickerCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([t, count]) => ({ ticker: t, count }));

    // Stats: average win rate per direction
    const winRateByDir: Record<string, number[]> = {};
    for (const s of signals) {
      const dir = String(s.direction || 'NEUTRAL');
      const prob = Number(s.probability_score || 0.5);
      const winRate = dir.includes('SELL') ? (1 - prob) * 100 : dir.includes('BUY') ? prob * 100 : 50;
      if (!winRateByDir[dir]) winRateByDir[dir] = [];
      winRateByDir[dir].push(winRate);
    }
    const avgWinRateByDir = Object.fromEntries(
      Object.entries(winRateByDir).map(([dir, rates]) => [
        dir,
        Math.round(rates.reduce((a, b) => a + b, 0) / rates.length),
      ])
    );

    return NextResponse.json({
      success: true,
      stats: {
        totalSignals: signals.length,
        totalAlertsSent: alertHistory.filter((a) => a.status === 'sent').length,
        totalAlertsBlocked: alertHistory.filter((a) => a.status === 'blocked').length,
        directionDistribution: dirCounts,
        avgWinRateByDirection: avgWinRateByDir,
        topTickers,
        periodDays: days,
      },
      signals: signals.slice(0, 50),
      alertHistory: alertHistory.slice(0, 30),
    });
  } catch (err) {
    return NextResponse.json({ success: false, error: (err as Error).message }, { status: 500 });
  }
}
