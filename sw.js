const CACHE_NAME = 'expense-tracker-v1';
const ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon192x192.png',
  '/icon512x512.png',
  'https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css',
  'https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js'
];

// Install Service Worker
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS))
  );
});

// Activate Service Worker
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(keys
        .filter(key => key !== CACHE_NAME)
        .map(key => caches.delete(key))
      );
    })
  );
});

// Fetch Event (Offline Capability)
self.addEventListener('fetch', event => {
  // ถ้าเป็นการส่งข้อมูลไป Google Sheet ให้ข้าม Cache ไปเลย
  if (event.request.url.includes('script.google.com')) {
    return; 
  }

  event.respondWith(
    caches.match(event.request).then(response => {
      return response || fetch(event.request);
    })
  );
});