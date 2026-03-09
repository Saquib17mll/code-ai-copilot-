import React from 'react';

const ICONS = {
  first_session: '🎯',
  '3_consecutive_days': '🔥',
  '10_completions_this_week': '⚡',
  '5_sessions_one_day': '💎',
};

export default function Achievements({ achievements }) {
  if (!achievements || achievements.length === 0) return null;

  return (
    <div className="achievements-section">
      <h3 className="section-title">Achievements</h3>
      <div className="achievements-grid">
        {achievements.map((ach) => (
          <div
            key={ach.key}
            className={`achievement-card ${ach.unlocked ? 'unlocked' : 'locked'}`}
          >
            <div className="achievement-icon">
              {ach.unlocked ? (ICONS[ach.key] || '🏆') : '🔒'}
            </div>
            <div className="achievement-info">
              <span className="achievement-label">{ach.label}</span>
              <span className="achievement-desc">{ach.description}</span>
              {ach.unlocked && ach.unlocked_at && (
                <span className="achievement-date">
                  Unlocked {new Date(ach.unlocked_at).toLocaleDateString()}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
