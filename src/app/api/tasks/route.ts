import { NextResponse } from "next/server";
import type { TaskRecord } from "@/data/tasks";
import { createTaskInSheet, deleteTaskInSheet, listTasks, updateTaskInSheet } from "@/lib/connectors/google-sheet-task-project";
import { getApiUser } from "@/lib/auth/api";

const characterNameMap = {
  tammasit: "Tammasit",
  film: "Film",
  kla: "Kla",
  moss: "Moss",
  foreman: "Foreman",
} as const;

function canManageAllTasks(user: { role: string; characterId?: string }) {
  return user.role === "Super Admin" || user.characterId === "tammasit";
}

function getUserTaskOwner(user: { characterId?: string; name: string; email: string }) {
  if (user.characterId && user.characterId in characterNameMap) {
    return characterNameMap[user.characterId as keyof typeof characterNameMap];
  }
  return user.name || user.email;
}

export async function POST(request: Request) {
  const user = await getApiUser("Tasks");
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const body = (await request.json()) as { task?: TaskRecord };
    if (!body.task?.taskTitle) throw new Error("Task title is required.");
    const owner = getUserTaskOwner(user);
    const assignedTo = canManageAllTasks(user) ? body.task.assignedTo || owner : owner;
    const task = await createTaskInSheet({
      ...body.task,
      assignedTo,
      assignedBy: body.task.assignedBy || user.name,
      updatedBy: user.name,
    });
    return NextResponse.json({ task, mode: "google-sheet" });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to create task." },
      { status: 400 },
    );
  }
}

export async function DELETE(request: Request) {
  const user = await getApiUser("Tasks");
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const body = (await request.json()) as { taskId?: string };
    if (!body.taskId) throw new Error("Task ID is required.");
    const tasks = await listTasks();
    const task = tasks.find((item) => item.taskId === body.taskId);
    if (!task) throw new Error("Task not found in Google Sheet.");
    const owner = getUserTaskOwner(user);
    if (!canManageAllTasks(user) && task.assignedTo.toLowerCase() !== owner.toLowerCase()) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const deletedTask = await deleteTaskInSheet(body.taskId);
    return NextResponse.json({ task: deletedTask, mode: "google-sheet" });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to delete task." },
      { status: 400 },
    );
  }
}

export async function PATCH(request: Request) {
  const user = await getApiUser("Tasks");
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const body = (await request.json()) as { taskId?: string; patch?: Partial<TaskRecord> };
    if (!body.taskId) throw new Error("Task ID is required.");
    const tasks = await listTasks();
    const currentTask = tasks.find((item) => item.taskId === body.taskId);
    if (!currentTask) throw new Error("Task not found in Google Sheet.");
    const owner = getUserTaskOwner(user);
    if (!canManageAllTasks(user) && currentTask.assignedTo.toLowerCase() !== owner.toLowerCase()) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const task = await updateTaskInSheet(body.taskId, body.patch || {}, user.name);
    return NextResponse.json({ task, mode: "google-sheet" });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to update task." },
      { status: 400 },
    );
  }
}
