const express = require('express');
const router = express.Router();
const db = require('../database');

const EMPLOYEE_ID = null; // No auth system; NULL represents the global user

const ACHIEVEMENT_DEFINITIONS = [
  {
    key: '3_consecutive_days',
    label: '3-Day Streak',
    description: 'Complete focus sessions on 3 consecutive days.',
  },
  {
    key: '10_completions_this_week',
    label: 'Weekly Warrior',
    description: 'Complete 10 focus sessions in one week.',
  },
  {
    key: 'first_session',
    label: 'First Step',
    description: 'Complete your very first focus session.',
  },
  {
    key: '5_sessions_one_day',
    label: 'Deep Focus',
    description: 'Complete 5 focus sessions in a single day.',
  },
];

// ── Helpers ──────────────────────────────────────────────────────────────────

function getOrCreateXp(employeeId) {
  let xp = db
    .prepare('SELECT * FROM timer_xp WHERE employee_id IS ?')
    .get(employeeId);
  if (!xp) {
    const now = new Date().toISOString();
    db.prepare(
      'INSERT INTO timer_xp (employee_id, total_xp, level, updated_at) VALUES (?, 0, 1, ?)'
    ).run(employeeId, now);
    xp = db
      .prepare('SELECT * FROM timer_xp WHERE employee_id IS ?')
      .get(employeeId);
  }
  return xp;
}

function calcLevel(totalXp) {
  return Math.floor(totalXp / 100) + 1;
}

function awardXp(employeeId, amount) {
  const xp = getOrCreateXp(employeeId);
  const newTotal = xp.total_xp + amount;
  const newLevel = calcLevel(newTotal);
  const now = new Date().toISOString();
  db.prepare(
    'UPDATE timer_xp SET total_xp = ?, level = ?, updated_at = ? WHERE employee_id IS ?'
  ).run(newTotal, newLevel, now, employeeId);
  return { previousLevel: xp.level, newLevel, totalXp: newTotal, xpGained: amount };
}

function unlockAchievement(employeeId, key) {
  const existing = db
    .prepare(
      'SELECT * FROM timer_achievements WHERE employee_id IS ? AND achievement_key = ?'
    )
    .get(employeeId, key);
  if (existing) return null; // already unlocked – idempotent
  const now = new Date().toISOString();
  db.prepare(
    'INSERT INTO timer_achievements (employee_id, achievement_key, unlocked_at) VALUES (?, ?, ?)'
  ).run(employeeId, key, now);
  return { key, unlocked_at: now };
}

function evaluateAchievements(employeeId) {
  const newlyUnlocked = [];
  const now = new Date();

  // first_session
  const totalSessions = db
    .prepare('SELECT COUNT(*) as cnt FROM timer_sessions WHERE employee_id IS ?')
    .get(employeeId).cnt;
  if (totalSessions >= 1) {
    const u = unlockAchievement(employeeId, 'first_session');
    if (u) newlyUnlocked.push(u);
  }

  // 5_sessions_one_day
  const todayStr = now.toISOString().slice(0, 10);
  const sessionsToday = db
    .prepare(
      "SELECT COUNT(*) as cnt FROM timer_sessions WHERE employee_id IS ? AND completed_at LIKE ?"
    )
    .get(employeeId, `${todayStr}%`).cnt;
  if (sessionsToday >= 5) {
    const u = unlockAchievement(employeeId, '5_sessions_one_day');
    if (u) newlyUnlocked.push(u);
  }

  // 10_completions_this_week – last 7 days
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const sessionsThisWeek = db
    .prepare(
      'SELECT COUNT(*) as cnt FROM timer_sessions WHERE employee_id IS ? AND completed_at >= ?'
    )
    .get(employeeId, weekAgo).cnt;
  if (sessionsThisWeek >= 10) {
    const u = unlockAchievement(employeeId, '10_completions_this_week');
    if (u) newlyUnlocked.push(u);
  }

  // 3_consecutive_days
  const recentDays = db
    .prepare(
      "SELECT DISTINCT substr(completed_at, 1, 10) as day FROM timer_sessions WHERE employee_id IS ? ORDER BY day DESC LIMIT 30"
    )
    .all(employeeId)
    .map((r) => r.day);

  let streak = 0;
  const today = new Date(now.toISOString().slice(0, 10));
  for (let i = 0; i < recentDays.length; i++) {
    const expected = new Date(today.getTime() - i * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);
    if (recentDays[i] === expected) {
      streak++;
    } else {
      break;
    }
  }
  if (streak >= 3) {
    const u = unlockAchievement(employeeId, '3_consecutive_days');
    if (u) newlyUnlocked.push(u);
  }

  return newlyUnlocked;
}

// ── POST /api/timer/complete ──────────────────────────────────────────────────
router.post('/complete', (req, res) => {
  try {
    const employeeId = EMPLOYEE_ID;
    const now = new Date().toISOString();

    // Record the session
    db.prepare(
      'INSERT INTO timer_sessions (employee_id, completed_at) VALUES (?, ?)'
    ).run(employeeId, now);

    // Base XP reward
    let xpResult = awardXp(employeeId, 10);

    // Daily consistency bonus: +20 XP once per day when 4th session is completed
    const todayStr = now.slice(0, 10);
    const sessionsToday = db
      .prepare(
        "SELECT COUNT(*) as cnt FROM timer_sessions WHERE employee_id IS ? AND completed_at LIKE ?"
      )
      .get(employeeId, `${todayStr}%`).cnt;
    if (sessionsToday === 4) {
      const bonus = awardXp(employeeId, 20);
      xpResult = {
        ...bonus,
        xpGained: xpResult.xpGained + 20,
        previousLevel: xpResult.previousLevel,
      };
    }

    // Achievement evaluation
    const newAchievements = evaluateAchievements(employeeId);

    const xpRow = getOrCreateXp(employeeId);
    res.json({
      xpGained: xpResult.xpGained,
      totalXp: xpRow.total_xp,
      level: xpRow.level,
      leveledUp: xpResult.newLevel > xpResult.previousLevel,
      newAchievements,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/timer/profile ────────────────────────────────────────────────────
router.get('/profile', (req, res) => {
  try {
    const employeeId = EMPLOYEE_ID;
    const xp = getOrCreateXp(employeeId);
    const totalSessions = db
      .prepare('SELECT COUNT(*) as cnt FROM timer_sessions WHERE employee_id IS ?')
      .get(employeeId).cnt;

    const xpForCurrentLevel = (xp.level - 1) * 100;
    const xpForNextLevel = xp.level * 100;
    const xpInLevel = xp.total_xp - xpForCurrentLevel;
    const xpNeeded = xpForNextLevel - xpForCurrentLevel;

    res.json({
      total_xp: xp.total_xp,
      level: xp.level,
      total_sessions: totalSessions,
      xp_in_level: xpInLevel,
      xp_needed: xpNeeded,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/timer/achievements ───────────────────────────────────────────────
router.get('/achievements', (req, res) => {
  try {
    const employeeId = EMPLOYEE_ID;
    const unlocked = db
      .prepare(
        'SELECT achievement_key, unlocked_at FROM timer_achievements WHERE employee_id IS ?'
      )
      .all(employeeId);
    const unlockedMap = {};
    for (const row of unlocked) {
      unlockedMap[row.achievement_key] = row.unlocked_at;
    }

    const achievements = ACHIEVEMENT_DEFINITIONS.map((def) => ({
      key: def.key,
      label: def.label,
      description: def.description,
      unlocked: !!unlockedMap[def.key],
      unlocked_at: unlockedMap[def.key] || null,
    }));

    res.json(achievements);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/timer/stats?range=weekly|monthly ─────────────────────────────────
router.get('/stats', (req, res) => {
  try {
    const employeeId = EMPLOYEE_ID;
    const range = req.query.range === 'monthly' ? 'monthly' : 'weekly';
    const days = range === 'monthly' ? 30 : 7;

    const now = new Date();
    const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000).toISOString();

    const sessions = db
      .prepare(
        'SELECT completed_at FROM timer_sessions WHERE employee_id IS ? AND completed_at >= ? ORDER BY completed_at ASC'
      )
      .all(employeeId, cutoff);

    // Total sessions and focus minutes (25 min each)
    const totalSessions = sessions.length;
    const totalFocusMinutes = totalSessions * 25;

    // Daily distribution
    const dailyMap = {};
    for (const s of sessions) {
      const day = s.completed_at.slice(0, 10);
      dailyMap[day] = (dailyMap[day] || 0) + 1;
    }

    // Fill in all days in range (including zeroes)
    const dailyDistribution = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
        .toISOString()
        .slice(0, 10);
      dailyDistribution.push({ date: d, count: dailyMap[d] || 0 });
    }

    // Streak calculation
    const allDays = db
      .prepare(
        "SELECT DISTINCT substr(completed_at, 1, 10) as day FROM timer_sessions WHERE employee_id IS ? ORDER BY day DESC LIMIT 60"
      )
      .all(employeeId)
      .map((r) => r.day);

    let streak = 0;
    const today = now.toISOString().slice(0, 10);
    const todayDate = new Date(today);
    for (let i = 0; i < allDays.length; i++) {
      const expected = new Date(todayDate.getTime() - i * 24 * 60 * 60 * 1000)
        .toISOString()
        .slice(0, 10);
      if (allDays[i] === expected) {
        streak++;
      } else {
        break;
      }
    }

    res.json({
      range,
      total_sessions: totalSessions,
      total_focus_minutes: totalFocusMinutes,
      streak_days: streak,
      daily_distribution: dailyDistribution,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
