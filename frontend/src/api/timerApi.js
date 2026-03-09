const BASE_URL = '/api/timer';

/**
 * Start a new timer session.
 * @param {object} params
 * @param {number|null} [params.employee_id] - Optional employee to associate the session with.
 * @param {number} params.duration_minutes - Session length (positive integer).
 * @param {string} params.started_at - ISO 8601 start timestamp.
 */
export async function startTimerSession({ employee_id, duration_minutes, started_at }) {
  const res = await fetch(`${BASE_URL}/sessions/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ employee_id, duration_minutes, started_at }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Failed to start timer session');
  }
  return res.json();
}

export async function completeTimerSession({ session_id, ended_at }) {
  const res = await fetch(`${BASE_URL}/sessions/complete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ session_id, ended_at }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Failed to complete timer session');
  }
  return res.json();
}

export async function cancelTimerSession({ session_id, ended_at }) {
  const res = await fetch(`${BASE_URL}/sessions/cancel`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ session_id, ended_at }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Failed to cancel timer session');
  }
  return res.json();
}
