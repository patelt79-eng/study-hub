// Boot, hash router, navigation, back button, theme and read-aloud wiring.

import { supported as speechSupported, speak, stop } from './speech.js';
import { initThemeButton } from './theme.js';
import { getSubject } from './data.js';
import { esc } from './ui.js';
import { todayView } from './views/today.js';
import { scheduleView } from './views/schedule.js';
import { subjectsView } from './views/subjects.js';
import { subjectView } from './views/subject.js';
import { flashcardsView } from './views/flashcards.js';
import { quizView } from './views/quiz.js';
import { workedView, practiceView } from './views/maths.js';
import { writingView } from './views/writing.js';
import { frenchTaskView } from './views/french.js';
import { progressView } from './views/progress.js';
import { settingsView } from './views/settings.js';
import { handleRagClick } from './views/rag.js';

const main = document.getElementById('main');
const backLink = document.getElementById('back');

if (!speechSupported) document.documentElement.classList.add('no-speech');

const ROUTES = [
  [/^#\/today$/, m => todayView],
  [/^#\/schedule$/, m => scheduleView],
  [/^#\/subjects$/, m => subjectsView],
  [/^#\/subject\/(\w+)$/, m => ctx => subjectView(ctx, m[1])],
  [/^#\/subject\/(\w+)\/flashcards\/([\w-]+)$/, m => ctx => flashcardsView(ctx, m[1], m[2])],
  [/^#\/subject\/(\w+)\/quiz\/([\w-]+)$/, m => ctx => quizView(ctx, m[1], m[2])],
  [/^#\/subject\/maths\/worked\/([\w-]+)$/, m => ctx => workedView(ctx, m[1])],
  [/^#\/subject\/maths\/practice\/([\w-]+)$/, m => ctx => practiceView(ctx, m[1])],
  [/^#\/subject\/(\w+)\/write\/([\w-]+)$/, m => ctx => writingView(ctx, m[1], m[2])],
  [/^#\/subject\/french\/task\/([\w-]+)$/, m => ctx => frenchTaskView(ctx, m[1])],
  [/^#\/progress$/, m => progressView],
  [/^#\/settings$/, m => settingsView],
];

const TOP_NAMES = { today: 'Today', schedule: 'Schedule', subjects: 'Subjects', progress: 'My Progress' };

// The back button always goes to the parent screen, so it is predictable.
async function parentOf(path, params) {
  if (params.get('session')) return ['#/today', 'Today'];
  const parts = path.replace(/^#\//, '').split('/');
  if (parts[0] === 'today') return null;
  if (parts[0] === 'settings') return ['#/progress', 'My Progress'];
  if (parts[0] === 'subject') {
    if (parts.length === 2) return ['#/subjects', 'Subjects'];
    try {
      const s = await getSubject(parts[1]);
      return [`#/subject/${parts[1]}`, s.name];
    } catch (e) {
      return ['#/subjects', 'Subjects'];
    }
  }
  return ['#/today', 'Today'];
}

function setActiveTab(path) {
  const top = path.replace(/^#\//, '').split('/')[0];
  const tab = top === 'subject' ? 'subjects' : top === 'settings' ? 'progress' : top;
  document.querySelectorAll('.tabs a').forEach(a => {
    if (a.dataset.tab === tab) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  });
  return TOP_NAMES[tab] || 'Study Hub';
}

// Each navigation gets a number, so a slower earlier screen cannot overwrite a newer one.
let routeToken = 0;

async function route() {
  stop();
  const token = ++routeToken;
  const raw = location.hash || '#/today';
  const [path, query] = raw.split('?');
  const params = new URLSearchParams(query || '');
  let view = null;
  for (const [re, make] of ROUTES) {
    const m = path.match(re);
    if (m) { view = make(m); break; }
  }
  if (!view) { location.replace('#/today'); return; }

  setActiveTab(path);
  const parent = await parentOf(path, params);
  if (token !== routeToken) return;
  if (parent) {
    backLink.hidden = false;
    backLink.href = parent[0];
    backLink.textContent = `← Back to ${parent[1]}`;
  } else {
    backLink.hidden = true;
  }

  // Views render into a detached box first, so only the newest navigation reaches the screen.
  const box = document.createElement('div');
  const ctx = { main: box, params, path };
  try {
    await view(ctx);
    if (token !== routeToken) return;
    main.replaceChildren(box);
  } catch (err) {
    if (token !== routeToken) return;
    main.innerHTML = `<h1 tabindex="-1">Something did not load</h1>
      <p>This screen could not be shown. Check the internet connection, then tap Try again.</p>
      <p class="muted small">${esc(err && err.message)}</p>
      <div class="row"><button class="btn primary" type="button" id="retry">Try again</button></div>`;
    main.querySelector('#retry').onclick = () => route();
  }
  window.scrollTo(0, 0);
  const h1 = main.querySelector('h1');
  if (h1) { h1.setAttribute('tabindex', '-1'); h1.focus({ preventScroll: true }); }
}

// Read-aloud buttons and RAG buttons work the same on every screen.
document.addEventListener('click', e => {
  const sayBtn = e.target.closest('.speak');
  if (sayBtn) {
    if (sayBtn.dataset.sayTarget) {
      const text = [...document.querySelectorAll(sayBtn.dataset.sayTarget)]
        .map(el => (el.value !== undefined ? el.value : el.textContent).trim())
        .filter(Boolean).join('. ');
      speak(text || 'There is nothing written yet.', sayBtn.dataset.lang || 'en-GB');
    } else {
      speak(sayBtn.dataset.say, sayBtn.dataset.lang || 'en-GB');
    }
    return;
  }
  const ragBtn = e.target.closest('.rag-btn');
  if (ragBtn) handleRagClick(ragBtn);
});

// Theme: the top-bar button switches between light and dark.
initThemeButton();

window.addEventListener('hashchange', route);
route();

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => { /* offline support is optional */ });
  });
}
