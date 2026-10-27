// Small shared helpers for building screens.

import * as store from './store.js';

export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
));

const SPEAKER = '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9h4l5-4v14l-5-4H4z"/><path d="M16.5 8.5a5 5 0 0 1 0 7"/><path d="M19 6a8.5 8.5 0 0 1 0 12"/></svg>';

// A "Listen" button that reads the given text aloud.
export function speakBtn(text, lang = 'en-GB', label = 'Listen') {
  return `<button type="button" class="speak" data-say="${esc(text)}" data-lang="${esc(lang)}" aria-label="${esc(label)} (read aloud)">${SPEAKER}<span>${esc(label)}</span></button>`;
}

// A "Listen" button that reads whatever is typed in the given boxes.
export function speakTargetBtn(selector, label = 'Read my writing') {
  return `<button type="button" class="speak" data-say-target="${esc(selector)}" data-lang="en-GB">${SPEAKER}<span>${esc(label)}</span></button>`;
}

// Text with a Listen button beside it.
export function sayRow(html, text, lang = 'en-GB') {
  return `<div class="say-row"><div>${html}</div>${speakBtn(text, lang)}</div>`;
}

export function minutes(n, perItem) {
  return Math.max(5, Math.round(n * perItem));
}

export function plural(n, word, many = word + 's') {
  return `${n} ${n === 1 ? word : many}`;
}

// Marks a plan session as done when an activity was started from Today.
export function markSessionFromParams(params) {
  const s = params.get('session');
  if (!s) return false;
  const [date, idx, subject] = s.split('.');
  const ticks = store.get('ticks', {});
  ticks[date] = ticks[date] || {};
  ticks[date][idx] = subject;
  store.set('ticks', ticks);
  return true;
}

// The buttons shown on every "Done" screen.
export function doneButtons(params, subjectId, subjectName) {
  const fromPlan = params.get('session');
  const primary = fromPlan
    ? `<a class="btn primary" href="#/today">Back to Today</a>`
    : `<a class="btn primary" href="#/subject/${esc(subjectId)}">Back to ${esc(subjectName)}</a>`;
  return `<div class="row">${primary}</div>`;
}

export function finishedLine() {
  return `<div class="done-box">${sayRow('<p class="big-text">Done. That\'s this session finished.</p>', "Done. That's this session finished.")}</div>`;
}

export function withSession(href, params) {
  const s = params && params.get('session');
  if (!s) return href;
  return href + (href.includes('?') ? '&' : '?') + 'session=' + encodeURIComponent(s);
}
