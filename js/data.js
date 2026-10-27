// Loads the JSON files in /data and works out the active schedule.

import * as store from './store.js';

export const SUBJECT_IDS = ['re', 'geography', 'science', 'maths', 'history', 'french', 'english'];

const cache = {};

export function getJSON(name) {
  if (!cache[name]) {
    cache[name] = fetch(`data/${name}.json`).then(r => {
      if (!r.ok) throw new Error(`Could not load ${name}`);
      return r.json();
    });
  }
  return cache[name];
}

export const getSubject = id => getJSON(id);

export async function allSubjects() {
  return Promise.all(SUBJECT_IDS.map(getJSON));
}

export async function classChoice() {
  const sched = await getJSON('schedule');
  const saved = store.get('class', null);
  const ids = new Set(sched.groups.map(g => g.id));
  if (saved && ids.has(saved.core) && ids.has(saved.lang)) return saved;
  return { ...sched.default_class };
}

export function isDefaultClass(sched, choice) {
  return choice.core === sched.default_class.core && choice.lang === sched.default_class.lang;
}

// The papers for the selected class, sorted by date then by the fixed subject order.
export async function activePapers() {
  const sched = await getJSON('schedule');
  const choice = await classChoice();
  const papers = [];
  for (const gid of [choice.core, choice.lang]) {
    const g = sched.groups.find(x => x.id === gid);
    if (!g) continue;
    for (const [date, subject] of Object.entries(g.papers)) papers.push({ date, subject });
  }
  const order = [...SUBJECT_IDS, 'spanish'];
  papers.sort((a, b) => a.date.localeCompare(b.date) || order.indexOf(a.subject) - order.indexOf(b.subject));
  return papers;
}

export async function subjectName(id) {
  const sched = await getJSON('schedule');
  return (sched.subject_names && sched.subject_names[id]) || id;
}
