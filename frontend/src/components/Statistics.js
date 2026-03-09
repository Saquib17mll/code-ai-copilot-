import React, { useState } from 'react';

function BarChart({ data }) {
  const max = Math.max(1, ...data.map((d) => d.count));
  return (
    <div className="bar-chart">
      {data.map((d) => (
        <div key={d.date} className="bar-col">
          <div
            className="bar-fill"
            style={{ height: `${Math.round((d.count / max) * 100)}%` }}
            title={`${d.date}: ${d.count} sessions`}
          />
          <span className="bar-label">
            {d.date.length === 10 ? d.date.slice(5) : d.date} {/* MM-DD */}
          </span>
        </div>
      ))}
    </div>
  );
}

export default function Statistics({ stats, onRangeChange }) {
  const [range, setRange] = useState('weekly');

  const handleRange = (r) => {
    setRange(r);
    if (onRangeChange) onRangeChange(r);
  };

  if (!stats) return null;

  const { total_sessions, total_focus_minutes, streak_days, daily_distribution } = stats;

  return (
    <div className="stats-section">
      <div className="stats-header">
        <h3 className="section-title">Statistics</h3>
        <div className="range-toggle">
          <button
            className={`range-btn ${range === 'weekly' ? 'active' : ''}`}
            onClick={() => handleRange('weekly')}
          >
            Weekly
          </button>
          <button
            className={`range-btn ${range === 'monthly' ? 'active' : ''}`}
            onClick={() => handleRange('monthly')}
          >
            Monthly
          </button>
        </div>
      </div>

      <div className="stats-cards">
        <div className="stat-card">
          <span className="stat-icon">🍅</span>
          <span className="stat-num">{total_sessions}</span>
          <span className="stat-desc">Sessions</span>
        </div>
        <div className="stat-card">
          <span className="stat-icon">⏱️</span>
          <span className="stat-num">{total_focus_minutes}</span>
          <span className="stat-desc">Focus Minutes</span>
        </div>
        <div className="stat-card">
          <span className="stat-icon">🔥</span>
          <span className="stat-num">{streak_days}</span>
          <span className="stat-desc">Day Streak</span>
        </div>
      </div>

      <div className="chart-card">
        <h4 className="chart-title">Daily Distribution</h4>
        <BarChart data={daily_distribution} />
      </div>
    </div>
  );
}
