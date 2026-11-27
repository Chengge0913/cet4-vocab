const PREFIX = 'ciyu-cet4-' + new URL(self.registration.scope).pathname + '-';
const CACHE = PREFIX + 'v2';
const FILES = [
  './', './index.html', './manifest.json', './style.css', './tailwind.css', './app.js',
  './engine.js', './words.js', './audio-index.js', './assets/pronunciation.mp3',
  './assets/pronunciation-01.mp3',
  './assets/pronunciation-02.mp3',
  './assets/pronunciation-03.mp3',
  './assets/pronunciation-04.mp3',
  './assets/pronunciation-05.mp3',
  './assets/pronunciation-06.mp3',
  './assets/pronunciation-07.mp3',
  './assets/pronunciation-08.mp3',
  './assets/pronunciation-09.mp3',
  './assets/pronunciation-10.mp3',
  './assets/pronunciation-11.mp3',
  './assets/folded-loop.webp', './assets/manrope.woff2', './assets/manrope-license.txt', './assets/word-data-notices.txt',
  './assets/apple-touch-icon.png', './assets/icon-192.png', './assets/icon-512.png'
];
self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await cache.addAll(FILES.map(file => new Request(file, {cache: 'reload'})));
    // Let existing tabs finish with their current word list before activating the new cache.
  })());
});
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.filter(name => name.startsWith(PREFIX) && name !== CACHE).map(name => caches.delete(name)));
    await self.clients.claim();
  })());
});
self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET' || !request.url.startsWith(self.registration.scope)) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    if (request.mode === 'navigate') return (await cache.match('./index.html')) || fetch(request);
    return (await cache.match(request, {ignoreSearch:true})) || fetch(request);
  })());
});
