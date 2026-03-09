const express = require('express');
const router = express.Router();
const db = require('../database');

// POST /api/timer/sessions/start
router.post('/sessions/start', (req, res) => {
  try {
    const { employee_id, duration_minutes, started_at } = req.body;

    if (!duration_minutes || !started_at) {
      return res.status(400).json({ error: 'duration_minutes and started_at are required' });
    }
    if (!Number.isInteger(duration_minutes) || duration_minutes <= 0) {
      return res.status(400).json({ error: 'duration_minutes must be a positive integer' });
    }
    if (typeof started_at !== 'string' || started_at.trim() === '') {
      return res.status(400).json({ error: 'started_at must be a non-empty string' });
    }

    const stmt = db.prepare(
      'INSERT INTO timer_sessions (employee_id, started_at, duration_minutes, status) VALUES (?, ?, ?, ?)'
    );
    const result = stmt.run(employee_id || null, started_at, duration_minutes, 'running');
    const session = db.prepare('SELECT * FROM timer_sessions WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(session);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/timer/sessions/complete
router.post('/sessions/complete', (req, res) => {
  try {
    const { session_id, ended_at } = req.body;

    if (!session_id || !ended_at) {
      return res.status(400).json({ error: 'session_id and ended_at are required' });
    }
    if (typeof ended_at !== 'string' || ended_at.trim() === '') {
      return res.status(400).json({ error: 'ended_at must be a non-empty string' });
    }

    const session = db.prepare('SELECT * FROM timer_sessions WHERE id = ?').get(session_id);
    if (!session) {
      return res.status(404).json({ error: 'Timer session not found' });
    }
    if (session.status !== 'running') {
      return res.status(409).json({ error: `Session is already ${session.status}` });
    }

    db.prepare('UPDATE timer_sessions SET status = ?, ended_at = ? WHERE id = ?')
      .run('completed', ended_at, session_id);
    const updated = db.prepare('SELECT * FROM timer_sessions WHERE id = ?').get(session_id);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/timer/sessions/cancel
router.post('/sessions/cancel', (req, res) => {
  try {
    const { session_id, ended_at } = req.body;

    if (!session_id || !ended_at) {
      return res.status(400).json({ error: 'session_id and ended_at are required' });
    }
    if (typeof ended_at !== 'string' || ended_at.trim() === '') {
      return res.status(400).json({ error: 'ended_at must be a non-empty string' });
    }

    const session = db.prepare('SELECT * FROM timer_sessions WHERE id = ?').get(session_id);
    if (!session) {
      return res.status(404).json({ error: 'Timer session not found' });
    }
    if (session.status !== 'running') {
      return res.status(409).json({ error: `Session is already ${session.status}` });
    }

    db.prepare('UPDATE timer_sessions SET status = ?, ended_at = ? WHERE id = ?')
      .run('cancelled', ended_at, session_id);
    const updated = db.prepare('SELECT * FROM timer_sessions WHERE id = ?').get(session_id);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
