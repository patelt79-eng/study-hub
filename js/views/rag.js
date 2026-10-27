// Red / Amber / Green self-rating, shared by subject pages and My Progress.

import * as store from '../store.js';
import { esc } from '../ui.js';

const NAMES = { R: 'Red', A: 'Amber', G: 'Green' };

export function getRag() {
  return store.get('rag', {});
}

export function ragList(subjectId, topics) {
  const rag = getRag()[subjectId] || {};
  let html = `<ul class="rag-list">`;
  let group = null;
  for (const t of topics) {
    if (t.group && t.group !== group) {
      group = t.group;
      html += `<li class="group-heading">${esc(group)}</li>`;
    }
    const val = rag[t.id] || '';
    html += `<li class="rag-item">
      <span class="rag-label">${esc(t.label)}${t.detail ? `<span class="rag-sub">${esc(t.detail)}</span>` : ''}</span>
      <span class="rag-group" role="group" aria-label="Rating for ${esc(t.label)}">
        ${['R', 'A', 'G'].map(r => `<button type="button" class="rag-btn" data-rag="${r}" data-subject="${esc(subjectId)}" data-topic="${esc(t.id)}" aria-pressed="${val === r}">${NAMES[r]}</button>`).join('')}
      </span>
    </li>`;
  }
  return html + `</ul>`;
}

export function handleRagClick(btn) {
  const { subject, topic, rag: value } = btn.dataset;
  const rag = getRag();
  rag[subject] = rag[subject] || {};
  if (rag[subject][topic] === value) delete rag[subject][topic];
  else rag[subject][topic] = value;
  store.set('rag', rag);
  btn.closest('.rag-group').querySelectorAll('.rag-btn').forEach(b => {
    b.setAttribute('aria-pressed', String(rag[subject][topic] === b.dataset.rag));
  });
}

export function ragCounts(subjectId, topics) {
  const rag = getRag()[subjectId] || {};
  const c = { R: 0, A: 0, G: 0, none: 0, red: [] };
  for (const t of topics) {
    const v = rag[t.id];
    if (v) c[v]++; else c.none++;
    if (v === 'R') c.red.push(t.label);
  }
  return c;
}
