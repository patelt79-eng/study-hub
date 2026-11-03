// Offline support. When online, every file is fetched fresh (so updates show
// on the first visit) and the copy is saved. When offline, or if the network
// takes more than 4 seconds, the saved copy is used.
// Change VERSION when files are added or removed.

const VERSION = 'study-hub-v9';
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
  './js/meta.js',
  './js/visuals.js',
  './js/pictos.js',
  './js/views/topic.js',
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
  // cache: 'reload' skips the browser's HTTP cache, so the saved copy is the latest one.
  event.waitUntil(
    caches.open(VERSION)
      .then(cache => cache.addAll(FILES.map(f => new Request(f, { cache: 'reload' }))))
      .then(() => self.skipWaiting())
  );
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
  event.respondWith((async () => {
    const cache = await caches.open(VERSION);
    const fromCache = () => cache.match(req, { ignoreSearch: true });
    try {
      const res = await Promise.race([
        fetch(req, { cache: 'no-cache' }),
        new Promise((_, reject) => setTimeout(() => reject(new Error('slow')), 4000)),
      ]);
      if (res && res.ok) cache.put(req, res.clone());
      return res;
    } catch (e) {
      return (await fromCache()) || Response.error();
    }
  })());
});
