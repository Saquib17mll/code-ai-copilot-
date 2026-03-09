const express = require('express');
const router = express.Router();
const db = require('../database');

const XP_PER_SESSION = 10;
const DAILY_BONUS_XP = 20;
const DAILY_BONUS_THRESHOLD = 4;

const ALL_ACHIEVEMENTS = [
  { key: '3_consecutive_days', label: '3-Day Streak', description: 'Complete focus sessions on 3 consecutive days' },
  { key: '10_completions_this_week', label: 'Weekly Warrior', description: 'Complete 10 focus sessions in a single week' },
];

function computeLevel(totalXp) {
  return Math.floor(totalXp / 100) + 1;
}

// Parse and validate an employee_id query/body parameter.
// Returns a positive integer or null; rejects non-integer values.
function parseEmployeeId(raw) {
  if (raw == null || raw === '') return null;
  const n = Number(raw);
  if (!Number.isInteger(n) || n <= 0) return null;
  return n;
}

// Return the start of the current ISO week (Monday 00:00:00 UTC)
function startOfCurrentWeekUTC() {
  const now = new Date();
  const day = now.getUTCDay(); // 0=Sun, 1=Mon, ...
  const diffToMonday = (day === 0 ? -6 : 1 - day);
  const monday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + diffToMonday));
  return monday.toISOString();
}

function daysAgoISO(n) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - n);
  d.setUTCHours(0, 0, 0, 0);
  return d.toISOString();
}

function todayDateString() {
  return new Date().toISOString().slice(0, 10);
}

// Evaluate and unlock achievements idempotently
function evaluateAchievements(employeeId) {
  const now = new Date().toISOString();

  // Achievement: 10_completions_this_week
  const weekStart = startOfCurrentWeekUTC();
  const weekCount = db.prepare(
    'SELECT COUNT(*) as cnt FROM timer_sessions WHERE employee_id IS ? AND completed_at >= ?'
  ).get(employeeId, weekStart);
  if (weekCount && weekCount.cnt >= 10) {
    db.prepare(
      'INSERT OR IGNORE INTO timer_achievements (employee_id, achievement_key, unlocked_at) VALUES (?, ?, ?)'
    ).run(employeeId, '10_completions_this_week', now);
  }

  // Achievement: 3_consecutive_days
  // Get distinct session dates (UTC date strings), sorted descending
  const rows = db.prepare(
    `SELECT DISTINCT substr(completed_at, 1, 10) as session_date
     FROM timer_sessions
     WHERE employee_id IS ?
     ORDER BY session_date DESC`
  ).all(employeeId);

  if (rows.length >= 3) {
    let streak = 1;
    for (let i = 1; i < rows.length; i++) {
      const prev = new Date(rows[i - 1].session_date);
      const curr = new Date(rows[i].session_date);
      const diff = (prev - curr) / (1000 * 60 * 60 * 24);
      if (diff === 1) {
        streak++;
        if (streak >= 3) break;
      } else {
        break;
      }
    }
    if (streak >= 3) {
      db.prepare(
        'INSERT OR IGNORE INTO timer_achievements (employee_id, achievement_key, unlocked_at) VALUES (?, ?, ?)'
      ).run(employeeId, '3_consecutive_days', now);
    }
  }
}

// GET /api/timer/profile
router.get('/profile', (req, res) => {
  try {
    const employeeId = parseEmployeeId(req.query.employee_id);

    const xpRow = db.prepare(
      'SELECT total_xp, level FROM timer_xp WHERE employee_id IS ? ORDER BY id DESC LIMIT 1'
    ).get(employeeId);

    const sessionsRow = db.prepare(
      'SELECT COUNT(*) as cnt FROM timer_sessions WHERE employee_id IS ?'
    ).get(employeeId);

    res.json({
      total_xp: xpRow ? xpRow.total_xp : 0,
      level: xpRow ? xpRow.level : 1,
      sessions_completed: sessionsRow ? sessionsRow.cnt : 0,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/timer/achievements
router.get('/achievements', (req, res) => {
  try {
    const employeeId = parseEmployeeId(req.query.employee_id);

    const unlocked = db.prepare(
      'SELECT achievement_key, unlocked_at FROM timer_achievements WHERE employee_id IS ?'
    ).all(employeeId);

    const unlockedMap = {};
    for (const row of unlocked) {
      unlockedMap[row.achievement_key] = row.unlocked_at;
    }

    const result = ALL_ACHIEVEMENTS.map((a) => ({
      key: a.key,
      label: a.label,
      description: a.description,
      unlocked: !!unlockedMap[a.key],
      unlocked_at: unlockedMap[a.key] || null,
    }));

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/timer/stats?range=weekly|monthly
router.get('/stats', (req, res) => {
  try {
    const range = req.query.range === 'monthly' ? 'monthly' : 'weekly';
    const employeeId = parseEmployeeId(req.query.employee_id);
    const daysBack = range === 'monthly' ? 30 : 7;
    const since = daysAgoISO(daysBack);

    const sessions = db.prepare(
      `SELECT substr(completed_at, 1, 10) as session_date, duration_minutes
       FROM timer_sessions
       WHERE employee_id IS ? AND completed_at >= ?`
    ).all(employeeId, since);

    const sessionsCompleted = sessions.length;
    const totalFocusMinutes = sessions.reduce((sum, s) => sum + (s.duration_minutes || 25), 0);

    // Calculate streak days from most recent streak up to today
    const allDates = db.prepare(
      `SELECT DISTINCT substr(completed_at, 1, 10) as session_date
       FROM timer_sessions
       WHERE employee_id IS ?
       ORDER BY session_date DESC`
    ).all(employeeId);

    let streakDays = 0;
    const today = todayDateString();
    if (allDates.length > 0) {
      // Streak must include today or yesterday to be active
      const mostRecent = allDates[0].session_date;
      const daysDiff = (new Date(today) - new Date(mostRecent)) / (1000 * 60 * 60 * 24);
      if (daysDiff <= 1) {
        streakDays = 1;
        for (let i = 1; i < allDates.length; i++) {
          const prev = new Date(allDates[i - 1].session_date);
          const curr = new Date(allDates[i].session_date);
          const diff = (prev - curr) / (1000 * 60 * 60 * 24);
          if (diff === 1) {
            streakDays++;
          } else {
            break;
          }
        }
      }
    }

    res.json({
      range,
      sessions_completed: sessionsCompleted,
      total_focus_minutes: totalFocusMinutes,
      streak_days: streakDays,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/timer/complete
router.post('/complete', (req, res) => {
  try {
    const { employee_id, duration_minutes } = req.body;
    const employeeId = parseEmployeeId(employee_id);
    const duration = duration_minutes != null ? Number(duration_minutes) : 25;

    if (!Number.isFinite(duration) || duration <= 0) {
      return res.status(400).json({ error: 'duration_minutes must be a positive number' });
    }

    const now = new Date().toISOString();
    const today = todayDateString();

    // Record the session
    db.prepare(
      'INSERT INTO timer_sessions (employee_id, completed_at, duration_minutes) VALUES (?, ?, ?)'
    ).run(employeeId, now, duration);

    // Count sessions today for daily bonus check
    const todayCount = db.prepare(
      `SELECT COUNT(*) as cnt FROM timer_sessions
       WHERE employee_id IS ? AND substr(completed_at, 1, 10) = ?`
    ).get(employeeId, today);

    // Award XP
    let xpEarned = XP_PER_SESSION;
    if (todayCount && todayCount.cnt === DAILY_BONUS_THRESHOLD) {
      // Exactly at threshold: award bonus (only once per threshold crossing)
      xpEarned += DAILY_BONUS_XP;
    }

    const xpRow = db.prepare(
      'SELECT id, total_xp FROM timer_xp WHERE employee_id IS ? ORDER BY id DESC LIMIT 1'
    ).get(employeeId);

    let newTotalXp;
    const newLevel = (currentXp) => computeLevel(currentXp);

    if (xpRow) {
      newTotalXp = xpRow.total_xp + xpEarned;
      db.prepare(
        'UPDATE timer_xp SET total_xp=?, level=?, updated_at=? WHERE id=?'
      ).run(newTotalXp, newLevel(newTotalXp), now, xpRow.id);
    } else {
      newTotalXp = xpEarned;
      db.prepare(
        'INSERT INTO timer_xp (employee_id, total_xp, level, updated_at) VALUES (?, ?, ?, ?)'
      ).run(employeeId, newTotalXp, newLevel(newTotalXp), now);
    }

    const leveledUp = xpRow ? computeLevel(xpRow.total_xp) < computeLevel(newTotalXp) : computeLevel(0) < computeLevel(newTotalXp);

    // Evaluate achievements
    const prevAchievements = db.prepare(
      'SELECT achievement_key FROM timer_achievements WHERE employee_id IS ?'
    ).all(employeeId).map((r) => r.achievement_key);

    evaluateAchievements(employeeId);

    const newAchievements = db.prepare(
      'SELECT achievement_key, unlocked_at FROM timer_achievements WHERE employee_id IS ?'
    ).all(employeeId);

    const newlyUnlocked = newAchievements
      .filter((r) => !prevAchievements.includes(r.achievement_key))
      .map((r) => r.achievement_key);

    res.json({
      xp_earned: xpEarned,
      total_xp: newTotalXp,
      level: computeLevel(newTotalXp),
      leveled_up: leveledUp,
      newly_unlocked_achievements: newlyUnlocked,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
