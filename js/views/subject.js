// A subject page. Every subject uses the same seven sections in the same order.

import * as store from '../store.js';
import { getSubject, activePapers } from '../data.js';
import { longDate, shortDate } from '../dates.js';
import { esc, sayRow, speakBtn, minutes, plural } from '../ui.js';
import { todayPlan, sessionHref } from './today.js';
import { ragList } from './rag.js';
import { cardsInSet } from './flashcards.js';

export async function subjectView({ main }, id) {
  const [s, papers, tp] = await Promise.all([getSubject(id), activePapers(), todayPlan()]);
  const paper = papers.find(p => p.subject === id);

  let html = `<h1>${esc(s.name)}</h1>`;
  const dateLine = paper ? `Assessment: ${longDate(paper.date)}.` : '';
  const intro = `${dateLine} This page has 7 parts. They are in the same order for every subject.`;
  html += sayRow(`<p class="lead">${esc(intro)}</p>`, intro);

  // 1. What's on the test
  let scopeSpeech = `What's on the test. ${s.paper_note || ''} `;
  let scopeHtml = s.paper_note ? `<p>${esc(s.paper_note)}</p>` : '';
  for (const block of s.scope) {
    if (block.heading) scopeHtml += `<h3>${esc(block.heading)}</h3>`;
    scopeHtml += `<ul>${block.items.map(i => `<li>${esc(i)}</li>`).join('')}</ul>`;
    scopeSpeech += `${block.heading || ''}. ${block.items.join('. ')}. `;
  }
  html += section(1, "What's on the test", `${sayRow('', scopeSpeech)}${scopeHtml}`);

  // 2. Today's task
  const mine = tp.plan.sessions.filter(x => x.subject === id);
  let taskHtml;
  if (mine.length) {
    const ticks = (store.get('ticks', {})[tp.today]) || {};
    taskHtml = mine.map(x => {
      const idx = tp.plan.sessions.indexOf(x);
      const done = ticks[idx];
      return `<a class="btn block${done ? '' : ' primary'}" href="${esc(sessionHref(x))}">${done ? '✓ ' : ''}${esc(x.label)}, about ${x.minutes} min</a>`;
    }).join('');
  } else {
    const t = 'There is no task for this subject today. You can still use the parts below if you want to.';
    taskHtml = sayRow(`<p>${esc(t)}</p>`, t);
  }
  html += section(2, "Today's task", taskHtml);

  // 3. Flashcards
  let fcHtml = '';
  for (const set of s.flashcard_sets) {
    const n = cardsInSet(s, set.id).length;
    const len = `${plural(n, 'card')}, about ${minutes(n, 0.5)} minutes`;
    if (s.two_way) {
      fcHtml += `<p class="group-heading">${esc(set.title)} <span class="muted small">(${esc(len)} each way)</span></p>
        <div class="row">
          <a class="btn" href="#/subject/${id}/flashcards/${set.id}?dir=fr-en">French to English</a>
          <a class="btn" href="#/subject/${id}/flashcards/${set.id}?dir=en-fr">English to French</a>
        </div>`;
    } else {
      fcHtml += `<a class="btn block" href="#/subject/${id}/flashcards/${set.id}${set.dir ? '?dir=' + set.dir : ''}">${esc(set.title)}: ${esc(len)}</a>`;
    }
  }
  html += section(3, 'Flashcards', `<div class="stack">${fcHtml}</div>`);

  // 4. Quiz
  const history = store.get('quizHistory', {});
  let qHtml = '';
  for (const set of s.quiz_sets) {
    const n = s.quiz.filter(q => q.set === set.id).length;
    const h = history[`${id}:${set.id}`];
    const last = h ? `<br><span class="small">Last time: ${h.score} out of ${h.total} on ${esc(shortDate(h.date))}.</span>` : '';
    qHtml += `<a class="btn block" href="#/subject/${id}/quiz/${set.id}"><span>${esc(set.title)}: ${plural(n, 'question')}, about ${minutes(n, 0.6)} minutes${last}</span></a>`;
  }
  html += section(4, 'Quiz', `<div class="stack">${qHtml}</div>`);

  // 5. Practise
  html += section(5, s.practise_heading || 'Practise writing', practiseHtml(s));

  // 6. School resources
  let rHtml = '<ul>';
  for (const r of s.resources) {
    rHtml += `<li>${r.url ? `<a href="${esc(r.url)}" target="_blank" rel="noopener noreferrer">${esc(r.label)}</a>` : `<strong>${esc(r.label)}</strong>`}${r.note ? `. ${esc(r.note)}` : ''}</li>`;
  }
  rHtml += '</ul><p class="small muted">Links open in a new tab. Come back to Study Hub when you finish.</p>';
  html += section(6, 'School resources', rHtml);

  // 7. RAG
  const ragIntro = 'Tap Red, Amber or Green for each topic. Red means I need a lot more practice. Amber means I am nearly there. Green means I feel confident. You can change it at any time.';
  html += section(7, 'My RAG check', sayRow(`<p>${esc(ragIntro)}</p>`, ragIntro) + ragList(id, s.rag_topics));

  main.innerHTML = html;
}

function section(n, title, body) {
  return `<section class="card" aria-labelledby="sec-${n}"><h2 id="sec-${n}"><span class="section-num">${n}.</span>${esc(title)}</h2>${body}</section>`;
}

function practiseHtml(s) {
  const id = s.id;
  if (s.skills) {
    let h = `<p>Each skill has a worked example and practice questions. You do not need a calculator.</p>`;
    let shownSets = false;
    for (const sk of s.skills) {
      if (sk.sets12 && !shownSets) {
        shownSets = true;
        h += `<h3>Only if your teacher has covered this</h3><p class="small">These topics are for sets 1 and 2. Skip them if you have not learned them in class.</p>`;
      }
      h += `<div class="para"><p><strong>${esc(sk.label)}</strong> <span class="tag">Mathswatch clip ${esc(sk.clip)}</span></p>
        <div class="row">
          <a class="btn" href="#/subject/maths/worked/${sk.id}">Worked example (${plural(sk.steps.length, 'step')})</a>
          <a class="btn" href="#/subject/maths/practice/${sk.id}">Practice (${plural(sk.practice.length, 'question')})</a>
        </div></div>`;
    }
    return h;
  }
  if (s.french_tasks) {
    return `<p>These are the tasks from pages 15 and 16 of your booklet.</p><div class="stack">${s.french_tasks.map(t =>
      `<a class="btn block" href="${esc(t.route)}">${esc(t.title)}</a>`).join('')}</div>`;
  }
  if (s.writing && s.writing.length) {
    let h = `<p>${esc(s.writing_intro || '')}</p><div class="stack">`;
    for (const w of s.writing) {
      h += `<a class="btn block" href="#/subject/${id}/write/${w.id}"><span>${esc(w.title)}<br><span class="small">${plural(w.paragraphs, w.type + ' paragraph')}</span></span></a>`;
    }
    h += `</div>`;
    if (s.booklet_tasks) {
      h += `<h3>${esc(s.booklet_tasks.title)}</h3>${sayRow(`<ul>${s.booklet_tasks.items.map(i => `<li>${esc(i)}</li>`).join('')}</ul>`, s.booklet_tasks.items.join('. '))}`;
    }
    return h;
  }
  if (s.bigger_picture) {
    const bp = s.bigger_picture;
    let h = `<h3>Bigger picture (optional)</h3>${sayRow(`<p>${esc(bp.intro)}</p>`, bp.intro)}`;
    bp.questions.forEach((q, n) => {
      h += `<div class="para">${sayRow(`<p><strong>${n + 1}.</strong> ${esc(q.q)}</p>`, q.q)}
        <details><summary>Show an example answer</summary>${sayRow(`<p>${esc(q.a)}</p>`, q.a)}</details></div>`;
    });
    return h;
  }
  const t = 'This subject does not have a writing part. Use the flashcards and the quiz.';
  return sayRow(`<p>${esc(t)}</p>`, t);
}
