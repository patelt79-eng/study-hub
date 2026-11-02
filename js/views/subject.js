// A subject page: what to do next, the list of topics, and extras folded away.
// Every subject uses the same layout.

import * as store from '../store.js';
import { getSubject, activePapers } from '../data.js';
import { longDate, inDays, todayISO } from '../dates.js';
import { esc, sayRow, plural } from '../ui.js';
import { icon } from '../meta.js';
import { todayPlan, sessionHref } from './today.js';
import { ragList } from './rag.js';
import { topicProgress, topicMeta } from './topic.js';

export async function subjectView({ main }, id) {
  const [s, papers, tp] = await Promise.all([getSubject(id), activePapers(), todayPlan()]);
  const paper = papers.find(p => p.subject === id);
  const prog = topicProgress(id);
  const doneCount = s.topics.filter(t => prog[t.id] && prog[t.id].done).length;
  const today = todayISO();

  // Hero
  const when = paper ? (paper.date < today ? `Assessment done on ${longDate(paper.date)}` : `Assessment: ${longDate(paper.date)} (${inDays(today, paper.date)})`) : '';
  let html = `<section class="hero">
      <div class="hero-icon">${icon(id)}</div>
      <div class="hero-text">
        <h1>${esc(s.name)}</h1>
        <p>${esc(when)}</p>
        <div class="progress-row">
          <div class="progress" aria-hidden="true"><span style="width:${Math.round((doneCount / s.topics.length) * 100)}%"></span></div>
          <span class="progress-label">${doneCount} of ${s.topics.length} topics done</span>
        </div>
      </div>
    </section>`;

  // Next up: today's session for this subject, or else the first unfinished topic.
  const session = tp.plan.sessions.find(x => x.subject === id);
  const ticks = (store.get('ticks', {})[tp.today]) || {};
  const sessionDone = session && ticks[tp.plan.sessions.indexOf(session)];
  const nextTopic = s.topics.find(t => !(prog[t.id] && prog[t.id].done) && !t.sets12);
  if (session && !sessionDone) {
    html += `<section class="next-up">
        <p class="eyebrow">Today's task</p>
        <h2>${esc(session.label)}</h2>
        <p class="muted">About ${session.minutes} minutes</p>
        <a class="btn primary big" href="${esc(sessionHref(session))}">Start ${icon('arrow')}</a>
      </section>`;
  } else if (nextTopic) {
    const n = s.topics.indexOf(nextTopic) + 1;
    const started = prog[nextTopic.id] && prog[nextTopic.id].step;
    html += `<section class="next-up">
        <p class="eyebrow">${session ? "Today's task is done. " : ''}Next up: topic ${n}</p>
        <h2>${esc(nextTopic.title)}</h2>
        <p class="muted">${esc(topicMeta(s, nextTopic))}</p>
        <a class="btn primary big" href="#/subject/${id}/topic/${nextTopic.id}">${started ? 'Carry on' : 'Start'} ${icon('arrow')}</a>
      </section>`;
  } else {
    const t = 'You have done every topic. Pick any topic below to go over it again.';
    html += `<section class="next-up">${sayRow(`<h2>All topics done</h2><p>${esc(t)}</p>`, t)}</section>`;
  }

  // Topics
  html += `<section class="card"><h2>Topics</h2>
    <p class="muted small">Each topic has three steps: learn, flashcards, then a short quiz.</p>
    <ol class="topic-list">`;
  s.topics.forEach((t, n) => {
    const p = prog[t.id] || {};
    const state = p.done ? 'done' : p.step ? 'started' : '';
    const extra = p.done ? (p.total ? `Done · quiz ${p.score}/${p.total}` : 'Done') : p.step ? 'Started' : topicMeta(s, t);
    html += `<li class="topic ${state}">
      <a href="#/subject/${id}/topic/${t.id}">
        <span class="topic-num">${p.done ? icon('check') : n + 1}</span>
        <span class="topic-text"><strong>${esc(t.title)}</strong>${t.sets12 ? '<span class="tag">Only if covered</span>' : ''}<span class="small muted">${esc(extra)}</span></span>
      </a></li>`;
  });
  html += `</ol></section>`;

  // Extras, folded away in the same order on every subject.
  html += `<h2 class="more-heading">More for ${esc(s.name)}</h2>`;
  let scope = s.paper_note ? `<p>${esc(s.paper_note)}</p>` : '';
  let scopeSpeech = `${s.paper_note || ''} `;
  for (const block of s.scope) {
    if (block.heading) scope += `<h3>${esc(block.heading)}</h3>`;
    scope += `<ul>${block.items.map(i => `<li>${esc(i)}</li>`).join('')}</ul>`;
    scopeSpeech += `${block.heading || ''}. ${block.items.join('. ')}. `;
  }
  html += fold("What's on the test", sayRow('', scopeSpeech) + scope);
  html += fold(s.practise_heading || 'Writing practice', practiseHtml(s));
  let res = '<ul>';
  for (const r of s.resources) {
    res += `<li>${r.url ? `<a href="${esc(r.url)}" target="_blank" rel="noopener noreferrer">${esc(r.label)}</a>` : `<strong>${esc(r.label)}</strong>`}${r.note ? `. ${esc(r.note)}` : ''}</li>`;
  }
  res += '</ul><p class="small muted">Links open in a new tab.</p>';
  html += fold('School links', res);
  const ragIntro = 'Tap Red, Amber or Green for each topic. Red means I need lots more practice. Amber means nearly there. Green means confident.';
  html += fold('My RAG check', sayRow(`<p>${esc(ragIntro)}</p>`, ragIntro) + ragList(id, s.rag_topics));

  main.innerHTML = html;
}

function fold(title, body) {
  return `<details class="fold"><summary>${esc(title)}</summary><div class="fold-body">${body}</div></details>`;
}

function practiseHtml(s) {
  const id = s.id;
  if (s.skills) {
    let h = '<p>Each skill has a worked example, one step at a time, and practice questions. No calculator.</p>';
    let shownSets = false;
    for (const sk of s.skills) {
      if (sk.sets12 && !shownSets) {
        shownSets = true;
        h += '<h3>Only if your teacher has covered this</h3>';
      }
      h += `<div class="skill-row"><p><strong>${esc(sk.label)}</strong> <span class="tag">Mathswatch ${esc(sk.clip)}</span></p>
        <div class="row">
          <a class="btn small-btn" href="#/subject/maths/worked/${sk.id}">Worked example</a>
          <a class="btn small-btn" href="#/subject/maths/practice/${sk.id}">${plural(sk.practice.length, 'practice question')}</a>
        </div></div>`;
    }
    return h;
  }
  if (s.french_tasks) {
    return `<p>The tasks from pages 15 and 16 of your booklet.</p><div class="stack">${s.french_tasks.map(t =>
      `<a class="btn block" href="${esc(t.route)}">${esc(t.title)}</a>`).join('')}</div>`;
  }
  if (s.writing && s.writing.length) {
    let h = `<p>${esc(s.writing_intro || '')}</p><div class="stack">`;
    for (const w of s.writing) {
      h += `<a class="btn block" href="#/subject/${id}/write/${w.id}"><span>${esc(w.title)}<br><span class="small">${plural(w.paragraphs, w.type + ' paragraph')}</span></span></a>`;
    }
    h += '</div>';
    if (s.booklet_tasks) {
      h += `<h3>${esc(s.booklet_tasks.title)}</h3>${sayRow(`<ul>${s.booklet_tasks.items.map(i => `<li>${esc(i)}</li>`).join('')}</ul>`, s.booklet_tasks.items.join('. '))}`;
    }
    return h;
  }
  if (s.bigger_picture) {
    const bp = s.bigger_picture;
    let h = sayRow(`<p>${esc(bp.intro)}</p>`, bp.intro);
    bp.questions.forEach((q, n) => {
      h += `<div class="skill-row">${sayRow(`<p><strong>${n + 1}.</strong> ${esc(q.q)}</p>`, q.q)}
        <details><summary>Show an example answer</summary>${sayRow(`<p>${esc(q.a)}</p>`, q.a)}</details></div>`;
    });
    return h;
  }
  const t = 'This subject has no writing task. The topics above cover everything.';
  return sayRow(`<p>${esc(t)}</p>`, t);
}
