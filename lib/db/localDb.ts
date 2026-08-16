import { createClient, Client } from '@libsql/client';
import path from 'path';
import fs from 'fs';
import { DEFAULT_SYMBOLS } from '../constants/defaultSymbols';
import { PriceSnapshot, NewsArticle, TechnicalIndicators, SignalOutput, AIAnalysisOutput } from '../types';

let client: Client | null = null;
let tablesInitializedPromise: Promise<void> | null = null;

export function getDbClient(): Client {
  if (!client) {
    const tursoUrl = process.env.TURSO_DATABASE_URL;
    const tursoAuthToken = process.env.TURSO_AUTH_TOKEN;

    if (tursoUrl && tursoAuthToken) {
      // Connect to Turso Cloud Database (Always synchronized 24/7)
      client = createClient({
        url: tursoUrl,
        authToken: tursoAuthToken,
      });
      console.log('[Database] Connected to Turso Cloud Database:', tursoUrl);
    } else {
      // Connect to Local SQLite file via LibSQL
      const dataDir = path.join(process.cwd(), 'data');
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
      const dbPath = path.join(dataDir, 'intel.db');
      client = createClient({
        url: `file:${dbPath}`,
      });
      console.log('[Database] Connected to Local SQLite Database:', dbPath);
    }
  }

  return client;
}

export async function ensureTables(): Promise<void> {
  if (!tablesInitializedPromise) {
    tablesInitializedPromise = (async () => {
      const db = getDbClient();
      console.log('[Database] Initializing tables on Turso / SQLite...');

      await db.execute(`
        CREATE TABLE IF NOT EXISTS symbols (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          ticker TEXT UNIQUE NOT NULL,
          finnhub_symbol TEXT NOT NULL,
          display_name TEXT NOT NULL,
          asset_type TEXT NOT NULL,
          category TEXT DEFAULT 'Major',
          is_active INTEGER DEFAULT 1,
          alert_threshold REAL DEFAULT 0.70,
          created_at TEXT DEFAULT (datetime('now'))
        );
      `);

      await db.execute(`
        CREATE TABLE IF NOT EXISTS price_snapshots (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          ticker TEXT NOT NULL,
          price REAL NOT NULL,
          open_price REAL,
          high_price REAL,
          low_price REAL,
          previous_close REAL,
          change_amount REAL,
          change_percent REAL,
          bid REAL,
          ask REAL,
          volume REAL,
          source TEXT NOT NULL,
          captured_at TEXT DEFAULT (datetime('now'))
        );
      `);

      await db.execute(`
        CREATE TABLE IF NOT EXISTS news_articles (
          id TEXT PRIMARY KEY,
          source TEXT NOT NULL,
          ticker TEXT NOT NULL,
          headline TEXT NOT NULL,
          summary TEXT,
          url TEXT,
          image_url TEXT,
          published_at TEXT NOT NULL,
          sentiment_score REAL DEFAULT 0,
          sentiment_label TEXT,
          created_at TEXT DEFAULT (datetime('now'))
        );
      `);

      await db.execute(`
        CREATE TABLE IF NOT EXISTS technical_indicators (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          ticker TEXT NOT NULL,
          timeframe TEXT NOT NULL DEFAULT '1D',
          rsi_14 REAL,
          macd_value REAL,
          macd_signal REAL,
          macd_histogram REAL,
          bollinger_upper REAL,
          bollinger_middle REAL,
          bollinger_lower REAL,
          ema_20 REAL,
          ema_50 REAL,
          ema_200 REAL,
          atr_14 REAL,
          trend_bias TEXT,
          computed_at TEXT DEFAULT (datetime('now'))
        );
      `);

      await db.execute(`
        CREATE TABLE IF NOT EXISTS signals (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          ticker TEXT NOT NULL,
          probability_score REAL NOT NULL,
          confidence_level TEXT NOT NULL,
          direction TEXT NOT NULL,
          sentiment_component REAL NOT NULL,
          technical_component REAL NOT NULL,
          trend_component REAL NOT NULL,
          recommended_entry REAL,
          stop_loss REAL,
          take_profit_1 REAL,
          take_profit_2 REAL,
          risk_reward_ratio REAL,
          explanation TEXT,
          computed_at TEXT DEFAULT (datetime('now'))
        );
      `);

      await db.execute(`
        CREATE TABLE IF NOT EXISTS ai_analyses (
          id TEXT PRIMARY KEY,
          ticker TEXT NOT NULL,
          macro_catalyst TEXT,
          bull_case TEXT,
          bear_case TEXT,
          trade_thesis TEXT NOT NULL,
          invalidation_level REAL,
          model_used TEXT DEFAULT 'gemini-2.0-flash',
          generated_at TEXT DEFAULT (datetime('now'))
        );
      `);

      await db.execute(`
        CREATE TABLE IF NOT EXISTS system_settings (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL,
          updated_at TEXT DEFAULT (datetime('now'))
        );
      `);

      await db.execute(`
        CREATE TABLE IF NOT EXISTS telegram_subscribers (
          chat_id TEXT PRIMARY KEY,
          first_name TEXT,
          username TEXT,
          subscribed_at TEXT DEFAULT (datetime('now')),
          is_active INTEGER DEFAULT 1,
          last_active_at TEXT DEFAULT (datetime('now'))
        );
      `);

      // Seed default settings
      try {
        await db.execute(`
          INSERT OR IGNORE INTO system_settings (key, value) VALUES
          ('focus_symbol', 'ALL'),
          ('min_alert_probability', '0.70'),
          ('telegram_enabled', 'true'),
          ('active_symbols', '["EURUSD","GBPUSD","USDJPY","GBPJPY","EURJPY","AUDUSD","USDCHF","USDCAD","XAUUSD","AAPL","NVDA","TSLA","MSFT","AMZN","GOOGL","SPY"]')
        `);

        // Seed default admin subscriber
        await db.execute(`
          INSERT OR IGNORE INTO telegram_subscribers (chat_id, first_name, username, is_active)
          VALUES ('6270422059', 'Jame (Admin)', 'Owner', 1)
        `);
      } catch (e) {}

      // Seed initial symbols if needed
      try {
        const check = await db.execute('SELECT COUNT(*) as count FROM symbols');
        const count = Number(check.rows[0]?.count || 0);
        if (count === 0) {
          for (const s of DEFAULT_SYMBOLS) {
            await db.execute({
              sql: `INSERT OR IGNORE INTO symbols (ticker, finnhub_symbol, display_name, asset_type, category, alert_threshold)
                    VALUES (?, ?, ?, ?, ?, ?)`,
              args: [s.ticker, s.finnhub_symbol, s.display_name, s.asset_type, s.category, s.alert_threshold],
            });
          }
        }
      } catch (e) {}

      console.log('[Database] Tables and seed ready on Turso!');
    })();
  }
  return tablesInitializedPromise;
}

// -------------------------------------------------------------
// Database Operations Helpers (Turso / LibSQL)
// -------------------------------------------------------------

export async function savePriceSnapshot(snapshot: PriceSnapshot) {
  try {
    await ensureTables();
    const db = getDbClient();
    await db.execute({
      sql: `INSERT INTO price_snapshots (ticker, price, open_price, high_price, low_price, previous_close, change_amount, change_percent, bid, ask, volume, source, captured_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        snapshot.ticker,
        snapshot.price,
        snapshot.open_price || null,
        snapshot.high_price || null,
        snapshot.low_price || null,
        snapshot.previous_close || null,
        snapshot.change_amount || null,
        snapshot.change_percent || null,
        snapshot.bid || null,
        snapshot.ask || null,
        snapshot.volume || null,
        snapshot.source,
        snapshot.captured_at,
      ],
    });
  } catch (err) {
    console.error('[DB] Error saving price snapshot:', err);
  }
}

export async function saveSignal(signal: SignalOutput) {
  try {
    await ensureTables();
    const db = getDbClient();
    await db.execute({
      sql: `INSERT INTO signals (ticker, probability_score, confidence_level, direction, sentiment_component, technical_component, trend_component, recommended_entry, stop_loss, take_profit_1, take_profit_2, risk_reward_ratio, explanation, computed_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        signal.ticker,
        signal.probability_score,
        signal.confidence_level,
        signal.direction,
        signal.sentiment_component,
        signal.technical_component,
        signal.trend_component,
        signal.recommended_entry || null,
        signal.stop_loss || null,
        signal.take_profit_1 || null,
        signal.take_profit_2 || null,
        signal.risk_reward_ratio || null,
        signal.explanation,
        signal.computed_at,
      ],
    });
  } catch (err) {
    console.error('[DB] Error saving signal:', err);
  }
}

export async function saveNewsArticles(articles: NewsArticle[]) {
  try {
    await ensureTables();
    const db = getDbClient();
    for (const a of articles) {
      await db.execute({
        sql: `INSERT OR REPLACE INTO news_articles (id, source, ticker, headline, summary, url, image_url, published_at, sentiment_score, sentiment_label)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          a.id || String(Date.now() + Math.random()),
          a.source,
          a.ticker,
          a.headline,
          a.summary,
          a.url,
          a.image_url || null,
          a.published_at,
          a.sentiment_score,
          a.sentiment_label,
        ],
      });
    }
  } catch (err) {
    console.error('[DB] Error saving news articles:', err);
  }
}

export async function logAlert(ticker: string, direction: string, probability: number, message: string, status: string, error?: string) {
  try {
    await ensureTables();
    const db = getDbClient();
    await db.execute({
      sql: `INSERT INTO alerts_log (ticker, direction, probability_score, channel, message, status, error_message)
            VALUES (?, ?, ?, 'telegram', ?, ?, ?)`,
      args: [ticker, direction, probability, message, status, error || null],
    });
  } catch (err) {
    console.error('[DB] Error logging alert:', err);
  }
}

export async function getRecentSignals(ticker?: string, limit = 50) {
  try {
    await ensureTables();
    const db = getDbClient();
    if (ticker) {
      const res = await db.execute({
        sql: 'SELECT * FROM signals WHERE ticker = ? ORDER BY computed_at DESC LIMIT ?',
        args: [ticker, limit],
      });
      return res.rows;
    }
    const res = await db.execute({
      sql: 'SELECT * FROM signals ORDER BY computed_at DESC LIMIT ?',
      args: [limit],
    });
    return res.rows;
  } catch (err) {
    return [];
  }
}

export interface SystemSettingsState {
  focus_symbol: string;
  min_alert_probability: number;
  telegram_enabled: boolean;
  active_symbols: string[];
}

export async function getSystemSettings(): Promise<SystemSettingsState> {
  try {
    await ensureTables();
    const db = getDbClient();
    const res = await db.execute('SELECT key, value FROM system_settings');
    
    const settingsMap: Record<string, string> = {};
    for (const row of res.rows) {
      if (row.key && row.value !== undefined) {
        settingsMap[String(row.key)] = String(row.value);
      }
    }

    const focus_symbol = settingsMap['focus_symbol'] || 'ALL';
    const min_alert_probability = Number(settingsMap['min_alert_probability'] || '0.70');
    const telegram_enabled = settingsMap['telegram_enabled'] !== 'false';
    let active_symbols = DEFAULT_SYMBOLS.map((s) => s.ticker);

    if (settingsMap['active_symbols']) {
      try {
        active_symbols = JSON.parse(settingsMap['active_symbols']);
      } catch (e) {}
    }

    return {
      focus_symbol,
      min_alert_probability,
      telegram_enabled,
      active_symbols,
    };
  } catch (err) {
    return {
      focus_symbol: 'ALL',
      min_alert_probability: 0.70,
      telegram_enabled: true,
      active_symbols: DEFAULT_SYMBOLS.map((s) => s.ticker),
    };
  }
}

export async function updateSystemSettings(newSettings: Partial<SystemSettingsState>): Promise<SystemSettingsState> {
  try {
    await ensureTables();
    const db = getDbClient();

    if (newSettings.focus_symbol !== undefined) {
      await db.execute({
        sql: `INSERT INTO system_settings (key, value, updated_at) VALUES ('focus_symbol', ?, datetime('now'))
              ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')`,
        args: [newSettings.focus_symbol],
      });
    }

    if (newSettings.min_alert_probability !== undefined) {
      await db.execute({
        sql: `INSERT INTO system_settings (key, value, updated_at) VALUES ('min_alert_probability', ?, datetime('now'))
              ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')`,
        args: [String(newSettings.min_alert_probability)],
      });
    }

    if (newSettings.telegram_enabled !== undefined) {
      await db.execute({
        sql: `INSERT INTO system_settings (key, value, updated_at) VALUES ('telegram_enabled', ?, datetime('now'))
              ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')`,
        args: [String(newSettings.telegram_enabled)],
      });
    }

    if (newSettings.active_symbols !== undefined) {
      await db.execute({
        sql: `INSERT INTO system_settings (key, value, updated_at) VALUES ('active_symbols', ?, datetime('now'))
              ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')`,
        args: [JSON.stringify(newSettings.active_symbols)],
      });
    }

    return await getSystemSettings();
  } catch (err) {
    console.error('[DB] Error updating system settings:', err);
    return await getSystemSettings();
  }
}

export interface TelegramSubscriber {
  chat_id: string;
  first_name?: string;
  username?: string;
  subscribed_at: string;
  is_active: boolean;
  last_active_at: string;
}

/**
 * Register or update an active subscriber
 */
export async function upsertSubscriber(
  chatId: string,
  firstName?: string,
  username?: string
): Promise<void> {
  try {
    await ensureTables();
    const db = getDbClient();
    await db.execute({
      sql: `INSERT INTO telegram_subscribers (chat_id, first_name, username, is_active, last_active_at, subscribed_at)
            VALUES (?, ?, ?, 1, datetime('now'), datetime('now'))
            ON CONFLICT(chat_id) DO UPDATE SET
              first_name = COALESCE(excluded.first_name, telegram_subscribers.first_name),
              username = COALESCE(excluded.username, telegram_subscribers.username),
              is_active = 1,
              last_active_at = datetime('now')`,
      args: [String(chatId), firstName || null, username || null],
    });
  } catch (err) {
    console.error('[DB] Failed to upsert subscriber:', err);
  }
}

/**
 * Get all active subscribers for alert broadcasting
 */
export async function getActiveSubscribers(): Promise<TelegramSubscriber[]> {
  try {
    await ensureTables();
    const db = getDbClient();
    const res = await db.execute('SELECT * FROM telegram_subscribers WHERE is_active = 1 ORDER BY subscribed_at DESC');
    return res.rows.map((r: any) => ({
      chat_id: String(r.chat_id),
      first_name: r.first_name ? String(r.first_name) : undefined,
      username: r.username ? String(r.username) : undefined,
      subscribed_at: String(r.subscribed_at),
      is_active: Boolean(r.is_active),
      last_active_at: String(r.last_active_at),
    }));
  } catch (err) {
    console.error('[DB] Failed to get active subscribers:', err);
    return [];
  }
}

/**
 * Get total count of active subscribers
 */
export async function getSubscriberCount(): Promise<number> {
  try {
    await ensureTables();
    const db = getDbClient();
    const res = await db.execute('SELECT COUNT(*) as count FROM telegram_subscribers WHERE is_active = 1');
    return Number(res.rows[0]?.count || 0);
  } catch (err) {
    return 1;
  }
}

/**
 * Deactivate a subscriber (when user sends /stop or /unsubscribe)
 */
export async function deactivateSubscriber(chatId: string): Promise<void> {
  try {
    await ensureTables();
    const db = getDbClient();
    await db.execute({
      sql: `UPDATE telegram_subscribers SET is_active = 0, last_active_at = datetime('now') WHERE chat_id = ?`,
      args: [String(chatId)],
    });
  } catch (err) {
    console.error('[DB] Failed to deactivate subscriber:', err);
  }
}

/**
 * Get all subscribers (both active and inactive) for admin view
 */
export async function getAllSubscribers(): Promise<TelegramSubscriber[]> {
  try {
    await ensureTables();
    const db = getDbClient();
    const res = await db.execute('SELECT * FROM telegram_subscribers ORDER BY last_active_at DESC');
    return res.rows.map((r: any) => ({
      chat_id: String(r.chat_id),
      first_name: r.first_name ? String(r.first_name) : undefined,
      username: r.username ? String(r.username) : undefined,
      subscribed_at: String(r.subscribed_at),
      is_active: Boolean(r.is_active),
      last_active_at: String(r.last_active_at),
    }));
  } catch (err) {
    return [];
  }
}

/**
 * 7-Day Rolling Retention: Prune old signals, prices, and news to keep database lean forever
 */
export async function pruneOldRecords(daysToKeep: number = 7): Promise<{
  deletedSignals: number;
  deletedPrices: number;
  deletedNews: number;
}> {
  try {
    await ensureTables();
    const db = getDbClient();
    const cutoff = `-${daysToKeep} days`;

    const [resSignals, resPrices, resNews] = await Promise.all([
      db.execute({
        sql: `DELETE FROM signals WHERE computed_at < datetime('now', ?)`,
        args: [cutoff],
      }),
      db.execute({
        sql: `DELETE FROM price_snapshots WHERE timestamp < datetime('now', ?)`,
        args: [cutoff],
      }),
      db.execute({
        sql: `DELETE FROM news WHERE published_at < datetime('now', ?)`,
        args: [cutoff],
      }),
    ]);

    return {
      deletedSignals: resSignals.rowsAffected || 0,
      deletedPrices: resPrices.rowsAffected || 0,
      deletedNews: resNews.rowsAffected || 0,
    };
  } catch (err) {
    console.error('[DB Auto-Prune] Error during cleanup:', err);
    return { deletedSignals: 0, deletedPrices: 0, deletedNews: 0 };
  }
}


