import { activePapers, subjectName, getSubject, SUBJECT_IDS } from '../data.js';
import { todayISO, longDate, inDays } from '../dates.js';
import { esc, sayRow } from '../ui.js';
import { icon } from '../meta.js';
import { topicProgress } from './topic.js';

export async function subjectsView({ main }) {
  const papers = await activePapers();
  const today = todayISO();
  let html = `<h1>Subjects</h1>`;
  const intro = 'Your subjects are in the order of your assessments. Tap one to open it.';
  html += sayRow(`<p>${esc(intro)}</p>`, intro);
  html += `<div class="subject-grid">`;
  for (const p of papers) {
    const name = await subjectName(p.subject);
    const sat = p.date < today;
    const when = sat ? `Done on ${longDate(p.date)}` : `${longDate(p.date)} · ${inDays(today, p.date)}`;
    if (SUBJECT_IDS.includes(p.subject)) {
      const s = await getSubject(p.subject);
      const prog = topicProgress(p.subject);
      const done = s.topics.filter(t => prog[t.id] && prog[t.id].done).length;
      html += `<a class="subject-tile${sat ? ' is-sat' : ''}" data-subject="${p.subject}" href="#/subject/${p.subject}">
        <span class="tile-icon">${icon(p.subject)}</span>
        <span class="tile-name">${esc(name)}</span>
        <span class="tile-date">${esc(when)}</span>
        <span class="progress" aria-hidden="true"><span style="width:${Math.round((done / s.topics.length) * 100)}%"></span></span>
        <span class="tile-meta">${done} of ${s.topics.length} topics done</span>
      </a>`;
    } else {
      html += `<div class="subject-tile is-sat"><span class="tile-name">${esc(name)}</span><span class="tile-date">${esc(when)}</span>
        <span class="tile-meta">Study Hub does not include ${esc(name)}. Use your paper booklet.</span></div>`;
    }
  }
  html += `</div>`;
  main.innerHTML = html;
}
