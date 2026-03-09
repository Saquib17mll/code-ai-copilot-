import React, { useState } from 'react';

export default function StatisticsPanel({ weeklyStats, monthlyStats, loading, error }) {
  const [range, setRange] = useState('weekly');

  const stats = range === 'weekly' ? weeklyStats : monthlyStats;

  if (loading) {
    return <div className="statistics-panel"><p className="panel-loading">Loading statistics…</p></div>;
  }

  if (error) {
    return <div className="statistics-panel"><p className="panel-error">Statistics unavailable</p></div>;
  }

  const { sessions_completed = 0, total_focus_minutes = 0, streak_days = 0 } = stats || {};

  return (
    <div className="statistics-panel">
      <div className="stats-header">
        <h3 className="panel-title">Statistics</h3>
        <div className="stats-range-toggle">
          <button
            className={`range-btn${range === 'weekly' ? ' active' : ''}`}
            onClick={() => setRange('weekly')}
          >
            Weekly
          </button>
          <button
            className={`range-btn${range === 'monthly' ? ' active' : ''}`}
            onClick={() => setRange('monthly')}
          >
            Monthly
          </button>
        </div>
      </div>
      <div className="stats-grid">
        <div className="stat-card">
          <span className="stat-card-value">{sessions_completed}</span>
          <span className="stat-card-label">Sessions</span>
        </div>
        <div className="stat-card">
          <span className="stat-card-value">{total_focus_minutes}</span>
          <span className="stat-card-label">Focus Minutes</span>
        </div>
        <div className="stat-card">
          <span className="stat-card-value">{streak_days}</span>
          <span className="stat-card-label">Streak Days</span>
        </div>
      </div>
    </div>
  );
}
