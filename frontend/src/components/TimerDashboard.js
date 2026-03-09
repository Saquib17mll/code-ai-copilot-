import React, { useState, useEffect, useRef, useCallback } from 'react';
import ProfileSummary from './ProfileSummary';
import Achievements from './Achievements';
import Statistics from './Statistics';
import { completeSession, getProfile, getAchievements, getStats } from '../api/timerApi';

const FOCUS_DURATION = 25 * 60; // 25 minutes in seconds

function formatTime(seconds) {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

export default function TimerDashboard() {
  const [timeLeft, setTimeLeft] = useState(FOCUS_DURATION);
  const [running, setRunning] = useState(false);
  const [profile, setProfile] = useState(null);
  const [achievements, setAchievements] = useState([]);
  const [stats, setStats] = useState(null);
  const [statsRange, setStatsRange] = useState('weekly');
  const [notification, setNotification] = useState(null);
  const intervalRef = useRef(null);

  const loadData = useCallback(async (range = statsRange) => {
    try {
      const [p, a, s] = await Promise.all([
        getProfile(),
        getAchievements(),
        getStats(range),
      ]);
      setProfile(p);
      setAchievements(a);
      setStats(s);
    } catch (_) {
      // silently ignore if backend not available during tests
    }
  }, [statsRange]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRangeChange = async (range) => {
    setStatsRange(range);
    try {
      const s = await getStats(range);
      setStats(s);
    } catch (_) {}
  };

  const showNotification = (msg, type = 'success') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const handleSessionComplete = useCallback(async () => {
    setRunning(false);
    setTimeLeft(FOCUS_DURATION);
    try {
      const result = await completeSession();
      const messages = [];
      if (result.leveledUp) {
        messages.push(`🎉 Level Up! You are now Level ${result.level}!`);
      }
      if (result.newAchievements && result.newAchievements.length > 0) {
        for (const achievement of result.newAchievements) {
          messages.push(`🏆 Achievement Unlocked: ${achievement.key}`);
        }
      }
      if (messages.length === 0) {
        messages.push(`✅ Session complete! +${result.xpGained} XP`);
      }
      showNotification(messages.join(' '));
      await loadData();
    } catch (_) {}
  }, [loadData]);

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(intervalRef.current);
            handleSessionComplete();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      clearInterval(intervalRef.current);
    }
    return () => clearInterval(intervalRef.current);
  }, [running, handleSessionComplete]);

  const handleStartPause = () => setRunning((r) => !r);

  const handleReset = () => {
    setRunning(false);
    setTimeLeft(FOCUS_DURATION);
  };

  const progress = ((FOCUS_DURATION - timeLeft) / FOCUS_DURATION) * 100;

  return (
    <div className="timer-dashboard">
      {notification && (
        <div className={`toast-notification ${notification.type}`}>
          {notification.msg}
        </div>
      )}

      <div className="timer-top">
        <ProfileSummary profile={profile} />

        <div className="pomodoro-timer">
          <div className="timer-ring-wrap">
            <svg className="timer-ring" viewBox="0 0 120 120">
              <circle cx="60" cy="60" r="54" className="ring-bg" />
              <circle
                cx="60"
                cy="60"
                r="54"
                className="ring-progress"
                strokeDasharray={`${2 * Math.PI * 54}`}
                strokeDashoffset={`${2 * Math.PI * 54 * (1 - progress / 100)}`}
              />
            </svg>
            <div className="timer-display">{formatTime(timeLeft)}</div>
          </div>
          <p className="timer-phase">Focus Session</p>
          <div className="timer-controls">
            <button className="btn-primary" onClick={handleStartPause}>
              {running ? 'Pause' : timeLeft === FOCUS_DURATION ? 'Start' : 'Resume'}
            </button>
            <button className="btn-secondary" onClick={handleReset}>
              Reset
            </button>
          </div>
        </div>
      </div>

      <Statistics stats={stats} onRangeChange={handleRangeChange} />
      <Achievements achievements={achievements} />
    </div>
  );
}
