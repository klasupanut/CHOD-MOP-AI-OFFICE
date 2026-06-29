import type { TaskRecord, TaskStatus } from "@/data/tasks";

export function getTasksByProject(projectId: string, tasks: TaskRecord[]) {
  return tasks.filter((task) => task.projectId === projectId);
}

export function getTasksByPerson(personId: string, tasks: TaskRecord[]) {
  return tasks.filter((task) => task.assignedTo.toLowerCase() === personId.toLowerCase());
}

export function createTask(task: TaskRecord, tasks: TaskRecord[]) {
  return [task, ...tasks];
}

export function updateTaskStatus(taskId: string, status: TaskStatus, actor: string, tasks: TaskRecord[]) {
  return tasks.map((task) =>
    task.taskId === taskId
      ? {
          ...task,
          status,
          progress: status === "Done" ? 100 : task.progress,
          updatedBy: actor,
          lastUpdate: new Date().toISOString().slice(0, 16).replace("T", " "),
        }
      : task,
  );
}

export function updateTaskNote(taskId: string, note: string, actor: string, tasks: TaskRecord[]) {
  return tasks.map((task) =>
    task.taskId === taskId
      ? { ...task, note, updatedBy: actor, lastUpdate: new Date().toISOString().slice(0, 16).replace("T", " ") }
      : task,
  );
}

export function updateTaskProgress(taskId: string, progress: number, actor: string, tasks: TaskRecord[]) {
  return tasks.map((task) =>
    task.taskId === taskId
      ? {
          ...task,
          progress: Math.max(0, Math.min(100, progress)),
          updatedBy: actor,
          status: progress >= 100 ? "Done" : task.status,
          lastUpdate: new Date().toISOString().slice(0, 16).replace("T", " "),
        }
      : task,
  );
}

export function createTasksFromProjectAssignments(projectId: string, projectName: string, assignedTeam: string[]) {
  const taskTemplates: Record<string, string[]> = {
    Film: [`Prepare ${projectName} quotation`],
    Kla: [`Review shop drawing for ${projectName}`, "Check engineering scope"],
    Moss: ["Review electrical scope and quotation"],
    Foreman: ["Update site progress", `Site measurement - ${projectName.replace(/^Fit-out\s*/i, "")}`],
    Tammasit: [`Approve ${projectName} priority and budget`],
  };

  return assignedTeam.flatMap((person) =>
    (taskTemplates[person] ?? [`Follow up ${projectName}`]).map((title, index) => ({
      taskId: `TSK-${projectId}-${person.toUpperCase()}-${index + 1}`,
      projectId,
      taskTitle: title,
      taskDescription: `Auto-created task from ${projectName} assignment.`,
      category: projectName.toLowerCase().includes("fit-out") ? "Fit-out" as const : "General" as const,
      assignedTo: person,
      assignedBy: "Tammasit",
      updatedBy: "Tammasit",
      status: "To Do" as const,
      priority: "Medium" as const,
      dueDate: "",
      progress: 0,
      note: "Generated from project assignment.",
      sourceModule: "Projects",
      lastUpdate: new Date().toISOString().slice(0, 16).replace("T", " "),
      createdAt: new Date().toISOString().slice(0, 16).replace("T", " "),
    })),
  );
}

export function logActivity(action: string, entityType: "Project" | "Task", entityId: string, actor: string, detail: string) {
  return {
    logId: `LOG-${Date.now()}`,
    timestamp: new Date().toISOString().slice(0, 16).replace("T", " "),
    action,
    entityType,
    entityId,
    actor,
    detail,
  };
}
