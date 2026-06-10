// service-worker.js — PWA caching v44-topbar-fullscreen
const CACHE_NAME = 'ae-civil-v44-topbar';
const STATIC_ASSETS = [
  './',
  './index.html',
  './css/styles.css',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

// Network-first assets — always fetch fresh, fallback to cache
const NETWORK_FIRST = [
  'notes-combined.json',
  'data/gs-notes.json',
  'data/gs-history.json',
  'data/gs-polity.json',
  'data/gs-geography.json',
  'data/gs-science.json',
  'data/hindi-notes.json',
  'gs-notes.json',
  'gs-history.json',
  'hindi-notes.json',
  '/js/app.js',
  '/js/notes.js',
  '/js/gs-notes.js',
  '/js/subjects.js',
  '/js/exams.js',
  '/js/pcb-notes.js',
  'data/pcb/unit1.html',
  'data/pcb/unit2.html',
  'data/pcb/unit3.html',
  'data/pcb/unit4.html',
  'data/pcb/unit5.html',
  'data/pcb/unit6.html',
  'data/pcb/unit7.html',
  'data/pcb/unit8.html',
  'data/pcb/unit9.html',
  'data/pcb/unit10.html',
  'data/pcb/unit11.html',
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

// ── Push notification click handler ─────────────────────────────────────────
// Handles clicks on notifications shown by THIS service worker.
// (FCM background notifications are handled by firebase-messaging-sw.js)
self.addEventListener('notificationclick', (e) => {
  e.notification.close();

  const targetUrl = e.notification.data?.url || '/';

  e.waitUntil(
    clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((windowClients) => {
        for (const client of windowClients) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            return client.focus();
          }
        }
        if (clients.openWindow) return clients.openWindow(targetUrl);
      })
  );
});

// ── Push event (non-FCM fallback) ────────────────────────────────────────────
self.addEventListener('push', (e) => {
  if (!e.data) return;
  try {
    const payload = e.data.json();
    const title   = payload.title || 'AE/JE Civil';
    const options = {
      body:    payload.body  || '',
      icon:    '/icon-192.png',
      badge:   '/icon-192.png',
      data:    payload.data  || {},
      vibrate: [200, 100, 200],
    };
    e.waitUntil(self.registration.showNotification(title, options));
  } catch (_) {}
});
