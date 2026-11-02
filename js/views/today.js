import * as store from '../store.js';
import { getJSON, getSubject, activePapers, subjectName } from '../data.js';
import { todayISO, longDate, inDays, addDays, daysBetween } from '../dates.js';
import { buildPlan } from '../plan.js';
import { esc, speakBtn, plural } from '../ui.js';
import { icon } from '../meta.js';
import { topicParts } from './topic.js';

export async function todayPlan() {
  const [rules, papers] = await Promise.all([getJSON('plan-rules'), activePapers()]);
  const today = todayISO();
  return { today, papers, rules, plan: buildPlan(today, rules, papers) };
}

export function sessionHref(s) {
  return `${s.route}${s.route.includes('?') ? '&' : '?'}session=${encodeURIComponent(s.id)}`;
}

// A topic session's real length comes from the topic itself (same number the topic screen shows).
async function sessionMinutes(s) {
  const m = s.route.match(/^#\/subject\/(\w+)\/topic\/([\w-]+)/);
  if (!m) return s.minutes;
  try {
    const subj = await getSubject(m[1]);
    const t = subj.topics.find(x => x.id === m[2]);
    return t ? topicParts(subj, t).mins : s.minutes;
  } catch (e) {
    return s.minutes;
  }
}

// Days in a row (ending today, or yesterday if nothing is done yet today) with at least one session done.
function streak(ticks, today) {
  const did = d => ticks[d] && Object.keys(ticks[d]).length > 0;
  let d = did(today) ? today : addDays(today, -1);
  let n = 0;
  while (did(d)) { n++; d = addDays(d, -1); }
  return n;
}

function doneThisWeek(ticks, today) {
  let n = 0;
  for (let k = 0; k < 7; k++) { const d = addDays(today, -k); n += ticks[d] ? Object.keys(ticks[d]).length : 0; }
  return n;
}

const joinNames = names => (names.length > 1 ? `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}` : names[0] || '');

export async function todayView({ main }) {
  const { today, papers, rules, plan } = await todayPlan();
  const ticks = store.get('ticks', {});
  const doneToday = ticks[today] || {};
  const spoken = [`Today is ${longDate(today)}.`];

  const sessions = plan.sessions || [];
  const names = await Promise.all(sessions.map(s => subjectName(s.subject)));
  const mins = await Promise.all(sessions.map(sessionMinutes));
  const doneCount = sessions.filter((s, i) => doneToday[i]).length;
  const allDone = sessions.length > 0 && doneCount === sessions.length;

  let html = `<div class="today-head">
      <div><p class="eyebrow">Today</p><h1>${esc(longDate(today))}</h1></div>
      <span id="say-today"></span>
    </div>`;

  // Progress strip: today's sessions, streak and the week so far.
  const st = streak(ticks, today);
  const week = doneThisWeek(ticks, today);
  const cheer = allDone ? 'All done today. Brilliant work!' : doneCount ? `${doneCount} of ${sessions.length} done. Keep going!` : '';
  const streakText = st ? `${plural(st, 'day')} in a row` : 'Start a streak today!';
  const strip = `<section class="today-strip" aria-label="Your streak">
      <div class="today-strip-top"><span class="streak">${icon('flame')}${esc(streakText)}</span>
        ${week ? `<span class="small">${esc(plural(week, 'session'))} done in the last 7 days</span>` : ''}</div>
    </section>`;
  const tail = [];
  spoken.push(st ? `You have revised ${plural(st, 'day')} in a row.` : 'Start a streak today!');

  // Assessments today and the next one, with when it next comes up in the plan.
  const todayNames = await Promise.all(plan.todayPapers.map(subjectName));
  const next = papers.find(p => p.date > today);
  if (todayNames.length) {
    const t = `Today you have your ${joinNames(todayNames)} ${todayNames.length > 1 ? 'assessments' : 'assessment'}. Good luck!`;
    // An exam today stays at the top, above the plan.
    html += `<section class="next-paper" data-subject="${esc(plan.todayPapers[0])}">${icon(plan.todayPapers[0])}<p><strong>${esc(t)}</strong></p></section>`;
    spoken.push(t);
  }
  if (next) {
    const sameDay = papers.filter(p => p.date === next.date);
    const nextNames = await Promise.all(sameDay.map(p => subjectName(p.subject)));
    let when = '';
    if (sessions.some(s => s.subject === next.subject)) when = "It's in today's plan.";
    else {
      for (let d = addDays(today, 1); d < next.date; d = addDays(d, 1)) {
        const p = buildPlan(d, rules, papers);
        if ((p.sessions || []).some(s => s.subject === next.subject)) {
          when = daysBetween(today, d) === 1 ? "It's in your plan tomorrow." : `It's in your plan on ${longDate(d)}.`;
          break;
        }
      }
    }
    tail.push(`<section class="next-paper" data-subject="${esc(next.subject)}">${icon(next.subject)}
      <p><span class="small">Next assessment</span><br><strong>${esc(joinNames(nextNames))}</strong> · ${esc(longDate(next.date))} (${esc(inDays(today, next.date))})${when ? `<br><span class="small">${esc(when)}</span>` : ''}</p></section>`);
    spoken.push(`Next assessment: ${joinNames(nextNames)}, ${longDate(next.date)} (${inDays(today, next.date)}). ${when}`);
  } else if (!todayNames.length) {
    tail.push(`<section class="next-paper"><p><strong>All assessments finished. Well done!</strong></p></section>`);
    spoken.push('All assessments finished. Well done!');
  }

  const segs = sessions.map((s, i) => `<span class="seg${doneToday[i] ? ' on' : ''}" data-subject="${esc(s.subject)}"></span>`).join('');
  html += `<section class="card plan-card"><div class="plan-head"><h2>Today's plan</h2>${sessions.length ? `<span class="small"><strong>${doneCount} of ${sessions.length}</strong> done</span>` : ''}</div>`;
  if (sessions.length) html += `<div class="segs" role="img" aria-label="${doneCount} of ${sessions.length} sessions done">${segs}</div>`;
  if (cheer) { html += `<p class="cheer">${esc(cheer)}</p>`; spoken.push(cheer); }
  if (plan.kind === 'before') {
    const t = `Your plan starts on ${longDate(plan.start)}. There is nothing to do today.`;
    html += `<p>${esc(t)}</p>`; spoken.push(t);
  } else if (plan.kind === 'finished') {
    html += '<p class="big-text">All assessments finished.</p>';
  } else if (!sessions.length) {
    const t = plan.message || 'There are no revision sessions today.';
    html += `<p>${esc(t)}</p>`; spoken.push(t);
  } else {
    const total = mins.reduce((a, b) => a + b, 0);
    let intro = allDone ? "You've finished today's plan." : plan.light
      ? `${sessions.length === 1 ? 'One light session' : plural(sessions.length, 'light session')} today: key terms only, nothing new.`
      : `${plural(sessions.length, 'session')}, about ${total} minutes in total. Tap Start to begin.`;
    if (plan.message) intro += ' ' + plan.message;
    html += `<p${allDone ? ' class="big-text"' : ''}>${esc(intro)}</p>`;
    spoken.push(intro);

    html += `<ol class="sessions">`;
    sessions.forEach((s, i) => {
      const done = !!doneToday[i];
      spoken.push(`Session ${i + 1}: ${names[i]}, ${s.label}, about ${mins[i]} minutes${done ? ', done' : ''}.`);
      html += `<li class="session${done ? ' is-done' : ''}" data-subject="${esc(s.subject)}">
        <div class="session-main">
          <span class="session-icon">${done ? icon('check') : icon(s.subject)}</span>
          <div>
            <p class="eyebrow">Session ${i + 1} · ${esc(names[i])}</p>
            <p class="session-title">${esc(s.label)}</p>
            <p class="small muted">${done ? 'Done' : `About ${mins[i]} minutes`}</p>
          </div>
        </div>
        <div class="session-actions">
          <a class="btn${done ? '' : ' primary big'}" href="${esc(sessionHref(s))}">${done ? 'Do it again' : `Start ${icon('arrow')}`}</a>
          <button type="button" class="link-btn tick" data-idx="${i}" data-subject="${esc(s.subject)}" aria-pressed="${done}">${done ? 'Untick' : 'Already done it? Tick it off'}</button>
        </div>
      </li>`;
    });
    html += `</ol>`;
  }
  html += `</section>`;
  html += strip + tail.join('');

  // A look ahead, instead of a note about how the plan works.
  if (plan.kind !== 'finished') {
    const tomorrow = addDays(today, 1);
    const tp = buildPlan(tomorrow, rules, papers);
    const tNames = await Promise.all((tp.sessions || []).map(s => subjectName(s.subject)));
    if (tNames.length) html += `<p class="muted small">Tomorrow: ${esc(joinNames([...new Set(tNames)]))}${tp.light ? ' (light session)' : ''}.</p>`;
  }

  main.innerHTML = html;
  main.querySelector('#say-today').outerHTML = speakBtn(spoken.join(' '), 'en-GB', 'Listen to today');

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
