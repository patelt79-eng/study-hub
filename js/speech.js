// Read-aloud with the Web Speech API. If it is not supported, the
// speaker buttons are hidden by the 'no-speech' class on <html>.
// The chosen English and French voices are saved in Settings; otherwise
// the best-sounding voice on the device is used (Premium, then Enhanced).

import * as store from './store.js';

const synth = typeof window !== 'undefined' && 'speechSynthesis' in window ? window.speechSynthesis : null;
export const supported = !!synth && typeof window.SpeechSynthesisUtterance === 'function';

let voices = [];
const listeners = new Set();

function loadVoices() {
  try { voices = synth.getVoices() || []; } catch (e) { voices = []; }
  listeners.forEach(fn => { try { fn(); } catch (e) { /* ignore */ } });
}

if (supported) {
  loadVoices();
  try { synth.onvoiceschanged = loadVoices; } catch (e) { /* ignore */ }
}

// Settings re-draws its voice lists when the device finishes loading voices.
export function onVoicesChanged(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

const norm = v => (v.lang || '').replace('_', '-').toLowerCase();

// 2 = Premium, 1 = Enhanced, 0 = standard. iPads put this in the name or the voice id.
export function quality(v) {
  const s = `${v.name} ${v.voiceURI}`.toLowerCase();
  if (s.includes('premium')) return 2;
  if (s.includes('enhanced')) return 1;
  return 0;
}

export const QUALITY_LABEL = ['Standard', 'Enhanced', 'Premium'];

// Apple's robotic "Eloquence" voices: kept, but listed last and never picked automatically.
const ROBOTIC = new Set(['eddy', 'flo', 'grandma', 'grandpa', 'reed', 'rocko', 'sandy', 'shelley']);
// Joke voices (sound effects, singing, whispering): hidden.
const NOVELTY = new Set(['albert', 'bad news', 'bahh', 'bells', 'boing', 'bubbles', 'cellos', 'good news', 'jester', 'organ', 'superstar', 'trinoids', 'whisper', 'wobble', 'zarvox', 'junior', 'ralph', 'fred', 'kathy', 'deranged', 'hysterical', 'pipe organ']);
const baseName = v => v.name.replace(/\s*\(.*\)\s*$/, '').trim().toLowerCase();
export const isRobotic = v => ROBOTIC.has(baseName(v));
export const displayName = v => v.name.replace(/\s*\(.*\)\s*$/, '').trim();

// Voices for a language ('en' or 'fr'), best first, with the exact dialect (en-GB, fr-FR) ahead of others.
export function voicesFor(base) {
  const prefer = base === 'fr' ? 'fr-fr' : 'en-gb';
  return voices
    .filter(v => norm(v).startsWith(base) && !NOVELTY.has(baseName(v)))
    .sort((a, b) =>
      isRobotic(a) - isRobotic(b) ||
      (norm(b) === prefer) - (norm(a) === prefer) ||
      quality(b) - quality(a) ||
      (b.localService === true) - (a.localService === true) ||
      a.name.localeCompare(b.name));
}

export const savedVoiceKey = base => (base === 'fr' ? 'voiceFr' : 'voiceEn');

function pickVoice(lang) {
  const base = lang.slice(0, 2).toLowerCase();
  const saved = store.get(savedVoiceKey(base), null);
  if (saved) {
    const v = voices.find(x => x.voiceURI === saved);
    if (v) return v;
  }
  return voicesFor(base)[0] || null;
}

export function rate() {
  return store.get('speechSpeed', 'normal') === 'slow' ? 0.75 : 1;
}

export function speak(text, lang = 'en-GB', voiceURI = null) {
  if (!supported || !text) return;
  try {
    synth.cancel();
    const u = new SpeechSynthesisUtterance(text);
    const v = (voiceURI && voices.find(x => x.voiceURI === voiceURI)) || pickVoice(lang);
    u.lang = v ? v.lang : lang;
    if (v) u.voice = v;
    u.rate = rate();
    synth.speak(u);
  } catch (e) { /* ignore speech errors */ }
}

export function stop() {
  if (!supported) return;
  try { synth.cancel(); } catch (e) { /* ignore */ }
}
