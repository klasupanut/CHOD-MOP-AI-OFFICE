import type { ProjectRecord } from "@/data/projects";
import type { TaskRecord } from "@/data/tasks";

export const scheduleEventTypes = [
  "Meeting",
  "Site Visit",
  "PM Loop",
  "Approval Deadline",
  "Quotation Follow-up",
  "Fit-out Handover",
  "Solar Check",
  "Renovation",
  "Task Due",
  "Project Milestone",
  "Other",
] as const;

export type ScheduleEventType = (typeof scheduleEventTypes)[number];

export const scheduleStatuses = ["Scheduled", "In Progress", "Delayed", "Done", "Cancelled"] as const;
export type ScheduleStatus = (typeof scheduleStatuses)[number];

export const scheduleLocations = [
  "CHOD 1",
  "CHOD 2",
  "CHOD 3",
  "CHOD 5",
  "CHODBIZ KM.8",
  "CHODBIZ SAI4",
  "CHODBIZ CHAENG",
  "Head Office",
  "Online / Teams",
  "Customer Site",
  "Other",
] as const;

export type ScheduleLocation = (typeof scheduleLocations)[number] | string;

export type ScheduleEvent = {
  eventId: string;
  title: string;
  eventType: ScheduleEventType;
  location: ScheduleLocation;
  owner: string;
  attendees: string[];
  startAt: string;
  endAt: string;
  status: ScheduleStatus;
  priority: "Low" | "Medium" | "High" | "Critical";
  relatedModule: string;
  relatedId: string;
  note: string;
  createdBy: string;
  lastUpdate: string;
  source: "manual" | "task" | "project" | "approval" | "future";
};

export type ScheduleData = {
  mode: "google-sheet" | "not-configured" | "fallback";
  message: string;
  events: ScheduleEvent[];
  manualEvents: ScheduleEvent[];
  derivedEvents: ScheduleEvent[];
};

function dateOnly(value?: string) {
  return String(value || "").slice(0, 10);
}

function normalizeDateTime(value?: string, fallbackHour = "09:00") {
  const text = String(value || "").trim();
  if (!text) return "";
  if (text.includes("T")) return text.slice(0, 16);
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return `${text}T${fallbackHour}`;
  if (/^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}/.test(text)) return text.replace(" ", "T").slice(0, 16);
  return text;
}

function addHours(value: string, hours: number) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  parsed.setHours(parsed.getHours() + hours);
  return parsed.toISOString().slice(0, 16);
}

function taskEventType(task: TaskRecord): ScheduleEventType {
  if (task.category === "PM") return "PM Loop";
  if (task.category === "Solar" || task.category === "Electrical") return "Solar Check";
  if (task.category === "Quotation") return "Quotation Follow-up";
  if (task.category === "Approval") return "Approval Deadline";
  if (task.category === "Fit-out" && /handover/i.test(task.taskTitle)) return "Fit-out Handover";
  if (task.category === "Renovation") return "Renovation";
  return "Task Due";
}

function projectEventType(project: ProjectRecord): ScheduleEventType {
  if (project.projectType === "PM Loop") return "PM Loop";
  if (project.projectType === "Solar") return "Solar Check";
  if (project.projectType === "Renovation") return "Renovation";
  if (project.projectType === "Fit-out" && /handover/i.test(project.projectName)) return "Fit-out Handover";
  return "Project Milestone";
}

export function deriveScheduleEventsFromTasksProjects(tasks: TaskRecord[], projects: ProjectRecord[]) {
  const taskEvents: ScheduleEvent[] = tasks
    .filter((task) => task.dueDate)
    .map((task) => {
      const startAt = normalizeDateTime(task.dueDate, "10:00");
      return {
        eventId: `TASK-${task.taskId}`,
        title: task.taskTitle,
        eventType: taskEventType(task),
        location: "Related Site",
        owner: task.assignedTo || "Team",
        attendees: [task.assignedTo].filter(Boolean),
        startAt,
        endAt: addHours(startAt, 1),
        status: task.status === "Done" ? "Done" : task.status === "Overdue" ? "Delayed" : task.status === "In Progress" ? "In Progress" : "Scheduled",
        priority: task.priority,
        relatedModule: task.sourceModule || "Tasks",
        relatedId: task.taskId,
        note: task.note || task.taskDescription,
        createdBy: task.assignedBy || "System",
        lastUpdate: task.lastUpdate,
        source: "task",
      };
    });

  const projectEvents: ScheduleEvent[] = projects
    .filter((project) => project.dueDate)
    .map((project) => {
      const startAt = normalizeDateTime(project.dueDate, "16:00");
      return {
        eventId: `PROJECT-${project.projectId}`,
        title: `${project.projectName} milestone`,
        eventType: projectEventType(project),
        location: project.site || "Related Site",
        owner: project.projectManager || "Team",
        attendees: project.assignedTeam,
        startAt,
        endAt: addHours(startAt, 1),
        status: project.status === "Completed" ? "Done" : project.status === "Cancelled" ? "Cancelled" : project.status === "In Progress" ? "In Progress" : "Scheduled",
        priority: project.priority,
        relatedModule: "Projects",
        relatedId: project.projectId,
        note: project.description,
        createdBy: project.createdBy || "System",
        lastUpdate: project.lastUpdate,
        source: "project",
      };
    });

  return [...taskEvents, ...projectEvents].sort((a, b) => dateOnly(a.startAt).localeCompare(dateOnly(b.startAt)));
}
