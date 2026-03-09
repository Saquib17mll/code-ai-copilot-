import React from 'react';

export default function ProfileSummary({ profile }) {
  if (!profile) return null;
  const { total_xp, level, total_sessions, xp_in_level, xp_needed } = profile;
  const progressPct = Math.min(100, Math.round((xp_in_level / xp_needed) * 100));

  return (
    <div className="profile-card">
      <div className="profile-level-badge">
        <span className="level-number">{level}</span>
        <span className="level-label">LVL</span>
      </div>
      <div className="profile-details">
        <div className="profile-stat">
          <span className="profile-stat-value">{total_xp}</span>
          <span className="profile-stat-label">Total XP</span>
        </div>
        <div className="profile-stat">
          <span className="profile-stat-value">{total_sessions}</span>
          <span className="profile-stat-label">Sessions</span>
        </div>
        <div className="profile-xp-bar-wrap">
          <div className="profile-xp-bar">
            <div
              className="profile-xp-fill"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <span className="profile-xp-text">
            {xp_in_level} / {xp_needed} XP to Level {level + 1}
          </span>
        </div>
      </div>
    </div>
  );
}
