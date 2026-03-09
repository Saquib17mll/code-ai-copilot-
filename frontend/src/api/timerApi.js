const BASE = '/api/timer';

export async function completeSession() {
  const res = await fetch(`${BASE}/complete`, { method: 'POST' });
  if (!res.ok) throw new Error('Failed to record session');
  return res.json();
}

export async function getProfile() {
  const res = await fetch(`${BASE}/profile`);
  if (!res.ok) throw new Error('Failed to load profile');
  return res.json();
}

export async function getAchievements() {
  const res = await fetch(`${BASE}/achievements`);
  if (!res.ok) throw new Error('Failed to load achievements');
  return res.json();
}

export async function getStats(range = 'weekly') {
  const res = await fetch(`${BASE}/stats?range=${range}`);
  if (!res.ok) throw new Error('Failed to load stats');
  return res.json();
}
