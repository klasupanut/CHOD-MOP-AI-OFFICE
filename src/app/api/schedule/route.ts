import { NextResponse } from "next/server";
import type { ProjectStatus } from "@/data/projects";
import type { ScheduleEvent, ScheduleStatus } from "@/data/schedule";
import type { TaskStatus } from "@/data/tasks";
import {
  createScheduleEventInSheet,
  deleteScheduleEventInSheet,
  listProjects,
  listScheduleData,
  listTasks,
  updateProjectInSheet,
  updateScheduleEventInSheet,
  updateScheduleEventStatusInSheet,
  updateTaskInSheet,
} from "@/lib/connectors/google-sheet-task-project";
import { getApiUser } from "@/lib/auth/api";
import { invalidateLiveWorkspaceCaches } from "@/lib/cache/live-workspace-cache";
import { rejectUnsafeMutationRequest } from "@/lib/security/request-guards";

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

function dateOnly(value?: string) {
  return String(value || "").slice(0, 10);
}

export async function POST(request: Request) {
  const unsafe = rejectUnsafeMutationRequest(request);
  if (unsafe) return unsafe;

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
    invalidateLiveWorkspaceCaches();
    return NextResponse.json({ event, mode: "google-sheet" });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to create schedule event." },
      { status: 400 },
    );
  }
}

export async function PATCH(request: Request) {
  const unsafe = rejectUnsafeMutationRequest(request);
  if (unsafe) return unsafe;

  const user = await getApiUser("Calendar / Schedule");
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = (await request.json()) as { eventId?: string; status?: ScheduleStatus; event?: Partial<ScheduleEvent> };
    if (!body.eventId) throw new Error("Event ID is required.");

    const schedule = await listScheduleData();
    const event = schedule.events.find((item) => item.eventId === body.eventId);
    if (!event) throw new Error("Schedule event not found.");

    const owner = userDisplayName(user);
    const canManageAll = canManageAllSchedule(user);
    const requestedStatus = body.event?.status || body.status;
    if (!requestedStatus && !body.event) throw new Error("Event update data is required.");

    if (event.source === "task") {
      const tasks = await listTasks();
      const task = tasks.find((item) => item.taskId === event.relatedId);
      if (!task) throw new Error("Related task not found.");
      if (!canManageAll && !samePerson(task.assignedTo, owner)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      const nextScheduleStatus = requestedStatus || event.status;
      if (nextScheduleStatus === "Cancelled") {
        return NextResponse.json(
          { error: "Task-linked events cannot be cancelled from Calendar because Tasks do not have a Cancelled status. Delete or update the task record instead." },
          { status: 400 },
        );
      }
      const taskStatus = scheduleStatusToTaskStatus(nextScheduleStatus);
      const updatedTask = await updateTaskInSheet(
        task.taskId,
        {
          taskTitle: body.event?.title || task.taskTitle,
          dueDate: dateOnly(body.event?.startAt) || task.dueDate,
          status: taskStatus,
          priority: body.event?.priority || task.priority,
          note: body.event?.note ?? task.note,
          progress: nextScheduleStatus === "Done" ? 100 : Math.min(task.progress || 0, 99),
        },
        user.name,
      );
      invalidateLiveWorkspaceCaches();
      return NextResponse.json({
        event: {
          ...event,
          status: updatedTask.status === "Done" ? "Done" : nextScheduleStatus,
          title: updatedTask.taskTitle,
          startAt: body.event?.startAt || event.startAt,
          endAt: body.event?.endAt || event.endAt,
          priority: updatedTask.priority,
          note: updatedTask.note,
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
      const nextScheduleStatus = requestedStatus || event.status;
      const updatedProject = await updateProjectInSheet(project.projectId, {
        projectName: body.event?.title ? body.event.title.replace(/\s+milestone$/i, "") : project.projectName,
        dueDate: dateOnly(body.event?.startAt) || project.dueDate,
        site: body.event?.location && body.event.location !== "Related Site" ? String(body.event.location) : project.site,
        status: scheduleStatusToProjectStatus(nextScheduleStatus),
        priority: body.event?.priority || project.priority,
        description: body.event?.note ?? project.description,
        progress: nextScheduleStatus === "Done" ? 100 : Math.min(project.progress || 0, 99),
      });
      invalidateLiveWorkspaceCaches();
      return NextResponse.json({
        event: {
          ...event,
          status: updatedProject.status === "Completed" ? "Done" : nextScheduleStatus,
          title: `${updatedProject.projectName} milestone`,
          location: updatedProject.site || event.location,
          startAt: body.event?.startAt || event.startAt,
          endAt: body.event?.endAt || event.endAt,
          priority: updatedProject.priority,
          note: updatedProject.description,
          lastUpdate: updatedProject.lastUpdate,
        },
        mode: "google-sheet",
      });
    }

    if (!canManageAll && !samePerson(event.owner, owner)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const updatedEvent = body.event
      ? await updateScheduleEventInSheet(event.eventId, {
          ...body.event,
          owner: body.event.owner || event.owner,
          attendees: body.event.attendees || event.attendees,
          source: "manual",
        })
      : await updateScheduleEventStatusInSheet(event.eventId, requestedStatus as ScheduleStatus);
    invalidateLiveWorkspaceCaches();
    return NextResponse.json({ event: updatedEvent, mode: "google-sheet" });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to update schedule event." },
      { status: 400 },
    );
  }
}

export async function DELETE(request: Request) {
  const unsafe = rejectUnsafeMutationRequest(request);
  if (unsafe) return unsafe;

  const user = await getApiUser("Calendar / Schedule");
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = (await request.json()) as { eventId?: string };
    if (!body.eventId) throw new Error("Event ID is required.");

    const schedule = await listScheduleData();
    const event = schedule.events.find((item) => item.eventId === body.eventId);
    if (!event) throw new Error("Schedule event not found.");
    if (event.source !== "manual") {
      return NextResponse.json(
        { error: "Linked task/project events cannot be deleted from Calendar. For project events, change status to Cancelled. For task events, delete or update the source task instead." },
        { status: 400 },
      );
    }

    const owner = userDisplayName(user);
    const canManageAll = canManageAllSchedule(user);
    if (!canManageAll && !samePerson(event.owner, owner)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const deletedEvent = await deleteScheduleEventInSheet(event.eventId);
    invalidateLiveWorkspaceCaches();
    return NextResponse.json({ event: deletedEvent, mode: "google-sheet" });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to delete schedule event." },
      { status: 400 },
    );
  }
}
