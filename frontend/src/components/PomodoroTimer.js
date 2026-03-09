import React, { useState, useEffect, useRef, useCallback } from 'react';
import { getTimerPreferences, updateTimerPreferences, completeSession, getTimerProfile, getTimerAchievements, getTimerStats } from '../api/timerApi';
import GamificationPanel from './GamificationPanel';
import AchievementsPanel from './AchievementsPanel';
import StatisticsPanel from './StatisticsPanel';

const DURATION_PRESETS = [15, 25, 35, 45];
const THEME_OPTIONS = ['light', 'dark', 'focus'];

const DEFAULT_PREFS = {
  default_duration: 25,
  theme: 'light',
  sound_start: true,
  sound_end: true,
  sound_tick: false,
};

function playBeep(frequency = 440, duration = 200, volume = 0.3) {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    oscillator.frequency.value = frequency;
    gainNode.gain.setValueAtTime(volume, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration / 1000);
    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + duration / 1000);
  } catch (e) {
    // AudioContext not available (e.g., tests)
  }
}

function formatTime(seconds) {
  const m = String(Math.floor(seconds / 60)).padStart(2, '0');
  const s = String(seconds % 60).padStart(2, '0');
  return `${m}:${s}`;
}

function loadLocalPrefs() {
  try {
    const raw = localStorage.getItem('pomodoroPrefs');
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return null;
}

function saveLocalPrefs(prefs) {
  try {
    localStorage.setItem('pomodoroPrefs', JSON.stringify(prefs));
  } catch (e) {}
}

export default function PomodoroTimer() {
  const [prefs, setPrefs] = useState(() => loadLocalPrefs() || DEFAULT_PREFS);
  const [timeLeft, setTimeLeft] = useState(prefs.default_duration * 60);
  const [running, setRunning] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const intervalRef = useRef(null);
  const prevDurationRef = useRef(prefs.default_duration);

  // Gamification state
  const [profile, setProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileError, setProfileError] = useState('');
  const [achievements, setAchievements] = useState(null);
  const [achievementsLoading, setAchievementsLoading] = useState(true);
  const [achievementsError, setAchievementsError] = useState('');
  const [weeklyStats, setWeeklyStats] = useState(null);
  const [monthlyStats, setMonthlyStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [statsError, setStatsError] = useState('');
  const [feedback, setFeedback] = useState(null); // { type: 'level'|'achievement', message }

  const refreshGamification = useCallback(() => {
    setProfileLoading(true);
    getTimerProfile()
      .then(setProfile)
      .catch(() => setProfileError('unavailable'))
      .finally(() => setProfileLoading(false));

    setAchievementsLoading(true);
    getTimerAchievements()
      .then(setAchievements)
      .catch(() => setAchievementsError('unavailable'))
      .finally(() => setAchievementsLoading(false));

    setStatsLoading(true);
    Promise.all([getTimerStats('weekly'), getTimerStats('monthly')])
      .then(([w, m]) => { setWeeklyStats(w); setMonthlyStats(m); })
      .catch(() => setStatsError('unavailable'))
      .finally(() => setStatsLoading(false));
  }, []);

  // Load preferences from backend on mount
  useEffect(() => {
    getTimerPreferences()
      .then((serverPrefs) => {
        const merged = { ...DEFAULT_PREFS, ...serverPrefs };
        setPrefs(merged);
        saveLocalPrefs(merged);
        setTimeLeft(merged.default_duration * 60);
        prevDurationRef.current = merged.default_duration;
      })
      .catch(() => {
        // Fall back to localStorage / defaults already loaded
      });
  }, []);

  // Load gamification data on mount
  useEffect(() => {
    refreshGamification();
  }, [refreshGamification]);

  // Apply theme to body
  useEffect(() => {
    document.body.setAttribute('data-pomodoro-theme', prefs.theme);
    return () => {
      document.body.removeAttribute('data-pomodoro-theme');
    };
  }, [prefs.theme]);

  // Reset timer when duration changes and timer is not running
  useEffect(() => {
    if (!running && prefs.default_duration !== prevDurationRef.current) {
      setTimeLeft(prefs.default_duration * 60);
      prevDurationRef.current = prefs.default_duration;
    }
  }, [prefs.default_duration, running]);

  const tick = useCallback(() => {
    setTimeLeft((prev) => {
      if (prev <= 1) {
        clearInterval(intervalRef.current);
        setRunning(false);
        if (prefs.sound_end) playBeep(523, 500, 0.5);
        // Record session completion
        completeSession({ duration_minutes: prefs.default_duration })
          .then((result) => {
            refreshGamification();
            if (result.leveled_up) {
              setFeedback({ type: 'level', message: `Level up! You reached Level ${result.level}! 🎉` });
            } else if (result.newly_unlocked_achievements && result.newly_unlocked_achievements.length > 0) {
              setFeedback({ type: 'achievement', message: `Achievement unlocked! 🏆` });
            }
            setTimeout(() => setFeedback(null), 4000);
          })
          .catch(() => {
            // Gamification failure is non-blocking
          });
        return 0;
      }
      if (prefs.sound_tick) playBeep(880, 50, 0.1);
      return prev - 1;
    });
  }, [prefs.sound_end, prefs.sound_tick, prefs.default_duration, refreshGamification]);

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(tick, 1000);
    } else {
      clearInterval(intervalRef.current);
    }
    return () => clearInterval(intervalRef.current);
  }, [running, tick]);

  const handleStart = () => {
    if (timeLeft === 0) return;
    if (prefs.sound_start) playBeep(440, 200, 0.3);
    setRunning(true);
  };

  const handlePause = () => setRunning(false);

  const handleReset = () => {
    setRunning(false);
    setTimeLeft(prefs.default_duration * 60);
  };

  const handlePrefsChange = (updates) => {
    const updated = { ...prefs, ...updates };
    setPrefs(updated);
    saveLocalPrefs(updated);
  };

  const handleSavePrefs = async () => {
    setSaving(true);
    setSaveError('');
    try {
      const saved = await updateTimerPreferences({
        default_duration: prefs.default_duration,
        theme: prefs.theme,
        sound_start: prefs.sound_start,
        sound_end: prefs.sound_end,
        sound_tick: prefs.sound_tick,
      });
      const merged = { ...prefs, ...saved };
      setPrefs(merged);
      saveLocalPrefs(merged);
      setSettingsOpen(false);
    } catch (err) {
      setSaveError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const progress = 1 - timeLeft / (prefs.default_duration * 60);
  const circumference = 2 * Math.PI * 54;

  return (
    <div className={`pomodoro-wrapper pomodoro-theme-${prefs.theme}`}>
      <div className="pomodoro-layout">
        <div className="pomodoro-card">
          <h2 className="pomodoro-title">Pomodoro Timer</h2>

          {/* Feedback toast */}
          {feedback && (
            <div className={`feedback-toast feedback-toast--${feedback.type}`}>
              {feedback.message}
            </div>
          )}

          {/* Compact settings summary */}
          <div className="pomodoro-summary">
            <span className="summary-badge">{prefs.default_duration} min</span>
            <span className="summary-badge">{prefs.theme}</span>
            {prefs.sound_start && <span className="summary-badge">▶ sound</span>}
            {prefs.sound_end && <span className="summary-badge">⏹ sound</span>}
            {prefs.sound_tick && <span className="summary-badge">🕐 tick</span>}
          </div>

          {/* Circular timer */}
          <div className="pomodoro-clock">
            <svg viewBox="0 0 120 120" className="pomodoro-svg">
              <circle cx="60" cy="60" r="54" className="clock-track" />
              <circle
                cx="60"
                cy="60"
                r="54"
                className="clock-progress"
                strokeDasharray={circumference}
                strokeDashoffset={circumference * (1 - progress)}
              />
            </svg>
            <div className="pomodoro-time">{formatTime(timeLeft)}</div>
          </div>

          {/* Controls */}
          <div className="pomodoro-controls">
            {!running ? (
              <button className="btn-primary pomodoro-btn" onClick={handleStart} disabled={timeLeft === 0}>
                Start
              </button>
            ) : (
              <button className="btn-secondary pomodoro-btn" onClick={handlePause}>
                Pause
              </button>
            )}
            <button className="btn-secondary pomodoro-btn" onClick={handleReset}>
              Reset
            </button>
            <button className="btn-secondary pomodoro-btn" onClick={() => setSettingsOpen((v) => !v)}>
              ⚙ Settings
            </button>
          </div>

          {/* Settings panel */}
          {settingsOpen && (
            <div className="pomodoro-settings">
              <h3 className="settings-title">Settings</h3>

              <div className="settings-row">
                <label className="settings-label">Duration</label>
                <div className="preset-group">
                  {DURATION_PRESETS.map((d) => (
                    <button
                      key={d}
                      className={`preset-btn${prefs.default_duration === d ? ' active' : ''}`}
                      onClick={() => handlePrefsChange({ default_duration: d })}
                    >
                      {d}m
                    </button>
                  ))}
                </div>
              </div>

              <div className="settings-row">
                <label className="settings-label">Theme</label>
                <div className="preset-group">
                  {THEME_OPTIONS.map((t) => (
                    <button
                      key={t}
                      className={`preset-btn${prefs.theme === t ? ' active' : ''}`}
                      onClick={() => handlePrefsChange({ theme: t })}
                    >
                      {t.charAt(0).toUpperCase() + t.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              <div className="settings-row">
                <label className="settings-label">Sounds</label>
                <div className="toggle-group">
                  <label className="toggle-label">
                    <input
                      type="checkbox"
                      checked={prefs.sound_start}
                      onChange={(e) => handlePrefsChange({ sound_start: e.target.checked })}
                    />
                    Start sound
                  </label>
                  <label className="toggle-label">
                    <input
                      type="checkbox"
                      checked={prefs.sound_end}
                      onChange={(e) => handlePrefsChange({ sound_end: e.target.checked })}
                    />
                    End sound
                  </label>
                  <label className="toggle-label">
                    <input
                      type="checkbox"
                      checked={prefs.sound_tick}
                      onChange={(e) => handlePrefsChange({ sound_tick: e.target.checked })}
                    />
                    Tick sound
                  </label>
                </div>
              </div>

              {saveError && <div className="error">{saveError}</div>}

              <div className="settings-actions">
                <button className="btn-primary" onClick={handleSavePrefs} disabled={saving}>
                  {saving ? 'Saving…' : 'Save'}
                </button>
                <button className="btn-secondary" onClick={() => setSettingsOpen(false)}>
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right-side panels */}
        <div className="pomodoro-side-panels">
          <GamificationPanel profile={profile} loading={profileLoading} error={profileError} />
          <AchievementsPanel achievements={achievements} loading={achievementsLoading} error={achievementsError} />
          <StatisticsPanel
            weeklyStats={weeklyStats}
            monthlyStats={monthlyStats}
            loading={statsLoading}
            error={statsError}
          />
        </div>
      </div>
    </div>
  );
}
