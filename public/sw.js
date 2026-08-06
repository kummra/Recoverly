/* Recoverly service worker.
 *
 * Deliberately conservative. This app handles personal health data, so:
 *  - Only the static app shell is cached. API responses and Firestore traffic
 *    are never cached — stale recovery data would be worse than none, and a
 *    cached response could outlive an account deletion.
 *  - Navigations are network-first, falling back to the offline page only when
 *    the network genuinely fails.
 */

const VERSION = "v1";
const SHELL_CACHE = `recoverly-shell-${VERSION}`;
const OFFLINE_URL = "/offline";

const SHELL_ASSETS = [OFFLINE_URL, "/icon-192.png", "/icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) => cache.addAll(SHELL_ASSETS))
      .then(() => self.skipWaiting())
      .catch(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== SHELL_CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;      // never touch Firebase/Groq traffic
  if (url.pathname.startsWith("/api/")) return;          // never cache personal data

  if (request.mode === "navigate") {
    event.respondWith(fetch(request).catch(() => caches.match(OFFLINE_URL)));
    return;
  }

  // Hashed build assets are immutable — cache-first is safe and fast.
  if (url.pathname.startsWith("/_next/static/") || SHELL_ASSETS.includes(url.pathname)) {
    event.respondWith(
      caches.match(request).then(
        (hit) =>
          hit ||
          fetch(request).then((res) => {
            const copy = res.clone();
            caches.open(SHELL_CACHE).then((c) => c.put(request, copy));
            return res;
          })
      )
    );
  }
});

/* ── Daily check-in reminder ───────────────────────────────────────────────
 * The page schedules this by posting the delay; the worker fires the
 * notification even if the tab has since been closed. Kept gentle by design:
 * one a day, easy to dismiss, never guilt-inducing.
 */
let reminderTimer = null;

self.addEventListener("message", (event) => {
  const data = event.data || {};

  if (data.type === "SCHEDULE_REMINDER" && typeof data.delayMs === "number") {
    if (reminderTimer) clearTimeout(reminderTimer);
    reminderTimer = setTimeout(() => {
      self.registration.showNotification("Your daily check-in", {
        body: "However today went, showing up is the win. Take a moment to reflect.",
        icon: "/icon-192.png",
        badge: "/icon-192.png",
        tag: "recoverly-daily-checkin",
        requireInteraction: false,
        data: { url: "/dashboard" }
      });
    }, Math.min(data.delayMs, 24 * 60 * 60 * 1000));
  }

  if (data.type === "CANCEL_REMINDER" && reminderTimer) {
    clearTimeout(reminderTimer);
    reminderTimer = null;
  }
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = (event.notification.data && event.notification.data.url) || "/dashboard";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if (client.url.includes(target) && "focus" in client) return client.focus();
      }
      return self.clients.openWindow(target);
    })
  );
});
