// Maths worked examples (one step per screen) and practice questions (method shown with the answer).

import { getSubject } from '../data.js';
import { esc, sayRow, plural, markSessionFromParams, doneButtons, finishedLine } from '../ui.js';

async function skill(id) {
  const s = await getSubject('maths');
  return [s, s.skills.find(k => k.id === id)];
}

function clipLine(sk) {
  return `<p><span class="tag">Mathswatch clip ${esc(sk.clip)}</span>${sk.sets12 ? ' <span class="tag">Only if your teacher has covered this</span>' : ''}</p>`;
}

export async function workedView({ main, params }, id) {
  const [s, sk] = await skill(id);
  if (!sk) { main.innerHTML = '<h1>Worked example</h1><p>This skill was not found.</p>'; return; }
  let i = -1;

  function render() {
    if (i < 0) {
      const t = `Worked example: ${sk.label}. This example has ${plural(sk.steps.length, 'step')}. It takes about 5 minutes. Each step is on its own screen. Tap Start.`;
      main.innerHTML = `<h1>Worked example: ${esc(sk.label)}</h1>${clipLine(sk)}
        ${sayRow(`<p class="lead">${esc(`This example has ${plural(sk.steps.length, 'step')}. It takes about 5 minutes. Each step is on its own screen.`)}</p>`, t)}
        <div class="card">${sayRow(`<p class="muted small">The question</p><p class="big-text">${esc(sk.example)}</p>`, sk.example_say || sk.example)}</div>
        <div class="row"><button type="button" class="btn primary" id="next">Start</button></div>`;
    } else if (i < sk.steps.length) {
      const st = sk.steps[i];
      main.innerHTML = `<h1>Worked example: ${esc(sk.label)}</h1>
        <p class="step-count">Step ${i + 1} of ${sk.steps.length}</p>
        <div class="card"><p class="muted small">The question: ${esc(sk.example)}</p>
          ${sayRow(`<p class="big-text">${esc(st.text)}</p>${st.math ? `<p class="answer-box big-text">${esc(st.math)}</p>` : ''}`, st.say || `${st.text} ${st.math || ''}`)}
        </div>
        <div class="row">
          <button type="button" class="btn" id="prev">Previous step</button>
          <button type="button" class="btn primary" id="next">${i + 1 < sk.steps.length ? 'Next step' : 'Finish'}</button>
        </div>`;
    } else {
      markSessionFromParams(params);
      main.innerHTML = `<h1>Worked example: ${esc(sk.label)}</h1>${finishedLine()}
        <div class="row"><a class="btn" href="#/subject/maths/practice/${sk.id}">Try the practice questions</a></div>
        ${doneButtons(params, 'maths', s.name)}`;
    }
    const n = main.querySelector('#next');
    if (n) n.onclick = () => { i++; render(); focusNext(); };
    const p = main.querySelector('#prev');
    if (p) p.onclick = () => { i--; render(); focusNext(); };
  }
  function focusNext() { const n = main.querySelector('#next'); if (n) n.focus(); }
  render();
}

export async function practiceView({ main, params }, id) {
  const [s, sk] = await skill(id);
  if (!sk) { main.innerHTML = '<h1>Practice</h1><p>This skill was not found.</p>'; return; }
  let i = -1;
  let shown = false;

  function render() {
    const n = sk.practice.length;
    if (i < 0) {
      const t = `There are ${plural(n, 'question')}. It takes about ${n * 2} minutes. You do not need a calculator. Work each one out on paper. Then tap Show the answer to check your method.`;
      main.innerHTML = `<h1>Practice: ${esc(sk.label)}</h1>${clipLine(sk)}
        ${sayRow(`<p class="lead">${esc(t)}</p>`, t)}
        <div class="row"><button type="button" class="btn primary" id="go">Start</button></div>`;
    } else if (i < n) {
      const q = sk.practice[i];
      let html = `<h1>Practice: ${esc(sk.label)}</h1>
        <p class="step-count">Question ${i + 1} of ${n}</p>
        <div class="card">${sayRow(`<p class="big-text">${esc(q.q)}</p>`, q.say || q.q)}</div>`;
      if (!shown) {
        html += `<p>Work it out on paper. Then tap Show the answer.</p>
          <div class="row"><button type="button" class="btn primary" id="show">Show the answer</button></div>`;
      } else {
        const methodText = q.method.join(' ');
        html += `<div class="answer-box">${sayRow(`<p class="muted small">Answer</p><p class="big-text">${esc(q.answer)}</p>`, `The answer is ${q.answer_say || q.answer}.`)}</div>
          <div class="card">${sayRow(`<p class="muted small">Method</p><ol>${q.method.map(m => `<li>${esc(m)}</li>`).join('')}</ol>`, methodText)}</div>
          <div class="row"><button type="button" class="btn primary" id="go">${i + 1 < n ? 'Next question' : 'Finish'}</button></div>`;
      }
      main.innerHTML = html;
    } else {
      markSessionFromParams(params);
      main.innerHTML = `<h1>Practice: ${esc(sk.label)}</h1>${finishedLine()}${doneButtons(params, 'maths', s.name)}`;
    }
    const go = main.querySelector('#go');
    if (go) go.onclick = () => { i++; shown = false; render(); const b = main.querySelector('#show, #go'); if (b) b.focus(); };
    const show = main.querySelector('#show');
    if (show) show.onclick = () => { shown = true; render(); main.querySelector('#go').focus(); };
  }
  render();
}
