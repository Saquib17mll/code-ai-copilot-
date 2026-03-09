const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'employees.db'));

db.exec(`
  CREATE TABLE IF NOT EXISTS employees (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    department TEXT NOT NULL,
    role TEXT NOT NULL,
    hire_date TEXT NOT NULL
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS timer_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    employee_id INTEGER NULL,
    completed_at TEXT NOT NULL
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS timer_xp (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    employee_id INTEGER NULL UNIQUE,
    total_xp INTEGER NOT NULL DEFAULT 0,
    level INTEGER NOT NULL DEFAULT 1,
    updated_at TEXT NOT NULL
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS timer_achievements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    employee_id INTEGER NULL,
    achievement_key TEXT NOT NULL,
    unlocked_at TEXT NOT NULL,
    UNIQUE(employee_id, achievement_key)
  )
`);

module.exports = db;
