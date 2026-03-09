const BASE_URL = '/api/timer/preferences';

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
