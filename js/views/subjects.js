import { activePapers, subjectName, SUBJECT_IDS } from '../data.js';
import { todayISO, longDate } from '../dates.js';
import { esc, sayRow } from '../ui.js';

export async function subjectsView({ main }) {
  const papers = await activePapers();
  const today = todayISO();
  let html = `<h1>Subjects</h1>`;
  const intro = 'Your subjects are in the order of your assessments. Tap a subject to open it.';
  html += sayRow(`<p>${esc(intro)}</p>`, intro);
  html += `<div class="stack">`;
  for (const p of papers) {
    const name = await subjectName(p.subject);
    const when = p.date < today ? `Done. You sat this on ${longDate(p.date)}.` : `Assessment: ${longDate(p.date)}`;
    if (SUBJECT_IDS.includes(p.subject)) {
      html += `<a class="btn block" href="#/subject/${p.subject}"><span><strong>${esc(name)}</strong><br><span class="small">${esc(when)}</span></span></a>`;
    } else {
      html += `<div class="card"><strong>${esc(name)}</strong><br><span class="small">${esc(when)}</span>
        <p class="small muted">Study Hub does not include ${esc(name)} content. Use your paper booklet.</p></div>`;
    }
  }
  html += `</div>`;
  main.innerHTML = html;
}
