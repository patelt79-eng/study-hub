// French booklet tasks from page 16: reading, sentence building and translations.

import * as store from '../store.js';
import { getSubject } from '../data.js';
import { esc, sayRow, speakBtn, markSessionFromParams, doneButtons, finishedLine } from '../ui.js';

export async function frenchTaskView({ main, params }, taskId) {
  const s = await getSubject('french');
  const task = s.tasks[taskId];
  if (!task) { main.innerHTML = '<h1>French task</h1><p>This task was not found.</p>'; return; }

  let html = `<h1>${esc(task.title)}</h1>${sayRow(`<p class="lead">${esc(task.intro)}</p>`, task.intro)}`;

  if (taskId === 'reading') {
    html += `<div class="card">
        ${sayRow(`<p lang="fr">${esc(task.text)}</p><p><em>${esc(task.signed)}</em></p>`, task.text, 'fr-FR')}
        <p class="note small">${esc(task.correction_note)}</p>
      </div>`;
    html += revealList(task.questions);
  } else if (taskId === 'translations') {
    html += revealList(task.items, 'fr-FR');
  } else if (taskId === 'sentences') {
    const saved = store.get('french:sentences', {});
    task.starters.forEach((st, n) => {
      const pick = saved[`pick${n}`];
      html += `<div class="para"><h2>${n + 1}. ${esc(st.fr)}</h2>
        ${sayRow(`<p class="small muted">${esc(st.en)}${st.note ? '. ' + esc(st.note) : ''}</p>`, `${st.en}. ${st.note || ''}`)}
        <p>Tap an ending to build a sentence:</p>
        <div class="starters">${task.endings.map((e, k) =>
          `<button type="button" class="chip" data-n="${n}" data-k="${k}" aria-pressed="${pick === k}" lang="fr">${esc(e.fr)}</button>`).join('')}</div>`;
      if (pick !== undefined && task.endings[pick]) {
        const e = task.endings[pick];
        const fr = `${st.fr}, ${e.fr}.`;
        html += `<div class="answer-box">${sayRow(`<p class="big-text" lang="fr">${esc(fr)}</p><p>${esc(`${st.en}, ${e.en}.`)}</p>`, fr, 'fr-FR')}</div>`;
      }
      html += `<label for="own-${n}">Or write your own sentence</label>
        <textarea id="own-${n}" data-n="${n}" class="own" lang="fr">${esc(saved[`own${n}`] || '')}</textarea></div>`;
    });
  }

  html += `<div class="row"><button type="button" class="btn primary" id="finish">I have finished</button></div>`;
  main.innerHTML = html;

  main.querySelectorAll('.reveal').forEach(b => b.addEventListener('click', () => {
    const box = main.querySelector('#' + b.dataset.target);
    box.hidden = !box.hidden;
    b.textContent = box.hidden ? 'Show the answer' : 'Hide the answer';
    b.setAttribute('aria-expanded', String(!box.hidden));
  }));
  main.querySelectorAll('.chip[data-n]').forEach(c => c.addEventListener('click', () => {
    const saved = store.get('french:sentences', {});
    saved[`pick${c.dataset.n}`] = Number(c.dataset.k);
    store.set('french:sentences', saved);
    const y = window.scrollY;
    frenchTaskView({ main, params }, taskId).then(() => {
      window.scrollTo(0, y);
      const again = main.querySelector(`.chip[data-n="${c.dataset.n}"][data-k="${c.dataset.k}"]`);
      if (again) again.focus({ preventScroll: true });
    });
  }));
  main.querySelectorAll('textarea.own').forEach(t => t.addEventListener('input', () => {
    const saved = store.get('french:sentences', {});
    saved[`own${t.dataset.n}`] = t.value;
    store.set('french:sentences', saved);
  }));
  main.querySelector('#finish').addEventListener('click', () => {
    markSessionFromParams(params);
    main.innerHTML = `<h1>${esc(task.title)}</h1>${finishedLine()}${doneButtons(params, 'french', s.name)}`;
  });
}

function revealList(items, promptLang = 'en-GB') {
  return `<ol class="stack" style="list-style:none;padding:0">${items.map((it, k) => `
    <li class="card">
      ${sayRow(`<p class="small muted">${k + 1} of ${items.length}</p><p class="big-text"${promptLang === 'fr-FR' ? ' lang="fr"' : ''}>${esc(it.q)}</p>`, it.q, promptLang)}
      ${it.note ? `<p class="note small">${esc(it.note)}</p>` : ''}
      <div class="row"><button type="button" class="btn reveal" data-target="ans-${k}" aria-expanded="false">Show the answer</button></div>
      <div id="ans-${k}" class="answer-box" hidden>${sayRow(`<p>${esc(it.a)}</p>`, it.a)}</div>
    </li>`).join('')}</ol>`;
}
