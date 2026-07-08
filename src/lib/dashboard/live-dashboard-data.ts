import "server-only";

import type { ProjectRecord } from "@/data/projects";
import type { TaskRecord } from "@/data/tasks";
import { listApprovalRows } from "@/lib/approvals/approval-store";
import { getBudgetUtilizeData, type BudgetUtilizeData } from "@/lib/budget-utilize/budget-utilize-data";
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
    projectPortfolio: {
      totalProjects: number;
      activeProjects: number;
      completedProjects: number;
      overdueProjects: number;
      totalBudget: number;
      activeBudget: number;
      completedBudget: number;
      watchBudget: number;
      doneRate: number;
      workloadBalance: number;
      busiestMember: string;
      busiestScore: number;
      sourceName: string;
    };
    overviewKpis: Array<{ label: string; value: string; detail: string; tone: "cyan" | "success" | "warning" | "danger" | "blue" }>;
    teamMembers: Array<{
      id: "film" | "moss" | "kla" | "foreman" | "tammasit";
      name: string;
      role: string;
      avatar: string;
      activeTasks: number;
      completedThisWeek: number;
      kpis: Array<{ label: string; value: string; tone: "cyan" | "success" | "warning" | "danger" | "blue" }>;
      projectSummary: {
        activeProjects: number;
        totalProjects: number;
        totalBudget: number;
        overdueProjects: number;
        topProjects: string[];
      };
      workload: {
        score: number;
        percent: number;
        label: string;
        detail: string;
        skillMatch: string;
        breakdown: {
          executionLoad: number;
          projectLoad: number;
          watchLoad: number;
          riskLoad: number;
          budgetLoad: number;
          bottleneckLoad: number;
        };
        tone: "cyan" | "success" | "warning" | "danger" | "blue";
      };
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

function formatBaht(value: number) {
  return new Intl.NumberFormat("th-TH", {
    style: "currency",
    currency: "THB",
    maximumFractionDigits: 0,
  }).format(value);
}

function timestamp(value?: string) {
  return parseDate(value)?.getTime() || 0;
}

function isCustomerSigned(approval: Awaited<ReturnType<typeof listApprovalRows>>[number]) {
  const status = String(approval.clientSigningStatus || "").trim().toLowerCase();
  return status === "signed" || status === "internal_verified" || Boolean(approval.clientSignedAt);
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

function projectTouchesOwner(project: ProjectRecord, owner: string) {
  const target = owner.toLowerCase();
  return project.projectManager.toLowerCase() === target || project.assignedTeam.some((member) => member.toLowerCase() === target);
}

function isProjectOverdue(project: ProjectRecord) {
  const dueDate = parseDate(project.dueDate);
  if (!dueDate || ["Completed", "Cancelled"].includes(project.status)) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return dueDate < today;
}

function summarizeProjectsForOwner(projects: ProjectRecord[], owner: string) {
  const ownerProjects = projects.filter((project) => projectTouchesOwner(project, owner));
  const activeProjects = ownerProjects.filter((project) => !["Completed", "Cancelled"].includes(project.status));
  return {
    activeProjects: activeProjects.length,
    totalProjects: ownerProjects.length,
    totalBudget: sumProjectBudget(ownerProjects),
    overdueProjects: ownerProjects.filter(isProjectOverdue).length,
    topProjects: ownerProjects
      .sort((a, b) => (Number(b.budget) || 0) - (Number(a.budget) || 0))
      .slice(0, 3)
      .map((project) => project.projectName),
  };
}

function budgetStatusCount(budgetUtilizeData: BudgetUtilizeData, key: "done" | "active" | "stopped" | "blank") {
  return budgetUtilizeData.summary.statusRows.find((row) => row.key === key)?.value || 0;
}

function budgetStatusBudget(budgetUtilizeData: BudgetUtilizeData, key: "done" | "active" | "stopped" | "blank") {
  return budgetUtilizeData.summary.statusRows.find((row) => row.key === key)?.budget || 0;
}

function summarizeBudgetUtilizeForOwner(budgetUtilizeData: BudgetUtilizeData, projects: ProjectRecord[], owner: string) {
  if (budgetUtilizeData.source.status !== "live") return summarizeProjectsForOwner(projects, owner);

  const row = budgetUtilizeData.summary.ownerRows.find((item) => item.person.toLowerCase() === owner.toLowerCase());
  if (!row) return summarizeProjectsForOwner(projects, owner);

  return {
    activeProjects: row.active,
    totalProjects: row.total,
    totalBudget: row.budget,
    overdueProjects: row.watch,
    topProjects: row.topProjects,
  };
}

type WorkDomain = "Quotation" | "Document" | "Approval" | "Fit-out" | "Renovation" | "Solar" | "Electrical" | "PM" | "Site" | "Maintenance" | "Engineering" | "Executive" | "General";
type BudgetTask = BudgetUtilizeData["tasks"][number];
type WorkloadBreakdown = LiveDashboardData["reports"]["teamMembers"][number]["workload"]["breakdown"];

function taskDomain(task: TaskRecord): WorkDomain {
  const text = `${task.category} ${task.sourceModule} ${task.taskTitle} ${task.taskDescription}`.toLowerCase();
  if (task.category === "Quotation" || text.includes("quotation")) return "Quotation";
  if (task.category === "Document" || text.includes("document")) return "Document";
  if (task.category === "Approval" || text.includes("approval")) return "Approval";
  if (task.category === "Solar" || text.includes("solar")) return "Solar";
  if (task.category === "Electrical" || text.includes("electrical") || text.includes("power")) return "Electrical";
  if (task.category === "PM" || text.includes("pm loop")) return "PM";
  if (task.category === "Site" || text.includes("site")) return "Site";
  if (task.category === "Fit-out" || text.includes("fit-out") || text.includes("fitout")) return "Fit-out";
  if (task.category === "Renovation" || text.includes("renovation")) return "Renovation";
  return "General";
}

function budgetTaskDomain(task: BudgetTask): WorkDomain {
  const text = `${task.item} ${task.sourceTitle} ${task.budgetCode} ${task.site}`.toLowerCase();
  if (text.includes("solar") || text.includes("โซล")) return "Solar";
  if (text.includes("electrical") || text.includes("power") || text.includes("led") || text.includes("ไฟ") || text.includes("โคม")) return "Electrical";
  if (text.includes("pm") || text.includes("maintenance")) return "PM";
  if (text.includes("fit") || text.includes("siding")) return "Fit-out";
  if (text.includes("drawing") || text.includes("calculation") || text.includes("engineering")) return "Engineering";
  if (text.includes("site") || text.includes("หน้างาน")) return "Site";
  if (text.includes("renovation") || text.includes("ปรับ") || text.includes("ซ่อม")) return "Renovation";
  return "General";
}

const coreSkillDomains: Record<string, WorkDomain[]> = {
  Film: ["Quotation", "Document", "Approval", "Fit-out"],
  Kla: ["Engineering", "Fit-out", "Renovation", "Site", "General"],
  Moss: ["Solar", "Electrical"],
  Foreman: ["PM", "Site", "Maintenance", "Renovation"],
  Tammasit: ["Approval", "Executive", "General"],
};

const supportSkillDomains: Record<string, WorkDomain[]> = {
  Film: ["Renovation", "General", "Site"],
  Kla: ["Quotation", "Document", "PM", "Approval"],
  Moss: ["Fit-out", "Site", "General"],
  Foreman: ["Fit-out", "General"],
  Tammasit: ["Quotation", "Fit-out", "Renovation", "Solar", "Electrical", "PM", "Site"],
};

function skillFactor(owner: string, domain: WorkDomain) {
  const normalizedOwner = owner.trim();
  if (coreSkillDomains[normalizedOwner]?.includes(domain)) return 0.85;
  if (supportSkillDomains[normalizedOwner]?.includes(domain)) return 1;
  if (domain === "General") return 1;
  return 1.25;
}

function priorityMultiplier(priority: TaskRecord["priority"]) {
  if (priority === "Critical") return 1.8;
  if (priority === "High") return 1.4;
  if (priority === "Low") return 0.8;
  return 1;
}

function statusMultiplier(status: TaskRecord["status"]) {
  if (status === "Overdue") return 1.6;
  if (status === "Waiting Approval") return 1.2;
  if (status === "To Do") return 0.9;
  if (status === "Done") return 0;
  return 1;
}

function roundScore(value: number) {
  return Math.round(value * 10) / 10;
}

function workloadSkillMatchLabel(skillFactors: number[]) {
  if (!skillFactors.length) return "No skill-mapped live work";
  const average = skillFactors.reduce((sum, factor) => sum + factor, 0) / skillFactors.length;
  if (average <= 0.92) return "Strong skill match";
  if (average <= 1.08) return "Mixed skill match";
  return "Skill stretch";
}

function budgetValueLoad(value: number, multiplier: number) {
  if (!Number.isFinite(value) || value <= 0) return 0;
  return Math.sqrt(value / 500_000) * multiplier;
}

function weightedBudgetLoad(ownerBudgetTasks: BudgetTask[], projectSummary: ReturnType<typeof summarizeProjectsForOwner>) {
  if (!ownerBudgetTasks.length) {
    return budgetValueLoad(projectSummary.totalBudget, 2);
  }

  const activeBudget = ownerBudgetTasks
    .filter((task) => task.statusKey === "active")
    .reduce((sum, task) => sum + task.budget, 0);
  const watchBudget = ownerBudgetTasks
    .filter((task) => task.statusKey === "blank")
    .reduce((sum, task) => sum + task.budget, 0);
  const completedBudget = ownerBudgetTasks
    .filter((task) => task.statusKey === "done")
    .reduce((sum, task) => sum + task.budget, 0);

  return (
    budgetValueLoad(activeBudget, 2) +
    budgetValueLoad(watchBudget, 1.5) +
    budgetValueLoad(completedBudget, 0.4)
  );
}

function workloadScore(tasks: TaskRecord[], projectSummary: ReturnType<typeof summarizeProjectsForOwner>, owner: string, budgetTasks: BudgetTask[], pendingApprovalCount: number) {
  const ownerTasks = tasks.filter((task) => task.assignedTo.toLowerCase() === owner.toLowerCase());
  const openTasks = ownerTasks.filter((task) => task.status !== "Done");
  const riskTasks = openTasks.filter((task) => ["High", "Critical"].includes(task.priority) || task.status === "Overdue");
  const ownerBudgetTasks = budgetTasks.filter((task) => task.owner.toLowerCase() === owner.toLowerCase());
  const activeBudgetTasks = ownerBudgetTasks.filter((task) => task.statusKey !== "done" && task.statusKey !== "stopped");
  const taskSkillFactors: number[] = [];
  const budgetSkillFactors: number[] = [];

  const executionLoad = openTasks.reduce((sum, task) => {
    const factor = skillFactor(owner, taskDomain(task));
    taskSkillFactors.push(factor);
    return sum + 1 * priorityMultiplier(task.priority) * statusMultiplier(task.status) * factor;
  }, 0);

  const riskLoad = riskTasks.reduce((sum, task) => {
    const factor = skillFactor(owner, taskDomain(task));
    return sum + 0.8 * priorityMultiplier(task.priority) * statusMultiplier(task.status) * factor;
  }, 0);

  const projectLoad = activeBudgetTasks.length
    ? activeBudgetTasks.reduce((sum, task) => {
        const factor = skillFactor(owner, budgetTaskDomain(task));
        budgetSkillFactors.push(factor);
        return sum + 1.0 * factor;
      }, 0)
    : projectSummary.activeProjects * 1.2;

  const watchLoad = activeBudgetTasks.length
    ? activeBudgetTasks.reduce((sum, task) => {
        const factor = skillFactor(owner, budgetTaskDomain(task));
        return sum + 1.15 * factor;
      }, 0)
    : projectSummary.overdueProjects * 1.6;

  const budgetLoad = weightedBudgetLoad(ownerBudgetTasks, projectSummary);
  const bottleneckLoad =
    owner === "Tammasit" ? pendingApprovalCount * 1.5 :
    owner === "Film" ? pendingApprovalCount * 0.8 :
    owner === "Kla" ? pendingApprovalCount * 0.4 :
    0;

  const breakdown: WorkloadBreakdown = {
    executionLoad: roundScore(executionLoad),
    projectLoad: roundScore(projectLoad),
    watchLoad: roundScore(watchLoad),
    riskLoad: roundScore(riskLoad),
    budgetLoad: roundScore(budgetLoad),
    bottleneckLoad: roundScore(bottleneckLoad),
  };
  const score = roundScore(Object.values(breakdown).reduce((sum, value) => sum + value, 0));
  const skillMatch = workloadSkillMatchLabel([...taskSkillFactors, ...budgetSkillFactors]);

  return {
    score,
    breakdown,
    skillMatch,
  };
}

function managementLoadScore(
  budgetUtilizeData: BudgetUtilizeData,
  pendingApprovalCount: number,
  overdueTaskCount: number,
  executionScores: number[],
) {
  const activeControlLoad = budgetStatusCount(budgetUtilizeData, "active") * 1.0;
  const approvalLoad = pendingApprovalCount * 2.0;
  const watchlistLoad = budgetUtilizeData.summary.watchItems * 2.5;
  const maxExecutionScore = Math.max(...executionScores, 1);
  const highWorkloadTeamMembers = executionScores.filter((score) => Math.round((score / maxExecutionScore) * 100) >= 85).length;
  const teamRiskLoad = highWorkloadTeamMembers * 3.0;
  const activeWorkValueLoad = Math.min(20, ((budgetUtilizeData.summary.activeBudget || budgetStatusBudget(budgetUtilizeData, "active")) / 1_000_000) * 0.5);
  const escalationLoad = overdueTaskCount * 2.5;

  const breakdown: WorkloadBreakdown = {
    executionLoad: roundScore(activeControlLoad),
    projectLoad: roundScore(approvalLoad),
    watchLoad: roundScore(watchlistLoad),
    riskLoad: roundScore(teamRiskLoad),
    budgetLoad: roundScore(activeWorkValueLoad),
    bottleneckLoad: roundScore(escalationLoad),
  };
  const score = roundScore(Object.values(breakdown).reduce((sum, value) => sum + value, 0));

  return {
    score,
    breakdown,
    skillMatch: "Control Tower management model",
  };
}

function workloadBalance(scores: number[]) {
  const activeScores = scores.filter((score) => score > 0);
  if (activeScores.length < 2) return 100;
  const average = activeScores.reduce((sum, score) => sum + score, 0) / activeScores.length;
  if (!average) return 100;
  const variance = activeScores.reduce((sum, score) => sum + (score - average) ** 2, 0) / activeScores.length;
  const coefficient = Math.sqrt(variance) / average;
  return Math.max(0, Math.min(100, Math.round(100 - coefficient * 100)));
}

function workloadLabel(percent: number) {
  if (percent >= 85) return { label: "Overloaded", tone: "danger" as const };
  if (percent >= 65) return { label: "Heavy", tone: "warning" as const };
  if (percent >= 35) return { label: "Healthy", tone: "success" as const };
  return {
    label: "Light",
    tone: "blue" as const,
  };
}

export async function getLiveDashboardData(): Promise<LiveDashboardData> {
  const [taskProjectData, approvalRows, fitoutData, budgetUtilizeData] = await Promise.all([
    listTaskProjectData().catch(() => ({ projects: [] as ProjectRecord[], tasks: [] as TaskRecord[] })),
    listApprovalRows().catch(() => []),
    getFitoutWorkspaceData({ allowFallback: false }),
    getBudgetUtilizeData(),
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
  const budgetUtilizeIsLive = budgetUtilizeData.source.status === "live";
  const budgetUtilizeTotalBudget = budgetUtilizeIsLive ? budgetUtilizeData.summary.totalBudget : sumProjectBudget(projectBudgetRows);
  const budgetUtilizeActualCost = budgetUtilizeIsLive ? budgetUtilizeData.summary.realizedBudget : approvedProjectBudget(projectBudgetRows);
  const totalBudget = budgetUtilizeTotalBudget + fitoutRestorationAnnualCost;
  const actualCost = budgetUtilizeActualCost + fitoutRestorationAnnualCost;
  const committedBudget = actualCost;
  const remainingBudget = Math.max(0, totalBudget - actualCost);
  const utilization = totalBudget ? Math.round((actualCost / totalBudget) * 100) : 0;
  const pmTasks = tasks.filter((task) => task.category === "PM" || task.sourceModule.toLowerCase().includes("pm") || task.taskTitle.toLowerCase().includes("pm"));
  const pmDone = pmTasks.filter((task) => task.status === "Done").length;
  const pmOverdue = pmTasks.filter((task) => overdueTasks.some((overdue) => overdue.taskId === task.taskId)).length;
  const solarProjects = projects.filter((project) => project.projectType === "Solar" || project.projectName.toLowerCase().includes("solar"));
  const solarTasks = tasks.filter((task) => task.category === "Solar" || task.sourceModule.toLowerCase().includes("solar") || task.taskTitle.toLowerCase().includes("solar"));
  const annualTotalRevenue = fitoutAnnual.fitoutRevenue + fitoutAnnual.restorationRevenue;
  const annualTotalProfit = fitoutAnnual.fitoutProfit + fitoutAnnual.restorationProfit;
  const projectSummaryByOwner = {
    Film: summarizeBudgetUtilizeForOwner(budgetUtilizeData, projects, "Film"),
    Moss: summarizeBudgetUtilizeForOwner(budgetUtilizeData, projects, "Moss"),
    Kla: summarizeBudgetUtilizeForOwner(budgetUtilizeData, projects, "Kla"),
    Foreman: summarizeBudgetUtilizeForOwner(budgetUtilizeData, projects, "Foreman"),
    Tammasit: summarizeBudgetUtilizeForOwner(budgetUtilizeData, projects, "Tammasit"),
  };

  const baseReportTeamMembers: Array<Omit<LiveDashboardData["reports"]["teamMembers"][number], "workload">> = [
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
      projectSummary: projectSummaryByOwner.Film,
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
      projectSummary: projectSummaryByOwner.Moss,
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
      projectSummary: projectSummaryByOwner.Kla,
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
      projectSummary: projectSummaryByOwner.Foreman,
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
      projectSummary: projectSummaryByOwner.Tammasit,
      mainArea: "Overall Operation / Decision / Approval",
      suggestedReport: "Executive Decision Summary",
    },
  ];
  const executionWorkloadResults = baseReportTeamMembers
    .filter((member) => member.id !== "tammasit")
    .map((member) => [member.id, workloadScore(tasks, member.projectSummary, member.name, budgetUtilizeData.tasks, pendingApprovals.length)] as const);
  const executionWorkloadById = new Map(executionWorkloadResults);
  const executionWorkloadScores = executionWorkloadResults.map(([, result]) => result.score);
  const tammasitManagementResult = managementLoadScore(budgetUtilizeData, pendingApprovals.length, overdueTasks.length, executionWorkloadScores);
  const workloadResults = baseReportTeamMembers.map((member) =>
    member.id === "tammasit"
      ? tammasitManagementResult
      : executionWorkloadById.get(member.id) || workloadScore(tasks, member.projectSummary, member.name, budgetUtilizeData.tasks, pendingApprovals.length),
  );
  const maxWorkloadScore = Math.max(...executionWorkloadScores, 1);
  const reportTeamMembers: LiveDashboardData["reports"]["teamMembers"] = baseReportTeamMembers.map((member, index) => {
    const result = workloadResults[index] || {
      score: 0,
      skillMatch: "No skill-mapped live work",
      breakdown: { executionLoad: 0, projectLoad: 0, watchLoad: 0, riskLoad: 0, budgetLoad: 0, bottleneckLoad: 0 },
    };
    const score = result.score;
    const percent = member.id === "tammasit"
      ? Math.max(0, Math.min(100, Math.round(score)))
      : Math.round((score / maxWorkloadScore) * 100);
    const level = workloadLabel(percent);
    return {
      ...member,
      workload: {
        score,
        percent,
        label: level.label,
        tone: level.tone,
        skillMatch: result.skillMatch,
        breakdown: result.breakdown,
        detail: member.id === "tammasit"
          ? `${budgetStatusCount(budgetUtilizeData, "active")} active projects / ${budgetUtilizeData.summary.watchItems} watch items / ${pendingApprovals.length} approvals / Control Tower`
          : `${member.projectSummary.activeProjects} active projects / ${member.activeTasks} open tasks / ${result.skillMatch}`,
      },
    };
  });
  const balanceScore = workloadBalance(executionWorkloadScores);
  const busiestMember = reportTeamMembers.filter((member) => member.id !== "tammasit").slice().sort((a, b) => b.workload.score - a.workload.score)[0];
  const overdueProjectCount = projects.filter(isProjectOverdue).length;
  const completedProjectCount = projects.filter((project) => project.status === "Completed").length;
  const budgetProjectPortfolio = budgetUtilizeIsLive
    ? {
        totalProjects: budgetUtilizeData.summary.totalTasks,
        activeProjects: budgetStatusCount(budgetUtilizeData, "active"),
        completedProjects: budgetStatusCount(budgetUtilizeData, "done"),
        overdueProjects: budgetUtilizeData.summary.watchItems,
        totalBudget: budgetUtilizeData.summary.totalBudget,
        activeBudget: budgetUtilizeData.summary.activeBudget || budgetStatusBudget(budgetUtilizeData, "active"),
        completedBudget: budgetStatusBudget(budgetUtilizeData, "done"),
        watchBudget: budgetUtilizeData.summary.watchBudget,
        doneRate: budgetUtilizeData.summary.doneRate,
        sourceName: "Projects & Budgets live sheet",
      }
    : {
        totalProjects: projects.length,
        activeProjects: activeProjects.length,
        completedProjects: completedProjectCount,
        overdueProjects: overdueProjectCount,
        totalBudget: sumProjectBudget(projects),
        activeBudget: sumProjectBudget(activeProjects),
        completedBudget: sumProjectBudget(projects.filter((project) => project.status === "Completed")),
        watchBudget: sumProjectBudget(projects.filter(isProjectOverdue)),
        doneRate: projects.length ? Math.round((completedProjectCount / projects.length) * 100) : 0,
        sourceName: "Task / Project Projects tab",
      };
  const projectPortfolio = {
    ...budgetProjectPortfolio,
    workloadBalance: balanceScore,
    busiestMember: busiestMember?.name || "-",
    busiestScore: busiestMember?.workload.score || 0,
  };

  return {
    executiveKPIs: [
      { id: "active-projects", label: "Active Projects", value: activeProjects.length, detail: "From live Projects sheet", tone: "cyan" },
      { id: "open-tasks", label: "Open Tasks", value: tasks.filter((task) => task.status !== "Done").length, detail: "From live Tasks sheet", tone: "blue" },
      { id: "budget-utilization", label: "Budget Utilization", value: `${utilization}%`, detail: budgetUtilizeIsLive ? "Budget Utilize actual + Fit-out / Restoration cost" : "Approved annual cost / total budget", tone: "success" },
      { id: "pending-approvals", label: "Pending Approvals", value: pendingApprovals.length, detail: "From live quotation approvals", tone: "warning" },
      { id: "fitout-revenue", label: "Fit-out Revenue", value: formatBaht(fitoutAnnual.fitoutRevenue), detail: "Current year live Fit-out sheet", tone: "solar" },
      { id: "restoration-revenue", label: "Restoration Revenue", value: formatBaht(fitoutAnnual.restorationRevenue), detail: "Current year live Fit-out sheet", tone: "success" },
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
      projectPortfolio,
      overviewKpis: [
        { label: "Total Projects", value: String(projectPortfolio.totalProjects), detail: projectPortfolio.sourceName, tone: "cyan" },
        { label: "Active Projects", value: String(projectPortfolio.activeProjects), detail: `${formatBaht(projectPortfolio.activeBudget)} active work value`, tone: projectPortfolio.activeProjects ? "blue" : "success" },
        { label: "Project Work Value", value: formatBaht(projectPortfolio.totalBudget), detail: `${formatBaht(projectPortfolio.completedBudget)} completed value tracked`, tone: "success" },
        { label: budgetUtilizeIsLive ? "Watch Items" : "Overdue Projects", value: String(projectPortfolio.overdueProjects), detail: `${formatBaht(projectPortfolio.watchBudget)} value needs follow-up`, tone: projectPortfolio.overdueProjects ? "warning" : "success" },
        { label: budgetUtilizeIsLive ? "Done Rate" : "Project Completion", value: `${projectPortfolio.doneRate}%`, detail: `${projectPortfolio.completedProjects}/${projectPortfolio.totalProjects} projects completed`, tone: "blue" },
        { label: "Execution Workload Balance", value: `${projectPortfolio.workloadBalance}%`, detail: `Busiest execution owner: ${projectPortfolio.busiestMember} / score ${projectPortfolio.busiestScore}`, tone: projectPortfolio.workloadBalance < 50 ? "warning" : "cyan" },
      ],
      teamMembers: reportTeamMembers,
      recommended: [
        { id: "portfolio-scope", owner: "Tammasit", title: "Project Portfolio Review", reason: `${projectPortfolio.totalProjects} projects / ${formatBaht(projectPortfolio.totalBudget)} total work value from ${projectPortfolio.sourceName}.`, tone: "cyan" },
        { id: "active-value", owner: projectPortfolio.busiestMember, title: "Active Project Action List", reason: `${projectPortfolio.activeProjects} active projects worth ${formatBaht(projectPortfolio.activeBudget)} need weekly status tracking.`, tone: projectPortfolio.activeProjects ? "blue" : "success" },
        { id: "watch-items", owner: "Kla + Film", title: "Watch Items Follow-up", reason: `${projectPortfolio.overdueProjects} watch items worth ${formatBaht(projectPortfolio.watchBudget)} should be checked before the next report.`, tone: projectPortfolio.overdueProjects ? "warning" : "success" },
        { id: "done-rate", owner: "Tammasit", title: "Done Rate & Completion Review", reason: `${projectPortfolio.completedProjects}/${projectPortfolio.totalProjects} completed (${projectPortfolio.doneRate}%) with ${formatBaht(projectPortfolio.completedBudget)} completed value.`, tone: "cyan" },
        { id: "workload-balance", owner: "Tammasit", title: "Execution Workload Balance", reason: `${projectPortfolio.workloadBalance}% balance score for Film, Kla, Moss and Foreman. Tammasit is tracked separately as Control Tower load. Busiest execution owner is ${projectPortfolio.busiestMember} with score ${projectPortfolio.busiestScore}.`, tone: projectPortfolio.workloadBalance < 50 ? "warning" : "blue" },
        { id: "approval-queue", owner: "Tammasit", title: "Quotation Approval Summary", reason: `${pendingApprovals.length} live quotation approvals are waiting for internal decision.`, tone: pendingApprovals.length ? "warning" : "success" },
      ],
      insights: [
        { id: "scope", title: "Project Scope", summary: `${projectPortfolio.totalProjects} projects are visible in Reports from ${projectPortfolio.sourceName}.`, action: "Review portfolio scope", tone: "cyan" },
        { id: "value", title: "Work Value Exposure", summary: `${formatBaht(projectPortfolio.totalBudget)} total value, with ${formatBaht(projectPortfolio.activeBudget)} still active.`, action: "Review work value", tone: "success" },
        { id: "watch", title: "Watch Item Pressure", summary: `${projectPortfolio.overdueProjects} watch items represent ${formatBaht(projectPortfolio.watchBudget)} that needs follow-up.`, action: "View watch items", tone: projectPortfolio.overdueProjects ? "warning" : "success" },
        { id: "completion", title: "Completion Signal", summary: `${projectPortfolio.doneRate}% done rate from ${projectPortfolio.completedProjects}/${projectPortfolio.totalProjects} completed project rows.`, action: "Review completion", tone: "blue" },
        { id: "load", title: "Execution Workload Hotspot", summary: `${projectPortfolio.busiestMember} is the busiest execution owner; team balance is ${projectPortfolio.workloadBalance}%. Tammasit is measured as Management Load separately.`, action: "View workload detail", tone: projectPortfolio.workloadBalance < 50 ? "warning" : "blue" },
      ],
    },
  };
}
