"use client";

export const WORKSPACE_NOTIFICATION_EVENT = "chod-workspace-notification-change";
export const READ_NOTIFICATION_STORAGE_KEY = "chod-read-notification-ids-v1";

export type WorkspaceNotification = {
  id: string;
  title: string;
  detail: string;
  href: string;
  tone: "critical" | "warning" | "info";
  meta: "Tasks" | "Approvals" | "Quotations";
  badgeValue?: number;
};

export const staticWorkspaceNotifications: WorkspaceNotification[] = [
  {
    id: "notif-task-overdue",
    title: "Foreman PM task overdue",
    detail: "Close overdue PM work orders needs update today.",
    href: "/tasks",
    tone: "critical",
    meta: "Tasks",
  },
  {
    id: "notif-quotation",
    title: "Auto Quotation follow-up",
    detail: "Fit-out quotation workspace has pending follow-up.",
    href: "/quotations",
    tone: "info",
    meta: "Quotations",
  },
];

export function getReadNotificationIds() {
  if (typeof window === "undefined") return [];
  try {
    const stored = window.localStorage.getItem(READ_NOTIFICATION_STORAGE_KEY);
    return stored ? JSON.parse(stored) as string[] : [];
  } catch {
    return [];
  }
}

export function writeReadNotificationIds(readIds: string[]) {
  if (typeof window === "undefined") return readIds;
  const uniqueIds = [...new Set(readIds)];
  try {
    window.localStorage.setItem(READ_NOTIFICATION_STORAGE_KEY, JSON.stringify(uniqueIds));
  } catch {
    // Navigation must still work even if localStorage is unavailable.
  }
  window.dispatchEvent(new CustomEvent<string[]>(WORKSPACE_NOTIFICATION_EVENT, { detail: uniqueIds }));
  return uniqueIds;
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

export function getWorkspaceNotifications(approvalPendingCount: number, isHydrated: boolean) {
  const approvalNotification: WorkspaceNotification[] = isHydrated && approvalPendingCount > 0 ? [{
    id: "notif-approval-pending",
    title: `${approvalPendingCount} quotation approval pending`,
    detail: "Review quotation approval request in Approvals menu.",
    href: "/approvals",
    tone: "warning",
    meta: "Approvals",
    badgeValue: approvalPendingCount,
  }] : [];

  return [...approvalNotification, ...staticWorkspaceNotifications];
}

export function getSidebarNotificationBadges(notifications: WorkspaceNotification[], readIds: string[]) {
  return notifications.reduce<Record<string, number>>((counts, notification) => {
    if (readIds.includes(notification.id)) return counts;
    counts[notification.href] = (counts[notification.href] || 0) + (notification.badgeValue || 1);
    return counts;
  }, {});
}
