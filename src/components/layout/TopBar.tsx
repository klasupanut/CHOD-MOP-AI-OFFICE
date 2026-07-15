"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Bell, Cloud, ExternalLink, ShieldCheck } from "lucide-react";
import { useThailandTime } from "@/components/office/ThailandTimeController";
import { ThemeModeToggle } from "@/components/layout/ThemeModeToggle";
import { CHOD_LOGO_DATA_URI } from "@/lib/brand/chod-logo";
import { getApprovalNotificationSnapshot, publishApprovalNotificationSnapshot, subscribeApprovalNotifications } from "@/lib/notifications/approval-notifications";
import {
  fetchLiveWorkspaceNotifications,
  getReadNotificationIds,
  getWorkspaceNotifications,
  hydrateWorkspaceNotificationReadIds,
  isApprovalWorkspaceNotification,
  writeReadNotificationIds,
} from "@/lib/notifications/workspace-notifications";
import type { WorkspaceNotification } from "@/lib/notifications/types";

export function TopBar() {
  const [open, setOpen] = useState(false);
  const [readIds, setReadIds] = useState<string[]>([]);
  const [isHydrated, setIsHydrated] = useState(false);
  const [approvalPendingCount, setApprovalPendingCount] = useState(0);
  const [liveNotifications, setLiveNotifications] = useState<WorkspaceNotification[]>([]);
  const { now, timeLabel } = useThailandTime();
  const dateLabel = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Bangkok",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  useEffect(() => {
    setIsHydrated(true);
    setReadIds(getReadNotificationIds());
    void hydrateWorkspaceNotificationReadIds().then(setReadIds);
    setApprovalPendingCount(getApprovalNotificationSnapshot(0).pendingCount);
    return subscribeApprovalNotifications((snapshot) => setApprovalPendingCount(snapshot.pendingCount));
  }, []);

  useEffect(() => {
    let mounted = true;
    async function loadNotifications() {
      try {
        const notifications = await fetchLiveWorkspaceNotifications();
        if (mounted) {
          const liveApprovalNotification = notifications.find(isApprovalWorkspaceNotification);
          const livePendingCount = Number(liveApprovalNotification?.badgeValue || 0);
          publishApprovalNotificationSnapshot({ pendingCount: livePendingCount });
          setApprovalPendingCount(livePendingCount);
          setLiveNotifications(notifications);
        }
      } catch {
        if (mounted) setLiveNotifications([]);
      }
    }
    loadNotifications();
    const interval = window.setInterval(loadNotifications, 120_000);
    window.addEventListener("focus", loadNotifications);
    return () => {
      mounted = false;
      window.clearInterval(interval);
      window.removeEventListener("focus", loadNotifications);
    };
  }, []);

  const notifications = useMemo(() => {
    return getWorkspaceNotifications(approvalPendingCount, isHydrated, liveNotifications);
  }, [approvalPendingCount, isHydrated, liveNotifications]);

  const unreadNotifications = useMemo(
    () => notifications.filter((item) => !readIds.includes(item.id)),
    [notifications, readIds],
  );

  function markRead(notificationId: string) {
    setReadIds((current) => {
      const next = current.includes(notificationId) ? current : [...current, notificationId];
      return writeReadNotificationIds(next);
    });
    setOpen(false);
  }

  return (
    <header className="topbar">
      <div>
        <h1 aria-label="CHOD MOP OFFICE" className="project-title">
          <img alt="CHOD" className="project-title-logo" decoding="async" src={CHOD_LOGO_DATA_URI} />
          <span>MOP OFFICE</span>
        </h1>
        <p>Integrated Operations Command</p>
      </div>
      <div className="topbar-tools">
        <div className="secure-state"><ShieldCheck size={18} /> Secure workspace</div>
        <div className="weather-state"><Cloud size={18} /> Bangkok</div>
        <ThemeModeToggle />
        <div className="time-state"><strong>{timeLabel}</strong><span>{now ? dateLabel.format(now) : "THAILAND TIME"} · ICT</span></div>
        <div className="notification-menu">
          <button
            aria-expanded={open}
            aria-label="Notifications"
            onClick={() => setOpen((value) => !value)}
            type="button"
          >
            <Bell size={20} />
            {unreadNotifications.length ? <em>{unreadNotifications.length}</em> : null}
          </button>
          {open ? (
            <div className="notification-popover">
              <header>
                <strong>Notifications</strong>
                <span>{unreadNotifications.length} unread</span>
              </header>
              <div className="notification-list">
                {notifications.map((item) => {
                  const isRead = readIds.includes(item.id);
                  return (
                    <Link
                      aria-label={`Open ${item.meta}: ${item.title}`}
                      className={`notification-item ${item.tone} ${isRead ? "is-read" : ""}`}
                      href={item.href}
                      key={item.id}
                      onClick={() => markRead(item.id)}
                    >
                      <i />
                      <span>
                        <strong>{item.title}</strong>
                        <small>{item.detail}</small>
                        <em>{isRead ? `Read · Open ${item.meta}` : `Open ${item.meta}`}</em>
                      </span>
                      <ExternalLink size={15} />
                    </Link>
                  );
                })}
                {!notifications.length ? <p className="notification-empty">No due-date alerts right now.</p> : null}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}
