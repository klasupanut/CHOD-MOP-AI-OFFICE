import "server-only";

import type { ProjectRecord } from "@/data/projects";
import type { TaskRecord } from "@/data/tasks";
import { listApprovalRows } from "@/lib/approvals/approval-store";
import { listTaskProjectData } from "@/lib/connectors/google-sheet-task-project";
import { getFitoutWorkspaceData } from "@/lib/fitout/fitout-google-sheet";

type Tone = "success" | "warning" | "danger" | "cyan" | "blue" | "solar";

export type LiveDashboardData = {
  executiveKPIs: Array<{ id: string; label: string; value: string | number; detail: string; tone: Tone }>;
  projectStatus: Array<{ label: string; value: number; tone: Tone }>;
  taskOverview: {
    totalTasks: number;
    dueToday: number;
    overdue: number;
    waitingApproval: number;
    completedThisWeek: number;
    inProgress: number;
  };
  budget: {
    totalBudget: number;
    committedBudget: number;
    actualCost: number;
    remainingBudget: number;
    utilization: number;
  };
  fitout: {
    activeJobs: number;
    fitout: number;
    restoration: number;
    pendingApproval: number;
    overdue: number;
    handoverPending: number;
    sourceStatus: "live" | "fallback";
    sourceMessage: string;
  };
  pmLoop: {
    compliance: number;
    overdue: number;
    nearCycleAlerts: number;
    workOrdersThisWeek: number;
  };
  solar: {
    sites: number;
    totalCapacityKw: number;
    todayOutputKwh: number;
    monthlyGenerationKwh: number;
    varianceAlerts: number;
    systemWarnings: number;
  };
  quotation: {
    waitingApproval: number;
    approvedThisMonth: number;
    signedThisMonth: number;
    rejectedOrRevision: number;
    totalPendingValue: number;
    actualWorkValue: number;
    notAcceptedValue: number;
    internalApprovedNotSigned: number;
    mainApprover: string;
  };
  annualDivisionRevenue: {
    year: number;
    totalRevenue: number;
    totalProfit: number;
    profitMargin: number;
    divisions: Array<{ id: string; label: string; revenue: number; profit: number; note: string }>;
  };
  alerts: Array<{ level: "Critical" | "High" | "Medium"; count: number; types: string[] }>;
  activity: Array<{ id: string; agent: string; message: string; time: string; tone: "info" | "success" | "warning" | "danger" }>;
  deadlines: Array<{ id: string; label: string; owner: string; due: string; tone: "info" | "warning" | "danger" }>;
  reports: {
    overviewKpis: Array<{ label: string; value: string; detail: string; tone: "cyan" | "success" | "warning" | "danger" | "blue" }>;
    teamMembers: Array<{
      id: "film" | "moss" | "kla" | "foreman" | "tammasit";
      name: string;
      role: string;
      avatar: string;
      activeTasks: number;
      completedThisWeek: number;
      kpis: Array<{ label: string; value: string; tone: "cyan" | "success" | "warning" | "danger" | "blue" }>;
      mainArea: string;
      suggestedReport: string;
    }>;
    recommended: Array<{ id: string; owner: string; title: string; reason: string; tone: "cyan" | "success" | "warning" | "danger" | "blue" }>;
    insights: Array<{ id: string; title: string; summary: string; action: string; tone: "cyan" | "success" | "warning" | "danger" | "blue" }>;
  };
};

const pendingApprovalStatuses = new Set(["Waiting Approval", "Waiting Final Approval"]);

function parseDate(value?: string) {
  if (!value) return null;
  const normalized = value.includes("T") ? value : value.replace(" ", "T");
  const parsed = new Date(normalized);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function isWithinDays(value: string | undefined, days: number) {
  const date = parseDate(value);
  if (!date) return false;
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const end = new Date(start);
  end.setDate(start.getDate() + days);
  return date >= start && date <= end;
}

function formatTime(value?: string) {
  const parsed = parseDate(value);
  if (!parsed) return value || "-";
  return parsed.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function timestamp(value?: string) {
  return parseDate(value)?.getTime() || 0;
}

function isCustomerSigned(approval: Awaited<ReturnType<typeof listApprovalRows>>[number]) {
  return String(approval.clientSigningStatus || "").trim().toLowerCase() === "signed" || Boolean(approval.clientSignedAt);
}

function statusTone(status: string): Tone {
  const normalized = status.toLowerCase();
  if (normalized.includes("completed") || normalized.includes("approved")) return "success";
  if (normalized.includes("hold") || normalized.includes("waiting")) return "warning";
  if (normalized.includes("cancel") || normalized.includes("overdue") || normalized.includes("rejected")) return "danger";
  return "cyan";
}

function projectStatusSummary(projects: ProjectRecord[]) {
  const summary = new Map<string, { label: string; value: number; tone: Tone }>();
  for (const project of projects) {
    const current = summary.get(project.status) || { label: project.status, value: 0, tone: statusTone(project.status) };
    current.value += 1;
    summary.set(project.status, current);
  }
  return Array.from(summary.values()).sort((a, b) => b.value - a.value);
}

function sumProjectBudget(projects: ProjectRecord[]) {
  return projects.reduce((sum, project) => sum + (Number(project.budget) || 0), 0);
}

function isApprovedOperationalStatus(status: string) {
  const normalized = status.trim().toLowerCase();
  return [
    "approved",
    "active",
    "in progress",
    "proceed",
    "proceeding",
    "started",
    "done",
    "completed",
  ].includes(normalized);
}

function isCurrentYearProject(project: ProjectRecord, year: number) {
  const dates = [project.startDate, project.dueDate, project.lastUpdate]
    .map((value) => parseDate(value))
    .filter(Boolean) as Date[];
  if (!dates.length) return true;
  return dates.some((date) => date.getFullYear() === year);
}

function isFitoutWorkspaceProject(project: ProjectRecord) {
  return project.projectType === "Fit-out" || /fit[-\s]?out|restoration/i.test(project.projectName);
}

function approvedProjectBudget(projects: ProjectRecord[]) {
  return projects.reduce((sum, project) => {
    if (!isApprovedOperationalStatus(project.status)) return sum;
    return sum + (Number(project.budget) || 0);
  }, 0);
}

function currentYearFitoutRevenue(fitout: Awaited<ReturnType<typeof getFitoutWorkspaceData>>) {
  const year = new Date().getFullYear();
  const row = fitout.annualRows.find((item) => item.year === year) || fitout.annualRows[0];
  return {
    year: row?.year || year,
    fitoutRevenue: row?.megaRevenue || 0,
    fitoutProfit: row?.megaProfit || 0,
    restorationRevenue: row?.miniRevenue || 0,
    restorationProfit: row?.miniProfit || 0,
    actualCapex: row?.actualCapex || fitout.summary.actualCapex || 0,
  };
}

function activityFromLiveData(tasks: TaskRecord[], projects: ProjectRecord[], approvals: Awaited<ReturnType<typeof listApprovalRows>>) {
  return [
    ...tasks.map((task) => ({
      id: `task-${task.taskId}`,
      agent: task.updatedBy || task.assignedTo || "Team",
      message: `Updated task: ${task.taskTitle}`,
      time: formatTime(task.lastUpdate || task.createdAt),
      tone: task.status === "Done" ? "success" as const : task.status === "Overdue" ? "danger" as const : "info" as const,
      timestamp: timestamp(task.lastUpdate || task.createdAt),
    })),
    ...projects.map((project) => ({
      id: `project-${project.projectId}`,
      agent: project.projectManager || project.createdBy || "Team",
      message: `Updated project: ${project.projectName}`,
      time: formatTime(project.lastUpdate),
      tone: project.status === "Completed" ? "success" as const : project.status === "Waiting Approval" ? "warning" as const : "info" as const,
      timestamp: timestamp(project.lastUpdate),
    })),
    ...approvals.map((approval) => ({
      id: `approval-${approval.approvalId}`,
      agent: approval.approver || "Tammasit",
      message: `${approval.quotationNo} approval status: ${approval.status}`,
      time: formatTime(approval.lastUpdate || approval.requestedAt),
      tone: approval.status === "Approved" ? "success" as const : approval.status === "Rejected" ? "danger" as const : "warning" as const,
      timestamp: timestamp(approval.lastUpdate || approval.requestedAt),
    })),
  ]
    .filter((item) => item.timestamp > 0)
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 8)
    .map(({ timestamp: _timestamp, ...item }) => item);
}

function countActiveTasks(tasks: TaskRecord[], owner: string) {
  return tasks.filter((task) => task.assignedTo.toLowerCase() === owner.toLowerCase() && task.status !== "Done").length;
}

function countCompletedThisWeek(tasks: TaskRecord[], owner: string) {
  return tasks.filter((task) => task.assignedTo.toLowerCase() === owner.toLowerCase() && task.status === "Done" && isWithinDays(task.lastUpdate || task.dueDate, 7)).length;
}

export async function getLiveDashboardData(): Promise<LiveDashboardData> {
  const [taskProjectData, approvalRows, fitoutData] = await Promise.all([
    listTaskProjectData().catch(() => ({ projects: [] as ProjectRecord[], tasks: [] as TaskRecord[] })),
    listApprovalRows().catch(() => []),
    getFitoutWorkspaceData({ allowFallback: false }),
  ]);

  const tasks = taskProjectData.tasks || [];
  const projects = taskProjectData.projects || [];
  const liveApprovals = approvalRows.filter((approval) => approval.source !== "quotation-fallback");
  const today = new Date();
  const activeProjects = projects.filter((project) => !["Completed", "Cancelled"].includes(project.status));
  const overdueTasks = tasks.filter((task) => task.status === "Overdue" || (task.status !== "Done" && !!parseDate(task.dueDate) && parseDate(task.dueDate)! < new Date(today.getFullYear(), today.getMonth(), today.getDate())));
  const waitingTaskApprovals = tasks.filter((task) => task.status === "Waiting Approval");
  const pendingApprovals = liveApprovals.filter((approval) => pendingApprovalStatuses.has(approval.status));
  const approvedThisMonth = liveApprovals.filter((approval) => {
    const date = parseDate(approval.lastUpdate || approval.requestedAt);
    return approval.status === "Approved" && !!date && date.getFullYear() === today.getFullYear() && date.getMonth() === today.getMonth();
  });
  const customerSignedQuotations = liveApprovals.filter(isCustomerSigned);
  const signedThisMonth = customerSignedQuotations.filter((approval) => {
    const date = parseDate(approval.clientSignedAt || approval.lastUpdate || approval.requestedAt);
    return !!date && date.getFullYear() === today.getFullYear() && date.getMonth() === today.getMonth();
  });
  const unsignedQuotations = liveApprovals.filter((approval) => !isCustomerSigned(approval));
  const internalApprovedNotSigned = unsignedQuotations.filter((approval) => approval.status === "Approved");
  const rejectedOrRevision = liveApprovals.filter((approval) => ["Rejected", "Revision Required"].includes(approval.status));
  const fitoutAnnual = currentYearFitoutRevenue(fitoutData);
  const annualProjects = projects.filter((project) => isCurrentYearProject(project, today.getFullYear()));
  const fitoutSheetIsLive = fitoutData.source.status === "live";
  const projectBudgetRows = fitoutSheetIsLive
    ? annualProjects.filter((project) => !isFitoutWorkspaceProject(project))
    : annualProjects;
  const fitoutRestorationAnnualCost = fitoutSheetIsLive ? fitoutAnnual.actualCapex : 0;
  const totalBudget = sumProjectBudget(projectBudgetRows) + fitoutRestorationAnnualCost;
  const committedBudget = approvedProjectBudget(projectBudgetRows);
  const actualCost = committedBudget + fitoutRestorationAnnualCost;
  const remainingBudget = Math.max(0, totalBudget - actualCost);
  const utilization = totalBudget ? Math.round((actualCost / totalBudget) * 100) : 0;
  const pmTasks = tasks.filter((task) => task.category === "PM" || task.sourceModule.toLowerCase().includes("pm") || task.taskTitle.toLowerCase().includes("pm"));
  const pmDone = pmTasks.filter((task) => task.status === "Done").length;
  const pmOverdue = pmTasks.filter((task) => overdueTasks.some((overdue) => overdue.taskId === task.taskId)).length;
  const solarProjects = projects.filter((project) => project.projectType === "Solar" || project.projectName.toLowerCase().includes("solar"));
  const solarTasks = tasks.filter((task) => task.category === "Solar" || task.sourceModule.toLowerCase().includes("solar") || task.taskTitle.toLowerCase().includes("solar"));
  const annualTotalRevenue = fitoutAnnual.fitoutRevenue + fitoutAnnual.restorationRevenue;
  const annualTotalProfit = fitoutAnnual.fitoutProfit + fitoutAnnual.restorationProfit;

  const reportTeamMembers: LiveDashboardData["reports"]["teamMembers"] = [
    {
      id: "film",
      name: "Film",
      role: "Engineer / Data Center",
      avatar: "/assets/characters/film-front.png",
      activeTasks: countActiveTasks(tasks, "Film"),
      completedThisWeek: countCompletedThisWeek(tasks, "Film"),
      kpis: [
        { label: "Approval Queue", value: String(pendingApprovals.length), tone: pendingApprovals.length ? "warning" : "success" },
        { label: "Quotation Tasks", value: String(tasks.filter((task) => task.assignedTo === "Film" && task.category === "Quotation").length), tone: "cyan" },
      ],
      mainArea: "Quotation / Document / Fit-out",
      suggestedReport: "Quotation Weekly Summary",
    },
    {
      id: "moss",
      name: "Moss",
      role: "Electrical Engineer",
      avatar: "/assets/characters/moss-front.png",
      activeTasks: countActiveTasks(tasks, "Moss"),
      completedThisWeek: countCompletedThisWeek(tasks, "Moss"),
      kpis: [
        { label: "Solar Alerts", value: String(solarTasks.filter((task) => task.status !== "Done").length), tone: solarTasks.length ? "warning" : "success" },
        { label: "Electrical Tasks", value: String(tasks.filter((task) => task.assignedTo === "Moss" && task.category === "Electrical").length), tone: "blue" },
      ],
      mainArea: "Solar / Electrical / System Performance",
      suggestedReport: "Solar Performance Summary",
    },
    {
      id: "kla",
      name: "Kla",
      role: "Civil Engineer / Moderator",
      avatar: "/assets/characters/kla-front.png",
      activeTasks: countActiveTasks(tasks, "Kla"),
      completedThisWeek: countCompletedThisWeek(tasks, "Kla"),
      kpis: [
        { label: "Fit-out Tasks", value: String(tasks.filter((task) => task.assignedTo === "Kla" && task.category === "Fit-out").length), tone: "cyan" },
        { label: "High Priority", value: String(tasks.filter((task) => task.assignedTo === "Kla" && ["High", "Critical"].includes(task.priority)).length), tone: "danger" },
      ],
      mainArea: "Engineering / Renovation / Fit-out",
      suggestedReport: "Engineering Review Summary",
    },
    {
      id: "foreman",
      name: "Foreman",
      role: "Maintenance & Site Lead",
      avatar: "/assets/characters/foreman-back.png",
      activeTasks: countActiveTasks(tasks, "Foreman"),
      completedThisWeek: countCompletedThisWeek(tasks, "Foreman"),
      kpis: [
        { label: "PM Overdue", value: String(pmOverdue), tone: pmOverdue ? "danger" : "success" },
        { label: "Site Tasks", value: String(tasks.filter((task) => task.assignedTo === "Foreman" && task.category === "Site").length), tone: "cyan" },
      ],
      mainArea: "PM / Site / Maintenance",
      suggestedReport: "PM / Site Progress Summary",
    },
    {
      id: "tammasit",
      name: "Tammasit",
      role: "Director of Operations",
      avatar: "/assets/characters/tammasit-front.png",
      activeTasks: countActiveTasks(tasks, "Tammasit"),
      completedThisWeek: countCompletedThisWeek(tasks, "Tammasit"),
      kpis: [
        { label: "Pending Approvals", value: String(pendingApprovals.length), tone: pendingApprovals.length ? "warning" : "success" },
        { label: "Team Risks", value: String(overdueTasks.length), tone: overdueTasks.length ? "danger" : "success" },
      ],
      mainArea: "Overall Operation / Decision / Approval",
      suggestedReport: "Executive Decision Summary",
    },
  ];

  return {
    executiveKPIs: [
      { id: "active-projects", label: "Active Projects", value: activeProjects.length, detail: "From live Projects sheet", tone: "cyan" },
      { id: "open-tasks", label: "Open Tasks", value: tasks.filter((task) => task.status !== "Done").length, detail: "From live Tasks sheet", tone: "blue" },
      { id: "budget-utilization", label: "Budget Utilization", value: `${utilization}%`, detail: "Approved annual cost / total budget", tone: "success" },
      { id: "pending-approvals", label: "Pending Approvals", value: pendingApprovals.length, detail: "From live quotation approvals", tone: "warning" },
      { id: "fitout-revenue", label: "Fit-out Revenue", value: fitoutAnnual.fitoutRevenue, detail: "Current year live Fit-out sheet", tone: "solar" },
      { id: "restoration-revenue", label: "Restoration Revenue", value: fitoutAnnual.restorationRevenue, detail: "Current year live Fit-out sheet", tone: "success" },
    ],
    projectStatus: projectStatusSummary(projects),
    taskOverview: {
      totalTasks: tasks.length,
      dueToday: tasks.filter((task) => {
        const due = parseDate(task.dueDate);
        return !!due && isSameDay(due, today);
      }).length,
      overdue: overdueTasks.length,
      waitingApproval: waitingTaskApprovals.length,
      completedThisWeek: tasks.filter((task) => task.status === "Done" && isWithinDays(task.lastUpdate || task.dueDate, 7)).length,
      inProgress: tasks.filter((task) => task.status === "In Progress").length,
    },
    budget: {
      totalBudget,
      committedBudget,
      actualCost,
      remainingBudget,
      utilization,
    },
    fitout: {
      activeJobs: fitoutData.source.status === "live" ? fitoutData.summary.totalJobs : 0,
      fitout: fitoutData.source.status === "live" ? fitoutData.summary.megaJobs : 0,
      restoration: fitoutData.source.status === "live" ? fitoutData.summary.miniJobs : 0,
      pendingApproval: pendingApprovals.filter((approval) => approval.quotationType === "fit-out").length,
      overdue: tasks.filter((task) => task.category === "Fit-out" && overdueTasks.some((overdue) => overdue.taskId === task.taskId)).length,
      handoverPending: tasks.filter((task) => task.category === "Fit-out" && task.taskTitle.toLowerCase().includes("handover") && task.status !== "Done").length,
      sourceStatus: fitoutData.source.status,
      sourceMessage: fitoutData.source.message,
    },
    pmLoop: {
      compliance: pmTasks.length ? Math.round((pmDone / pmTasks.length) * 100) : 0,
      overdue: pmOverdue,
      nearCycleAlerts: pmTasks.filter((task) => task.status !== "Done" && isWithinDays(task.dueDate, 7)).length,
      workOrdersThisWeek: pmTasks.filter((task) => isWithinDays(task.dueDate || task.createdAt, 7)).length,
    },
    solar: {
      sites: solarProjects.length,
      totalCapacityKw: 0,
      todayOutputKwh: 0,
      monthlyGenerationKwh: 0,
      varianceAlerts: solarTasks.filter((task) => task.priority === "High" || task.priority === "Critical").length,
      systemWarnings: solarTasks.filter((task) => task.status === "Overdue").length,
    },
    quotation: {
      waitingApproval: pendingApprovals.length,
      approvedThisMonth: approvedThisMonth.length,
      signedThisMonth: signedThisMonth.length,
      rejectedOrRevision: rejectedOrRevision.length,
      totalPendingValue: pendingApprovals.reduce((sum, approval) => sum + approval.amount, 0),
      actualWorkValue: customerSignedQuotations.reduce((sum, approval) => sum + approval.amount, 0),
      notAcceptedValue: unsignedQuotations.reduce((sum, approval) => sum + approval.amount, 0),
      internalApprovedNotSigned: internalApprovedNotSigned.length,
      mainApprover: "Tammasit",
    },
    annualDivisionRevenue: {
      year: fitoutAnnual.year,
      totalRevenue: annualTotalRevenue,
      totalProfit: annualTotalProfit,
      profitMargin: annualTotalRevenue ? (annualTotalProfit / annualTotalRevenue) * 100 : 0,
      divisions: [
        { id: "fitout", label: "Fit-out", revenue: fitoutAnnual.fitoutRevenue, profit: fitoutAnnual.fitoutProfit, note: "Live FIT-OUT sheet" },
        { id: "restoration", label: "Restoration", revenue: fitoutAnnual.restorationRevenue, profit: fitoutAnnual.restorationProfit, note: "Live RESTORATION sheet" },
      ],
    },
    alerts: [
      { level: "Critical", count: overdueTasks.filter((task) => task.priority === "Critical").length, types: ["Critical overdue tasks"] },
      { level: "High", count: overdueTasks.length + pendingApprovals.length, types: ["Overdue tasks", "Pending approvals"] },
      { level: "Medium", count: activeProjects.length + tasks.length, types: ["Live projects", "Live tasks"] },
    ],
    activity: activityFromLiveData(tasks, projects, liveApprovals),
    deadlines: [
      ...tasks.filter((task) => task.status !== "Done" && isWithinDays(task.dueDate, 14)).map((task) => ({
        id: `task-deadline-${task.taskId}`,
        label: task.taskTitle,
        owner: task.assignedTo || "-",
        due: task.dueDate || "-",
        tone: overdueTasks.some((overdue) => overdue.taskId === task.taskId) ? "danger" as const : "warning" as const,
      })),
      ...projects.filter((project) => !["Completed", "Cancelled"].includes(project.status) && isWithinDays(project.dueDate, 14)).map((project) => ({
        id: `project-deadline-${project.projectId}`,
        label: project.projectName,
        owner: project.projectManager || "-",
        due: project.dueDate || "-",
        tone: "info" as const,
      })),
    ].slice(0, 8),
    reports: {
      overviewKpis: [
        { label: "Team Active Tasks", value: String(tasks.filter((task) => task.status !== "Done").length), detail: "From live Tasks sheet", tone: "cyan" },
        { label: "Tasks Completed This Week", value: String(tasks.filter((task) => task.status === "Done" && isWithinDays(task.lastUpdate || task.dueDate, 7)).length), detail: "From live Tasks sheet", tone: "success" },
        { label: "Overdue by Team", value: String(overdueTasks.length), detail: "Live overdue tasks only", tone: overdueTasks.length ? "danger" : "success" },
        { label: "Pending Quotation Approval", value: String(pendingApprovals.length), detail: "Live quotation approval queue", tone: pendingApprovals.length ? "warning" : "success" },
        { label: "Reports Ready to Generate", value: String(reportTeamMembers.length), detail: "One live summary per team station", tone: "blue" },
        { label: "Team Workload Balance", value: `${tasks.length ? Math.round((1 - Math.min(...reportTeamMembers.map((member) => member.activeTasks)) / Math.max(...reportTeamMembers.map((member) => member.activeTasks), 1)) * 100) : 0}%`, detail: "Calculated from active task spread", tone: "cyan" },
      ],
      teamMembers: reportTeamMembers,
      recommended: [
        { id: "film-quotation", owner: "Film", title: "Quotation Approval Summary", reason: `${pendingApprovals.length} live quotations are waiting for approval.`, tone: pendingApprovals.length ? "warning" : "success" },
        { id: "moss-solar", owner: "Moss", title: "Solar / Electrical Task Summary", reason: `${solarTasks.length} live solar/electrical tasks found.`, tone: solarTasks.length ? "blue" : "success" },
        { id: "kla-fitout", owner: "Kla", title: "Fit-out Engineering Summary", reason: `${tasks.filter((task) => task.category === "Fit-out").length} live Fit-out tasks found.`, tone: "cyan" },
        { id: "foreman-pm", owner: "Foreman", title: "PM Overdue Report", reason: `${pmOverdue} live PM tasks are overdue.`, tone: pmOverdue ? "danger" : "success" },
        { id: "tammasit-weekly", owner: "Tammasit", title: "Executive Weekly Summary", reason: `${activeProjects.length} active projects and ${overdueTasks.length} overdue tasks from live data.`, tone: "cyan" },
      ],
      insights: [
        { id: "overdue", title: "Overdue Focus", summary: `${overdueTasks.length} live tasks are overdue.`, action: "View overdue focus", tone: overdueTasks.length ? "danger" : "success" },
        { id: "approval", title: "Approval Bottleneck", summary: `${pendingApprovals.length} quotations are waiting for approval.`, action: "View approval queue", tone: pendingApprovals.length ? "warning" : "success" },
        { id: "on-track", title: "On Track", summary: `${activeProjects.length} active projects are currently tracked.`, action: "View project status", tone: "cyan" },
        { id: "load", title: "Team Load Balance", summary: "Calculated from live task assignment by team member.", action: "View workload detail", tone: "blue" },
      ],
    },
  };
}
