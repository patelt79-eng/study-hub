// My Progress: RAG ratings, quiz history, sessions done, sharing and backup.

import * as store from '../store.js';
import { allSubjects, activePapers } from '../data.js';
import { todayISO, longDate, shortDate } from '../dates.js';
import { esc, sayRow, plural } from '../ui.js';
import { ragList, ragCounts } from './rag.js';

function sessionsDone(subjectId) {
  const ticks = store.get('ticks', {});
  let n = 0;
  for (const day of Object.values(ticks)) for (const subj of Object.values(day)) if (subj === subjectId) n++;
  return n;
}

function quizLines(s) {
  const h = store.get('quizHistory', {});
  return s.quiz_sets
    .map(set => ({ set, r: h[`${s.id}:${set.id}`] }))
    .filter(x => x.r);
}

async function summaryText() {
  const [subjects, papers] = await Promise.all([allSubjects(), activePapers()]);
  const lines = ['Study Hub progress summary', `Made on ${longDate(todayISO())}`, ''];
  for (const s of subjects) {
    const p = papers.find(x => x.subject === s.id);
    const c = ragCounts(s.id, s.rag_topics);
    lines.push(`${s.name}${p ? ` (assessment ${longDate(p.date)})` : ''}`);
    lines.push(`Sessions done: ${sessionsDone(s.id)}`);
    lines.push(`Topics: Green ${c.G}, Amber ${c.A}, Red ${c.R}, not rated ${c.none}`);
    lines.push(`Topics marked Red: ${c.red.length ? c.red.join('; ') : 'none'}`);
    const q = quizLines(s);
    lines.push(`Last quiz scores: ${q.length ? q.map(x => `${x.set.title} ${x.r.score}/${x.r.total} (${shortDate(x.r.date)})`).join('; ') : 'none yet'}`);
    lines.push('');
  }
  return lines.join('\n');
}

export async function progressView({ main }) {
  const subjects = await allSubjects();
  let html = `<h1>My Progress</h1>`;
  const intro = 'This page shows your RAG ratings, your sessions and your quiz scores. You can change any rating at any time.';
  html += sayRow(`<p>${esc(intro)}</p>`, intro);
  if (!store.storageWorks()) {
    html += `<p class="note">This browser is not saving progress. Progress will be lost when the app is closed. Ask an adult to check the browser settings.</p>`;
  }

  for (const s of subjects) {
    const c = ragCounts(s.id, s.rag_topics);
    const q = quizLines(s);
    html += `<details><summary>${esc(s.name)}: Green ${c.G}, Amber ${c.A}, Red ${c.R}, not rated ${c.none}</summary>
      <p>Sessions done: ${sessionsDone(s.id)}</p>
      <h3>Quiz scores</h3>
      ${q.length ? `<ul>${q.map(x => `<li>${esc(x.set.title)}: ${x.r.score} out of ${x.r.total} on ${esc(shortDate(x.r.date))}</li>`).join('')}</ul>` : '<p>No quizzes yet.</p>'}
      <h3>My RAG check</h3>
      ${ragList(s.id, s.rag_topics)}
    </details>`;
  }

  html += `<section class="card"><h2>Share my progress</h2>
      ${sayRow('<p>This makes a short summary you can send or print. It does not include anything you wrote.</p>', 'This makes a short summary you can send or print. It does not include anything you wrote.')}
      <div class="row"><button type="button" class="btn primary" id="share">Share my progress</button></div>
      <div id="share-out"></div>
    </section>
    <section class="card"><h2>Backup</h2>
      <p>A backup file keeps your progress safe if the browser is cleared.</p>
      <div class="row">
        <button type="button" class="btn" id="export">Save a backup file</button>
        <label class="btn" for="import" style="margin:0">Load a backup file</label>
        <input type="file" id="import" accept="application/json,.json" style="position:absolute;left:-9999px">
      </div>
      <div id="backup-msg" role="status"></div>
    </section>
    <p><a class="btn" href="#/settings">Settings</a></p>`;

  main.innerHTML = html;

  main.querySelector('#share').addEventListener('click', async () => {
    const text = await summaryText();
    const out = main.querySelector('#share-out');
    out.innerHTML = `<pre class="summary">${esc(text)}</pre>
      <div class="row"><button type="button" class="btn" id="copy">Copy</button><button type="button" class="btn" id="print">Print</button></div>
      <p id="copy-msg" role="status"></p>`;
    out.querySelector('#copy').onclick = async () => {
      const msg = out.querySelector('#copy-msg');
      try { await navigator.clipboard.writeText(text); msg.textContent = 'Copied.'; }
      catch (e) { msg.textContent = 'Copy did not work. You can select the text above and copy it.'; }
    };
    out.querySelector('#print').onclick = () => printText(text);
    if (navigator.share) {
      try { await navigator.share({ title: 'Study Hub progress', text }); } catch (e) { /* cancelled */ }
    }
  });

  main.querySelector('#export').addEventListener('click', () => {
    const payload = { app: 'study-hub', version: 1, exported: new Date().toISOString(), data: store.allData() };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `study-hub-backup-${todayISO()}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    main.querySelector('#backup-msg').innerHTML = '<p>The backup file has been saved to Downloads (or Files on a tablet).</p>';
  });

  main.querySelector('#import').addEventListener('change', async e => {
    const file = e.target.files && e.target.files[0];
    const msg = main.querySelector('#backup-msg');
    if (!file) return;
    let payload;
    try {
      payload = JSON.parse(await file.text());
      if (!payload || payload.app !== 'study-hub' || typeof payload.data !== 'object') throw new Error('bad');
    } catch (err) {
      msg.innerHTML = '<p class="note">This file is not a Study Hub backup. Nothing has changed.</p>';
      return;
    }
    msg.innerHTML = `<p class="note">This will replace the progress on this tablet with the backup from ${esc(String(payload.exported || '').slice(0, 10))}. Tap Replace to continue.</p>
      <div class="row"><button type="button" class="btn primary" id="confirm-import">Replace</button><button type="button" class="btn" id="cancel-import">Cancel</button></div>`;
    msg.querySelector('#confirm-import').onclick = () => {
      store.replaceAll(payload.data);
      progressView({ main }).then(() => {
        main.querySelector('#backup-msg').innerHTML = '<p>Your progress has been loaded from the backup.</p>';
      });
    };
    msg.querySelector('#cancel-import').onclick = () => { msg.innerHTML = '<p>Nothing has changed.</p>'; e.target.value = ''; };
  });
}

function printText(text) {
  const w = window.open('', '_blank');
  if (!w) { window.print(); return; }
  w.document.write(`<!doctype html><title>Study Hub progress</title><pre style="font:16px/1.5 sans-serif;white-space:pre-wrap">${esc(text)}</pre>`);
  w.document.close();
  w.focus();
  w.print();
}
