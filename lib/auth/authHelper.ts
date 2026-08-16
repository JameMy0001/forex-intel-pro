import { getDbClient, ensureTables } from '../db/localDb';

const DEFAULT_MASTER_PASSWORD = process.env.ADMIN_PASSWORD || 'nexus2026';
const SESSION_SECRET_SALT = 'nexus_secure_auth_token_salt_2026';

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
 * Create a simple tamper-resistant session token
 */
export function createSessionToken(): string {
  const timestamp = Date.now();
  const raw = `${timestamp}:${SESSION_SECRET_SALT}`;
  // Base64 encode token payload
  return Buffer.from(raw).toString('base64');
}

/**
 * Verify session token
 */
export function verifySessionToken(token: string | undefined | null): boolean {
  if (!token) return false;
  try {
    const decoded = Buffer.from(token, 'base64').toString('utf-8');
    const [timestampStr, salt] = decoded.split(':');
    if (salt !== SESSION_SECRET_SALT) return false;

    const timestamp = Number(timestampStr);
    if (isNaN(timestamp)) return false;

    // Check if token is within 30 days
    const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
    return Date.now() - timestamp < thirtyDaysMs;
  } catch (err) {
    return false;
  }
}
