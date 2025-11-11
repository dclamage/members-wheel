import path from 'path';
import { fileURLToPath } from 'url';
import sqlite3 from 'sqlite3';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const defaultDbPath = path.join(__dirname, '..', 'data', 'members-wheel.sqlite');
const databasePath = process.env.SQLITE_PATH || defaultDbPath;

sqlite3.verbose();

const db = new sqlite3.Database(databasePath);

db.serialize(() => {
  db.run('PRAGMA foreign_keys = ON');
});

export const run = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.run(sql, params, function callback(err) {
      if (err) {
        reject(err);
      } else {
        resolve({ id: this.lastID, changes: this.changes });
      }
    });
  });

export const get = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) {
        reject(err);
      } else {
        resolve(row);
      }
    });
  });

export const all = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });

export const initialize = async () => {
  await run(`
    CREATE TABLE IF NOT EXISTS wheels (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      spin_duration_seconds INTEGER NOT NULL DEFAULT 5,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS people (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      wheel_id INTEGER NOT NULL,
      label TEXT NOT NULL,
      person_id INTEGER NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (wheel_id) REFERENCES wheels(id) ON DELETE CASCADE,
      FOREIGN KEY (person_id) REFERENCES people(id) ON DELETE CASCADE
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS admin_sessions (
      id TEXT PRIMARY KEY,
      created_at DATETIME NOT NULL,
      last_used_at DATETIME NOT NULL,
      expires_at DATETIME NOT NULL
    )
  `);
};

export default db;
