// localStorage wrapper. Every read and write is guarded, and an in-memory copy
// keeps the app working for the current visit if storage is unavailable.

const PREFIX = 'sh:';
const memory = new Map();
let usable = false;

try {
  localStorage.setItem(PREFIX + 'probe', '1');
  localStorage.removeItem(PREFIX + 'probe');
  usable = true;
} catch (e) {
  usable = false;
}

export function storageWorks() {
  return usable;
}

export function get(key, fallback = null) {
  if (memory.has(key)) return memory.get(key);
  if (usable) {
    try {
      const raw = localStorage.getItem(PREFIX + key);
      if (raw !== null) {
        const value = JSON.parse(raw);
        memory.set(key, value);
        return value;
      }
    } catch (e) { /* fall through to fallback */ }
  }
  return fallback;
}

export function set(key, value) {
  memory.set(key, value);
  if (!usable) return;
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch (e) { /* storage full or blocked: the memory copy still works */ }
}

export function remove(key) {
  memory.delete(key);
  if (!usable) return;
  try { localStorage.removeItem(PREFIX + key); } catch (e) { /* ignore */ }
}

function storedKeys() {
  const keys = [];
  if (!usable) return keys;
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(PREFIX)) keys.push(k.slice(PREFIX.length));
    }
  } catch (e) { /* ignore */ }
  return keys;
}

// Everything the app has saved, as one plain object (used for backup).
export function allData() {
  const out = {};
  for (const k of storedKeys()) {
    const v = get(k);
    if (v !== null) out[k] = v;
  }
  for (const [k, v] of memory) out[k] = v;
  return out;
}

// Replace all saved progress with the contents of a backup.
export function replaceAll(data) {
  for (const k of storedKeys()) remove(k);
  memory.clear();
  for (const [k, v] of Object.entries(data)) set(k, v);
}
