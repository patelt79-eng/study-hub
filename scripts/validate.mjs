// Checks the content in /data and scans the repo for identifying strings.
//
//   node scripts/validate.mjs            run all checks
//   node scripts/validate.mjs --review   also rewrite CONTENT_REVIEW.md
//   node scripts/validate.mjs --plan     also print the daily plan for every day
//
// Forbidden strings (names, school, staff, class codes) are read from
// scripts/forbidden.local.txt, one per line. That file is gitignored so the
// names are never published.

import { readFileSync, readdirSync, statSync, writeFileSync, existsSync } from 'node:fs';
import { join, relative, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildPlan } from '../js/plan.js';
import { addDays } from '../js/dates.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const args = new Set(process.argv.slice(2));
const errors = [];
const warnings = [];
const fail = msg => errors.push(msg);

const SUBJECTS = ['re', 'geography', 'science', 'maths', 'history', 'french', 'english'];
const load = name => JSON.parse(readFileSync(join(root, 'data', `${name}.json`), 'utf8'));

const data = {};
for (const name of [...SUBJECTS, 'schedule', 'plan-rules']) {
  try { data[name] = load(name); } catch (e) { fail(`data/${name}.json does not parse: ${e.message}`); }
}

function needSource(file, where, item) {
  if (!item || (item.source !== 'booklet' && item.source !== 'generated')) {
    fail(`${file}: ${where} is missing "source": "booklet" or "generated"`);
  }
}

for (const id of SUBJECTS) {
  const s = data[id];
  if (!s) continue;
  const f = `data/${id}.json`;
  const ids = new Set();
  const checkId = (x, where) => {
    if (!x.id) return fail(`${f}: ${where} has no id`);
    if (ids.has(x.id)) fail(`${f}: duplicate id ${x.id}`);
    ids.add(x.id);
  };

  for (const key of ['scope', 'flashcards', 'quiz', 'resources', 'rag_topics', 'flashcard_sets', 'quiz_sets']) {
    if (!Array.isArray(s[key])) fail(`${f}: "${key}" must be a list`);
  }
  (s.scope || []).forEach((b, i) => needSource(f, `scope[${i}]`, b));
  (s.resources || []).forEach((r, i) => needSource(f, `resources[${i}] (${r.label})`, r));
  const ragIds = new Set();
  (s.rag_topics || []).forEach((r, i) => {
    needSource(f, `rag_topics[${i}]`, r);
    if (!r.id) fail(`${f}: rag_topics[${i}] has no id`);
    else if (ragIds.has(r.id)) fail(`${f}: duplicate RAG topic id ${r.id}`);
    ragIds.add(r.id);
  });

  const fcSets = new Set((s.flashcard_sets || []).map(x => x.id));
  (s.flashcards || []).forEach((c, i) => {
    checkId(c, `flashcards[${i}]`);
    needSource(f, `flashcard ${c.id}`, c);
    if (!fcSets.has(c.set)) fail(`${f}: flashcard ${c.id} uses unknown set "${c.set}"`);
    const front = c.fr !== undefined ? c.fr : c.front;
    const back = c.en !== undefined ? c.en : c.back;
    if (!front || !back) fail(`${f}: flashcard ${c.id} is missing a front or back`);
    const words = `${front} ${back} ${c.note || ''}`.split(/\s+/).length;
    if (words > 40) warnings.push(`${f}: flashcard ${c.id} has ${words} words (may take more than 15 seconds to read aloud)`);
  });
  for (const set of fcSets) if (!s.flashcards.some(c => c.set === set)) fail(`${f}: flashcard set "${set}" is empty`);
  if (!s.flashcards.some(c => c.key)) fail(`${f}: no flashcards are marked "key": true (needed for light sessions)`);

  const qSets = new Set((s.quiz_sets || []).map(x => x.id));
  (s.quiz || []).forEach((q, i) => {
    checkId(q, `quiz[${i}]`);
    needSource(f, `quiz ${q.id}`, q);
    if (!qSets.has(q.set)) fail(`${f}: quiz ${q.id} uses unknown set "${q.set}"`);
    if (!Array.isArray(q.options) || q.options.length !== 4) fail(`${f}: quiz ${q.id} must have exactly 4 options`);
    else if (new Set(q.options.map(o => o.trim().toLowerCase())).size !== 4) fail(`${f}: quiz ${q.id} has repeated options`);
    if (!Number.isInteger(q.answer) || q.answer < 0 || q.answer > 3) fail(`${f}: quiz ${q.id} must have exactly one correct answer (answer 0 to 3)`);
    if (!q.explain) fail(`${f}: quiz ${q.id} has no explanation`);
    if (!q.q) fail(`${f}: quiz ${q.id} has no question text`);
  });
  for (const set of qSets) if (!s.quiz.some(q => q.set === set)) fail(`${f}: quiz set "${set}" is empty`);

  (s.writing || []).forEach((w, i) => {
    checkId(w, `writing[${i}]`);
    needSource(f, `writing ${w.id}`, w);
    if (!['PEE', 'PEA'].includes(w.type)) fail(`${f}: writing ${w.id} type must be PEE or PEA`);
    if (!(w.paragraphs >= 1)) fail(`${f}: writing ${w.id} needs a paragraphs count`);
  });
  (s.skills || []).forEach((k, i) => {
    checkId(k, `skills[${i}]`);
    needSource(f, `skill ${k.id}`, k);
    if (!k.steps || !k.steps.length) fail(`${f}: skill ${k.id} has no worked example steps`);
    if (!k.practice || !k.practice.length) fail(`${f}: skill ${k.id} has no practice questions`);
    (k.practice || []).forEach((p, j) => { if (!p.q || !p.answer || !p.method) fail(`${f}: skill ${k.id} practice ${j + 1} is incomplete`); });
  });
  if (s.skills) {
    const firstSets = s.skills.findIndex(k => k.sets12);
    if (firstSets >= 0 && s.skills.slice(firstSets).some(k => !k.sets12)) fail(`${f}: sets 1–2 skills must come last`);
  }
  if (s.tasks) {
    for (const [tid, t] of Object.entries(s.tasks)) {
      needSource(f, `tasks.${tid}`, t);
      (t.questions || []).forEach((q, j) => needSource(f, `tasks.${tid}.questions[${j}]`, q));
      (t.items || []).forEach((q, j) => needSource(f, `tasks.${tid}.items[${j}]`, q));
    }
  }
  if (s.bigger_picture) s.bigger_picture.questions.forEach((q, j) => needSource(f, `bigger_picture.questions[${j}]`, q));
  if (s.booklet_tasks) needSource(f, 'booklet_tasks', s.booklet_tasks);

  // RE: every generated item must be flagged for a parent to check.
  if (id === 're') {
    for (const list of [s.flashcards, s.quiz]) {
      for (const x of list) if (x.source === 'generated' && x.needs_parent_check !== true) fail(`${f}: ${x.id} is generated but not marked "needs_parent_check": true`);
    }
  }
}

// Plan rules: every route must point at something that exists.
const rules = data['plan-rules'];
if (rules) {
  const routes = [];
  for (const [subj, list] of Object.entries(rules.tasks || {})) list.forEach(t => routes.push([subj, t.route, t.label]));
  for (const [subj, t] of Object.entries(rules.light || {})) routes.push([subj, t.route, t.label]);
  for (const [subj, route, label] of routes) {
    const [path] = route.split('?');
    const m = path.match(/^#\/subject\/(\w+)\/(flashcards|quiz|write|worked|practice|task)\/([\w-]+)$/);
    const s = m && data[m[1]];
    if (!m || !s) { fail(`plan-rules: bad route ${route}`); continue; }
    const [, , kind, target] = m;
    const ok =
      (kind === 'flashcards' && (['key', 'all'].includes(target) || s.flashcard_sets.some(x => x.id === target))) ||
      (kind === 'quiz' && s.quiz_sets.some(x => x.id === target)) ||
      (kind === 'write' && (s.writing || []).some(x => x.id === target)) ||
      ((kind === 'worked' || kind === 'practice') && (s.skills || []).some(x => x.id === target)) ||
      (kind === 'task' && s.tasks && s.tasks[target]);
    if (!ok) fail(`plan-rules: "${label}" points at ${route}, which does not exist`);
    if (!label) fail(`plan-rules: route ${route} has no label`);
  }
}

// Plan: identical every time for the same date, for the default class.
const sched = data.schedule;
if (rules && sched) {
  const papers = [];
  for (const gid of [sched.default_class.core, sched.default_class.lang]) {
    const g = sched.groups.find(x => x.id === gid);
    for (const [date, subject] of Object.entries(g.papers)) papers.push({ date, subject });
  }
  const order = [...SUBJECTS, 'spanish'];
  papers.sort((a, b) => a.date.localeCompare(b.date) || order.indexOf(a.subject) - order.indexOf(b.subject));
  const lines = [];
  for (let d = addDays(rules.start_date, -1); d <= '2026-11-26'; d = addDays(d, 1)) {
    const a = JSON.stringify(buildPlan(d, rules, papers));
    const b = JSON.stringify(buildPlan(d, rules, papers));
    if (a !== b) fail(`plan for ${d} is not the same on every run`);
    const p = JSON.parse(a);
    lines.push(`${d}  ${p.kind.padEnd(11)} ${p.todayPapers.length ? '[paper: ' + p.todayPapers.join(', ') + '] ' : ''}${p.sessions.map(s => s.label).join(' | ')}`);
  }
  if (args.has('--plan')) console.log(lines.join('\n') + '\n');
}

// Forbidden strings anywhere in the repo.
const forbiddenFile = join(root, 'scripts', 'forbidden.local.txt');
let forbidden = [];
if (existsSync(forbiddenFile)) {
  forbidden = readFileSync(forbiddenFile, 'utf8').split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('#'));
} else {
  warnings.push('scripts/forbidden.local.txt not found, so names were not checked. Create it with one name per line.');
}
const SKIP = new Set(['.git', 'node_modules', 'forbidden.local.txt', '.DS_Store']);
function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    if (SKIP.has(name)) continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else out.push(p);
  }
  return out;
}
const escapeRe = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
for (const file of walk(root)) {
  if (/\.(png|jpg|ico)$/i.test(file)) continue;
  const text = readFileSync(file, 'utf8');
  for (const word of forbidden) {
    const re = new RegExp(`(^|[^A-Za-z0-9])${escapeRe(word)}($|[^A-Za-z0-9])`, 'i');
    if (re.test(text) || re.test(relative(root, file))) fail(`${relative(root, file)} contains a forbidden string (line ${forbidden.indexOf(word) + 1} of forbidden.local.txt)`);
  }
}

// CONTENT_REVIEW.md: every item flagged for a parent to check, RE first.
if (args.has('--review')) {
  const out = ['# Content review', '',
    'Every generated item flagged `needs_parent_check`, grouped by subject, RE first.',
    'Please read these before the app is used. To correct an item, edit the matching file in `/data/` (search for its id).', ''];
  let total = 0;
  for (const id of SUBJECTS) {
    const s = data[id];
    const items = [];
    for (const c of s.flashcards) if (c.needs_parent_check) items.push(`- **${c.id}** (flashcard) **${c.front ?? c.fr}**: ${c.back ?? c.en}`);
    for (const q of s.quiz) if (q.needs_parent_check) items.push(`- **${q.id}** (quiz) ${q.q} Answer: **${q.options[q.answer]}**. ${q.explain}`);
    for (const w of s.writing || []) if (w.needs_parent_check) items.push(`- **${w.id}** (writing hints for "${w.question}"): ${w.hints.join(' / ')}`);
    if (!items.length) continue;
    total += items.length;
    out.push(`## ${s.name} (${items.length})`, '', ...items, '');
  }
  out.push('## Also generated, not flagged', '',
    'Everything else marked `"source": "generated"` (definitions, quiz questions, maths worked examples and practice, French vocabulary, History "Bigger picture" answers) is simple KS3 content written for this app. It was not flagged because it is standard and stable, but you can spot-check it in the same files.', '');
  writeFileSync(join(root, 'CONTENT_REVIEW.md'), out.join('\n'));
  console.log(`CONTENT_REVIEW.md written (${total} flagged items).`);
}

for (const w of warnings) console.log(`warning: ${w}`);
if (errors.length) {
  for (const e of errors) console.log(`FAIL: ${e}`);
  console.log(`\n${errors.length} problem(s) found.`);
  process.exit(1);
}
const counts = SUBJECTS.map(id => `${data[id].name}: ${data[id].flashcards.length} cards, ${data[id].quiz.length} questions`).join('\n  ');
console.log(`All checks passed.\n  ${counts}`);
