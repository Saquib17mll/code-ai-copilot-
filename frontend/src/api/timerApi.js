const BASE_URL = '/api/timer/preferences';
const GAMIFICATION_BASE = '/api/timer';

export async function getTimerPreferences() {
  const res = await fetch(BASE_URL);
  if (!res.ok) throw new Error('Failed to fetch timer preferences');
  return res.json();
}

export async function updateTimerPreferences(data) {
  const res = await fetch(BASE_URL, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || 'Failed to update timer preferences');
  return json;
}

export async function completeSession(data) {
  const res = await fetch(`${GAMIFICATION_BASE}/complete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || 'Failed to record session');
  return json;
}

export async function getTimerProfile(employeeId) {
  const url = employeeId != null
    ? `${GAMIFICATION_BASE}/profile?employee_id=${employeeId}`
    : `${GAMIFICATION_BASE}/profile`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch timer profile');
  return res.json();
}

export async function getTimerAchievements(employeeId) {
  const url = employeeId != null
    ? `${GAMIFICATION_BASE}/achievements?employee_id=${employeeId}`
    : `${GAMIFICATION_BASE}/achievements`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch achievements');
  return res.json();
}

export async function getTimerStats(range, employeeId) {
  let url = `${GAMIFICATION_BASE}/stats?range=${range || 'weekly'}`;
  if (employeeId != null) url += `&employee_id=${employeeId}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch timer stats');
  return res.json();
}
