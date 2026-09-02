/* Next Level Devotional — PWA service worker (hardened).
   - Never throws / never returns undefined to FetchEvent (always a Response)
   - Bypasses API routes, Next internals, and non-GET
   - Navigation: network-first with offline fallback
   - Assets: cache-first with network fallback
*/
const CACHE = "nld-shell-v2";

const PRECACHE_ASSETS = ["/manifest.json", "/icons/icon-192.png", "/icons/icon-512.png"];

const OFFLINE_HTML = `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Offline — Next Level Devotional</title><style>body{font-family:system-ui,sans-serif;display:flex;min-height:100vh;align-items:center;justify-content:center;margin:0;background:#fff;color:#111}div{max-width:480px;padding:24px;text-align:center}h1{font-size:1.5rem;margin:0 0 8px}p{color:#666;font-size:.95rem}a{display:inline-block;margin-top:16px;padding:10px 18px;background:#111;color:#fff;border-radius:8px;text-decoration:none}</style><div><h1>You're offline</h1><p>The page isn't available offline. Please check your connection and try again.</p><a href="/">Go home</a></div></html>`;

async function precacheAssets(cache) {
  for (const asset of PRECACHE_ASSETS) {
    try {
      const response = await fetch(asset, { cache: "no-cache" });
      if (response.ok) {
        await cache.put(asset, response);
      } else {
        console.warn("[sw] precache skip", asset, response.status);
      }
    } catch (err) {
      console.warn("[sw] precache failed for", asset, err);
    }
  }
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

function isBypassUrl(url) {
  // Never intercept API, Next internals, or Paystack callbacks
  return (
    url.pathname.startsWith("/api/") ||
    url.pathname.startsWith("/_next/") ||
    url.pathname.startsWith("/admin/") // admin must always hit network for auth
  );
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (isBypassUrl(url)) return;

  // Navigations: network-first, fallback to cache, then offline HTML
  if (request.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          const response = await fetch(request);
          // Cache successful navigations (opaque caching of GET html)
          if (response && response.ok) {
            const copy = response.clone();
            caches.open(CACHE).then((cache) => cache.put(request, copy)).catch(() => {});
          }
          return response;
        } catch {
          // Network failed → try cached version of this URL, then root, then offline fallback
          const cached =
            (await caches.match(request).catch(() => null)) ||
            (await caches.match("/").catch(() => null));
          if (cached) return cached;
          return new Response(OFFLINE_HTML, {
            status: 503,
            headers: { "Content-Type": "text/html; charset=utf-8" },
          });
        }
      })(),
    );
    return;
  }

  // Static assets: cache-first, network fallback, never reject
  event.respondWith(
    (async () => {
      try {
        const cached = await caches.match(request).catch(() => null);
        if (cached) return cached;
        const response = await fetch(request);
        if (response && response.ok) {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(request, copy)).catch(() => {});
        }
        return response;
      } catch {
        const cached = await caches.match(request).catch(() => null);
        if (cached) return cached;
        // For images/css/js that failed, return a synthetic error response rather than rejecting
        return new Response("", { status: 504, statusText: "Gateway Timeout" });
      }
    })(),
  );
});
