export type WorkspaceNotification = {
  id: string;
  title: string;
  detail: string;
  href: string;
  tone: "critical" | "warning" | "info";
  meta: "Tasks" | "Projects" | "Calendar / Schedule" | "Approvals" | "Quotations";
  badgeValue?: number;
};
