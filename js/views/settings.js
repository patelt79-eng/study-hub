// Settings: theme, read-aloud speed, and the "Not my class?" option.

import * as store from '../store.js';
import { getJSON, classChoice, isDefaultClass } from '../data.js';
import { supported as speechSupported, speak } from '../speech.js';
import { savedTheme, applyTheme } from '../theme.js';
import { esc } from '../ui.js';

function radios(name, options, value) {
  return `<div class="radio-row">${options.map(([v, label]) =>
    `<label><input type="radio" name="${name}" value="${v}" ${v === value ? 'checked' : ''}>${esc(label)}</label>`).join('')}</div>`;
}

export async function settingsView({ main }) {
  const [sched, choice] = await Promise.all([getJSON('schedule'), classChoice()]);
  const speed = store.get('speechSpeed', 'normal');
  const core = sched.groups.filter(g => g.kind === 'core');
  const lang = sched.groups.filter(g => g.kind === 'language');
  const isDefault = isDefaultClass(sched, choice);

  main.innerHTML = `<h1>Settings</h1>
    <fieldset><legend>Colours</legend>
      ${radios('theme', [['auto', 'Same as the tablet'], ['light', 'Light'], ['dark', 'Dark']], savedTheme())}
    </fieldset>
    ${speechSupported ? `<fieldset><legend>Read-aloud speed</legend>
      ${radios('speed', [['slow', 'Slow'], ['normal', 'Normal']], speed)}
      <div class="row"><button type="button" class="btn" id="test-voice">Test the voice</button></div>
    </fieldset>` : `<p class="muted">Read-aloud is not available in this browser.</p>`}
    <details${isDefault ? '' : ' open'}><summary>Not my class?</summary>
      <p>Only change this if the assessment dates in Schedule are wrong for you. This changes your schedule and your daily plan.</p>
      <label for="core">Core group</label>
      <select id="core">${core.map(g => `<option value="${g.id}" ${g.id === choice.core ? 'selected' : ''}>${esc(g.label)}</option>`).join('')}</select>
      <label for="lang">Language group</label>
      <select id="lang">${lang.map(g => `<option value="${g.id}" ${g.id === choice.lang ? 'selected' : ''}>${esc(g.label)}</option>`).join('')}</select>
      <div class="row">
        <button type="button" class="btn primary" id="save-class">Save</button>
        <button type="button" class="btn" id="reset-class">Back to my usual class</button>
      </div>
      <p id="class-msg" role="status">${isDefault ? '' : 'You are using a different class from the usual one.'}</p>
    </details>`;

  main.querySelectorAll('input[name="theme"]').forEach(r => r.addEventListener('change', () => applyTheme(r.value)));
  main.querySelectorAll('input[name="speed"]').forEach(r => r.addEventListener('change', () => store.set('speechSpeed', r.value)));
  const test = main.querySelector('#test-voice');
  if (test) test.addEventListener('click', () => speak('This is how the reading voice sounds.'));
  main.querySelector('#save-class').addEventListener('click', () => {
    store.set('class', { core: main.querySelector('#core').value, lang: main.querySelector('#lang').value });
    main.querySelector('#class-msg').textContent = 'Saved. Your schedule and plan now use this class.';
  });
  main.querySelector('#reset-class').addEventListener('click', () => {
    store.remove('class');
    settingsView({ main });
  });
}
