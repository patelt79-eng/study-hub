// One topic at a time: Learn (one card per screen) → Flashcards → Quiz → Done.

import * as store from '../store.js';
import { getSubject } from '../data.js';
import { todayISO, shortDate } from '../dates.js';
import { esc, sayRow, plural, markSessionFromParams } from '../ui.js';
import { icon } from '../meta.js';

const LETTERS = ['A', 'B', 'C', 'D'];
const STEPS = [['learn', 'Learn'], ['cards', 'Flashcards'], ['quiz', 'Quiz']];

export function topicProgress(subjectId) {
  return (store.get('topicProgress', {})[subjectId]) || {};
}

function saveProgress(subjectId, topicId, patch) {
  const all = store.get('topicProgress', {});
  all[subjectId] = all[subjectId] || {};
  all[subjectId][topicId] = { ...(all[subjectId][topicId] || {}), ...patch };
  store.set('topicProgress', all);
}

export function topicParts(s, t) {
  const cards = s.flashcards.filter(c => c.topic === t.id);
  const quiz = s.quiz.filter(q => q.topic === t.id);
  const mins = Math.max(5, Math.round(t.learn.length * 1 + cards.length * 0.5 + quiz.length * 0.7));
  return { cards, quiz, mins };
}

export function topicMeta(s, t) {
  const { cards, quiz, mins } = topicParts(s, t);
  return `${plural(t.learn.length, 'learn card')} · ${plural(cards.length, 'flashcard')} · ${plural(quiz.length, 'question')} · about ${mins} min`;
}

// French cards store fr/en; everything else has front/back.
function faces(card) {
  if (card.fr !== undefined) return [{ text: card.fr, lang: 'fr-FR' }, { text: card.en, lang: 'en-GB' }];
  return [{ text: card.front, lang: 'en-GB' }, { text: card.back, lang: 'en-GB' }];
}

export async function topicView({ main, params }, subjectId, topicId) {
  const s = await getSubject(subjectId);
  const tIndex = s.topics.findIndex(t => t.id === topicId);
  const t = s.topics[tIndex];
  if (!t) { main.innerHTML = '<h1>Topic not found</h1>'; return; }
  const { cards, quiz, mins } = topicParts(s, t);
  const steps = STEPS.filter(([k]) => k === 'learn' || (k === 'cards' && cards.length) || (k === 'quiz' && quiz.length));
  const next = s.topics[tIndex + 1];

  let step = 'intro';
  let i = 0;
  let shown = false;
  let deck = cards;
  let notYet = [];
  let qs = quiz;
  let chosen = null;
  let score = 0;
  let missed = [];
  let quizRound = 1;

  function header() {
    const current = STEPS.findIndex(([k]) => k === step);
    const pills = steps.map(([k, label], n) => {
      const idx = STEPS.findIndex(([kk]) => kk === k);
      const state = step === 'done' || (current >= 0 && idx < current) ? 'done' : idx === current ? 'now' : 'later';
      return `<li class="step-pill ${state}" ${state === 'now' ? 'aria-current="step"' : ''}>
        <span class="step-num">${state === 'done' ? icon('check') : n + 1}</span>${label}</li>`;
    }).join('');
    return `<p class="eyebrow">${esc(s.name)} · Topic ${tIndex + 1} of ${s.topics.length}</p>
      <h1>${esc(t.title)}</h1>
      <ol class="stepper" aria-label="Steps in this topic">${pills}</ol>`;
  }

  function bar(n, total, label) {
    return `<div class="mini-progress" aria-hidden="true"><span style="width:${Math.round((n / total) * 100)}%"></span></div>
      <p class="step-count">${label} ${n} of ${total}</p>`;
  }

  function render() {
    let body = '';
    if (step === 'intro') {
      const done = topicProgress(subjectId)[topicId];
      const parts = [`${plural(t.learn.length, 'learn card')}`];
      if (cards.length) parts.push(plural(cards.length, 'flashcard'));
      if (quiz.length) parts.push(plural(quiz.length, 'quiz question'));
      const text = `This topic has ${steps.length} steps: ${parts.join(', then ')}. It takes about ${mins} minutes.`;
      body = `${t.sets12 ? '<p class="note">Only do this topic if your teacher has covered it in class.</p>' : ''}
        <div class="panel">${sayRow(`<p class="lead">${esc(text)}</p>`, text)}
        ${done && done.done ? `<p class="muted">You finished this topic on ${esc(shortDate(done.done))}${done.total ? `, with ${done.score} out of ${done.total} on the quiz` : ''}. You can do it again.</p>` : ''}</div>
        <div class="actions"><button type="button" class="btn primary big" id="go">Start ${icon('arrow')}</button></div>`;
    } else if (step === 'learn') {
      const card = t.learn[i];
      const last = i === t.learn.length - 1;
      const nextLabel = last ? (cards.length ? 'Start flashcards' : quiz.length ? 'Start the quiz' : 'Finish') : 'Next';
      body = `${bar(i + 1, t.learn.length, 'Card')}
        <article class="learn-card">
          ${sayRow(`<h2>${esc(card.title)}</h2>`, `${card.title}. ${card.text}`)}
          <p class="learn-text">${esc(card.text)}</p>
        </article>
        <div class="actions">
          ${i > 0 ? '<button type="button" class="btn" id="prev">Back</button>' : ''}
          <button type="button" class="btn primary big" id="go">${nextLabel} ${icon('arrow')}</button>
        </div>`;
    } else if (step === 'cards') {
      const [front, back] = faces(deck[i]);
      body = `${bar(i + 1, deck.length, 'Flashcard')}
        <div class="flash ${shown ? 'flipped' : ''}">
          <p class="flash-label">Question</p>
          ${sayRow(`<p class="big-text" lang="${front.lang.slice(0, 2)}">${esc(front.text)}</p>`, front.text, front.lang)}
          ${shown ? `<div class="flash-back"><p class="flash-label">Answer</p>
            ${sayRow(`<p class="big-text" lang="${back.lang.slice(0, 2)}">${esc(back.text)}</p>`, back.text, back.lang)}
            ${deck[i].note ? `<p class="small">${esc(deck[i].note)}</p>` : ''}</div>` : ''}
        </div>
        <div class="actions">
          ${shown
            ? '<button type="button" class="btn" id="notyet">Not yet</button><button type="button" class="btn primary big" id="knew">I knew it</button>'
            : '<button type="button" class="btn primary big" id="show">Show the answer</button>'}
        </div>`;
    } else if (step === 'cards-end') {
      const text = notYet.length
        ? `Flashcards done. You marked ${plural(notYet.length, 'card')} as Not yet. You can look at ${notYet.length === 1 ? 'it' : 'them'} once more, or go on.`
        : 'Flashcards done. You knew all of them.';
      body = `<div class="panel">${sayRow(`<p class="lead">${esc(text)}</p>`, text)}</div>
        <div class="actions">
          ${notYet.length ? `<button type="button" class="btn" id="again">See the ${plural(notYet.length, 'card')} again</button>` : ''}
          <button type="button" class="btn primary big" id="go">${quiz.length ? 'Start the quiz' : 'Finish'} ${icon('arrow')}</button>
        </div>`;
    } else if (step === 'quiz') {
      const q = qs[i];
      const spoken = `${q.q} ${q.options.map((o, k) => `${LETTERS[k]}: ${o}.`).join(' ')}`;
      body = `${bar(i + 1, qs.length, 'Question')}
        <div class="panel">${sayRow(`<p class="big-text">${esc(q.q)}</p>`, spoken)}</div>
        <ul class="options">${q.options.map((o, k) => {
          let cls = 'option';
          if (chosen !== null && k === q.answer) cls += ' correct';
          else if (chosen !== null && k === chosen) cls += ' chosen';
          return `<li><button type="button" class="${cls}" data-k="${k}" ${chosen !== null ? 'disabled' : ''}>
            <span class="letter">${chosen !== null && k === q.answer ? icon('check') : LETTERS[k]}</span><span>${esc(o)}</span></button></li>`;
        }).join('')}</ul>`;
      if (chosen !== null) {
        const right = chosen === q.answer;
        const msg = right ? `That's right. ${q.explain}` : `The answer is ${LETTERS[q.answer]}: ${q.options[q.answer]}. ${q.explain}`;
        body += `<div class="feedback ${right ? 'good' : 'info'}" role="status">${sayRow(`<p>${esc(msg)}</p>`, msg)}</div>
          <div class="actions"><button type="button" class="btn primary big" id="go">${i + 1 < qs.length ? 'Next question' : 'Finish'} ${icon('arrow')}</button></div>`;
      }
    } else if (step === 'done') {
      const saved = topicProgress(subjectId)[topicId] || {};
      const scoreLine = saved.total ? `You got ${saved.score} out of ${saved.total} on the quiz.` : '';
      const fromPlan = params.get('session');
      const nextBtn = next ? `<a class="btn ${fromPlan ? '' : 'primary big'}" href="#/subject/${subjectId}/topic/${next.id}">Next topic: ${esc(next.title)}</a>` : '';
      body = `<div class="done-box">${sayRow(`<p class="big-text">Topic done.</p><p>${esc(scoreLine)}</p>`, `Topic done. ${scoreLine}`)}</div>
        ${missed.length && quizRound === 1 ? `<p>You can try the ${plural(missed.length, 'question')} you missed. This is optional.</p>
          <div class="actions"><button type="button" class="btn" id="retry">Try ${plural(missed.length, 'question')} again</button></div>` : ''}
        <div class="actions">
          ${fromPlan ? '<a class="btn primary big" href="#/today">Back to Today</a>' : ''}
          ${nextBtn}
          <a class="btn" href="#/subject/${subjectId}">Back to ${esc(s.name)}</a>
        </div>`;
    }
    main.innerHTML = header() + body;
    wire();
  }

  function focusMain() {
    const b = main.querySelector('#go, #show, #knew, .option:not([disabled])');
    if (b) b.focus({ preventScroll: true });
    window.scrollTo(0, 0);
  }

  function goTo(newStep) {
    step = newStep; i = 0; shown = false; chosen = null;
    if (newStep === 'cards' || newStep === 'quiz') saveProgress(subjectId, topicId, { step: newStep });
    render(); focusMain();
  }

  function afterLearn() { cards.length ? goTo('cards') : quiz.length ? goTo('quiz') : finish(); }
  function afterCards() { quiz.length ? goTo('quiz') : finish(); }

  function finish() {
    const patch = { step: 'done', done: todayISO() };
    if (quizRound === 1 && quiz.length) { patch.score = score; patch.total = qs.length; }
    saveProgress(subjectId, topicId, patch);
    markSessionFromParams(params);
    step = 'done';
    render(); focusMain();
  }

  function wire() {
    const on = (sel, fn) => { const el = main.querySelector(sel); if (el) el.onclick = fn; };
    if (step === 'intro') on('#go', () => goTo('learn'));
    if (step === 'learn') {
      on('#go', () => { if (i < t.learn.length - 1) { i++; render(); focusMain(); } else afterLearn(); });
      on('#prev', () => { i--; render(); focusMain(); });
    }
    if (step === 'cards') {
      on('#show', () => { shown = true; render(); main.querySelector('#knew').focus({ preventScroll: true }); });
      const advance = knew => {
        if (!knew) notYet.push(deck[i]);
        shown = false; i++;
        if (i < deck.length) { render(); focusMain(); } else { step = 'cards-end'; render(); focusMain(); }
      };
      on('#knew', () => advance(true));
      on('#notyet', () => advance(false));
    }
    if (step === 'cards-end') {
      on('#again', () => { deck = notYet; notYet = []; step = 'cards'; i = 0; shown = false; render(); focusMain(); });
      on('#go', afterCards);
    }
    if (step === 'quiz') {
      main.querySelectorAll('.option').forEach(b => {
        b.onclick = () => {
          chosen = Number(b.dataset.k);
          if (chosen === qs[i].answer) score++; else missed.push(qs[i]);
          render(); main.querySelector('#go').focus({ preventScroll: true });
        };
      });
      on('#go', () => { chosen = null; i++; if (i < qs.length) { render(); focusMain(); } else finish(); });
    }
    if (step === 'done') {
      on('#retry', () => { qs = missed; missed = []; score = 0; quizRound++; step = 'quiz'; i = 0; chosen = null; render(); focusMain(); });
    }
  }

  render();
}
