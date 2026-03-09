const express = require('express');
const router = express.Router();
const db = require('../database');

const VALID_DURATIONS = [15, 25, 35, 45];
const VALID_THEMES = ['light', 'dark', 'focus'];

// GET /api/timer/preferences
router.get('/', (req, res) => {
  try {
    const prefs = db.prepare('SELECT * FROM timer_preferences ORDER BY id DESC LIMIT 1').get();
    if (!prefs) {
      return res.json({
        default_duration: 25,
        theme: 'light',
        sound_start: true,
        sound_end: true,
        sound_tick: false,
      });
    }
    res.json({
      id: prefs.id,
      employee_id: prefs.employee_id,
      default_duration: prefs.default_duration,
      theme: prefs.theme,
      sound_start: prefs.sound_start === 1,
      sound_end: prefs.sound_end === 1,
      sound_tick: prefs.sound_tick === 1,
      updated_at: prefs.updated_at,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/timer/preferences
router.put('/', (req, res) => {
  try {
    const { default_duration, theme, sound_start, sound_end, sound_tick, employee_id } = req.body;

    const errors = [];

    if (default_duration === undefined || default_duration === null) {
      errors.push('default_duration is required');
    } else if (!VALID_DURATIONS.includes(Number(default_duration))) {
      errors.push('default_duration must be one of 15, 25, 35, 45');
    }

    if (theme === undefined || theme === null) {
      errors.push('theme is required');
    } else if (!VALID_THEMES.includes(theme)) {
      errors.push('theme must be one of light, dark, focus');
    }

    if (typeof sound_start !== 'boolean') {
      errors.push('sound_start must be a boolean');
    }
    if (typeof sound_end !== 'boolean') {
      errors.push('sound_end must be a boolean');
    }
    if (typeof sound_tick !== 'boolean') {
      errors.push('sound_tick must be a boolean');
    }

    if (errors.length > 0) {
      return res.status(400).json({ error: errors.join('; ') });
    }

    const updated_at = new Date().toISOString();
    const existing = db.prepare('SELECT id FROM timer_preferences ORDER BY id DESC LIMIT 1').get();

    if (existing) {
      db.prepare(
        'UPDATE timer_preferences SET employee_id=?, default_duration=?, theme=?, sound_start=?, sound_end=?, sound_tick=?, updated_at=? WHERE id=?'
      ).run(
        employee_id ?? null,
        Number(default_duration),
        theme,
        sound_start ? 1 : 0,
        sound_end ? 1 : 0,
        sound_tick ? 1 : 0,
        updated_at,
        existing.id
      );
    } else {
      db.prepare(
        'INSERT INTO timer_preferences (employee_id, default_duration, theme, sound_start, sound_end, sound_tick, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
      ).run(
        employee_id ?? null,
        Number(default_duration),
        theme,
        sound_start ? 1 : 0,
        sound_end ? 1 : 0,
        sound_tick ? 1 : 0,
        updated_at
      );
    }

    const saved = db.prepare('SELECT * FROM timer_preferences ORDER BY id DESC LIMIT 1').get();
    res.json({
      id: saved.id,
      employee_id: saved.employee_id,
      default_duration: saved.default_duration,
      theme: saved.theme,
      sound_start: saved.sound_start === 1,
      sound_end: saved.sound_end === 1,
      sound_tick: saved.sound_tick === 1,
      updated_at: saved.updated_at,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
