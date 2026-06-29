"use client";

import { useEffect } from "react";

export function BrowserOriginGuard() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    const host = window.location.hostname;
    if (host !== "localhost" && host !== "127.0.0.1") return;

    window.document.documentElement.dataset.chodApp = "ai-office";

    const unregisterForeignServiceWorkers = async () => {
      if (!("serviceWorker" in navigator)) return;
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(
        registrations.map((registration) => {
          const activeScript = registration.active?.scriptURL || registration.installing?.scriptURL || registration.waiting?.scriptURL || "";
          const looksLikeChod = activeScript.includes("chod") || activeScript.includes("_next");
          return looksLikeChod ? Promise.resolve(false) : registration.unregister();
        }),
      );
    };

    const clearOriginCaches = async () => {
      if (!("caches" in window)) return;
      const cacheNames = await window.caches.keys();
      await Promise.all(cacheNames.map((name) => window.caches.delete(name)));
    };

    void unregisterForeignServiceWorkers()
      .then(clearOriginCaches)
      .catch(() => {
        // Best-effort local browser cleanup only. The app must continue even if browser APIs are blocked.
      });
  }, []);

  return null;
}
