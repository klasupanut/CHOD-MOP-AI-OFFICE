"use client";

import { useEffect, useState } from "react";
import {
  BarChart3, BriefcaseBusiness, Building2, CalendarDays, CheckCheck, ClipboardList, LogOut,
  FolderKanban, Gauge, Hammer, LayoutDashboard, Settings, SunMedium, Wrench, type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { logout } from "@/app/actions/auth";
import type { ApprovedUser } from "@/lib/auth/types";
import type { ModulePermission } from "@/lib/auth/permissions";
import { getApprovalNotificationSnapshot, publishApprovalNotificationSnapshot, subscribeApprovalNotifications } from "@/lib/notifications/approval-notifications";
import {
  fetchLiveWorkspaceNotifications,
  getReadNotificationIds,
  getSidebarNotificationBadges,
  getWorkspaceNotifications,
  isApprovalWorkspaceNotification,
  markWorkspaceNotificationsRead,
  subscribeWorkspaceNotificationReads,
} from "@/lib/notifications/workspace-notifications";
import type { WorkspaceNotification } from "@/lib/notifications/types";

const nav: Array<{ label: "Office" | ModulePermission; icon: LucideIcon; href?: string; pendingConnector?: boolean; displayLabel?: string }> = [
  { label: "Office", icon: Building2, href: "/" },
  { label: "Dashboard", icon: LayoutDashboard, href: "/dashboard" },
  { label: "Tasks", icon: ClipboardList, href: "/tasks" },
  { label: "Projects", icon: FolderKanban, href: "/projects", displayLabel: "Projects & Budgets" },
  { label: "Calendar / Schedule", icon: CalendarDays, href: "/calendar-schedule" },
  { label: "PM Loop", icon: Gauge, pendingConnector: true },
  { label: "Renovation", icon: Wrench, pendingConnector: true },
  { label: "Fit-out Project", icon: Hammer, href: "/fit-out-project" },
  { label: "Solar Projects", icon: SunMedium, pendingConnector: true },
  { label: "Quotations", icon: BriefcaseBusiness, href: "/quotations" },
  { label: "Approvals", icon: CheckCheck, href: "/approvals" },
  { label: "Reports", icon: BarChart3, href: "/reports" },
  { label: "Settings", icon: Settings, href: "/settings/users" },
];

export function Sidebar({ user }: { user: ApprovedUser }) {
  const pathname = usePathname();
  const [isHydrated, setIsHydrated] = useState(false);
  const [approvalBadgeCount, setApprovalBadgeCount] = useState(0);
  const [readNotificationIds, setReadNotificationIds] = useState<string[]>([]);
  const [liveNotifications, setLiveNotifications] = useState<WorkspaceNotification[]>([]);
  const visibleNav = nav.filter((item) => {
    if (item.label === "Office") return true;
    if (item.label === "Settings") return ["Admin", "Super Admin"].includes(user.role) && user.modulePermissions.includes("Settings");
    if (item.label === "Quotations") return user.modulePermissions.includes("Quotations") && user.quotationPermissions.includes("quotation.view");
    if (item.label === "Calendar / Schedule") {
      return user.modulePermissions.includes("Calendar / Schedule") || user.modulePermissions.includes("Tasks") || user.modulePermissions.includes("Projects");
    }
    return user.modulePermissions.includes(item.label);
  });

  useEffect(() => {
    setIsHydrated(true);
    setReadNotificationIds(getReadNotificationIds());
    setApprovalBadgeCount(getApprovalNotificationSnapshot(0).pendingCount);
    const unsubscribeApprovals = subscribeApprovalNotifications((snapshot) => setApprovalBadgeCount(snapshot.pendingCount));
    const unsubscribeReads = subscribeWorkspaceNotificationReads(setReadNotificationIds);
    return () => {
      unsubscribeApprovals();
      unsubscribeReads();
    };
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
          setApprovalBadgeCount(livePendingCount);
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

  const notifications = getWorkspaceNotifications(approvalBadgeCount, isHydrated, liveNotifications);
  const sidebarBadges = getSidebarNotificationBadges(notifications, readNotificationIds);

  function markMenuNotificationsRead(href?: string) {
    if (!href) return;
    const notificationIds = notifications
      .filter((notification) => notification.href === href)
      .map((notification) => notification.id);
    if (!notificationIds.length) return;
    setReadNotificationIds(markWorkspaceNotificationsRead(notificationIds));
  }

  function hideShellCursorDuringModuleTransition() {
    window.dispatchEvent(new Event("chod:hide-shell-cursor"));
  }

  return (
    <aside className="sidebar" onMouseLeave={hideShellCursorDuringModuleTransition} onPointerLeave={hideShellCursorDuringModuleTransition}>
      <div className="sidebar-footer sidebar-user-header">
        <div className="team-avatar">{user.name.slice(0, 1).toUpperCase()}</div>
        <div className="sidebar-user-copy"><strong>{user.name}</strong><span>{user.email}</span><small>{user.role}</small></div>
        <form action={logout}><button type="submit" className="logout-button" aria-label="Sign out"><LogOut size={18} /></button></form>
      </div>
      <nav>
        {visibleNav.map(({ label, icon: Icon, href, pendingConnector, displayLabel }) => {
          const active = href ? pathname === href : false;
          const badgeCount = href ? sidebarBadges[href] || 0 : 0;
          const content = <><Icon size={21} strokeWidth={1.8} /><span>{displayLabel || label}</span>{isHydrated && badgeCount > 0 ? <em>{badgeCount}</em> : null}</>;
          return href ? (
            <Link key={label} href={href} className={active ? "active" : ""} onClick={() => markMenuNotificationsRead(href)}>{content}</Link>
          ) : (
            <button
              aria-disabled={pendingConnector ? "true" : undefined}
              className={pendingConnector ? "pending-connector" : undefined}
              data-hover-label="Google Sheet pending"
              key={label}
              title={pendingConnector ? "Google Sheet connector is not live yet" : undefined}
              type="button"
            >
              {content}
            </button>
          );
        })}
      </nav>
      <div className="sidebar-system">
        <span className="live-dot" />
        <div><strong>Systems online</strong><small>Live sources only</small></div>
      </div>
    </aside>
  );
}
