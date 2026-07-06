import "server-only";

import { createSign } from "node:crypto";
import type { ProjectRecord, ProjectPriority, ProjectStatus, ProjectType } from "@/data/projects";
import { deriveScheduleEventsFromTasksProjects, type ScheduleData, type ScheduleEvent, type ScheduleEventType, type ScheduleStatus } from "@/data/schedule";
import type { TaskCategory, TaskPriority, TaskRecord, TaskStatus } from "@/data/tasks";
import { asGooglePrivateKeyError, getGoogleServiceAccountConfig, googleSheetsScope } from "@/lib/google/service-account";

const TASKS_TAB = "Tasks";
const PROJECTS_TAB = "Projects";
const SCHEDULE_TAB = "Schedule";

const TASK_HEADERS = [
  "taskId",
  "projectId",
  "taskTitle",
  "taskDescription",
  "category",
  "assignedTo",
  "assignedBy",
  "updatedBy",
  "status",
  "priority",
  "dueDate",
  "progress",
  "note",
  "sourceModule",
  "lastUpdate",
  "createdAt",
] as const;

const PROJECT_HEADERS = [
  "projectId",
  "projectName",
  "projectType",
  "site",
  "description",
  "status",
  "priority",
  "startDate",
  "dueDate",
  "projectManager",
  "createdBy",
  "assignedTeam",
  "progress",
  "budget",
  "linkedTasks",
  "linkedDocuments",
  "linkedQuotations",
  "lastUpdate",
] as const;

const SCHEDULE_HEADERS = [
  "eventId",
  "title",
  "eventType",
  "location",
  "owner",
  "attendees",
  "startAt",
  "endAt",
  "status",
  "priority",
  "relatedModule",
  "relatedId",
  "note",
  "createdBy",
  "lastUpdate",
  "source",
] as const;

export const taskProjectSheetConfig = {
  mode: "google-sheet",
  spreadsheetName: "CHOD MOP OFFICE - Task & Project Database",
  ownerAccount: "chod.mopteam@gmail.com",
  env: {
    serviceAccountEmail: "GOOGLE_SERVICE_ACCOUNT_EMAIL",
    privateKey: "GOOGLE_PRIVATE_KEY",
    sheetId: "GOOGLE_SHEET_ID_TASK_PROJECT",
  },
  tabs: [PROJECTS_TAB, TASKS_TAB, SCHEDULE_TAB],
};

let cachedToken: { value: string; expiresAt: number } | null = null;
let ensureSheetsPromise: Promise<void> | null = null;
const READ_CACHE_MS = 30_000;

type TaskProjectData = {
  mode: "google-sheet" | "not-configured";
  projects: ProjectRecord[];
  tasks: TaskRecord[];
  message: string;
};

type TaskProjectScheduleData = TaskProjectData & {
  manualEvents: ScheduleEvent[];
};

let taskProjectCache: { expiresAt: number; data: TaskProjectData } | null = null;
let taskProjectPromise: Promise<TaskProjectData> | null = null;
let taskProjectScheduleCache: { expiresAt: number; data: TaskProjectScheduleData } | null = null;
let taskProjectSchedulePromise: Promise<TaskProjectScheduleData> | null = null;

function getSheetId() {
  return process.env.GOOGLE_SHEET_ID_TASK_PROJECT || process.env.GOOGLE_SHEET_ID_USERS || "";
}

function base64Url(value: string) {
  return Buffer.from(value).toString("base64url");
}

function nowStamp() {
  return new Date().toISOString().slice(0, 16).replace("T", " ");
}

function ensureConfigured() {
  const { email, privateKey } = getGoogleServiceAccountConfig();
  if (!email || !privateKey || !getSheetId()) {
    throw new Error("Task / Project Google Sheet is not configured. Set GOOGLE_SHEET_ID_TASK_PROJECT in .env.local.");
  }
}

async function getAccessToken() {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) return cachedToken.value;
  ensureConfigured();
  const { email, privateKey } = getGoogleServiceAccountConfig();
  const now = Math.floor(Date.now() / 1000);
  const header = base64Url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const payload = base64Url(JSON.stringify({
    iss: email,
    scope: googleSheetsScope,
    aud: "https://oauth2.googleapis.com/token",
    exp: now + 3600,
    iat: now,
  }));
  const unsigned = `${header}.${payload}`;
  const signer = createSign("RSA-SHA256");
  signer.update(unsigned);
  signer.end();
  let assertion = "";
  try {
    assertion = `${unsigned}.${signer.sign(privateKey, "base64url")}`;
  } catch (error) {
    throw asGooglePrivateKeyError(error);
  }

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`Google service account token failed (${response.status}).`);
  const token = (await response.json()) as { access_token: string; expires_in: number };
  cachedToken = { value: token.access_token, expiresAt: Date.now() + token.expires_in * 1000 };
  return token.access_token;
}

async function sheetsFetch(path: string, init?: RequestInit) {
  const token = await getAccessToken();
  const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${getSheetId()}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...init?.headers,
    },
    cache: "no-store",
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Task / Project Google Sheets request failed (${response.status}): ${detail.slice(0, 180)}`);
  }
  return response;
}

function safeString(value: unknown) {
  return String(value || "").trim();
}

function parseNumber(value: unknown, fallback = 0) {
  const parsed = Number(String(value || "").replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parseList(value: unknown) {
  return safeString(value).split(",").map((item) => item.trim()).filter(Boolean);
}

function rowToTask(row: unknown[]): TaskRecord | null {
  const taskId = safeString(row[0]);
  const taskTitle = safeString(row[2]);
  if (!taskId || !taskTitle) return null;
  return {
    taskId,
    projectId: safeString(row[1]) || undefined,
    taskTitle,
    taskDescription: safeString(row[3]),
    category: (safeString(row[4]) || "General") as TaskCategory,
    assignedTo: safeString(row[5]),
    assignedBy: safeString(row[6]),
    updatedBy: safeString(row[7]),
    status: (safeString(row[8]) || "To Do") as TaskStatus,
    priority: (safeString(row[9]) || "Medium") as TaskPriority,
    dueDate: safeString(row[10]),
    progress: Math.max(0, Math.min(100, parseNumber(row[11]))),
    note: safeString(row[12]),
    sourceModule: safeString(row[13]) || "Tasks",
    lastUpdate: safeString(row[14]),
    createdAt: safeString(row[15]),
  };
}

function taskToRow(task: TaskRecord) {
  return [
    task.taskId,
    task.projectId || "",
    task.taskTitle,
    task.taskDescription,
    task.category,
    task.assignedTo,
    task.assignedBy,
    task.updatedBy,
    task.status,
    task.priority,
    task.dueDate,
    String(task.progress),
    task.note,
    task.sourceModule,
    task.lastUpdate,
    task.createdAt,
  ];
}

function rowToProject(row: unknown[]): ProjectRecord | null {
  const projectId = safeString(row[0]);
  const projectName = safeString(row[1]);
  if (!projectId || !projectName) return null;
  const progressText = safeString(row[12]);
  return {
    projectId,
    projectName,
    projectType: (safeString(row[2]) || "General") as ProjectType,
    site: safeString(row[3]),
    description: safeString(row[4]),
    status: (safeString(row[5]) || "Planning") as ProjectStatus,
    priority: (safeString(row[6]) || "Medium") as ProjectPriority,
    startDate: safeString(row[7]),
    dueDate: safeString(row[8]),
    projectManager: safeString(row[9]),
    createdBy: safeString(row[10]),
    assignedTeam: parseList(row[11]),
    progress: progressText === "" ? undefined : Math.max(0, Math.min(100, parseNumber(progressText))),
    budget: parseNumber(row[13]),
    linkedTasks: parseList(row[14]),
    linkedDocuments: parseList(row[15]),
    linkedQuotations: parseList(row[16]),
    lastUpdate: safeString(row[17]),
  };
}

function projectToRow(project: ProjectRecord) {
  return [
    project.projectId,
    project.projectName,
    project.projectType,
    project.site,
    project.description,
    project.status,
    project.priority,
    project.startDate,
    project.dueDate,
    project.projectManager,
    project.createdBy,
    project.assignedTeam.join(","),
    typeof project.progress === "number" ? String(project.progress) : "",
    String(project.budget),
    project.linkedTasks.join(","),
    project.linkedDocuments.join(","),
    project.linkedQuotations.join(","),
    project.lastUpdate,
  ];
}

function rowToScheduleEvent(row: unknown[]): ScheduleEvent | null {
  const eventId = safeString(row[0]);
  const title = safeString(row[1]);
  if (!eventId || !title) return null;
  return {
    eventId,
    title,
    eventType: (safeString(row[2]) || "Meeting") as ScheduleEventType,
    location: safeString(row[3]) || "Head Office",
    owner: safeString(row[4]) || "Team",
    attendees: parseList(row[5]),
    startAt: safeString(row[6]),
    endAt: safeString(row[7]),
    status: (safeString(row[8]) || "Scheduled") as ScheduleStatus,
    priority: (safeString(row[9]) || "Medium") as ScheduleEvent["priority"],
    relatedModule: safeString(row[10]) || "Schedule",
    relatedId: safeString(row[11]),
    note: safeString(row[12]),
    createdBy: safeString(row[13]) || "System",
    lastUpdate: safeString(row[14]),
    source: "manual",
  };
}

function scheduleEventToRow(event: ScheduleEvent) {
  return [
    event.eventId,
    event.title,
    event.eventType,
    event.location,
    event.owner,
    event.attendees.join(","),
    event.startAt,
    event.endAt,
    event.status,
    event.priority,
    event.relatedModule,
    event.relatedId,
    event.note,
    event.createdBy,
    event.lastUpdate,
    event.source,
  ];
}

async function ensureTaskProjectSheetsOnce() {
  ensureConfigured();
  const metadataResponse = await sheetsFetch("?fields=sheets.properties.title");
  const metadata = (await metadataResponse.json()) as { sheets?: Array<{ properties?: { title?: string } }> };
  const existing = new Set(metadata.sheets?.map((sheet) => sheet.properties?.title).filter(Boolean));
  const missing = [PROJECTS_TAB, TASKS_TAB, SCHEDULE_TAB].filter((title) => !existing.has(title));
  if (missing.length) {
    await sheetsFetch(":batchUpdate", {
      method: "POST",
      body: JSON.stringify({
        requests: missing.map((title) => ({ addSheet: { properties: { title } } })),
      }),
    });
  }
  const projectsRange = encodeURIComponent(`${PROJECTS_TAB}!A1:R1`);
  const tasksRange = encodeURIComponent(`${TASKS_TAB}!A1:P1`);
  const scheduleRange = encodeURIComponent(`${SCHEDULE_TAB}!A1:P1`);
  await Promise.all([
    sheetsFetch(`/values/${projectsRange}?valueInputOption=RAW`, {
      method: "PUT",
      body: JSON.stringify({ values: [[...PROJECT_HEADERS]] }),
    }),
    sheetsFetch(`/values/${tasksRange}?valueInputOption=RAW`, {
      method: "PUT",
      body: JSON.stringify({ values: [[...TASK_HEADERS]] }),
    }),
    sheetsFetch(`/values/${scheduleRange}?valueInputOption=RAW`, {
      method: "PUT",
      body: JSON.stringify({ values: [[...SCHEDULE_HEADERS]] }),
    }),
  ]);
}

async function ensureTaskProjectSheets() {
  if (ensureSheetsPromise) return ensureSheetsPromise;
  ensureSheetsPromise = ensureTaskProjectSheetsOnce().catch((error) => {
    ensureSheetsPromise = null;
    throw error;
  });
  return ensureSheetsPromise;
}

async function readTabRows(tab: string, rangeColumns: string) {
  await ensureTaskProjectSheets();
  const [rows] = await readTabRowsBatch([{ tab, rangeColumns }]);
  return rows;
}

async function readTabRowsBatch(ranges: Array<{ tab: string; rangeColumns: string }>) {
  await ensureTaskProjectSheets();
  const query = new URLSearchParams();
  ranges.forEach(({ tab, rangeColumns }) => query.append("ranges", `${tab}!A2:${rangeColumns}`));
  const response = await sheetsFetch(`/values:batchGet?${query.toString()}`);
  const payload = (await response.json()) as { valueRanges?: Array<{ values?: unknown[][] }> };
  return ranges.map((_, index) => payload.valueRanges?.[index]?.values || []);
}

function clearTaskProjectReadCache() {
  taskProjectCache = null;
  taskProjectPromise = null;
  taskProjectScheduleCache = null;
  taskProjectSchedulePromise = null;
}

async function appendRows(tab: string, rows: unknown[][]) {
  await ensureTaskProjectSheets();
  const range = encodeURIComponent(`${tab}!A:Z`);
  await sheetsFetch(`/values/${range}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`, {
    method: "POST",
    body: JSON.stringify({ values: rows }),
  });
}

async function clearRow(tab: string, rowNumber: number, lastColumn: string, columnCount: number) {
  await ensureTaskProjectSheets();
  const range = encodeURIComponent(`${tab}!A${rowNumber}:${lastColumn}${rowNumber}`);
  await sheetsFetch(`/values/${range}?valueInputOption=RAW`, {
    method: "PUT",
    body: JSON.stringify({ values: [Array.from({ length: columnCount }, () => "")] }),
  });
}

async function fetchTaskProjectData(): Promise<TaskProjectData> {
  if (!getSheetId()) {
    return {
      mode: "not-configured" as const,
      projects: [] as ProjectRecord[],
      tasks: [] as TaskRecord[],
      message: "GOOGLE_SHEET_ID_TASK_PROJECT is not configured. Add it to .env.local to use live Tasks / Projects.",
    };
  }
  const [projectRows, taskRows] = await readTabRowsBatch([
    { tab: PROJECTS_TAB, rangeColumns: "R" },
    { tab: TASKS_TAB, rangeColumns: "P" },
  ]);
  return {
    mode: "google-sheet" as const,
    projects: projectRows.map(rowToProject).filter((item): item is ProjectRecord => Boolean(item)),
    tasks: taskRows.map(rowToTask).filter((item): item is TaskRecord => Boolean(item)),
    message: "",
  };
}

export async function listTaskProjectData(options: { forceRefresh?: boolean } = {}): Promise<TaskProjectData> {
  if (!options.forceRefresh && taskProjectCache && taskProjectCache.expiresAt > Date.now()) {
    return taskProjectCache.data;
  }
  if (!options.forceRefresh && taskProjectPromise) return taskProjectPromise;

  taskProjectPromise = fetchTaskProjectData()
    .then((data) => {
      taskProjectCache = { expiresAt: Date.now() + READ_CACHE_MS, data };
      return data;
    })
    .catch((error) => {
      if (taskProjectCache) {
        return {
          ...taskProjectCache.data,
          message: "Using recently cached Tasks / Projects because Google Sheets is temporarily rate-limited.",
        };
      }
      throw error;
    })
    .finally(() => {
      taskProjectPromise = null;
    });
  return taskProjectPromise;
}

async function fetchTaskProjectScheduleData(): Promise<TaskProjectScheduleData> {
  if (!getSheetId()) {
    const taskProjectData = await listTaskProjectData();
    return {
      mode: "not-configured" as const,
      projects: taskProjectData.projects,
      tasks: taskProjectData.tasks,
      manualEvents: [] as ScheduleEvent[],
      message: "GOOGLE_SHEET_ID_TASK_PROJECT is not configured. Showing schedule from visible Task / Project dates only.",
    };
  }
  const [projectRows, taskRows, scheduleRows] = await readTabRowsBatch([
    { tab: PROJECTS_TAB, rangeColumns: "R" },
    { tab: TASKS_TAB, rangeColumns: "P" },
    { tab: SCHEDULE_TAB, rangeColumns: "P" },
  ]);
  return {
    mode: "google-sheet" as const,
    projects: projectRows.map(rowToProject).filter((item): item is ProjectRecord => Boolean(item)),
    tasks: taskRows.map(rowToTask).filter((item): item is TaskRecord => Boolean(item)),
    manualEvents: scheduleRows.map(rowToScheduleEvent).filter((item): item is ScheduleEvent => Boolean(item)),
    message: "",
  };
}

export async function listTaskProjectScheduleData(options: { forceRefresh?: boolean } = {}): Promise<TaskProjectScheduleData> {
  if (!options.forceRefresh && taskProjectScheduleCache && taskProjectScheduleCache.expiresAt > Date.now()) {
    return taskProjectScheduleCache.data;
  }
  if (!options.forceRefresh && taskProjectSchedulePromise) return taskProjectSchedulePromise;

  taskProjectSchedulePromise = fetchTaskProjectScheduleData()
    .then((data) => {
      taskProjectScheduleCache = { expiresAt: Date.now() + READ_CACHE_MS, data };
      taskProjectCache = {
        expiresAt: Date.now() + READ_CACHE_MS,
        data: { mode: data.mode, projects: data.projects, tasks: data.tasks, message: data.message },
      };
      return data;
    })
    .catch((error) => {
      if (taskProjectScheduleCache) {
        return {
          ...taskProjectScheduleCache.data,
          message: "Using recently cached schedule data because Google Sheets is temporarily rate-limited.",
        };
      }
      throw error;
    })
    .finally(() => {
      taskProjectSchedulePromise = null;
    });
  return taskProjectSchedulePromise;
}

export async function listScheduleData(): Promise<ScheduleData> {
  const data = await listTaskProjectScheduleData();
  const derivedEvents = deriveScheduleEventsFromTasksProjects(data.tasks, data.projects);
  return {
    mode: data.mode,
    events: [...data.manualEvents, ...derivedEvents].sort((a, b) => a.startAt.localeCompare(b.startAt)),
    manualEvents: data.manualEvents,
    derivedEvents,
    message: data.message,
  };
}

function assertTaskWriteAllowed(current: TaskRecord, access?: { canManageAll?: boolean; owner?: string }) {
  if (!access || access.canManageAll) return;
  if (access.owner && current.assignedTo.toLowerCase() === access.owner.toLowerCase()) return;
  throw new Error("Forbidden");
}

export async function listTasks() {
  return (await listTaskProjectData()).tasks;
}

export async function listProjects() {
  return (await listTaskProjectData()).projects;
}

export async function updateTaskInSheet(taskId: string, patch: Partial<TaskRecord>, actor: string, access?: { canManageAll?: boolean; owner?: string }) {
  const rows = await readTabRows(TASKS_TAB, "P");
  const index = rows.findIndex((row) => safeString(row[0]) === taskId);
  if (index < 0) throw new Error("Task not found in Google Sheet.");
  const current = rowToTask(rows[index]);
  if (!current) throw new Error("Task row is invalid.");
  assertTaskWriteAllowed(current, access);
  const next: TaskRecord = {
    ...current,
    ...patch,
    progress: Math.max(0, Math.min(100, Number(patch.progress ?? current.progress) || 0)),
    updatedBy: actor,
    lastUpdate: nowStamp(),
  };
  if (next.status === "Done") next.progress = 100;
  if (next.progress >= 100) next.status = "Done";
  const rowNumber = index + 2;
  const range = encodeURIComponent(`${TASKS_TAB}!A${rowNumber}:P${rowNumber}`);
  await sheetsFetch(`/values/${range}?valueInputOption=RAW`, {
    method: "PUT",
    body: JSON.stringify({ values: [taskToRow(next)] }),
  });
  clearTaskProjectReadCache();
  return next;
}

export async function createTaskInSheet(input: TaskRecord) {
  const now = nowStamp();
  const task: TaskRecord = {
    ...input,
    taskId: input.taskId || `TSK-${Date.now()}`,
    taskDescription: input.taskDescription || "",
    category: input.category || "General",
    assignedTo: input.assignedTo || "",
    assignedBy: input.assignedBy || "System",
    updatedBy: input.updatedBy || input.assignedBy || "System",
    status: input.status || "To Do",
    priority: input.priority || "Medium",
    dueDate: input.dueDate || "",
    progress: Number(input.progress) || 0,
    note: input.note || "",
    sourceModule: input.sourceModule || "Tasks",
    lastUpdate: input.lastUpdate || now,
    createdAt: input.createdAt || now,
  };
  await appendRows(TASKS_TAB, [taskToRow(task)]);
  clearTaskProjectReadCache();
  return task;
}

export async function deleteTaskInSheet(taskId: string, access?: { canManageAll?: boolean; owner?: string }) {
  const rows = await readTabRows(TASKS_TAB, "P");
  const index = rows.findIndex((row) => safeString(row[0]) === taskId);
  if (index < 0) throw new Error("Task not found in Google Sheet.");
  const current = rowToTask(rows[index]);
  if (!current) throw new Error("Task row is invalid.");
  assertTaskWriteAllowed(current, access);
  await clearRow(TASKS_TAB, index + 2, "P", TASK_HEADERS.length);
  clearTaskProjectReadCache();
  return current;
}

export async function updateProjectInSheet(projectId: string, patch: Partial<ProjectRecord>) {
  const rows = await readTabRows(PROJECTS_TAB, "R");
  const index = rows.findIndex((row) => safeString(row[0]) === projectId);
  if (index < 0) throw new Error("Project not found in Google Sheet.");
  const current = rowToProject(rows[index]);
  if (!current) throw new Error("Project row is invalid.");
  const next: ProjectRecord = {
    ...current,
    ...patch,
    budget: Number(patch.budget ?? current.budget) || 0,
    lastUpdate: nowStamp(),
  };
  const rowNumber = index + 2;
  const range = encodeURIComponent(`${PROJECTS_TAB}!A${rowNumber}:R${rowNumber}`);
  await sheetsFetch(`/values/${range}?valueInputOption=RAW`, {
    method: "PUT",
    body: JSON.stringify({ values: [projectToRow(next)] }),
  });
  clearTaskProjectReadCache();
  return next;
}

export async function createProjectInSheet(input: ProjectRecord) {
  const project: ProjectRecord = {
    ...input,
    projectId: input.projectId || `PRJ-${Date.now()}`,
    lastUpdate: input.lastUpdate || nowStamp(),
  };
  await appendRows(PROJECTS_TAB, [projectToRow(project)]);
  clearTaskProjectReadCache();
  return project;
}

export async function createScheduleEventInSheet(input: ScheduleEvent) {
  const now = nowStamp();
  const event: ScheduleEvent = {
    ...input,
    eventId: input.eventId || `EVT-${Date.now()}`,
    eventType: input.eventType || "Meeting",
    location: input.location || "Head Office",
    owner: input.owner || "Team",
    attendees: input.attendees || [],
    startAt: input.startAt || "",
    endAt: input.endAt || input.startAt || "",
    status: input.status || "Scheduled",
    priority: input.priority || "Medium",
    relatedModule: input.relatedModule || "Schedule",
    relatedId: input.relatedId || "",
    note: input.note || "",
    createdBy: input.createdBy || "System",
    lastUpdate: input.lastUpdate || now,
    source: "manual",
  };
  await appendRows(SCHEDULE_TAB, [scheduleEventToRow(event)]);
  clearTaskProjectReadCache();
  return event;
}

export async function updateScheduleEventStatusInSheet(eventId: string, status: ScheduleStatus) {
  const rows = await readTabRows(SCHEDULE_TAB, "P");
  const index = rows.findIndex((row) => safeString(row[0]) === eventId);
  if (index < 0) throw new Error("Schedule event not found in Google Sheet.");
  const current = rowToScheduleEvent(rows[index]);
  if (!current) throw new Error("Schedule event row is invalid.");
  const next: ScheduleEvent = {
    ...current,
    status,
    lastUpdate: nowStamp(),
  };
  const rowNumber = index + 2;
  const range = encodeURIComponent(`${SCHEDULE_TAB}!A${rowNumber}:P${rowNumber}`);
  await sheetsFetch(`/values/${range}?valueInputOption=RAW`, {
    method: "PUT",
    body: JSON.stringify({ values: [scheduleEventToRow(next)] }),
  });
  clearTaskProjectReadCache();
  return next;
}

export async function updateScheduleEventInSheet(eventId: string, patch: Partial<ScheduleEvent>) {
  const rows = await readTabRows(SCHEDULE_TAB, "P");
  const index = rows.findIndex((row) => safeString(row[0]) === eventId);
  if (index < 0) throw new Error("Schedule event not found in Google Sheet.");
  const current = rowToScheduleEvent(rows[index]);
  if (!current) throw new Error("Schedule event row is invalid.");
  const next: ScheduleEvent = {
    ...current,
    ...patch,
    eventId: current.eventId,
    title: patch.title || current.title,
    eventType: patch.eventType || current.eventType,
    location: patch.location || current.location,
    owner: patch.owner || current.owner,
    attendees: Array.isArray(patch.attendees) ? patch.attendees : current.attendees,
    startAt: patch.startAt || current.startAt,
    endAt: patch.endAt || patch.startAt || current.endAt,
    status: patch.status || current.status,
    priority: patch.priority || current.priority,
    relatedModule: patch.relatedModule || current.relatedModule,
    relatedId: current.relatedId,
    createdBy: current.createdBy,
    lastUpdate: nowStamp(),
    source: "manual",
  };
  const rowNumber = index + 2;
  const range = encodeURIComponent(`${SCHEDULE_TAB}!A${rowNumber}:P${rowNumber}`);
  await sheetsFetch(`/values/${range}?valueInputOption=RAW`, {
    method: "PUT",
    body: JSON.stringify({ values: [scheduleEventToRow(next)] }),
  });
  clearTaskProjectReadCache();
  return next;
}

export async function deleteScheduleEventInSheet(eventId: string) {
  const rows = await readTabRows(SCHEDULE_TAB, "P");
  const index = rows.findIndex((row) => safeString(row[0]) === eventId);
  if (index < 0) throw new Error("Schedule event not found in Google Sheet.");
  const current = rowToScheduleEvent(rows[index]);
  if (!current) throw new Error("Schedule event row is invalid.");
  await clearRow(SCHEDULE_TAB, index + 2, "P", SCHEDULE_HEADERS.length);
  clearTaskProjectReadCache();
  return current;
}

export async function deleteProjectInSheet(projectId: string) {
  const rows = await readTabRows(PROJECTS_TAB, "R");
  const index = rows.findIndex((row) => safeString(row[0]) === projectId);
  if (index < 0) throw new Error("Project not found in Google Sheet.");
  const current = rowToProject(rows[index]);
  if (!current) throw new Error("Project row is invalid.");
  await clearRow(PROJECTS_TAB, index + 2, "R", PROJECT_HEADERS.length);
  clearTaskProjectReadCache();
  return current;
}
