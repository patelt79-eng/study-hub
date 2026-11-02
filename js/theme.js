// Looks ("skins") and light / dark mode.
// Classic follows the light/dark setting. The other skins have a fixed
// brightness: Space is dark, Paper and Football are light.

import * as store from './store.js';

export const SKINS = [
  { id: 'classic', name: 'Classic', blurb: 'Warm colours and chunky cards. Has a light and a dark mode.', fixed: null, bar: '#2f5d8a' },
  { id: 'space', name: 'Space', blurb: 'A deep night sky with still stars.', fixed: 'dark', bar: '#0d1330' },
  { id: 'paper', name: 'Paper', blurb: 'Plain, flat and quiet. Good for calm days.', fixed: 'light', bar: '#f6f6f4' },
  { id: 'football', name: 'Football', blurb: 'A striped pitch with a scoreboard at the top.', fixed: 'light', bar: '#0b1f3a' },
];

export function savedSkin() {
  const s = store.get('skin', 'classic');
  return SKINS.some(x => x.id === s) ? s : 'classic';
}

export function savedTheme() {
  const t = store.get('theme', null);
  return t === 'light' || t === 'dark' ? t : 'auto';
}

export function currentTheme() {
  const skin = SKINS.find(x => x.id === savedSkin());
  if (skin.fixed) return skin.fixed;
  const saved = savedTheme();
  if (saved !== 'auto') return saved;
  return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

// Puts the saved skin and brightness on <html>.
function paint() {
  const root = document.documentElement;
  const skin = SKINS.find(x => x.id === savedSkin());
  root.setAttribute('data-skin', skin.id);
  const mode = skin.fixed || (savedTheme() === 'auto' ? null : savedTheme());
  if (mode) root.setAttribute('data-theme', mode); else root.removeAttribute('data-theme');
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', skin.bar);
  updateThemeButton();
}

export function applyTheme(theme) {
  if (theme === 'light' || theme === 'dark') store.set('theme', theme);
  else store.remove('theme');
  paint();
}

export function applySkin(id) {
  if (id === 'classic') store.remove('skin'); else store.set('skin', id);
  paint();
}

function updateThemeButton() {
  const btn = document.getElementById('theme');
  if (!btn) return;
  // Only Classic has a light and dark mode, so the button only shows for Classic.
  btn.hidden = savedSkin() !== 'classic';
  // A switch: the label stays "Dark mode" and the switch shows whether it is on.
  btn.setAttribute('aria-checked', String(currentTheme() === 'dark'));
}

export function initThemeButton() {
  const btn = document.getElementById('theme');
  btn.addEventListener('click', () => applyTheme(currentTheme() === 'dark' ? 'light' : 'dark'));
  paint();
}
