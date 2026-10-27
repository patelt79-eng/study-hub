// The daily plan. buildPlan() is a pure function of the date, the rules in
// data/plan-rules.json and the paper dates, so the same day always gives the
// same plan. There is no randomness.

import { addDays, isWeekend } from './dates.js';

const unique = list => [...new Set(list)];

export function lastPaperDate(papers) {
  return papers.reduce((m, p) => (p.date > m ? p.date : m), '');
}

export function buildPlan(day, rules, papers) {
  const last = lastPaperDate(papers);
  const todayPapers = papers.filter(p => p.date === day).map(p => p.subject);
  if (day < rules.start_date) return { kind: 'before', start: rules.start_date, sessions: [], todayPapers };
  if (last && day > last) return { kind: 'finished', sessions: [], todayPapers };

  // Walk forward from the start date so the rotation carries on smoothly.
  const state = { current: {}, used: {} };
  let result = null;
  for (let d = rules.start_date; d <= day; d = addDays(d, 1)) {
    result = planOneDay(d, rules, papers, state);
  }
  result.todayPapers = todayPapers;
  result.sessions = result.sessions.map((s, i) => ({ ...s, id: `${day}.${i}.${s.subject}` }));
  return result;
}

function planOneDay(d, rules, papers, state) {
  const override = rules.overrides && rules.overrides[d];
  if (override) {
    return {
      kind: 'sessions',
      light: !!override.light,
      message: override.message || '',
      sessions: (override.sessions || []).map(s => ({ minutes: rules.session_minutes, ...s })),
    };
  }

  // Papers sat on or before today are removed from the plan.
  const remaining = papers.filter(p => p.date > d && rules.tasks[p.subject]);
  const subjects = unique(remaining.map(p => p.subject));
  if (!subjects.length) return { kind: 'no-sessions', sessions: [] };

  // The evening before a paper: one light session on that subject only.
  const tomorrow = addDays(d, 1);
  const due = unique(remaining.filter(p => p.date === tomorrow).map(p => p.subject));
  if (due.length && rules.light_evening_before) {
    return {
      kind: 'sessions',
      light: true,
      sessions: due.map(s => ({ subject: s, minutes: rules.light_minutes, ...rules.light[s] })),
    };
  }

  const weekendStyle = isWeekend(d) || (rules.non_school_days || []).includes(d);
  const count = weekendStyle ? rules.sessions_weekend : rules.sessions_school_day;

  // Smooth weighted round-robin: higher weight subjects come up more often,
  // and no subject appears twice on the same day.
  const picks = [];
  for (let i = 0; i < count; i++) {
    const total = subjects.reduce((t, s) => t + (rules.weights[s] || 1), 0);
    for (const s of subjects) state.current[s] = (state.current[s] || 0) + (rules.weights[s] || 1);
    const choices = subjects.filter(s => !picks.includes(s));
    if (!choices.length) break;
    let best = choices[0];
    for (const s of choices) if (state.current[s] > state.current[best]) best = s;
    state.current[best] -= total;
    picks.push(best);
  }

  const sessions = picks.map(s => {
    const n = state.used[s] || 0;
    state.used[s] = n + 1;
    const list = rules.tasks[s];
    return { subject: s, minutes: rules.session_minutes, ...list[n % list.length] };
  });
  return { kind: 'sessions', light: false, sessions };
}
