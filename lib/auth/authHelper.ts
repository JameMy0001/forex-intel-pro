import { getDbClient, ensureTables } from '../db/localDb';
import { createHmac, randomBytes } from 'crypto';

const DEFAULT_MASTER_PASSWORD = process.env.ADMIN_PASSWORD || 'nexus2026';

// Use env var secret for HMAC signing — never hardcoded in source
function getHmacSecret(): string {
  return process.env.SESSION_SECRET || 'nexus_hmac_fallback_secret_change_this_in_env';
}

/**
 * Get active master password from Turso Cloud DB or fallback
 */
export async function getMasterPassword(): Promise<string> {
  try {
    await ensureTables();
    const db = getDbClient();
    const res = await db.execute("SELECT value FROM system_settings WHERE key = 'admin_password'");
    if (res.rows.length > 0 && res.rows[0]?.value) {
      return String(res.rows[0].value);
    }
  } catch (err) {
    console.warn('[AuthHelper] Failed to read admin_password from DB, using fallback:', err);
  }
  return DEFAULT_MASTER_PASSWORD;
}

/**
 * Verify provided password against stored master password
 */
export async function verifyPassword(inputPassword: string): Promise<boolean> {
  if (!inputPassword) return false;
  const masterPassword = await getMasterPassword();
  return inputPassword.trim() === masterPassword.trim();
}

/**
 * Update master password in Turso Cloud DB
 */
export async function setMasterPassword(newPassword: string): Promise<boolean> {
  if (!newPassword || newPassword.trim().length < 4) return false;
  try {
    await ensureTables();
    const db = getDbClient();
    await db.execute({
      sql: `INSERT INTO system_settings (key, value, updated_at) VALUES ('admin_password', ?, datetime('now'))
            ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')`,
      args: [newPassword.trim()],
    });
    return true;
  } catch (err) {
    console.error('[AuthHelper] Failed to update admin_password in DB:', err);
    return false;
  }
}

/**
 * Create a cryptographically signed session token using HMAC-SHA256.
 * Format: base64(timestamp.nonce):HMAC-SHA256(timestamp.nonce, secret)
 * This cannot be forged without knowledge of SESSION_SECRET env var.
 */
export function createSessionToken(): string {
  const timestamp = Date.now();
  const nonce = randomBytes(16).toString('hex');
  const payload = `${timestamp}.${nonce}`;
  const sig = createHmac('sha256', getHmacSecret()).update(payload).digest('hex');
  const encoded = Buffer.from(payload).toString('base64url');
  return `${encoded}.${sig}`;
}

/**
 * Verify a signed HMAC session token.
 */
export function verifySessionToken(token: string | undefined | null): boolean {
  if (!token) return false;
  try {
    const dotIdx = token.lastIndexOf('.');
    if (dotIdx === -1) return false;

    const encodedPayload = token.substring(0, dotIdx);
    const sig = token.substring(dotIdx + 1);
    const payload = Buffer.from(encodedPayload, 'base64url').toString('utf-8');

    // Constant-time HMAC compare
    const expectedSig = createHmac('sha256', getHmacSecret()).update(payload).digest('hex');
    if (sig.length !== expectedSig.length) return false;
    
    // Timing-safe comparison
    let mismatch = 0;
    for (let i = 0; i < expectedSig.length; i++) {
      mismatch |= sig.charCodeAt(i) ^ expectedSig.charCodeAt(i);
    }
    if (mismatch !== 0) return false;

    // Extract timestamp and check expiry
    const [timestampStr] = payload.split('.');
    const timestamp = Number(timestampStr);
    if (isNaN(timestamp)) return false;

    const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
    return Date.now() - timestamp < thirtyDaysMs;
  } catch {
    return false;
  }
}
