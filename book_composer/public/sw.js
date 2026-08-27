const CACHE = "kallistis-book-maker-shell-v1";

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  event.respondWith(
    caches.open(CACHE).then(async (cache) => {
      try {
        const response = await fetch(event.request);
        if (event.request.url.startsWith(self.location.origin)) {
          cache.put(event.request, response.clone());
        }
        return response;
      } catch {
        return (await cache.match(event.request)) || Response.error();
      }
    }),
  );
});
