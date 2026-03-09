import React, { useState, useEffect, useRef, useCallback } from 'react';
import { startTimerSession, completeTimerSession, cancelTimerSession } from '../api/timerApi';

const FOCUS_MINUTES = 25;
const BREAK_MINUTES = 5;
const RADIUS = 54;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

function getTimerColor(progress) {
  if (progress > 0.66) return '#1976d2'; // blue — early phase
  if (progress > 0.33) return '#f9a825'; // yellow — mid phase
  return '#d32f2f';                       // red — final phase
}

function formatTime(seconds) {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

function PomodoroTimer() {
  // mode: 'idle' | 'focus' | 'break' | 'paused' | 'completed'
  const [mode, setMode] = useState('idle');
  const [secondsLeft, setSecondsLeft] = useState(FOCUS_MINUTES * 60);
  const [totalSeconds, setTotalSeconds] = useState(FOCUS_MINUTES * 60);
  const [sessionId, setSessionId] = useState(null);
  const [apiError, setApiError] = useState('');
  const intervalRef = useRef(null);
  const pausedModeRef = useRef(null); // stores which mode was active before pausing

  const progress = totalSeconds > 0 ? secondsLeft / totalSeconds : 0;
  const dashOffset = CIRCUMFERENCE * (1 - progress);
  const timerColor = getTimerColor(progress);

  const clearTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  // Auto-complete when countdown reaches zero
  const handleAutoComplete = useCallback(async (sid) => {
    clearTimer();
    setMode('completed');
    setSecondsLeft(0);
    if (sid) {
      try {
        await completeTimerSession({ session_id: sid, ended_at: new Date().toISOString() });
        setApiError('');
      } catch {
        setApiError('Session completed locally, but failed to save to server.');
      }
    }
    setSessionId(null);
  }, [clearTimer]);

  const startCountdown = useCallback((sid) => {
    clearTimer();
    intervalRef.current = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          handleAutoComplete(sid);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [clearTimer, handleAutoComplete]);

  // Start a focus session
  const handleStartFocus = async () => {
    const duration = FOCUS_MINUTES;
    const total = duration * 60;
    setTotalSeconds(total);
    setSecondsLeft(total);
    setApiError('');

    let sid = null;
    try {
      const session = await startTimerSession({
        duration_minutes: duration,
        started_at: new Date().toISOString(),
      });
      sid = session.id;
      setSessionId(sid);
    } catch {
      setApiError('Failed to save session to server. Timer continues locally.');
    }

    setMode('focus');
    startCountdown(sid);
  };

  // Start a break session (local only — no API call needed for breaks)
  const handleStartBreak = () => {
    clearTimer();
    const total = BREAK_MINUTES * 60;
    setTotalSeconds(total);
    setSecondsLeft(total);
    setMode('break');
    setApiError('');
    startCountdown(null);
  };

  // Pause the running timer
  const handlePause = () => {
    clearTimer();
    pausedModeRef.current = mode;
    setMode('paused');
  };

  // Resume from paused
  const handleResume = () => {
    const resumedMode = pausedModeRef.current || 'focus';
    setMode(resumedMode);
    startCountdown(sessionId);
  };

  // Cancel an active focus session
  const handleCancel = async () => {
    clearTimer();
    setMode('idle');
    setSecondsLeft(FOCUS_MINUTES * 60);
    setTotalSeconds(FOCUS_MINUTES * 60);
    setApiError('');
    if (sessionId) {
      try {
        await cancelTimerSession({ session_id: sessionId, ended_at: new Date().toISOString() });
      } catch {
        setApiError('Failed to cancel session on server.');
      }
      setSessionId(null);
    }
  };

  // Manual complete
  const handleComplete = async () => {
    clearTimer();
    setMode('completed');
    setApiError('');
    if (sessionId) {
      try {
        await completeTimerSession({ session_id: sessionId, ended_at: new Date().toISOString() });
      } catch {
        setApiError('Session marked complete locally, but failed to save to server.');
      }
      setSessionId(null);
    }
  };

  // Reset back to idle
  const handleReset = () => {
    clearTimer();
    setMode('idle');
    setSecondsLeft(FOCUS_MINUTES * 60);
    setTotalSeconds(FOCUS_MINUTES * 60);
    setSessionId(null);
    setApiError('');
  };

  // Cleanup on unmount
  useEffect(() => () => clearTimer(), [clearTimer]);

  const isActive = mode === 'focus';
  const isRunning = mode === 'focus' || mode === 'break';

  const stateLabel = {
    idle: 'Ready',
    focus: 'Focus',
    break: 'Break',
    paused: 'Paused',
    completed: 'Completed',
  }[mode];

  return (
    <section className="pomodoro-section" aria-label="Pomodoro Timer">
      <h2 className="pomodoro-title">Pomodoro Timer</h2>

      {apiError && (
        <div className="pomodoro-api-error" role="alert">
          {apiError}
        </div>
      )}

      <div className={`pomodoro-wrapper${isActive ? ' pomodoro-active' : ''}`}>
        {/* Ripple pulse — only rendered during active focus */}
        {isActive && (
          <span className="pomodoro-ripple" aria-hidden="true">
            <span className="ripple-ring ripple-ring-1" />
            <span className="ripple-ring ripple-ring-2" />
            <span className="ripple-ring ripple-ring-3" />
          </span>
        )}

        <div className="pomodoro-ring-container">
          <svg
            className="pomodoro-svg"
            viewBox="0 0 120 120"
            width="200"
            height="200"
            role="img"
            aria-label={`Timer: ${formatTime(secondsLeft)} remaining — ${stateLabel}`}
          >
            {/* Track circle */}
            <circle
              cx="60"
              cy="60"
              r={RADIUS}
              fill="none"
              stroke="#e0e0e0"
              strokeWidth="8"
            />
            {/* Progress arc */}
            <circle
              cx="60"
              cy="60"
              r={RADIUS}
              fill="none"
              stroke={timerColor}
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={CIRCUMFERENCE}
              strokeDashoffset={dashOffset}
              transform="rotate(-90 60 60)"
              style={{ transition: 'stroke-dashoffset 1s linear, stroke 0.5s ease' }}
            />
          </svg>

          {/* Numeric time — aria-live is intentionally off to avoid announcing every tick;
               the SVG aria-label above provides accessible state when focused. */}
          <div className="pomodoro-time-display">
            <span className="pomodoro-time" style={{ color: timerColor }}>
              {formatTime(secondsLeft)}
            </span>
            <span className="pomodoro-state-label">{stateLabel}</span>
          </div>
        </div>
      </div>

      <div className="pomodoro-controls" role="group" aria-label="Timer controls">
        {mode === 'idle' && (
          <button className="btn-pomodoro btn-focus" onClick={handleStartFocus}>
            Start Focus
          </button>
        )}

        {mode === 'completed' && (
          <>
            <button className="btn-pomodoro btn-break" onClick={handleStartBreak}>
              Start Break
            </button>
            <button className="btn-pomodoro btn-secondary-pomodoro" onClick={handleReset}>
              Reset
            </button>
          </>
        )}

        {isRunning && (
          <>
            <button className="btn-pomodoro btn-pause" onClick={handlePause}>
              Pause
            </button>
            {mode === 'focus' && (
              <>
                <button className="btn-pomodoro btn-complete" onClick={handleComplete}>
                  Complete
                </button>
                <button className="btn-pomodoro btn-cancel-pomodoro" onClick={handleCancel}>
                  Cancel
                </button>
              </>
            )}
            {mode === 'break' && (
              <button className="btn-pomodoro btn-cancel-pomodoro" onClick={handleReset}>
                End Break
              </button>
            )}
          </>
        )}

        {mode === 'paused' && (
          <>
            <button className="btn-pomodoro btn-focus" onClick={handleResume}>
              Resume
            </button>
            {pausedModeRef.current === 'focus' && (
              <>
                <button className="btn-pomodoro btn-complete" onClick={handleComplete}>
                  Complete
                </button>
                <button className="btn-pomodoro btn-cancel-pomodoro" onClick={handleCancel}>
                  Cancel
                </button>
              </>
            )}
            {pausedModeRef.current === 'break' && (
              <button className="btn-pomodoro btn-cancel-pomodoro" onClick={handleReset}>
                End Break
              </button>
            )}
          </>
        )}
      </div>
    </section>
  );
}

export default PomodoroTimer;
