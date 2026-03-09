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
  CREATE TABLE IF NOT EXISTS timer_preferences (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    employee_id INTEGER NULL,
    default_duration INTEGER NOT NULL DEFAULT 25,
    theme TEXT NOT NULL DEFAULT 'light',
    sound_start INTEGER NOT NULL DEFAULT 1,
    sound_end INTEGER NOT NULL DEFAULT 1,
    sound_tick INTEGER NOT NULL DEFAULT 0,
    updated_at TEXT NOT NULL
  )
`);

module.exports = db;
