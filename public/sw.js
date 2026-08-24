/* Next Level Devotional — PWA service worker (scaffold).
   Minimal cache-first shell for static assets; navigation falls back to
   network then to the cached shell. Hardened SW (offline-first reading) is a
   Sprint 1 concern. */
const CACHE = "nld-shell-v1";

const PRECACHE_ASSETS = ["/manifest.json", "/icons/icon-192.png", "/icons/icon-512.png"];

async function precacheAssets(cache) {
  const results = await Promise.allSettled(
    PRECACHE_ASSETS.map(async (asset) => {
      try {
        const response = await fetch(asset, { cache: "no-cache" });
        if (response.ok) {
          await cache.put(asset, response);
        } else {
          console.warn("[sw] precache failed for", asset, "status:", response.status);
        }
      } catch (err) {
        console.warn("[sw] precache failed for", asset, err);
      }
    })
  );
  return results;
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => precacheAssets(cache))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Navigations: network-first with cache fallback.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE).then((cache) => cache.put("/", copy));
          }
          return response;
        })
        .catch(() => caches.match("/")),
    );
    return;
  }

  // Static assets: cache-first.
  event.respondWith(
    caches.match(request).then(
      (cached) => cached || fetch(request).then((response) => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(request, copy));
        }
        return response;
      }).catch(() => cached),
    ),
  );
});