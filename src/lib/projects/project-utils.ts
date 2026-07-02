import type { ProjectRecord } from "@/data/projects";
import type { TaskRecord } from "@/data/tasks";

export function createProject(project: ProjectRecord, projects: ProjectRecord[]) {
  return [project, ...projects];
}

export function calculateProjectProgressFromTasks(projectId: string, tasks: TaskRecord[]) {
  const linkedTasks = tasks.filter((task) => task.projectId === projectId);
  if (!linkedTasks.length) return 0;
  const completedTasks = linkedTasks.filter((task) => task.status === "Done").length;
  return Math.round((completedTasks / linkedTasks.length) * 100);
}

export function getProjectProgress(project: ProjectRecord, tasks: TaskRecord[]) {
  if (typeof project.progress === "number") return project.progress;
  return calculateProjectProgressFromTasks(project.projectId, tasks);
}

function parseLocalDate(value?: string) {
  if (!value) return null;
  const [year, month, day] = value.slice(0, 10).split("-").map(Number);
  if (!year || !month || !day) return null;
  const parsed = new Date(year, month - 1, day);
  if (Number.isNaN(parsed.getTime())) return null;
  parsed.setHours(0, 0, 0, 0);
  return parsed;
}

export function calculateProjectTimeProgress(project: ProjectRecord, now = new Date()) {
  const start = parseLocalDate(project.startDate);
  const finish = parseLocalDate(project.dueDate);
  if (!start || !finish) return 0;
  const finishEnd = new Date(finish);
  finishEnd.setDate(finishEnd.getDate() + 1);
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  if (today <= start) return 0;
  if (today >= finishEnd) return 100;
  const duration = finishEnd.getTime() - start.getTime();
  if (duration <= 0) return 100;
  const elapsed = today.getTime() - start.getTime();
  return Math.max(0, Math.min(99, Math.round((elapsed / duration) * 100)));
}
