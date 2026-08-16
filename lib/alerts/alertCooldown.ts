import { getDbClient, ensureTables } from '../db/localDb';

/**
 * Alert Cooldown Guard — prevents duplicate alerts for the same
 * ticker + direction within a defined cooldown window.
 *
 * Stores the last sent alert per ticker in the alerts_log table.
 * Default cooldown: 4 hours (240 minutes) per ticker+direction combo.
 */
export async function isAlertOnCooldown(
  ticker: string,
  direction: string,
  cooldownMinutes = 240
): Promise<boolean> {
  try {
    await ensureTables();
    const db = getDbClient();
    const res = await db.execute({
      sql: `SELECT sent_at FROM alerts_log 
            WHERE ticker = ? AND direction = ? AND status = 'sent'
            AND sent_at >= datetime('now', ?)
            ORDER BY sent_at DESC LIMIT 1`,
      args: [ticker, direction, `-${cooldownMinutes} minutes`],
    });
    return res.rows.length > 0;
  } catch {
    // On error, allow the alert through (fail-open)
    return false;
  }
}

/**
 * Log a dispatched alert to the alerts_log table for auditing and cooldown tracking.
 */
export async function logAlertSent(
  ticker: string,
  direction: string,
  probabilityScore: number,
  message: string,
  status: 'sent' | 'failed' | 'blocked' = 'sent',
  errorMessage?: string
): Promise<void> {
  try {
    await ensureTables();
    const db = getDbClient();
    await db.execute({
      sql: `INSERT INTO alerts_log (ticker, direction, probability_score, channel, message, status, error_message, sent_at)
            VALUES (?, ?, ?, 'telegram', ?, ?, ?, datetime('now'))`,
      args: [ticker, direction, probabilityScore, message, status, errorMessage || null],
    });
  } catch (err) {
    console.warn('[AlertCooldown] Failed to log alert:', err);
  }
}
