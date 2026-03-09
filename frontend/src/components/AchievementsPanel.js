import React from 'react';

export default function AchievementsPanel({ achievements, loading, error }) {
  if (loading) {
    return <div className="achievements-panel"><p className="panel-loading">Loading achievements…</p></div>;
  }

  if (error) {
    return <div className="achievements-panel"><p className="panel-error">Achievements unavailable</p></div>;
  }

  const list = achievements || [];

  return (
    <div className="achievements-panel">
      <h3 className="panel-title">Achievements</h3>
      {list.length === 0 ? (
        <p className="panel-empty">No achievements defined.</p>
      ) : (
        <ul className="achievements-list">
          {list.map((a) => (
            <li key={a.key} className={`achievement-item${a.unlocked ? ' unlocked' : ' locked'}`}>
              <span className="achievement-icon">{a.unlocked ? '🏆' : '🔒'}</span>
              <div className="achievement-info">
                <span className="achievement-label">{a.label}</span>
                <span className="achievement-desc">{a.description}</span>
                {a.unlocked && a.unlocked_at && (
                  <span className="achievement-date">
                    Unlocked {new Date(a.unlocked_at).toLocaleDateString()}
                  </span>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
