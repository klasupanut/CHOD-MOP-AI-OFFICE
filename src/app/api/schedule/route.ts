import { NextResponse } from "next/server";
import type { ProjectStatus } from "@/data/projects";
import type { ScheduleEvent, ScheduleStatus } from "@/data/schedule";
import type { TaskStatus } from "@/data/tasks";
import {
  createScheduleEventInSheet,
  listProjects,
  listScheduleData,
  listTasks,
  updateProjectInSheet,
  updateScheduleEventStatusInSheet,
  updateTaskInSheet,
} from "@/lib/connectors/google-sheet-task-project";
import { getApiUser } from "@/lib/auth/api";

const characterNameMap = {
  tammasit: "Tammasit",
  film: "Film",
  kla: "Kla",
  moss: "Moss",
  foreman: "Foreman",
} as const;

function canManageAllSchedule(user: { role: string; characterId?: string }) {
  return user.role === "Super Admin" || user.characterId === "tammasit";
}

function userDisplayName(user: { characterId?: string; name: string; email: string }) {
  if (user.characterId && user.characterId in characterNameMap) {
    return characterNameMap[user.characterId as keyof typeof characterNameMap];
  }
  return user.name || user.email;
}

function samePerson(a = "", b = "") {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

function scheduleStatusToTaskStatus(status: ScheduleStatus): TaskStatus {
  if (status === "Done") return "Done";
  if (status === "In Progress") return "In Progress";
  if (status === "Delayed") return "Overdue";
  return "To Do";
}

function scheduleStatusToProjectStatus(status: ScheduleStatus): ProjectStatus {
  if (status === "Done") return "Completed";
  if (status === "Cancelled") return "Cancelled";
  if (status === "In Progress") return "In Progress";
  if (status === "Delayed") return "On Hold";
  return "Planning";
}

export async function POST(request: Request) {
  const user = await getApiUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = (await request.json()) as { event?: ScheduleEvent };
    if (!body.event?.title) throw new Error("Event title is required.");
    if (!body.event.startAt) throw new Error("Start date/time is required.");
    const event = await createScheduleEventInSheet({
      ...body.event,
      createdBy: user.name,
      owner: body.event.owner || user.name,
      source: "manual",
    });
    return NextResponse.json({ event, mode: "google-sheet" });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to create schedule event." },
      { status: 400 },
    );
  }
}

export async function PATCH(request: Request) {
  const user = await getApiUser("Calendar / Schedule");
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = (await request.json()) as { eventId?: string; status?: ScheduleStatus };
    if (!body.eventId) throw new Error("Event ID is required.");
    if (!body.status) throw new Error("Event status is required.");

    const schedule = await listScheduleData();
    const event = schedule.events.find((item) => item.eventId === body.eventId);
    if (!event) throw new Error("Schedule event not found.");

    const owner = userDisplayName(user);
    const canManageAll = canManageAllSchedule(user);

    if (event.source === "task") {
      const tasks = await listTasks();
      const task = tasks.find((item) => item.taskId === event.relatedId);
      if (!task) throw new Error("Related task not found.");
      if (!canManageAll && !samePerson(task.assignedTo, owner)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      const taskStatus = scheduleStatusToTaskStatus(body.status);
      const updatedTask = await updateTaskInSheet(
        task.taskId,
        { status: taskStatus, progress: body.status === "Done" ? 100 : task.progress },
        user.name,
      );
      return NextResponse.json({
        event: {
          ...event,
          status: updatedTask.status === "Done" ? "Done" : body.status,
          lastUpdate: updatedTask.lastUpdate,
        },
        mode: "google-sheet",
      });
    }

    if (event.source === "project") {
      if (!canManageAll) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      const projects = await listProjects();
      const project = projects.find((item) => item.projectId === event.relatedId);
      if (!project) throw new Error("Related project not found.");
      const updatedProject = await updateProjectInSheet(project.projectId, {
        status: scheduleStatusToProjectStatus(body.status),
        progress: body.status === "Done" ? 100 : project.progress,
      });
      return NextResponse.json({
        event: {
          ...event,
          status: updatedProject.status === "Completed" ? "Done" : body.status,
          lastUpdate: updatedProject.lastUpdate,
        },
        mode: "google-sheet",
      });
    }

    if (!canManageAll && !samePerson(event.owner, owner)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const updatedEvent = await updateScheduleEventStatusInSheet(event.eventId, body.status);
    return NextResponse.json({ event: updatedEvent, mode: "google-sheet" });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to update schedule event." },
      { status: 400 },
    );
  }
}
