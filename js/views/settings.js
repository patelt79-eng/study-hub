// Settings: theme, read-aloud speed and voice, and the "Not my class?" option.

import * as store from '../store.js';
import { getJSON, classChoice, isDefaultClass } from '../data.js';
import { supported as speechSupported, speak, voicesFor, quality, QUALITY_LABEL, savedVoiceKey, onVoicesChanged, isRobotic, displayName } from '../speech.js';
import { savedTheme, applyTheme } from '../theme.js';
import { esc } from '../ui.js';

const SAMPLE = {
  en: 'Hello. This is how I will read your flashcards and questions.',
  fr: "Bonjour. J'aime regarder les dessins animés le soir.",
};

const LANG_NAMES = { 'en-gb': 'English (UK)', 'en-us': 'English (US)', 'en-au': 'English (Australia)', 'en-ie': 'English (Ireland)', 'en-in': 'English (India)', 'en-za': 'English (South Africa)', 'fr-fr': 'French (France)', 'fr-ca': 'French (Canada)', 'fr-be': 'French (Belgium)', 'fr-ch': 'French (Switzerland)' };

function voiceRow(base, v, saved) {
  const uri = v ? v.voiceURI : '';
  const checked = (saved || '') === uri;
  const lang = v ? (v.lang || '').replace('_', '-').toLowerCase() : '';
  const name = v ? displayName(v) : 'Automatic';
  const kind = v && isRobotic(v) ? 'Robotic' : v ? QUALITY_LABEL[quality(v)] : '';
  const detail = v ? `${kind} · ${LANG_NAMES[lang] || v.lang}` : 'The best voice on this device';
  return `<li class="voice-row${quality(v || {}) ? ' good' : ''}">
    <label><input type="radio" name="voice-${base}" value="${esc(uri)}" data-voice-base="${base}" ${checked ? 'checked' : ''}>
      <span><strong>${esc(name)}</strong><span class="small muted">${esc(detail)}</span></span></label>
    <button type="button" class="btn small-btn voice-try" data-voice-base="${base}" data-voice="${esc(uri)}">Listen</button>
  </li>`;
}

// The main dialect first (UK English, France French), other accents folded away.
function voiceList(base) {
  const all = voicesFor(base);
  const saved = store.get(savedVoiceKey(base), null);
  const main = base === 'fr' ? 'fr-fr' : 'en-gb';
  const isMain = v => (v.lang || '').replace('_', '-').toLowerCase() === main && !isRobotic(v);
  const first = all.filter(isMain);
  const others = all.filter(v => !isMain(v));
  if (!all.length) return '<p class="muted">No voices found yet. If this stays empty, read-aloud may not work on this device.</p>';
  const savedIsOther = saved && others.some(v => v.voiceURI === saved);
  return `<ul class="voice-list">${voiceRow(base, null, saved)}${first.map(v => voiceRow(base, v, saved)).join('')}</ul>
    ${others.length ? `<details class="voice-more"${savedIsOther ? ' open' : ''}><summary>Other accents and robotic voices (${others.length})</summary>
      <ul class="voice-list">${others.map(v => voiceRow(base, v, saved)).join('')}</ul></details>` : ''}`;
}

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
    </fieldset>
    <fieldset><legend>Reading voice</legend>
      <p>Tap Listen to hear a voice. Tap the circle to choose it.</p>
      <div id="voices-en"></div>
      <h3 class="voice-heading">Voice for French words</h3>
      <div id="voices-fr"></div>
      <details class="voice-help"><summary>How to get better voices on an iPad</summary>
        <ol>
          <li>Open the Settings app on the iPad.</li>
          <li>Tap Accessibility, then Spoken Content, then Voices.</li>
          <li>Tap English, then English (UK). Download a voice marked Premium or Enhanced, for example Jamie or Serena.</li>
          <li>Go back, tap French, then French (France), and download one there too.</li>
          <li>Close Study Hub completely and open it again. The new voices appear in the lists above.</li>
        </ol>
        <p class="small muted">Downloads are free. Premium voices are larger files, so use Wi-Fi.</p>
      </details>
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
  if (speechSupported) {
    const draw = () => {
      const en = main.querySelector('#voices-en');
      const fr = main.querySelector('#voices-fr');
      if (en) en.innerHTML = voiceList('en');
      if (fr) fr.innerHTML = voiceList('fr');
    };
    draw();
    const off = onVoicesChanged(() => { if (main.isConnected) draw(); else off(); });
    main.onchange = e => {
      const r = e.target.closest('input[data-voice-base]');
      if (!r) return;
      const key = savedVoiceKey(r.dataset.voiceBase);
      if (r.value) store.set(key, r.value); else store.remove(key);
    };
    main.onclick = e => {
      const b = e.target.closest('.voice-try');
      if (!b) return;
      const base = b.dataset.voiceBase;
      speak(SAMPLE[base], base === 'fr' ? 'fr-FR' : 'en-GB', b.dataset.voice || null);
    };
  }
  main.querySelector('#save-class').addEventListener('click', () => {
    store.set('class', { core: main.querySelector('#core').value, lang: main.querySelector('#lang').value });
    main.querySelector('#class-msg').textContent = 'Saved. Your schedule and plan now use this class.';
  });
  main.querySelector('#reset-class').addEventListener('click', () => {
    store.remove('class');
    settingsView({ main });
  });
}
