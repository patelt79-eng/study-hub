import * as store from '../store.js';
import { getJSON, activePapers, subjectName } from '../data.js';
import { todayISO, longDate, inDays, addDays } from '../dates.js';
import { buildPlan } from '../plan.js';
import { esc, sayRow, speakBtn, plural } from '../ui.js';

export async function todayPlan() {
  const [rules, papers] = await Promise.all([getJSON('plan-rules'), activePapers()]);
  const today = todayISO();
  return { today, papers, rules, plan: buildPlan(today, rules, papers) };
}

export function sessionHref(s) {
  return `${s.route}${s.route.includes('?') ? '&' : '?'}session=${encodeURIComponent(s.id)}`;
}

export async function todayView({ main }) {
  const { today, papers, plan } = await todayPlan();
  const ticks = store.get('ticks', {});
  const doneToday = ticks[today] || {};

  let html = `<h1>Today</h1>`;
  html += sayRow(`<p class="lead">${esc(longDate(today))}</p>`, `Today is ${longDate(today)}.`);

  // Assessments today and the next one.
  const todayNames = await Promise.all(plan.todayPapers.map(subjectName));
  const next = papers.find(p => p.date > today);
  let nextText = '';
  if (next) {
    const sameDay = papers.filter(p => p.date === next.date);
    const names = await Promise.all(sameDay.map(p => subjectName(p.subject)));
    nextText = `Next assessment: ${names.join(' and ')}, ${longDate(next.date)} (${inDays(today, next.date)}).`;
  }
  html += `<section class="card">`;
  if (todayNames.length) {
    const t = `Today you have your ${todayNames.join(' and ')} ${todayNames.length > 1 ? 'assessments' : 'assessment'}.`;
    html += sayRow(`<p><strong>${esc(t)}</strong></p>`, t);
  }
  if (nextText) html += sayRow(`<p>${esc(nextText)}</p>`, nextText);
  if (!next && !todayNames.length) html += sayRow('<p>All assessments finished.</p>', 'All assessments finished.');
  html += `</section>`;

  html += `<section class="card"><h2>Today's plan</h2>`;
  if (plan.kind === 'before') {
    const t = `Your plan starts on ${longDate(plan.start)}. There is nothing to do today.`;
    html += sayRow(`<p>${esc(t)}</p>`, t);
  } else if (plan.kind === 'finished') {
    html += sayRow('<p class="big-text">All assessments finished.</p>', 'All assessments finished.');
  } else if (!plan.sessions.length) {
    const t = plan.message || 'There are no revision sessions today.';
    html += sayRow(`<p>${esc(t)}</p>`, t);
  } else {
    const n = plan.sessions.length;
    const allDone = plan.sessions.every((s, i) => doneToday[i]);
    let intro;
    if (allDone) {
      intro = "You've finished today's plan.";
    } else if (plan.light) {
      intro = `There ${n === 1 ? 'is' : 'are'} ${plural(n, 'light session')} today. ${n === 1 ? 'It goes' : 'They go'} over key terms only. There is nothing new.`;
    } else {
      intro = `There are ${n} sessions today. Each one takes about 20 minutes. Tap a session to start it. When you finish, it is ticked for you.`;
    }
    if (plan.message) intro += ' ' + plan.message;
    html += sayRow(`<p${allDone ? ' class="big-text"' : ''}>${esc(intro)}</p>`, intro);

    html += `<ol class="sessions">`;
    plan.sessions.forEach((s, i) => {
      const label = `Session ${i + 1}: ${s.label}, about ${s.minutes} min`;
      const done = !!doneToday[i];
      html += `<li>
        <a class="btn block${done ? '' : ' primary'}" href="${esc(sessionHref(s))}">${esc(label)}</a>
        <button type="button" class="btn tick" data-idx="${i}" data-subject="${esc(s.subject)}" aria-pressed="${done}">${done ? '✓ Done' : 'Mark as done'}</button>
        ${speakBtn(label)}
      </li>`;
    });
    html += `</ol>`;
  }
  html += `</section>`;

  if (plan.kind !== 'finished') {
    const tomorrow = addDays(today, 1);
    html += `<p class="muted small">The plan for each day is fixed. It will not change if you refresh. Tomorrow's plan will be ready on ${esc(longDate(tomorrow))}.</p>`;
  }

  main.innerHTML = html;

  main.querySelectorAll('.tick').forEach(btn => {
    btn.addEventListener('click', () => {
      const t = store.get('ticks', {});
      t[today] = t[today] || {};
      const i = btn.dataset.idx;
      if (t[today][i]) delete t[today][i];
      else t[today][i] = btn.dataset.subject;
      store.set('ticks', t);
      todayView({ main });
    });
  });
}
