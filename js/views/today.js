import * as store from '../store.js';
import { getJSON, activePapers, subjectName } from '../data.js';
import { todayISO, longDate, inDays, addDays } from '../dates.js';
import { buildPlan } from '../plan.js';
import { esc, sayRow, speakBtn, plural } from '../ui.js';
import { icon } from '../meta.js';

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

  let html = `<p class="eyebrow">Today</p>`;
  html += sayRow(`<h1>${esc(longDate(today))}</h1>`, `Today is ${longDate(today)}.`);

  // Assessments today and the next one.
  const todayNames = await Promise.all(plan.todayPapers.map(subjectName));
  const next = papers.find(p => p.date > today);
  if (todayNames.length) {
    const t = `Today you have your ${todayNames.join(' and ')} ${todayNames.length > 1 ? 'assessments' : 'assessment'}.`;
    html += `<section class="next-paper" data-subject="${esc(plan.todayPapers[0])}">${icon(plan.todayPapers[0])}${sayRow(`<p><strong>${esc(t)}</strong></p>`, t)}</section>`;
  }
  if (next) {
    const sameDay = papers.filter(p => p.date === next.date);
    const names = await Promise.all(sameDay.map(p => subjectName(p.subject)));
    const t = `Next assessment: ${names.join(' and ')}, ${longDate(next.date)} (${inDays(today, next.date)}).`;
    html += `<section class="next-paper" data-subject="${esc(next.subject)}">${icon(next.subject)}
      ${sayRow(`<p><span class="small">Next assessment</span><br><strong>${esc(names.join(' and '))}</strong> · ${esc(longDate(next.date))} (${esc(inDays(today, next.date))})</p>`, t)}</section>`;
  } else if (!todayNames.length) {
    html += `<section class="next-paper">${sayRow('<p><strong>All assessments finished.</strong></p>', 'All assessments finished.')}</section>`;
  }

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
      intro = `There are ${n} sessions today, each about ${plan.sessions[0].minutes} minutes. Tap Start. When you finish a session, it is ticked for you.`;
    }
    if (plan.message) intro += ' ' + plan.message;
    html += sayRow(`<p${allDone ? ' class="big-text"' : ''}>${esc(intro)}</p>`, intro);

    html += `<ol class="sessions">`;
    const names = await Promise.all(plan.sessions.map(s => subjectName(s.subject)));
    plan.sessions.forEach((s, i) => {
      const spoken = `Session ${i + 1}. ${names[i]}. ${s.label}. About ${s.minutes} minutes.`;
      const done = !!doneToday[i];
      html += `<li class="session${done ? ' is-done' : ''}" data-subject="${esc(s.subject)}">
        <div class="session-main">
          <span class="session-icon">${done ? icon('check') : icon(s.subject)}</span>
          <div>
            <p class="eyebrow">Session ${i + 1} · ${esc(names[i])}</p>
            <p class="session-title">${esc(s.label)}</p>
            <p class="small muted">About ${s.minutes} minutes</p>
          </div>
        </div>
        <div class="session-actions">
          <a class="btn${done ? '' : ' primary'}" href="${esc(sessionHref(s))}">${done ? 'Do it again' : 'Start'}</a>
          <button type="button" class="btn tick" data-idx="${i}" data-subject="${esc(s.subject)}" aria-pressed="${done}">${done ? 'Done' : 'Mark as done'}</button>
          ${speakBtn(spoken)}
        </div>
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
