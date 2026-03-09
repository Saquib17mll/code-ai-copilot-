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
    started_at TEXT NOT NULL,
    ended_at TEXT NULL,
    duration_minutes INTEGER NOT NULL,
    status TEXT NOT NULL CHECK(status IN ('running', 'completed', 'cancelled'))
  )
`);

module.exports = db;
