/* Lion Survival — minimal offline service worker.
 *
 * The game is a single static index.html + procedural assets. Its ONE external
 * dependency is Three.js r128 from cdnjs (cdnjs sends permissive CORS headers,
 * so we can precache the real response, not an opaque one). Everything needed
 * for offline play — shell, icons, Three.js — is precached on install.
 *
 * Strategy:
 *   - HTML / navigations: NETWORK-FIRST → always get the latest game when online
 *     (Steven pushes to main constantly), fall back to the cached shell offline.
 *   - Everything else (icons, manifest, Three.js): CACHE-FIRST → instant, offline.
 *
 * Bump CACHE when the shell list changes so activate() evicts the stale cache.
 */
const CACHE = 'lion-survival-v1';
const THREE = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
const SHELL = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './icons/apple-touch-icon.png',
  THREE
];

self.addEventListener('install', (e) => {
  e.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    // Best-effort per item: a single transient failure (e.g. the CDN) must not
    // abort the whole install and leave the player with no offline shell.
    await Promise.allSettled(SHELL.map((u) => cache.add(u)));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const isNav = req.mode === 'navigate' || req.destination === 'document';

  if (isNav) {
    // Network-first for the game shell.
    e.respondWith((async () => {
      try {
        const net = await fetch(req);
        const cache = await caches.open(CACHE);
        cache.put('./index.html', net.clone());
        return net;
      } catch (_) {
        const cache = await caches.open(CACHE);
        return (await cache.match(req)) ||
               (await cache.match('./index.html')) ||
               (await cache.match('./')) ||
               Response.error();
      }
    })());
    return;
  }

  // Cache-first for static assets (incl. the cross-origin Three.js bundle).
  e.respondWith((async () => {
    const cached = await caches.match(req);
    if (cached) return cached;
    try {
      const net = await fetch(req);
      if (net && net.ok &&
          (url.origin === self.location.origin || url.href === THREE)) {
        const cache = await caches.open(CACHE);
        cache.put(req, net.clone());
      }
      return net;
    } catch (_) {
      return cached || Response.error();
    }
  })());
});
