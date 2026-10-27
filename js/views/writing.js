// PEE / PEA paragraph builder. Answers are saved on this tablet as he types.

import * as store from '../store.js';
import { getSubject } from '../data.js';
import { esc, sayRow, speakTargetBtn, markSessionFromParams, doneButtons, finishedLine } from '../ui.js';

const PARTS = {
  PEE: [['P', 'Point'], ['E', 'Evidence'], ['X', 'Explain']],
  PEA: [['P', 'Point'], ['E', 'Evidence'], ['X', 'Analysis']],
};

export async function writingView({ main, params }, subjectId, taskId) {
  const s = await getSubject(subjectId);
  const w = s.writing.find(x => x.id === taskId);
  if (!w) { main.innerHTML = '<h1>Writing</h1><p>This task was not found.</p>'; return; }
  const key = `write:${subjectId}:${taskId}`;
  const saved = store.get(key, { paras: [] });
  const parts = PARTS[w.type] || PARTS.PEE;
  const guide = s.writing_guide || {};

  const intro = `${w.question} Write ${w.paragraphs} ${w.type} ${w.paragraphs === 1 ? 'paragraph' : 'paragraphs'}. Each paragraph has 3 boxes: ${parts.map(p => p[1]).join(', ')}. Tap a sentence starter to add it to a box. Your writing is saved on this tablet as you type. It takes about 20 minutes.`;
  let html = `<h1>${esc(w.title)}</h1>
    <div class="card">${sayRow(`<p class="big-text">${esc(w.question)}</p>`, w.question)}</div>
    ${sayRow(`<p>${esc(intro.replace(w.question + ' ', ''))}</p>`, intro)}`;

  if (w.hints && w.hints.length) {
    html += `<details><summary>Ideas to help you (optional)</summary>
      ${sayRow(`<ul>${w.hints.map(h => `<li>${esc(h)}</li>`).join('')}</ul>`, w.hints.join('. '))}</details>`;
  }

  for (let p = 0; p < w.paragraphs; p++) {
    const para = saved.paras[p] || {};
    html += `<div class="para"><h2>Paragraph ${p + 1}</h2>`;
    for (const [code, name] of parts) {
      const id = `w-${p}-${code}`;
      const what = (guide[w.type] && guide[w.type][code]) || '';
      const starters = (w.starters && w.starters[code]) || [];
      html += `<label for="${id}">${esc(name)}</label>
        ${what ? sayRow(`<p class="small muted">${esc(what)}</p>`, `${name}. ${what}`) : ''}
        ${starters.length ? `<div class="starters" aria-label="Sentence starters for ${esc(name)}">${starters.map(st =>
          `<button type="button" class="chip" data-target="${id}" data-text="${esc(st)}">${esc(st)}</button>`).join('')}</div>` : ''}
        <textarea id="${id}" data-p="${p}" data-code="${code}" class="w-box w-box-${p}" spellcheck="true">${esc(para[code] || '')}</textarea>`;
    }
    html += `<div class="row">${speakTargetBtn(`.w-box-${p}`, `Read paragraph ${p + 1} to me`)}</div></div>`;
  }

  html += `<p class="saved" id="saved" role="status">${saved.updated ? 'Saved on this tablet.' : ''}</p>
    <div class="row"><button type="button" class="btn primary" id="finish">I have finished</button></div>`;
  main.innerHTML = html;

  const savedLine = main.querySelector('#saved');
  function save() {
    const data = { paras: [], updated: new Date().toISOString() };
    main.querySelectorAll('.w-box').forEach(t => {
      const p = Number(t.dataset.p);
      data.paras[p] = data.paras[p] || {};
      data.paras[p][t.dataset.code] = t.value;
    });
    store.set(key, data);
    savedLine.textContent = 'Saved on this tablet.';
  }
  main.querySelectorAll('.w-box').forEach(t => t.addEventListener('input', save));
  main.querySelectorAll('.chip').forEach(c => c.addEventListener('click', () => {
    const t = main.querySelector('#' + c.dataset.target);
    const text = c.dataset.text;
    t.value = t.value.trim() ? `${t.value.replace(/\s+$/, '')} ${text}` : text;
    save();
    t.focus();
    t.setSelectionRange(t.value.length, t.value.length);
  }));
  main.querySelector('#finish').addEventListener('click', () => {
    save();
    markSessionFromParams(params);
    main.innerHTML = `<h1>${esc(w.title)}</h1>${finishedLine()}
      <p>Your writing is saved. You can open this task again to read it or change it.</p>
      ${doneButtons(params, subjectId, s.name)}`;
  });
}
