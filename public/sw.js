// Service Worker for 2048 PWA
// Handles push notifications and basic offline caching

const CACHE_NAME = "2048-v3";

// Only cache static assets — never cache HTML or API responses
const STATIC_ASSETS = ["/icon-192x192.png", "/icon-512x512.png", "/brand.png"];
const STATIC_ASSET_PATHS = new Set(STATIC_ASSETS);

// Cache essential assets on install
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// Clean old caches on activate and notify clients
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
      )
      .then(() => {
        // Notify all clients that a new version is active
        self.clients.matchAll().then((clients) => {
          clients.forEach((client) => client.postMessage({ type: "SW_UPDATED" }));
        });
      })
  );
  self.clients.claim();
});

// Network-first for pages/API, cache-first for static assets
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);
  const isSameOrigin = url.origin === self.location.origin;
  const isImageRequest =
    event.request.destination === "image" || STATIC_ASSET_PATHS.has(url.pathname);

  // Never cache API routes or HTML pages
  if (url.pathname.startsWith("/api/") || event.request.headers.get("accept")?.includes("text/html")) {
    return;
  }

  if (!isSameOrigin || !isImageRequest) {
    return;
  }

  // Static assets: cache-first
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      });
    })
  );
});

// Push notifications
self.addEventListener("push", (event) => {
  if (event.data) {
    const data = event.data.json();
    event.waitUntil(
      self.registration.showNotification(data.title, {
        body: data.body,
        icon: data.icon || "/icon-192x192.png",
        badge: "/icon-192x192.png",
        vibrate: [100, 50, 100],
      })
    );
  }
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(clients.openWindow("/"));
});
