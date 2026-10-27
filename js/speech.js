// Read-aloud with the Web Speech API. If it is not supported, the
// speaker buttons are hidden by the 'no-speech' class on <html>.

import * as store from './store.js';

const synth = typeof window !== 'undefined' && 'speechSynthesis' in window ? window.speechSynthesis : null;
export const supported = !!synth && typeof window.SpeechSynthesisUtterance === 'function';

let voices = [];

function loadVoices() {
  try { voices = synth.getVoices() || []; } catch (e) { voices = []; }
}

if (supported) {
  loadVoices();
  try { synth.onvoiceschanged = loadVoices; } catch (e) { /* ignore */ }
}

function pickVoice(lang) {
  const want = lang.toLowerCase();
  const norm = v => (v.lang || '').replace('_', '-').toLowerCase();
  const exact = voices.filter(v => norm(v) === want);
  if (exact.length) return exact.find(v => v.localService) || exact[0];
  const base = want.slice(0, 2);
  return voices.find(v => norm(v).startsWith(base)) || null;
}

export function rate() {
  return store.get('speechSpeed', 'normal') === 'slow' ? 0.75 : 1;
}

export function speak(text, lang = 'en-GB') {
  if (!supported || !text) return;
  try {
    synth.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = lang;
    const v = pickVoice(lang);
    if (v) u.voice = v;
    u.rate = rate();
    synth.speak(u);
  } catch (e) { /* ignore speech errors */ }
}

export function stop() {
  if (!supported) return;
  try { synth.cancel(); } catch (e) { /* ignore */ }
}
