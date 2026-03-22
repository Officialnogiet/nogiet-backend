import { beforeAll, afterAll, beforeEach } from "vitest";

let sqliteDb: any = null;
let db: any = null;

export async function initTestDb() {
  if (db) return db;

  const Database = (await import("better-sqlite3")).default;
  const { drizzle } = await import("drizzle-orm/better-sqlite3");

  sqliteDb = new Database(":memory:");

  sqliteDb.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      full_name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      phone TEXT,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'member',
      avatar_url TEXT,
      is_active INTEGER NOT NULL DEFAULT 1,
      last_login_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS refresh_tokens (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token TEXT NOT NULL UNIQUE,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS password_resets (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      code TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      used_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS facilities (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      name TEXT NOT NULL,
      latitude REAL NOT NULL,
      longitude REAL NOT NULL,
      sector TEXT DEFAULT 'Oil & Gas',
      region TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  db = drizzle(sqliteDb);
  return db;
}

export function getTestDb() {
  return db;
}

export function cleanupTestDb() {
  if (sqliteDb) {
    try {
      sqliteDb.exec("DELETE FROM password_resets");
      sqliteDb.exec("DELETE FROM refresh_tokens");
      sqliteDb.exec("DELETE FROM users");
      sqliteDb.exec("DELETE FROM facilities");
    } catch {
      // tables may not exist if db never initialized
    }
  }
}

export function closeTestDb() {
  if (sqliteDb) sqliteDb.close();
}
