export const APPROVAL_NOTIFICATION_EVENT = "chod-approval-notification-change";

const STORAGE_KEY = "chod-approval-notification-state-v1";

export type ApprovalNotificationSnapshot = {
  pendingCount: number;
  lastResolvedApprovalId?: string;
};

function safePendingCount(value: unknown, fallback = 0) {
  const count = Number(value);
  return Number.isFinite(count) ? Math.max(0, Math.floor(count)) : fallback;
}

export function getApprovalNotificationSnapshot(fallbackPendingCount = 0): ApprovalNotificationSnapshot {
  if (typeof window === "undefined") {
    return { pendingCount: fallbackPendingCount };
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { pendingCount: fallbackPendingCount };
    const parsed = JSON.parse(raw) as Partial<ApprovalNotificationSnapshot>;
    return {
      pendingCount: safePendingCount(parsed.pendingCount, fallbackPendingCount),
      lastResolvedApprovalId: parsed.lastResolvedApprovalId,
    };
  } catch {
    return { pendingCount: fallbackPendingCount };
  }
}

export function publishApprovalNotificationSnapshot(snapshot: ApprovalNotificationSnapshot) {
  const nextSnapshot = {
    ...snapshot,
    pendingCount: safePendingCount(snapshot.pendingCount),
  };

  if (typeof window === "undefined") return nextSnapshot;

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextSnapshot));
  } catch {
    // Keep UI responsive even if localStorage is unavailable.
  }

  window.dispatchEvent(new CustomEvent<ApprovalNotificationSnapshot>(APPROVAL_NOTIFICATION_EVENT, { detail: nextSnapshot }));
  return nextSnapshot;
}

export function subscribeApprovalNotifications(listener: (snapshot: ApprovalNotificationSnapshot) => void) {
  if (typeof window === "undefined") return () => {};

  const handler = (event: Event) => {
    listener((event as CustomEvent<ApprovalNotificationSnapshot>).detail);
  };

  window.addEventListener(APPROVAL_NOTIFICATION_EVENT, handler);
  return () => window.removeEventListener(APPROVAL_NOTIFICATION_EVENT, handler);
}
