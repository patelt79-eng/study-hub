// Light / dark / automatic theme.

import * as store from './store.js';

export function savedTheme() {
  const t = store.get('theme', null);
  return t === 'light' || t === 'dark' ? t : 'auto';
}

export function currentTheme() {
  const saved = savedTheme();
  if (saved !== 'auto') return saved;
  return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function applyTheme(theme) {
  if (theme === 'light' || theme === 'dark') {
    document.documentElement.setAttribute('data-theme', theme);
    store.set('theme', theme);
  } else {
    document.documentElement.removeAttribute('data-theme');
    store.remove('theme');
  }
  updateThemeButton();
}

function updateThemeButton() {
  const btn = document.getElementById('theme');
  if (!btn) return;
  const dark = currentTheme() === 'dark';
  btn.setAttribute('aria-pressed', String(dark));
  btn.textContent = dark ? 'Light mode' : 'Dark mode';
}

export function initThemeButton() {
  const btn = document.getElementById('theme');
  btn.addEventListener('click', () => applyTheme(currentTheme() === 'dark' ? 'light' : 'dark'));
  updateThemeButton();
}
