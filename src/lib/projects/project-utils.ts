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
