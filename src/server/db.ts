import Database from 'better-sqlite3';
import path from 'path';
import bcrypt from 'bcryptjs';

const dbPath = path.resolve(process.cwd(), 'soc_system.db');
export const db = new Database(dbPath);

export function initDb() {
  // Users table
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE,
      password TEXT,
      role TEXT DEFAULT 'analyst',
      approved INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Migration: add approved column if missing (for older DBs)
  try {
    const tableInfo = db.prepare("PRAGMA table_info(users)").all() as any[];
    const hasApproved = tableInfo.some(col => col.name === 'approved');
    if (!hasApproved) {
      db.exec("ALTER TABLE users ADD COLUMN approved INTEGER DEFAULT 1");
    }
  } catch (e) { /* ignore */ }

  // Logs table
  db.exec(`
    CREATE TABLE IF NOT EXISTS logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      source_ip TEXT,
      service TEXT,
      username TEXT,
      event_type TEXT,
      status TEXT,
      request_path TEXT,
      user_agent TEXT,
      raw_log TEXT,
      severity TEXT DEFAULT 'info'
    )
  `);

  // Alerts table
  db.exec(`
    CREATE TABLE IF NOT EXISTS alerts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      rule_triggered TEXT,
      severity TEXT,
      source_ip TEXT,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      status TEXT DEFAULT 'Open',
      description TEXT,
      related_logs TEXT
    )
  `);

  // IP Intelligence table
  db.exec(`
    CREATE TABLE IF NOT EXISTS ip_intelligence (
      ip TEXT PRIMARY KEY,
      attack_count INTEGER DEFAULT 0,
      first_seen DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_seen DATETIME DEFAULT CURRENT_TIMESTAMP,
      country TEXT DEFAULT 'Unknown'
    )
  `);

  // ── Seed / repair admin account ──────────────────────────────────────────
  // Always ensure the admin account exists with a valid password hash.
  // Using bcrypt.hashSync at runtime guarantees the hash is always valid.
  const ADMIN_EMAIL = 'admin@sentinel.soc';
  const adminHash = bcrypt.hashSync('admin123', 10);

  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(ADMIN_EMAIL);
  if (!existing) {
    db.prepare(
      'INSERT INTO users (email, password, role, approved) VALUES (?, ?, ?, ?)'
    ).run(ADMIN_EMAIL, adminHash, 'admin', 1);
    console.log('[DB] Admin account created — admin@sentinel.soc / admin123');
  } else {
    // Always reset hash & role so broken seed from old DB is repaired on restart
    db.prepare(
      'UPDATE users SET password = ?, role = ?, approved = 1 WHERE email = ?'
    ).run(adminHash, 'admin', ADMIN_EMAIL);
    console.log('[DB] Admin account verified/repaired.');
  }
}
