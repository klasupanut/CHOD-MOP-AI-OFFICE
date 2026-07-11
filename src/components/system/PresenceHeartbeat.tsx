"use client";

import { useEffect } from "react";

// One write per visible user per minute keeps presence responsive without
// approaching the Google Sheets per-user request quota for this team size.
const HEARTBEAT_INTERVAL_MS = 60_000;

async function sendPresence(state: "online" | "offline", keepalive = false) {
  try {
    await fetch("/api/presence", {
      method: "POST",
      credentials: "same-origin",
      cache: "no-store",
      keepalive,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ state }),
    });
  } catch {
    // Presence is non-critical and must never interrupt workspace usage.
  }
}

export function PresenceHeartbeat() {
  useEffect(() => {
    const syncVisibility = () => {
      void sendPresence(document.visibilityState === "visible" ? "online" : "offline");
    };
    const markOffline = () => void sendPresence("offline", true);

    syncVisibility();
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") void sendPresence("online");
    }, HEARTBEAT_INTERVAL_MS);
    document.addEventListener("visibilitychange", syncVisibility);
    window.addEventListener("pagehide", markOffline);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", syncVisibility);
      window.removeEventListener("pagehide", markOffline);
    };
  }, []);

  return null;
}
