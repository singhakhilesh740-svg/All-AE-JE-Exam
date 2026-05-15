// service-worker.js — PWA caching
const CACHE_NAME = 'ae-civil-v10-notes-3';   // ← bumped: forces old cache purge
const ASSETS = [
  './',
  './index.html',
  './css/styles.css',
  './js/app.js',
  './js/auth.js',
  './js/db.js',
  './js/quiz.js',
  './js/notes.js',
  './js/exams.js',
  './js/subjects.js',
  './js/firebase-config.js',
  './data/notes-combined.json',
  './manifest.json'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS).catch(() => {}))
  );
  self.skipWaiting();   // activate immediately without waiting for old SW to die
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => {
        console.log('[SW] Deleting old cache:', k);
        return caches.delete(k);
      }))
    )
  );
  self.clients.claim();   // take control of all open tabs immediately
});

self.addEventListener('fetch', (e) => {
  // Always network-first for Firebase (real-time data must not be cached)
  if (e.request.url.includes('firestore') ||
      e.request.url.includes('firebase') ||
      e.request.url.includes('googleapis')) {
    return;
  }
  // Network-first for notes JSON so updates are always picked up
  if (e.request.url.includes('notes-combined.json')) {
    e.respondWith(
      fetch(e.request)
        .then(res => {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(e.request, clone));
          return res;
        })
        .catch(() => caches.match(e.request))   // fallback to cache if offline
    );
    return;
  }
  // Cache-first for app shell (JS, CSS, HTML)
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request))
  );
});
