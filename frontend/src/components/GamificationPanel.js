import React from 'react';

function XPBar({ totalXp, level }) {
  const xpForCurrentLevel = (level - 1) * 100;
  const xpIntoLevel = totalXp - xpForCurrentLevel;
  const progressPct = Math.min(100, xpIntoLevel);

  return (
    <div className="xp-bar-container">
      <div className="xp-bar-track">
        <div className="xp-bar-fill" style={{ width: `${progressPct}%` }} />
      </div>
      <span className="xp-bar-label">{xpIntoLevel} / 100 XP</span>
    </div>
  );
}

export default function GamificationPanel({ profile, loading, error }) {
  if (loading) {
    return <div className="gamification-panel"><p className="panel-loading">Loading profile…</p></div>;
  }

  if (error) {
    return <div className="gamification-panel"><p className="panel-error">Profile unavailable</p></div>;
  }

  const { total_xp = 0, level = 1, sessions_completed = 0 } = profile || {};

  return (
    <div className="gamification-panel">
      <h3 className="panel-title">Your Progress</h3>
      <div className="gamification-stats">
        <div className="gam-stat">
          <span className="gam-stat-value">{level}</span>
          <span className="gam-stat-label">Level</span>
        </div>
        <div className="gam-stat">
          <span className="gam-stat-value">{total_xp}</span>
          <span className="gam-stat-label">Total XP</span>
        </div>
        <div className="gam-stat">
          <span className="gam-stat-value">{sessions_completed}</span>
          <span className="gam-stat-label">Sessions</span>
        </div>
      </div>
      <XPBar totalXp={total_xp} level={level} />
    </div>
  );
}
