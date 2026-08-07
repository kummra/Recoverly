"use client";

import { useEffect } from "react";

/**
 * Registers the service worker (offline shell + reminder notifications).
 * Silent by design — a registration failure should never surface to the user,
 * it just means no offline support on that browser.
 *
 * Production only. The worker caches /_next/static/ cache-first, which is safe
 * for production's content-hashed filenames but not in dev, where chunk names
 * are stable and would pin the first build you ever loaded.
 */
export function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
    // Registering during load keeps it off the critical path.
    const onLoad = () => {
      navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    };
    if (document.readyState === "complete") onLoad();
    else window.addEventListener("load", onLoad, { once: true });
    return () => window.removeEventListener("load", onLoad);
  }, []);

  return null;
}
