// Multiple-choice quiz: one question per screen, calm feedback, retry missed questions at the end.

import * as store from '../store.js';
import { getSubject } from '../data.js';
import { todayISO } from '../dates.js';
import { esc, sayRow, speakBtn, minutes, plural, markSessionFromParams, doneButtons, finishedLine } from '../ui.js';

const LETTERS = ['A', 'B', 'C', 'D'];

export async function quizView(ctx, subjectId, setId) {
  const { main, params } = ctx;
  const s = await getSubject(subjectId);
  const setInfo = s.quiz_sets.find(x => x.id === setId);
  const title = setInfo ? setInfo.title : 'Quiz';
  const all = s.quiz.filter(q => q.set === setId);

  let questions = all;
  let i = 0;
  let chosen = null;
  let score = 0;
  let missed = [];
  let round = 1;
  let saved = false;

  function intro() {
    const n = questions.length;
    const t = `There ${n === 1 ? 'is' : 'are'} ${plural(n, 'question')}. It takes about ${minutes(n, 0.6)} minutes. Each question has 4 answers. Tap the answer you think is right. Tap Start.`;
    main.innerHTML = `<h1>${esc(s.name)} quiz: ${esc(title)}</h1>
      ${sayRow(`<p class="lead">${esc(t)}</p>`, t)}
      <div class="row"><button type="button" class="btn primary" id="start">Start</button></div>`;
    main.querySelector('#start').onclick = () => { i = 0; show(); };
  }

  function show() {
    const q = questions[i];
    const lang = q.lang || 'en-GB';
    const spoken = `${q.q} ${q.options.map((o, k) => `${LETTERS[k]}: ${o}.`).join(' ')}`;
    let html = `<h1>${esc(s.name)} quiz${round > 1 ? ': missed questions' : ''}</h1>
      <p class="step-count">Question ${i + 1} of ${questions.length}</p>
      <div class="card">${sayRow(`<p class="big-text">${esc(q.q)}</p>`, spoken, q.say_lang || 'en-GB')}</div>
      <ul class="options">`;
    q.options.forEach((o, k) => {
      let cls = 'btn';
      if (chosen !== null && k === chosen) cls += ' chosen';
      if (chosen !== null && k === q.answer) cls += ' correct';
      html += `<li><button type="button" class="${cls}" data-k="${k}" ${chosen !== null ? 'disabled' : ''}>
        <span><strong>${LETTERS[k]}.</strong> <span lang="${esc(q.option_lang || lang)}">${esc(o)}</span>${chosen !== null && k === q.answer ? ' ✓' : ''}</span></button></li>`;
    });
    html += `</ul>`;
    if (chosen !== null) {
      const right = chosen === q.answer;
      const msg = right
        ? `✓ That's right. ${q.explain}`
        : `The answer is ${LETTERS[q.answer]}: ${q.options[q.answer]}. ${q.explain}`;
      html += `<div class="feedback ${right ? 'good' : 'info'}" role="status">${sayRow(`<p>${esc(msg)}</p>`, msg.replace('✓ ', ''))}</div>
        <div class="row"><button type="button" class="btn primary" id="next">${i + 1 < questions.length ? 'Next question' : 'Finish'}</button></div>`;
    }
    main.innerHTML = html;
    main.querySelectorAll('.options .btn').forEach(b => {
      b.onclick = () => {
        chosen = Number(b.dataset.k);
        if (chosen === q.answer) score++; else missed.push(q);
        show();
        main.querySelector('#next').focus();
      };
    });
    const nextBtn = main.querySelector('#next');
    if (nextBtn) nextBtn.onclick = () => {
      chosen = null;
      i++;
      if (i < questions.length) { show(); const first = main.querySelector('.options .btn'); if (first) first.focus(); }
      else end();
    };
  }

  function end() {
    if (round === 1 && !saved) {
      saved = true;
      const h = store.get('quizHistory', {});
      const key = `${subjectId}:${setId}`;
      const prev = h[key];
      h[key] = { score, total: questions.length, date: todayISO(), attempts: (prev ? prev.attempts || 1 : 0) + 1 };
      store.set('quizHistory', h);
      markSessionFromParams(params);
    }
    const summary = round === 1
      ? `You answered ${score} out of ${questions.length} correctly.`
      : `You answered ${score} out of ${questions.length} missed questions correctly this time.`;
    let html = `<h1>${esc(s.name)} quiz</h1>${finishedLine()}${sayRow(`<p>${esc(summary)}</p>`, summary)}`;
    const retry = missed;
    if (retry.length) {
      html += `<p>You can try the ${plural(retry.length, 'missed question')} again if you want to. This is optional.</p>
        <div class="row"><button type="button" class="btn" id="retry">Try ${plural(retry.length, 'question')} again</button></div>`;
    }
    html += doneButtons(params, subjectId, s.name);
    main.innerHTML = html;
    const r = main.querySelector('#retry');
    if (r) r.onclick = () => {
      questions = retry; missed = []; score = 0; i = 0; chosen = null; round++; show();
    };
  }

  if (!all.length) {
    main.innerHTML = `<h1>${esc(s.name)} quiz</h1><p>There are no questions in this set.</p>`;
    return;
  }
  intro();
}
