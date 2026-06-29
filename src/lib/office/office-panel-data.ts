import "server-only";

import { listApprovalRows } from "@/lib/approvals/approval-store";
import { listTaskProjectData } from "@/lib/connectors/google-sheet-task-project";

export type OfficeSummaryMetric = {
  label: string;
  value: number;
  tone: "cyan" | "warning" | "success" | "danger" | "blue" | "solar";
};

export type OfficeActivityItem = {
  id: string;
  message: string;
  time: string;
  tone: "info" | "success" | "warning" | "danger";
};

export type OfficePanelData = {
  metrics: OfficeSummaryMetric[];
  activities: OfficeActivityItem[];
  solarStatus: {
    title: string;
    detail: string;
  };
};

type TimelineItem = OfficeActivityItem & {
  timestamp: number;
};

const pendingApprovalStatuses = new Set(["Waiting Approval", "Waiting Final Approval"]);

function parseDate(value?: string) {
  if (!value) return null;
  const normalized = value.includes("T") ? value : value.replace(" ", "T");
  const parsed = new Date(normalized);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function isDueThisWeek(value?: string) {
  const due = parseDate(value);
  if (!due) return false;
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekEnd = new Date(today);
  weekEnd.setDate(today.getDate() + 7);
  return due >= today && due <= weekEnd;
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

export async function getOfficePanelData(): Promise<OfficePanelData> {
  const [taskProjectData, approvalRows] = await Promise.all([
    listTaskProjectData().catch(() => ({ projects: [], tasks: [] })),
    listApprovalRows().catch(() => []),
  ]);

  const tasks = taskProjectData.tasks || [];
  const projects = taskProjectData.projects || [];
  const liveApprovals = approvalRows.filter((approval) => approval.source !== "quotation-fallback");
  const pendingApprovals = liveApprovals.filter((approval) => pendingApprovalStatuses.has(approval.status));
  const pmDueThisWeek = tasks.filter((task) => (
    task.status !== "Done"
    && isDueThisWeek(task.dueDate)
    && (task.category === "PM" || task.sourceModule.toLowerCase().includes("pm") || task.taskTitle.toLowerCase().includes("pm"))
  )).length;
  const activeProjects = projects.filter((project) => !["Completed", "Cancelled"].includes(project.status)).length;

  const timeline: TimelineItem[] = [
    ...tasks.map((task) => ({
      id: `task-${task.taskId}`,
      message: `${task.updatedBy || task.assignedTo || "Team"} updated task: ${task.taskTitle}`,
      time: formatTime(task.lastUpdate || task.createdAt),
      tone: task.status === "Done" ? "success" as const : task.status === "Overdue" ? "danger" as const : "info" as const,
      timestamp: timestamp(task.lastUpdate || task.createdAt),
    })),
    ...projects.map((project) => ({
      id: `project-${project.projectId}`,
      message: `${project.projectManager || project.createdBy || "Team"} updated project: ${project.projectName}`,
      time: formatTime(project.lastUpdate),
      tone: project.status === "Completed" ? "success" as const : project.status === "Waiting Approval" ? "warning" as const : "info" as const,
      timestamp: timestamp(project.lastUpdate),
    })),
    ...liveApprovals.map((approval) => ({
      id: `approval-${approval.approvalId}`,
      message: `${approval.quotationNo} approval status: ${approval.status}`,
      time: formatTime(approval.lastUpdate || approval.requestedAt),
      tone: approval.status === "Approved" ? "success" as const : approval.status === "Rejected" ? "danger" as const : "warning" as const,
      timestamp: timestamp(approval.lastUpdate || approval.requestedAt),
    })),
  ].filter((item) => item.timestamp > 0);

  return {
    metrics: [
      { label: "PM Due this week", value: pmDueThisWeek, tone: "cyan" },
      { label: "Active Projects", value: activeProjects, tone: "success" },
      { label: "Pending Approvals", value: pendingApprovals.length, tone: "warning" },
    ],
    activities: timeline
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 6)
      .map(({ timestamp: _timestamp, ...item }) => item),
    solarStatus: {
      title: "Live office data",
      detail: `${tasks.length} tasks · ${projects.length} projects · ${pendingApprovals.length} pending approvals`,
    },
  };
}
