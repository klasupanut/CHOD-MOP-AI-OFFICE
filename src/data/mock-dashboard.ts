import type { ActivityItem, DashboardMock, DashboardSummary } from "@/lib/types";

export const dashboardSummary: DashboardSummary = {
  overdueTasks: 3,
  dueThisWeek: 14,
  pendingApprovals: 3,
  activeProjects: 12,
  solarSites: 6,
  majorRenovationJobs: 2,
  solarWarning: 1,
  majorProjectRisk: 1,
  activeFitoutJobs: 8,
  fitoutPendingApproval: 3,
  fitoutOverdue: 2,
};

export const dashboardMock: DashboardMock = {
  updatedAt: "2026-06-27 18:20 ICT",
  headline: "Control Tower live mock data for Tammasit and Dashboard menu.",
  summary: dashboardSummary,
  metrics: [
    { id: "revenue", label: "Project Selling Pipeline", value: "฿8.42M", detail: "Fit-out + Restoration quotation value", tone: "cyan" },
    { id: "approvals", label: "Tammasit Approvals", value: String(dashboardSummary.pendingApprovals), detail: "Internal approvals waiting", tone: "warning" },
    { id: "fitout", label: "Active Fit-out Jobs", value: String(dashboardSummary.activeFitoutJobs), detail: `${dashboardSummary.fitoutOverdue} overdue / ${dashboardSummary.fitoutPendingApproval} pending approval`, tone: "blue" },
    { id: "risk", label: "Critical Risk Watch", value: String(dashboardSummary.overdueTasks + dashboardSummary.majorProjectRisk), detail: "Overdue tasks + major project risk", tone: "danger" },
    { id: "solar", label: "Solar Sites Online", value: String(dashboardSummary.solarSites), detail: dashboardSummary.solarWarning ? "1 site warning" : "All normal", tone: dashboardSummary.solarWarning ? "warning" : "success" },
    { id: "week", label: "Due This Week", value: String(dashboardSummary.dueThisWeek), detail: "Tasks and milestones to follow", tone: "success" },
  ],
  trends: [
    { label: "Mon", revenue: 6.1, workOrders: 18, approvals: 2 },
    { label: "Tue", revenue: 6.8, workOrders: 21, approvals: 3 },
    { label: "Wed", revenue: 7.2, workOrders: 19, approvals: 2 },
    { label: "Thu", revenue: 8.0, workOrders: 25, approvals: 4 },
    { label: "Fri", revenue: 8.42, workOrders: 27, approvals: 3 },
  ],
  focusProjects: [
    { id: "PRJ-FO-AB4", name: "AB4 Electrical Fit-out", type: "Fit-out", owner: "kla", progress: 72, risk: "High", value: 1334290, nextAction: "Tammasit internal approval before client issue" },
    { id: "PRJ-RN-F7", name: "F7-F8 Window Restoration", type: "Restoration", owner: "film", progress: 48, risk: "Medium", value: 104165, nextAction: "Review quotation margin and scope wording" },
    { id: "PRJ-PM-F7", name: "PM Loop F7 Critical Round", type: "PM Loop", owner: "foreman", progress: 61, risk: "High", value: 85000, nextAction: "Close overdue work orders and contractor SLA" },
    { id: "PRJ-SOLAR-03", name: "Solar CHOD-03 Output Review", type: "Solar", owner: "moss", progress: 84, risk: "Low", value: 285000, nextAction: "Monitor output variance and electrical quotation" },
  ],
  agentStatus: [
    { agent: "tammasit", label: "Control Tower", load: 76, status: "3 internal approvals waiting" },
    { agent: "film", label: "Data Center", load: 68, status: "Quotation and document queue active" },
    { agent: "kla", label: "Engineering Center", load: 74, status: "Fit-out / renovation review risk" },
    { agent: "foreman", label: "PM Loop Station", load: 81, status: "3 PM tasks overdue" },
    { agent: "moss", label: "Solar Control Center", load: 52, status: "1 solar warning under watch" },
  ],
};

export const activities: ActivityItem[] = [
  { id: "f1", agent: "film", message: "Fit-out quotation submitted", time: "10:12", tone: "info" },
  { id: "f2", agent: "foreman", message: "Fit-out work progress updated", time: "09:54", tone: "success" },
  { id: "f3", agent: "kla", message: "Fit-out handover pending", time: "09:31", tone: "warning" },
  { id: "f4", agent: "tammasit", message: "Mega Fit-out status updated", time: "09:05", tone: "info" },
  { id: "f5", agent: "tammasit", message: "Mini Fit-out approved", time: "08:47", tone: "success" },
  { id: "a1", agent: "moss", message: "Solar Project CHOD-03 updated", time: "08:24", tone: "success" },
  { id: "a2", agent: "foreman", message: "PM overdue reported", time: "08:11", tone: "danger" },
];

export const quickPrompts = [
  "สรุปงานวันนี้",
  "สรุป Fit-out Project",
  "Fit-out งานไหนค้าง",
  "งาน Fit-out ที่รออนุมัติ",
  "Mini / Mega Fit-out status",
  "Solar Output วันนี้",
  "PM ที่ใกล้ถึงรอบ",
  "งานที่ต้องให้ Tammasit เซ็น",
];
