// service-worker.js — PWA caching v10-notes-9
const CACHE_NAME = 'ae-civil-v10-notes-9';
const STATIC_ASSETS = [
  './',
  './index.html',
  './css/styles.css',
  './manifest.json'
];

// Network-first assets — always fetch fresh, fallback to cache
const NETWORK_FIRST = [
  'notes-combined.json',
  'gs-notes.json',
  'hindi-notes.json',
  '/js/app.js',
  '/js/notes.js',
  '/js/gs-notes.js',
  '/js/subjects.js',
  '/js/exams.js'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(STATIC_ASSETS).catch(() => {}))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  const url = e.request.url;

  // Always bypass SW for Firebase/Google APIs
  if (url.includes('firestore') || url.includes('firebase') || url.includes('googleapis')) {
    return;
  }

  // Network-first for data files and key JS — always get latest
  const isNetworkFirst = NETWORK_FIRST.some(p => url.includes(p));
  if (isNetworkFirst) {
    e.respondWith(
      fetch(e.request, { cache: 'no-cache' })
        .then(res => {
          if (res.ok) {
            const clone = res.clone();
            caches.open(CACHE_NAME).then(c => c.put(e.request, clone));
          }
          return res;
        })
        .catch(() => caches.match(e.request))
    );
    return;
  }

  // Cache-first for everything else (images, firebase SDK, etc.)
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request))
  );
});
