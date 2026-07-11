"use client";

import type { WorkspaceNotification } from "./types";

export const WORKSPACE_NOTIFICATION_EVENT = "chod-workspace-notification-change";
export const READ_NOTIFICATION_STORAGE_KEY = "chod-read-notification-ids-v1";

let liveNotificationCache: { expiresAt: number; notifications: WorkspaceNotification[]; promise?: Promise<WorkspaceNotification[]> } = {
  expiresAt: 0,
  notifications: [],
};
let persistedReadIdsPromise: Promise<string[]> | null = null;
const LIVE_NOTIFICATION_CACHE_MS = 120_000;
const APPROVAL_NOTIFICATION_PREFIX = "notif-approval-pending";

export function isApprovalWorkspaceNotification(notification: WorkspaceNotification) {
  return notification.id.startsWith(APPROVAL_NOTIFICATION_PREFIX);
}

function notificationKey(notification: WorkspaceNotification) {
  return notification.id || `${notification.href}|${notification.title}|${notification.detail}`;
}

function dedupeWorkspaceNotifications(notifications: WorkspaceNotification[]) {
  const seen = new Set<string>();
  return notifications.filter((notification) => {
    const key = notificationKey(notification);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function getReadNotificationIds() {
  if (typeof window === "undefined") return [];
  try {
    const stored = window.localStorage.getItem(READ_NOTIFICATION_STORAGE_KEY);
    return stored ? JSON.parse(stored) as string[] : [];
  } catch {
    return [];
  }
}

function uniqueReadIds(readIds: string[]) {
  return [...new Set(readIds.map((id) => String(id || "").trim()).filter(Boolean))];
}

async function persistReadNotificationIds(readIds: string[]) {
  try {
    await fetch("/api/notifications/read", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ notificationIds: readIds }),
    });
  } catch {
    // Local storage remains a resilient offline fallback.
  }
}

export function writeReadNotificationIds(readIds: string[], options: { persist?: boolean } = {}) {
  if (typeof window === "undefined") return readIds;
  const uniqueIds = uniqueReadIds(readIds);
  try {
    window.localStorage.setItem(READ_NOTIFICATION_STORAGE_KEY, JSON.stringify(uniqueIds));
  } catch {
    // Navigation must still work even if localStorage is unavailable.
  }
  window.dispatchEvent(new CustomEvent<string[]>(WORKSPACE_NOTIFICATION_EVENT, { detail: uniqueIds }));
  if (options.persist !== false) void persistReadNotificationIds(uniqueIds);
  return uniqueIds;
}

export async function hydrateWorkspaceNotificationReadIds() {
  if (typeof window === "undefined") return [];
  if (!persistedReadIdsPromise) {
    persistedReadIdsPromise = fetch("/api/notifications/read", { cache: "no-store", credentials: "same-origin" })
      .then(async (response) => {
        if (!response.ok) return [];
        const payload = (await response.json()) as { readIds?: unknown };
        return Array.isArray(payload.readIds) ? payload.readIds.map((id) => String(id || "")).filter(Boolean) : [];
      })
      .catch(() => [])
      .finally(() => {
        persistedReadIdsPromise = null;
      });
  }
  const persistedIds = await persistedReadIdsPromise;
  return writeReadNotificationIds([...getReadNotificationIds(), ...persistedIds], { persist: false });
}

export function markWorkspaceNotificationsRead(notificationIds: string[]) {
  const current = getReadNotificationIds();
  return writeReadNotificationIds([...current, ...notificationIds]);
}

export function subscribeWorkspaceNotificationReads(listener: (readIds: string[]) => void) {
  if (typeof window === "undefined") return () => {};
  const handler = (event: Event) => listener((event as CustomEvent<string[]>).detail);
  window.addEventListener(WORKSPACE_NOTIFICATION_EVENT, handler);
  return () => window.removeEventListener(WORKSPACE_NOTIFICATION_EVENT, handler);
}

export async function fetchLiveWorkspaceNotifications() {
  if (typeof window === "undefined") return [];
  const now = Date.now();
  if (liveNotificationCache.expiresAt > now) return liveNotificationCache.notifications;
  if (liveNotificationCache.promise) return liveNotificationCache.promise;

  liveNotificationCache.promise = fetch("/api/notifications", { cache: "no-store" })
    .then(async (response) => {
      if (!response.ok) throw new Error("Unable to load notifications.");
      const payload = await response.json() as { notifications?: WorkspaceNotification[] };
      const notifications = payload.notifications || [];
      liveNotificationCache = {
        expiresAt: Date.now() + LIVE_NOTIFICATION_CACHE_MS,
        notifications,
      };
      return notifications;
    })
    .catch((error) => {
      liveNotificationCache.promise = undefined;
      throw error;
    });
  return liveNotificationCache.promise;
}

export function getWorkspaceNotifications(approvalPendingCount: number, isHydrated: boolean, liveNotifications: WorkspaceNotification[] = []) {
  const liveHasApprovalNotification = liveNotifications.some(isApprovalWorkspaceNotification);
  const approvalNotification: WorkspaceNotification[] = isHydrated && approvalPendingCount > 0 && !liveHasApprovalNotification ? [{
    id: `${APPROVAL_NOTIFICATION_PREFIX}-fallback-${approvalPendingCount}`,
    title: `${approvalPendingCount} quotation approval pending`,
    detail: "Review quotation approval request in Approvals menu.",
    href: "/approvals",
    tone: "warning",
    meta: "Approvals",
    badgeValue: approvalPendingCount,
  }] : [];

  return dedupeWorkspaceNotifications([...liveNotifications, ...approvalNotification]);
}

export function getSidebarNotificationBadges(notifications: WorkspaceNotification[], readIds: string[]) {
  return notifications.reduce<Record<string, number>>((counts, notification) => {
    if (readIds.includes(notification.id)) return counts;
    counts[notification.href] = (counts[notification.href] || 0) + (notification.badgeValue || 1);
    return counts;
  }, {});
}
