// Dates are handled as 'YYYY-MM-DD' strings in the tablet's local time.

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July',
  'August', 'September', 'October', 'November', 'December'];

const pad = n => String(n).padStart(2, '0');

export const iso = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export function fromISO(s) {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d, 12);
}

// A '?date=YYYY-MM-DD' query string sets "today" for checking the plan on other dates.
export function todayISO() {
  try {
    const q = new URLSearchParams(location.search).get('date');
    if (q && /^\d{4}-\d{2}-\d{2}$/.test(q)) return q;
  } catch (e) { /* ignore */ }
  return iso(new Date());
}

export function addDays(s, n) {
  const d = fromISO(s);
  d.setDate(d.getDate() + n);
  return iso(d);
}

export const daysBetween = (a, b) => Math.round((fromISO(b) - fromISO(a)) / 86400000);

export const isWeekend = s => {
  const day = fromISO(s).getDay();
  return day === 0 || day === 6;
};

export function longDate(s) {
  const d = fromISO(s);
  return `${DAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

export function shortDate(s) {
  const d = fromISO(s);
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

export function inDays(from, to) {
  const n = daysBetween(from, to);
  if (n === 0) return 'today';
  if (n === 1) return 'tomorrow';
  return `in ${n} days`;
}
