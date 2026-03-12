// Caffeine Service Worker — Stub
// This is a minimal registration that does nothing yet.
// Phase 2 will add caching strategies for offline lesson access.

const CACHE_VERSION = "caffeine-v1";

self.addEventListener("install", (event) => {
  // Skip waiting to activate immediately
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  // Claim all clients immediately
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  // Pass through all requests for now (no caching)
  // Phase 2: Add cache-first strategy for lesson content and audio
  return;
});
