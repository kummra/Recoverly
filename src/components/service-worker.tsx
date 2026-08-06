"use client";

import { useEffect } from "react";

/**
 * Registers the service worker (offline shell + reminder notifications).
 * Silent by design — a registration failure should never surface to the user,
 * it just means no offline support on that browser.
 */
export function ServiceWorkerRegistrar() {
  useEffect(() => {
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
