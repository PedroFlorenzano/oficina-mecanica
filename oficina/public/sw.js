const CACHE_NAME = "operare-v1";

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", () => self.clients.claim());

self.addEventListener("fetch", (event) => {
  // Network-first strategy — app sempre busca dados frescos
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});
