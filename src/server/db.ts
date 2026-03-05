import Database from 'better-sqlite3';
import path from 'path';

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
      approved INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Migration for existing tables without the 'approved' column
  try {
    const tableInfo = db.prepare("PRAGMA table_info(users)").all() as any[];
    const hasApprovedColumn = tableInfo.some(col => col.name === 'approved');
    if (!hasApprovedColumn) {
      db.exec("ALTER TABLE users ADD COLUMN approved INTEGER DEFAULT 0");
      console.log("Migration: Added 'approved' column to users table.");
    }
  } catch (e) {
    console.error("Migration failed:", e);
  }

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

  // Seed admin user if not exists
  const admin = db.prepare('SELECT * FROM users WHERE email = ?').get('admin@sentinel.soc');
  if (!admin) {
    db.prepare('INSERT INTO users (email, password, role, approved) VALUES (?, ?, ?, ?)').run(
      'admin@sentinel.soc',
      '$2a$10$X7vH.Mv.Xv.Xv.Xv.Xv.Xv.Xv.Xv.Xv.Xv.Xv.Xv.Xv.Xv.Xv.Xv.', // password: admin (hashed placeholder)
      'admin',
      1
    );
  } else {
    // Ensure admin is approved if already existed
    db.prepare('UPDATE users SET approved = 1 WHERE email = ?').run('admin@sentinel.soc');
  }
}
