import * as store from '../store.js';
import { getJSON, activePapers, classChoice, subjectName } from '../data.js';
import { todayISO, longDate, inDays } from '../dates.js';
import { esc, sayRow } from '../ui.js';

export async function scheduleView({ main }) {
  const [sched, papers, choice] = await Promise.all([getJSON('schedule'), activePapers(), classChoice()]);
  const today = todayISO();
  const showGrid = store.get('showGrid', false);

  let html = `<h1>Schedule</h1>`;
  const intro = `You have ${papers.length} assessments. You can type the period and the room for each one. They are saved on this tablet.`;
  html += sayRow(`<p>${esc(intro)}</p>`, intro);

  for (const p of papers) {
    const name = await subjectName(p.subject);
    const info = (sched.paper_info && sched.paper_info[p.subject]) || '';
    const saved = store.get(`paper:${p.subject}`, { period: '', room: '' });
    const status = p.date < today ? 'Done.' : p.date === today ? 'Today.' : `${inDays(today, p.date)[0].toUpperCase()}${inDays(today, p.date).slice(1)}.`;
    const spoken = `${name}. ${longDate(p.date)}. ${info} ${saved.period ? 'Period ' + saved.period + '.' : ''} ${saved.room ? 'Room ' + saved.room + '.' : ''}`;
    html += `<section class="card">
      ${sayRow(`<h2>${esc(name)}</h2><p>${esc(longDate(p.date))} <span class="tag">${esc(status)}</span></p>${info ? `<p class="muted">${esc(info)}</p>` : ''}`, spoken)}
      <div class="row">
        <div style="flex:1 1 140px"><label for="period-${p.subject}">Period</label>
          <input type="text" id="period-${p.subject}" data-subject="${p.subject}" data-field="period" value="${esc(saved.period)}" placeholder="For example P2" autocomplete="off"></div>
        <div style="flex:1 1 140px"><label for="room-${p.subject}">Room</label>
          <input type="text" id="room-${p.subject}" data-subject="${p.subject}" data-field="room" value="${esc(saved.room)}" placeholder="For example S4" autocomplete="off"></div>
      </div>
    </section>`;
  }

  html += `<section class="card">
    <h2>Full year-group timetable</h2>
    <p>This shows every class. You do not need it. Your own assessments are listed above.</p>
    <div class="row"><button type="button" class="btn" id="toggle-grid" aria-pressed="${showGrid}">${showGrid ? 'Hide full timetable' : 'Show full timetable'}</button></div>
    ${showGrid ? gridTable(sched, choice) : ''}
  </section>`;

  main.innerHTML = html;

  main.querySelectorAll('input[data-subject]').forEach(input => {
    input.addEventListener('input', () => {
      const key = `paper:${input.dataset.subject}`;
      const saved = store.get(key, { period: '', room: '' });
      saved[input.dataset.field] = input.value;
      store.set(key, saved);
    });
  });
  main.querySelector('#toggle-grid').addEventListener('click', () => {
    store.set('showGrid', !showGrid);
    scheduleView({ main });
  });
}

function gridTable(sched, choice) {
  const names = sched.subject_names;
  let t = `<p class="small muted">Your groups are highlighted.</p><div class="table-wrap"><table><thead><tr><th scope="col">Group</th>`;
  for (const d of sched.days) t += `<th scope="col">${esc(longDate(d).replace(/ (November)$/, ''))}</th>`;
  t += `</tr></thead><tbody>`;
  for (const g of sched.groups) {
    const mine = g.id === choice.core || g.id === choice.lang;
    t += `<tr><th scope="row"${mine ? ' class="mine"' : ''}>${esc(g.label)}${mine ? ' (you)' : ''}</th>`;
    for (const d of sched.days) {
      const s = g.papers[d];
      t += `<td${mine && s ? ' class="mine"' : ''}>${s ? esc(names[s] || s) : ''}</td>`;
    }
    t += `</tr>`;
  }
  return t + `</tbody></table></div>`;
}
