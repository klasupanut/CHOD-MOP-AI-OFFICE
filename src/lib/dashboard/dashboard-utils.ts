import { dashboardModules } from "@/data/dashboard";
import { getFitoutWorkspaceData } from "@/lib/fitout/fitout-google-sheet";

const money = (value: number) =>
  new Intl.NumberFormat("th-TH", { style: "currency", currency: "THB", maximumFractionDigits: 0 }).format(value);

const percent = (value: number) => `${Math.round(value)}%`;

function isApprovedOperationalStatus(status: string) {
  return ["approved", "active", "in progress", "proceed", "proceeding", "started", "done", "completed"].includes(
    status.trim().toLowerCase(),
  );
}

function approvedProjectBudget() {
  return dashboardModules.projects.reduce((sum, project) => {
    if (!isApprovedOperationalStatus(project.status)) return sum;
    return sum + project.budget;
  }, 0);
}

export function getExecutiveKPIs() {
  const activeProjects = dashboardModules.projects.filter((project) => !["Completed", "Cancelled"].includes(project.status)).length;
  const inProgressTasks = dashboardModules.tasks.filter((task) => task.status === "In Progress").length;
  const overdueTasks = dashboardModules.tasks.filter((task) => task.status === "Overdue").length;
  const pendingQuotationApprovals = dashboardModules.approvals.filter((approval) => approval.status === "Waiting Approval" || approval.status === "Waiting Final Approval").length;
  const totalBudget = dashboardModules.projects.reduce((sum, project) => sum + project.budget, 0);
  const committedBudget = approvedProjectBudget();
  const averageProgress = Math.round(
    dashboardModules.tasks.reduce((sum, task) => sum + task.progress, 0) / Math.max(1, dashboardModules.tasks.length),
  );

  return [
    { id: "active-projects", label: "Active Projects", value: String(activeProjects), detail: "Projects currently open", tone: "cyan" },
    { id: "tasks-progress", label: "Tasks In Progress", value: String(inProgressTasks), detail: "Live task execution", tone: "blue" },
    { id: "overdue", label: "Overdue Tasks", value: String(overdueTasks), detail: "Needs escalation today", tone: "danger" },
    { id: "pending-approvals", label: "Pending Quotation Approvals", value: String(pendingQuotationApprovals), detail: "Quotation approvals only", tone: "warning" },
    { id: "budget-utilization", label: "Budget Utilization", value: percent((committedBudget / totalBudget) * 100), detail: `${money(committedBudget)} approved annual cost`, tone: "success" },
    { id: "overall-progress", label: "Overall Progress", value: percent(averageProgress), detail: "Average task progress", tone: "cyan" },
  ] as const;
}

export function getProjectStatusSummary() {
  return [
    { label: "On Track", value: dashboardModules.projects.filter((project) => project.priority === "Low" || project.priority === "Medium").length, tone: "success" },
    { label: "In Progress", value: dashboardModules.projects.filter((project) => project.status === "In Progress").length, tone: "cyan" },
    { label: "At Risk", value: dashboardModules.projects.filter((project) => project.priority === "High").length, tone: "warning" },
    { label: "Delayed", value: dashboardModules.projects.filter((project) => project.priority === "Critical" || project.status === "Waiting Approval").length, tone: "danger" },
    { label: "Completed", value: dashboardModules.projects.filter((project) => project.status === "Completed").length, tone: "blue" },
  ];
}

export function getTaskOverview() {
  return {
    totalTasks: dashboardModules.tasks.length,
    dueToday: 3,
    overdue: dashboardModules.tasks.filter((task) => task.status === "Overdue").length,
    waitingApproval: dashboardModules.tasks.filter((task) => task.status === "Waiting Approval").length,
    completedThisWeek: dashboardModules.tasks.filter((task) => task.status === "Done").length + 4,
  };
}

export function getBudgetOverview() {
  const totalBudget = dashboardModules.projects.reduce((sum, project) => sum + project.budget, 0);
  const committedBudget = approvedProjectBudget();
  const actualCost = committedBudget;
  return {
    totalBudget,
    committedBudget,
    actualCost,
    remainingBudget: totalBudget - actualCost,
    utilization: Math.round((actualCost / totalBudget) * 100),
  };
}

export function getFitoutOverview() {
  return dashboardModules.fitout;
}

export function getPmLoopOverview() {
  return dashboardModules.pmLoop;
}

export function getSolarOverview() {
  return dashboardModules.solar;
}

export function getQuotationApprovalOverview() {
  const waitingApproval = dashboardModules.approvals.filter((approval) => approval.status === "Waiting Approval" || approval.status === "Waiting Final Approval").length;
  return {
    waitingApproval,
    approvedThisMonth: dashboardModules.quotations.approvedThisMonth,
    rejectedOrRevision: dashboardModules.quotations.rejectedOrRevision,
    totalPendingValue: dashboardModules.quotations.totalPendingValue,
    mainApprover: dashboardModules.quotations.mainApprover,
  };
}

export async function getAnnualDivisionRevenueSummary() {
  const liveFitout = await getFitoutWorkspaceData();
  const year = new Date().getFullYear();
  const currentYear = liveFitout.annualRows.find((row) => row.year === year)
    || liveFitout.annualRows.find((row) => row.realizedRevenue || row.netOperatingProfit)
    || liveFitout.annualRows[0];
  const fitoutRevenue = currentYear?.megaRevenue || 0;
  const fitoutProfit = currentYear?.megaProfit || 0;
  const restorationRevenue = currentYear?.miniRevenue || 0;
  const restorationProfit = currentYear?.miniProfit || 0;
  const totalRevenue = fitoutRevenue + restorationRevenue;
  const totalProfit = fitoutProfit + restorationProfit;

  return {
    year: currentYear?.year || year,
    totalRevenue,
    totalProfit,
    profitMargin: totalRevenue ? (totalProfit / totalRevenue) * 100 : 0,
    sourceStatus: liveFitout.source.status,
    sourceMessage: liveFitout.source.message,
    divisions: [
      {
        id: "fitout",
        label: "Fit-out",
        revenue: fitoutRevenue,
        profit: fitoutProfit,
        note: "From Google Sheet tab: FIT-OUT",
      },
      {
        id: "restoration",
        label: "Restoration",
        revenue: restorationRevenue,
        profit: restorationProfit,
        note: "From Google Sheet tab: RESTORATION",
      },
    ],
  };
}

export function getAlertSummary() {
  return [
    { level: "Critical", count: dashboardModules.tasks.filter((task) => task.priority === "Critical" || task.status === "Overdue").length, types: ["PM overdue", "Budget overrun"] },
    { level: "High", count: dashboardModules.fitout.overdue + dashboardModules.solar.varianceAlerts, types: ["Fit-out overdue", "Solar output variance"] },
    { level: "Medium", count: getQuotationApprovalOverview().waitingApproval + dashboardModules.documents.expiring, types: ["Quotation waiting approval", "Document expiring"] },
    { level: "Low", count: dashboardModules.documents.missing, types: ["Document missing"] },
  ];
}

export function getDashboardActivityFeed() {
  return [
    { id: "dash-a1", agent: "Film", message: "submitted quotation", time: "10:12", tone: "info" },
    { id: "dash-a2", agent: "Moss", message: "updated solar output", time: "09:48", tone: "success" },
    { id: "dash-a3", agent: "Kla", message: "uploaded shop drawing", time: "09:24", tone: "info" },
    { id: "dash-a4", agent: "Foreman", message: "updated PM progress", time: "08:55", tone: "warning" },
    { id: "dash-a5", agent: "Tammasit", message: "approved quotation", time: "08:30", tone: "success" },
  ];
}

export function getUpcomingDeadlines() {
  return dashboardModules.upcomingDeadlines;
}
