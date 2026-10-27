// Offline support. Serves the cached copy straight away, then refreshes the
// cache in the background so content edits appear on the next visit.
// Change VERSION when files are added or removed.

const VERSION = 'study-hub-v1';
const FILES = [
  './',
  './index.html',
  './manifest.json',
  './css/app.css',
  './icons/icon.svg',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png',
  './js/app.js',
  './js/store.js',
  './js/dates.js',
  './js/speech.js',
  './js/data.js',
  './js/ui.js',
  './js/plan.js',
  './js/theme.js',
  './js/views/today.js',
  './js/views/schedule.js',
  './js/views/subjects.js',
  './js/views/subject.js',
  './js/views/flashcards.js',
  './js/views/quiz.js',
  './js/views/maths.js',
  './js/views/writing.js',
  './js/views/french.js',
  './js/views/progress.js',
  './js/views/settings.js',
  './js/views/rag.js',
  './data/schedule.json',
  './data/plan-rules.json',
  './data/re.json',
  './data/geography.json',
  './data/science.json',
  './data/maths.json',
  './data/history.json',
  './data/french.json',
  './data/english.json',
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(VERSION).then(cache => cache.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  event.respondWith(
    caches.open(VERSION).then(async cache => {
      const cached = await cache.match(req, { ignoreSearch: true });
      const network = fetch(req).then(res => {
        if (res && res.ok) cache.put(req, res.clone());
        return res;
      }).catch(() => cached);
      return cached || network;
    })
  );
});
