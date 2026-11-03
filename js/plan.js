// The daily plan. buildPlan() is a pure function of the date, the rules in
// data/plan-rules.json and the paper dates, so the same day always gives the
// same plan. There is no randomness.
//
// How sessions are chosen: the whole plan is worked out at once, from the start
// date to the last paper. Each session goes to the subject that is shortest of
// time: the number of days left before its paper, minus the topics it still
// needs. So every subject gets its topics in before its own paper, if there is
// room. Topics run in the order of rules.tasks, so the most important come first.
// Tasks that are not topics (writing, booklet tasks) are used once all topics
// that fit are planned.

import { addDays, isWeekend } from './dates.js';

const unique = list => [...new Set(list)];
const isTopic = t => t.route.includes('/topic/');

export function lastPaperDate(papers) {
  return papers.reduce((m, p) => (p.date > m ? p.date : m), '');
}

let memo = { key: '', value: null };

// Works out every day of the plan.
function schedule(rules, papers) {
  const key = JSON.stringify([rules, papers]);
  if (memo.key === key) return memo.value;

  const last = lastPaperDate(papers);
  const paperOf = {};
  for (const p of papers) if (rules.tasks[p.subject] && (!paperOf[p.subject] || p.date > paperOf[p.subject])) paperOf[p.subject] = p.date;
  const order = Object.keys(paperOf).sort((a, b) => paperOf[a].localeCompare(paperOf[b]));

  // 1. Decide what kind of day each date is.
  const days = [];
  for (let d = rules.start_date; d <= last; d = addDays(d, 1)) {
    const override = rules.overrides && rules.overrides[d];
    if (override) {
      days.push({ d, kind: 'sessions', light: !!override.light, message: override.message || '',
        sessions: (override.sessions || []).map(s => ({ minutes: rules.session_minutes, ...s })) });
      continue;
    }
    const remaining = order.filter(s => paperOf[s] > d);
    if (!remaining.length) { days.push({ d, kind: 'no-sessions', sessions: [] }); continue; }
    const tomorrow = addDays(d, 1);
    const due = unique(papers.filter(p => p.date === tomorrow && rules.tasks[p.subject]).map(p => p.subject));
    if (due.length && rules.light_evening_before) {
      days.push({ d, kind: 'sessions', light: true,
        sessions: due.map(s => ({ subject: s, minutes: rules.light_minutes, ...rules.light[s] })) });
      continue;
    }
    const weekendStyle = isWeekend(d) || (rules.non_school_days || []).includes(d);
    days.push({ d, kind: 'sessions', light: false, slots: weekendStyle ? rules.sessions_weekend : rules.sessions_school_day, sessions: [] });
  }

  // 2. Fill the normal days, one session at a time.
  const normal = days.filter(x => x.slots);
  const topics = Object.fromEntries(order.map(s => [s, rules.tasks[s].filter(isTopic)]));
  const extras = Object.fromEntries(order.map(s => [s, rules.tasks[s].filter(t => !isTopic(t))]));
  const done = Object.fromEntries(order.map(s => [s, 0]));
  const extraDone = Object.fromEntries(order.map(s => [s, 0]));
  const count = Object.fromEntries(order.map(s => [s, 0]));

  normal.forEach((day, di) => {
    for (let slot = 0; slot < day.slots; slot++) {
      const used = day.sessions.map(x => x.subject);
      const open = order.filter(s => paperOf[s] > day.d && !used.includes(s));
      // Days left for this subject, today included (one session per subject per day).
      const daysLeft = s => normal.slice(di).filter(x => x.d < paperOf[s]).length;
      // Free sessions left before a date, counting from this one.
      const slotsBefore = date => normal.slice(di).filter(x => x.d < date)
        .reduce((n, x, k) => n + (k === 0 ? x.slots - slot : x.slots), 0);
      const needing = open.filter(s => done[s] < topics[s].length);
      let pick = null;
      let task = null;
      if (needing.length) {
        // Guard the earlier papers: if the topics still needed for all papers up to
        // some date exactly fill the sessions left before it, one of those subjects
        // must go now. (If they can no longer all fit, sharing fairly is better.)
        let pool = needing;
        for (const s of order) {
          const upTo = order.filter(x => paperOf[x] <= paperOf[s]);
          const need = upTo.reduce((n, x) => n + topics[x].length - done[x], 0);
          if (need > 0 && slotsBefore(paperOf[s]) === need) {
            const urgent = needing.filter(x => paperOf[x] <= paperOf[s]);
            if (urgent.length) { pool = urgent; break; }
          }
        }
        // Otherwise share sessions fairly: the subject with the smallest share of its
        // topics done goes next. Ties go to the subject with less time to spare.
        const share = s => done[s] / topics[s].length;
        const slack = s => daysLeft(s) - (topics[s].length - done[s]);
        pick = pool.reduce((a, b) => (share(b) < share(a) || (share(b) === share(a) && slack(b) < slack(a)) ? b : a));
        task = topics[pick][done[pick]++];
      } else if (open.length) {
        // All topics that fit are planned: use writing tasks, then go over topics again.
        pick = open.reduce((a, b) => (count[b] < count[a] ? b : a));
        const list = [...extras[pick], ...topics[pick]];
        task = list[extraDone[pick]++ % list.length];
      }
      if (!pick) break;
      count[pick]++;
      day.sessions.push({ subject: pick, minutes: rules.session_minutes, ...task });
    }
  });

  // 3. Topics that did not fit before their paper.
  const missed = Object.fromEntries(order.map(s => [s, topics[s].slice(done[s])]));

  const value = { days: Object.fromEntries(days.map(x => [x.d, x])), missed };
  memo = { key, value };
  return value;
}

export function buildPlan(day, rules, papers) {
  const last = lastPaperDate(papers);
  const todayPapers = papers.filter(p => p.date === day).map(p => p.subject);
  if (day < rules.start_date) return { kind: 'before', start: rules.start_date, sessions: [], todayPapers };
  if (last && day > last) return { kind: 'finished', sessions: [], todayPapers };
  const d = schedule(rules, papers).days[day];
  return {
    kind: d.kind,
    light: !!d.light,
    message: d.message || '',
    todayPapers,
    sessions: d.sessions.map((s, i) => ({ ...s, id: `${day}.${i}.${s.subject}` })),
  };
}

// Topics in each subject that the plan has no room for before the paper.
export function topicsNotInPlan(rules, papers) {
  return schedule(rules, papers).missed;
}
