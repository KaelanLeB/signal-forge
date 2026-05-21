// Storage adapter — Stage 1 uses localStorage.
// Stage 3 migration: replace the bodies of these four functions with Supabase JS client calls.
// All callers use this interface unchanged.

const NS = 'feedbackPrd.';

export function saveItem(key, value) {
  localStorage.setItem(NS + key, JSON.stringify(value));
}

export function getItem(key) {
  const raw = localStorage.getItem(NS + key);
  if (raw === null) return null;
  try { return JSON.parse(raw); } catch { return raw; }
}

export function removeItem(key) {
  localStorage.removeItem(NS + key);
}

export function clearAll() {
  Object.keys(localStorage)
    .filter(k => k.startsWith(NS))
    .forEach(k => localStorage.removeItem(k));
}
