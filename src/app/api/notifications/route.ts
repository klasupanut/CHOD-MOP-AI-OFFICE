import { NextResponse } from "next/server";
import type { ProjectRecord } from "@/data/projects";
import type { ScheduleEvent } from "@/data/schedule";
import type { TaskRecord } from "@/data/tasks";
import { getApiUser } from "@/lib/auth/api";
import { listTaskProjectScheduleData } from "@/lib/connectors/google-sheet-task-project";
import type { WorkspaceNotification } from "@/lib/notifications/types";

const characterNameMap = {
  tammasit: "Tammasit",
  film: "Film",
  kla: "Kla",
  moss: "Moss",
  foreman: "Foreman",
} as const;

function bangkokTodayKey() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const get = (type: string) => parts.find((part) => part.type === type)?.value || "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

function dateKey(value?: string) {
  return String(value || "").slice(0, 10);
}

function isDueOrOverdue(value?: string) {
  const due = dateKey(value);
  if (!due) return false;
  return due <= bangkokTodayKey();
}

function dueTone(value?: string, forcedCritical = false): WorkspaceNotification["tone"] {
  const due = dateKey(value);
  if (forcedCritical || (due && due < bangkokTodayKey())) return "critical";
  return "warning";
}

function dueWord(value?: string) {
  const due = dateKey(value);
  if (!due) return "due date missing";
  if (due < bangkokTodayKey()) return `overdue since ${due}`;
  if (due === bangkokTodayKey()) return `due today ${due}`;
  return `due ${due}`;
}

function userName(user: { characterId?: string; name: string; email: string }) {
  if (user.characterId && user.characterId in characterNameMap) {
    return characterNameMap[user.characterId as keyof typeof characterNameMap];
  }
  return user.name || user.email;
}

function canSeeAll(user: { role: string; characterId?: string }) {
  return user.role === "Super Admin" || user.characterId === "tammasit";
}

function taskNotifications(tasks: TaskRecord[], currentUser: Awaited<ReturnType<typeof getApiUser>>) {
  if (!currentUser?.modulePermissions.includes("Tasks")) return [];
  const owner = userName(currentUser);
  const visibleTasks = canSeeAll(currentUser)
    ? tasks
    : tasks.filter((task) => task.assignedTo.trim().toLowerCase() === owner.trim().toLowerCase());

  return visibleTasks
    .filter((task) => task.status !== "Done" && isDueOrOverdue(task.dueDate))
    .map<WorkspaceNotification>((task) => ({
      id: `due-task-${task.taskId}-${dateKey(task.dueDate)}-${task.status}`,
      title: task.status === "Overdue" || dateKey(task.dueDate) < bangkokTodayKey()
        ? `Task overdue: ${task.taskTitle}`
        : `Task due today: ${task.taskTitle}`,
      detail: `${task.assignedTo || "Team"} / ${task.category} / ${dueWord(task.dueDate)}`,
      href: "/tasks",
      tone: dueTone(task.dueDate, task.status === "Overdue"),
      meta: "Tasks",
    }));
}

function projectNotifications(projects: ProjectRecord[], currentUser: Awaited<ReturnType<typeof getApiUser>>) {
  if (!currentUser?.modulePermissions.includes("Projects")) return [];

  return projects
    .filter((project) => !["Completed", "Cancelled"].includes(project.status) && isDueOrOverdue(project.dueDate))
    .map<WorkspaceNotification>((project) => ({
      id: `due-project-${project.projectId}-${dateKey(project.dueDate)}-${project.status}`,
      title: dateKey(project.dueDate) < bangkokTodayKey()
        ? `Project overdue: ${project.projectName}`
        : `Project due today: ${project.projectName}`,
      detail: `${project.projectType} / ${project.site || "Related Site"} / ${dueWord(project.dueDate)}`,
      href: "/projects",
      tone: dueTone(project.dueDate),
      meta: "Projects",
    }));
}

function scheduleNotifications(events: ScheduleEvent[], currentUser: Awaited<ReturnType<typeof getApiUser>>) {
  const allowed = currentUser?.modulePermissions.includes("Calendar / Schedule")
    || currentUser?.modulePermissions.includes("Tasks")
    || currentUser?.modulePermissions.includes("Projects");
  if (!allowed) return [];

  return events
    .filter((event) => event.source === "manual")
    .filter((event) => !["Done", "Cancelled"].includes(event.status) && isDueOrOverdue(event.startAt))
    .map<WorkspaceNotification>((event) => ({
      id: `due-schedule-${event.eventId}-${dateKey(event.startAt)}-${event.status}`,
      title: event.status === "Delayed" || dateKey(event.startAt) < bangkokTodayKey()
        ? `Schedule alert: ${event.title}`
        : `Schedule due today: ${event.title}`,
      detail: `${event.eventType} / ${event.location || "Related Site"} / ${dueWord(event.startAt)}`,
      href: "/calendar-schedule",
      tone: dueTone(event.startAt, event.status === "Delayed"),
      meta: "Calendar / Schedule",
    }));
}

export async function GET() {
  const user = await getApiUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const taskProjectData = await listTaskProjectScheduleData();
    const notifications = [
      ...taskNotifications(taskProjectData.tasks, user),
      ...projectNotifications(taskProjectData.projects, user),
      ...scheduleNotifications(taskProjectData.manualEvents, user),
    ].sort((a, b) => {
      const weight = { critical: 0, warning: 1, info: 2 } as const;
      return weight[a.tone] - weight[b.tone] || a.title.localeCompare(b.title);
    }).slice(0, 30);

    return NextResponse.json({ notifications, checkedAt: new Date().toISOString() });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to load notifications." },
      { status: 500 },
    );
  }
}
