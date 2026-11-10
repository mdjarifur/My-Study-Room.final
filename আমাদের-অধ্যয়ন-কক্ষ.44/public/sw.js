// Service Worker for আমাদের অধ্যয়ন কক্ষ (My Study Room PWA)
const CACHE_NAME = 'amader-study-room-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/css/app.css',
  '/css/exam.css',
  '/css/admin.css',
  '/js/config.js',
  '/js/app.js',
  '/js/entry.js',
  '/js/exam.js',
  '/img/icon-192.png',
  '/img/icon-512.png',
  '/img/apple-touch-icon.png',
  '/img/icon-maskable-512.png',
  '/img/dmc.png'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('PWA Precache partial fail:', err);
      });
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Bypass non-GET and Firebase Realtime Database websocket/polling calls
  if (req.method !== 'GET' || url.protocol === 'chrome-extension:' || url.hostname.includes('firebaseio.com') || url.hostname.includes('firebasedatabase.app')) {
    return;
  }

  // Navigation requests (HTML pages) -> Network First with Cache Fallback
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, clone));
          }
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(req);
          if (cached) return cached;
          const fallback = await caches.match('/index.html');
          return fallback || new Response('Offline: পৃষ্ঠাটি ইন্টারনেট সংযোগ ছাড়া লোড করা সম্ভব হয়নি। অনুগ্রহ করে ইন্টারনেট সংযোগ চেক করুন।', {
            headers: { 'Content-Type': 'text/html; charset=utf-8' }
          });
        })
    );
    return;
  }

  // Static Assets (CSS, JS, Fonts, Images) -> Stale While Revalidate / Cache First
  event.respondWith(
    caches.match(req).then((cachedResponse) => {
      const fetchPromise = fetch(req).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
          const clone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, clone));
        }
        return networkResponse;
      }).catch(() => null);

      return cachedResponse || fetchPromise;
    })
  );
});
