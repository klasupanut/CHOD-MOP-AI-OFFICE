"use client";

import Image from "next/image";
import { useEffect, useMemo, useState, type CSSProperties } from "react";
import {
  CHOD_ORGANIZATION,
  DEFAULT_LOCAL_PROJECT_ID,
  createTenantPlanEnvelope,
  isTenantPlanEnvelope,
  tenantStorageKey,
} from "@/lib/planner/tenancy";
import {
  DEFAULT_INTERNAL_PLAN_LIMITS,
  buildWorkspaceUsageSummary,
  type UsageLevel,
} from "@/lib/planner/usage-guard";
import {
  DAY_MS,
  distributedProgressRatio,
  peakIndexFromCumulative,
} from "@/lib/planner/s-curve-calculations";
import {
  WorkspaceUsageDashboard,
  type UsageLoadState,
  type WorkspaceUsagePayload,
} from "./WorkspaceUsageDashboard";
import type {
  Activity,
  ActualSnapshot,
  CalendarMode,
  CompanyProfile,
  CurveView,
  EarningMethod,
  PdfOrientation,
  PlanningModel,
  ProjectMeta,
  SavedPlan,
  TenantCompanyLogoRecord,
  TenantCompanyProfileRecord,
  TenantPlanRecord,
  TenantProjectSummary,
} from "@/lib/planner/plan-contract";

type PlanStorageMode = "loading" | "cloud" | "local" | "error";
type ActiveWorkspacePage = "plan" | "projects" | "usage";
type ProjectLibraryState = "idle" | "loading" | "ready" | "error";

type TimelineChartRow = {
  id: string;
  code: string;
  label: string;
  start: string;
  end: string;
  duration: number;
  progress: number;
  actualStart: string;
  actualEnd: string;
  actualProgress: number;
  weight: number;
  owner: string;
  dependency: string;
  kind: "group" | "task";
};

const LEGACY_STORAGE_KEY = "timeline-plan-creator-v3";
const OBSOLETE_STORAGE_KEYS = [
  LEGACY_STORAGE_KEY,
  "timeline-plan-creator-v4:org-chod-ai-office:project-local-primary",
];
const STORAGE_KEY = tenantStorageKey(
  CHOD_ORGANIZATION.id,
  DEFAULT_LOCAL_PROJECT_ID,
);
const PROJECT_INDEX_KEY = `timeline-plan-creator-project-index:${CHOD_ORGANIZATION.id}`;
const ACTIVE_PROJECT_KEY = `timeline-plan-creator-active-project:${CHOD_ORGANIZATION.id}`;
const LOCAL_PLANNER_STORAGE_LIMIT_BYTES = 5_000_000;

const initialProject: ProjectMeta = {
  name: "",
  code: "",
  client: "",
  location: "",
  projectManager: "",
  contractNo: "",
  baselineDate: "",
  statusDate: "",
  issueDate: "",
  revision: "Rev 00",
  preparedBy: "",
  approvedBy: "",
};

const DEFAULT_COMPANY_NAME = "Chodthanawat Co., Ltd.";
const DEFAULT_COMPANY_LOCATION = "เลขที่ 80 อาคารสำนักงาน ชั้น 11 ถนนสุรวงศ์ แขวงสี่พระยา เขตบางรัก กรุงเทพมหานคร 10500";
const DEFAULT_COMPANY_LOGO_URL = "/brand/logo.png";

const initialCompany: CompanyProfile = {
  name: DEFAULT_COMPANY_NAME,
  location: DEFAULT_COMPANY_LOCATION,
  logoDataUrl: DEFAULT_COMPANY_LOGO_URL,
};

const initialActivities: Activity[] = [];

function createFreshProject(): ProjectMeta {
  const today = new Date().toISOString().slice(0, 10);
  return {
    ...initialProject,
    baselineDate: today,
    statusDate: today,
    issueDate: today,
  };
}

function isEmptyPlan(plan: SavedPlan) {
  const project = plan.project;
  return plan.activities.length === 0 &&
    !project.name &&
    !project.code &&
    !project.client &&
    !project.location &&
    !project.projectManager &&
    !project.contractNo &&
    !project.preparedBy &&
    !project.approvedBy;
}

function companyProfileSignature(company: Pick<CompanyProfile, "name" | "location">) {
  return JSON.stringify([company.name.trim(), company.location.trim()]);
}

function createLocalProjectId() {
  const suffix = typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  return `project-local-${suffix}`;
}

function localProjectIds(storage: Storage) {
  let ids: string[] = [];
  try {
    const parsed = JSON.parse(storage.getItem(PROJECT_INDEX_KEY) || "[]") as unknown;
    if (Array.isArray(parsed)) ids = parsed.filter((id): id is string => typeof id === "string" && id.length > 0);
  } catch {
    ids = [];
  }
  if (storage.getItem(STORAGE_KEY) && !ids.includes(DEFAULT_LOCAL_PROJECT_ID)) ids.push(DEFAULT_LOCAL_PROJECT_ID);
  return [...new Set(ids)];
}

function readLocalProject(storage: Storage, projectId: string): TenantPlanRecord | null {
  const raw = storage.getItem(tenantStorageKey(CHOD_ORGANIZATION.id, projectId));
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    const candidate = isTenantPlanEnvelope<SavedPlan>(parsed)
      ? parsed.data
      : parsed && typeof parsed === "object" && "data" in parsed
        ? (parsed as { data: SavedPlan }).data
        : parsed as SavedPlan;
    if (!candidate || typeof candidate !== "object" || !candidate.project || !Array.isArray(candidate.activities)) return null;
    const savedAt = parsed && typeof parsed === "object" && "savedAt" in parsed && typeof (parsed as { savedAt?: unknown }).savedAt === "string"
      ? (parsed as { savedAt: string }).savedAt
      : new Date().toISOString();
    return { projectId, savedAt, data: candidate };
  } catch {
    return null;
  }
}

function saveLocalProject(storage: Storage, projectId: string, plan: SavedPlan) {
  const envelope = createTenantPlanEnvelope(CHOD_ORGANIZATION, projectId, plan);
  storage.setItem(tenantStorageKey(CHOD_ORGANIZATION.id, projectId), JSON.stringify(envelope));
  const ids = localProjectIds(storage);
  if (!ids.includes(projectId)) ids.push(projectId);
  storage.setItem(PROJECT_INDEX_KEY, JSON.stringify(ids));
  storage.setItem(ACTIVE_PROJECT_KEY, projectId);
  return envelope;
}

function removeLocalProject(storage: Storage, projectId: string) {
  storage.removeItem(tenantStorageKey(CHOD_ORGANIZATION.id, projectId));
  storage.setItem(PROJECT_INDEX_KEY, JSON.stringify(localProjectIds(storage).filter((id) => id !== projectId)));
  if (storage.getItem(ACTIVE_PROJECT_KEY) === projectId) storage.removeItem(ACTIVE_PROJECT_KEY);
}

function listLocalProjects(storage: Storage): TenantProjectSummary[] {
  return localProjectIds(storage)
    .map((id) => readLocalProject(storage, id))
    .filter((record): record is TenantPlanRecord & { projectId: string; data: SavedPlan } => Boolean(record?.projectId && record.data))
    .map((record) => ({
      id: record.projectId,
      name: record.data.project.name,
      client: record.data.project.client,
      location: record.data.project.location,
      status: record.data.activities.length > 0 ? "active" as const : "draft" as const,
      activityCount: record.data.activities.filter((activity) => activity.kind === "task").length,
      baselineDate: record.data.project.baselineDate,
      statusDate: record.data.project.statusDate,
      updatedAt: record.savedAt || new Date().toISOString(),
    }))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

function plannerLocalStorageBytes(storage: Storage) {
  let bytes = 0;
  for (let index = 0; index < storage.length; index += 1) {
    const key = storage.key(index);
    if (!key?.startsWith("timeline-plan-creator")) continue;
    const value = storage.getItem(key) || "";
    // localStorage is typically accounted as UTF-16, so use two bytes per code unit.
    bytes += (key.length + value.length) * 2;
  }
  return bytes;
}

function buildLocalWorkspaceUsage(storage: Storage): WorkspaceUsagePayload {
  return buildWorkspaceUsageSummary(
    {
      projects: listLocalProjects(storage).length,
      members: 1,
      storageBytes: plannerLocalStorageBytes(storage),
    },
    {
      ...DEFAULT_INTERNAL_PLAN_LIMITS,
      storageBytes: LOCAL_PLANNER_STORAGE_LIMIT_BYTES,
    },
    {
      planCode: "browser_local",
      planLabel: "Browser Local",
      source: "browser-local-storage",
    },
  );
}

function ProjectLibrary({
  projects,
  state,
  currentProjectId,
  onNew,
  onOpen,
  onRefresh,
}: {
  projects: TenantProjectSummary[];
  state: ProjectLibraryState;
  currentProjectId: string | null;
  onNew: () => void;
  onOpen: (projectId: string) => void;
  onRefresh: () => void;
}) {
  const [query, setQuery] = useState("");
  const filtered = projects.filter((project) =>
    [project.name, project.client, project.location]
      .join(" ")
      .toLocaleLowerCase()
      .includes(query.trim().toLocaleLowerCase()),
  );

  return <section className="project-library" aria-labelledby="project-library-title">
    <div className="project-library-intro">
      <div>
        <h2 id="project-library-title">Project library</h2>
        <p>Create a separate timeline for each fit-out project, then reopen any saved plan from this workspace.</p>
      </div>
      <button type="button" className="button primary" onClick={onNew}>+ New project</button>
    </div>
    <div className="project-library-tools">
      <label><span className="sr-only">Search projects</span><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search project, client or location" /></label>
      <button type="button" className="button quiet" onClick={onRefresh} disabled={state === "loading"}>Refresh</button>
    </div>
    {state === "loading" ? <div className="project-library-state" role="status">Loading projects...</div> : state === "error" ? <div className="project-library-state" role="alert">Could not load the project library. <button type="button" onClick={onRefresh}>Try again</button></div> : filtered.length === 0 ? <div className="project-library-empty"><strong>{projects.length ? "No matching projects" : "No saved projects yet"}</strong><p>{projects.length ? "Try another project name, client or location." : "Create your first project. It will autosave to this workspace."}</p><button type="button" className="button primary" onClick={onNew}>Create project</button></div> : <div className="project-library-table" role="list">
      {filtered.map((item) => <article className={`project-library-row ${item.id === currentProjectId ? "current" : ""}`} role="listitem" key={item.id}>
        <div className="project-library-name"><strong>{item.name || "Untitled fit-out project"}</strong><span>{item.client || "No client"}{item.location ? ` · ${item.location}` : ""}</span></div>
        <div><small>Baseline</small><strong>{displayDate(item.baselineDate)}</strong></div>
        <div><small>Activities</small><strong>{item.activityCount}</strong></div>
        <div><small>Last saved</small><strong>{new Date(item.updatedAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}</strong></div>
        <div className="project-library-action">{item.id === currentProjectId && <span>Open now</span>}<button type="button" className="button quiet" onClick={() => onOpen(item.id)}>{item.id === currentProjectId ? "Return to plan" : "Open"}</button></div>
      </article>)}
    </div>}
  </section>;
}

const usageLevelLabel: Record<UsageLevel, string> = {
  healthy: "Safe",
  notice: "70% notice",
  warning: "85% warning",
  critical: "95% critical",
  blocked: "Limit reached",
};

const usageLevelRank: Record<UsageLevel, number> = {
  healthy: 0,
  notice: 1,
  warning: 2,
  critical: 3,
  blocked: 4,
};

const pad = (value: number) => String(value).padStart(2, "0");

function parseDate(value: string) {
  if (!value) return new Date(0);
  const [year, month, day] = value.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function toISO(date: Date) {
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
}

function isWorkday(date: Date) {
  const day = date.getUTCDay();
  return day !== 0 && day !== 6;
}

function addDuration(start: string, rawDuration: number, mode: CalendarMode) {
  const duration = Math.max(1, Number(rawDuration) || 1);
  const date = parseDate(start);
  if (mode === "calendar") {
    date.setUTCDate(date.getUTCDate() + duration - 1);
    return toISO(date);
  }
  let counted = isWorkday(date) ? 1 : 0;
  while (counted < duration) {
    date.setUTCDate(date.getUTCDate() + 1);
    if (isWorkday(date)) counted += 1;
  }
  return toISO(date);
}

function durationBetween(start: string, end: string, mode: CalendarMode) {
  const from = parseDate(start);
  const to = parseDate(end);
  if (to < from) return 1;
  if (mode === "calendar") {
    return Math.floor((to.getTime() - from.getTime()) / 86_400_000) + 1;
  }
  const cursor = new Date(from);
  let count = 0;
  while (cursor <= to) {
    if (isWorkday(cursor)) count += 1;
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return Math.max(1, count);
}

function displayDate(value: string) {
  if (!value) return "—";
  return parseDate(value).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" });
}

function displayShortDate(value: string) {
  if (!value) return "—";
  return parseDate(value).toLocaleDateString("en-GB", { day: "2-digit", month: "short", timeZone: "UTC" });
}

type TimelineAxisSegment = {
  key: string;
  label: string;
  shortLabel?: string;
  detail: string;
  left: number;
  width: number;
};

function isoWeekNumber(date: Date) {
  const target = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const dayNumber = target.getUTCDay() || 7;
  target.setUTCDate(target.getUTCDate() + 4 - dayNumber);
  const yearStart = new Date(Date.UTC(target.getUTCFullYear(), 0, 1));
  return Math.ceil((((target.getTime() - yearStart.getTime()) / DAY_MS) + 1) / 7);
}

function timelineSegmentPosition(segmentStart: number, segmentEnd: number, startMs: number, endMs: number) {
  if (endMs <= startMs) return { left: 0, width: 100 };
  const spanMs = endMs - startMs;
  const left = clamp(((segmentStart - startMs) / spanMs) * 100, 0, 100);
  const right = clamp(((segmentEnd - startMs) / spanMs) * 100, 0, 100);
  return { left, width: Math.max(0, right - left) };
}

function timelineMonthSegments(startMs: number, endMs: number): TimelineAxisSegment[] {
  const start = new Date(startMs);
  let cursor = Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), 1);
  const segments: TimelineAxisSegment[] = [];

  while (cursor < endMs || segments.length === 0) {
    const cursorDate = new Date(cursor);
    const nextMonth = Date.UTC(cursorDate.getUTCFullYear(), cursorDate.getUTCMonth() + 1, 1);
    const segmentStart = Math.max(cursor, startMs);
    const segmentEnd = Math.min(nextMonth, endMs);
    const position = timelineSegmentPosition(segmentStart, segmentEnd, startMs, endMs);
    segments.push({
      key: `month-${cursor}`,
      label: cursorDate.toLocaleDateString("en-GB", { month: "long", year: "numeric", timeZone: "UTC" }),
      shortLabel: cursorDate.toLocaleDateString("en-GB", { month: "short", year: "2-digit", timeZone: "UTC" }),
      detail: `${displayShortDate(toISO(new Date(segmentStart)))} - ${displayShortDate(toISO(new Date(segmentEnd)))}`,
      ...position,
    });
    cursor = nextMonth;
  }

  return segments;
}

function timelineWeekSegments(startMs: number, endMs: number): TimelineAxisSegment[] {
  const start = new Date(startMs);
  const mondayOffset = (start.getUTCDay() + 6) % 7;
  let cursor = startMs - mondayOffset * DAY_MS;
  const segments: TimelineAxisSegment[] = [];

  while (cursor < endMs || segments.length === 0) {
    const nextWeek = cursor + 7 * DAY_MS;
    const segmentStart = Math.max(cursor, startMs);
    const segmentEnd = Math.min(nextWeek, endMs);
    const weekStart = new Date(cursor);
    const position = timelineSegmentPosition(segmentStart, segmentEnd, startMs, endMs);
    segments.push({
      key: `week-${cursor}`,
      label: `W${String(isoWeekNumber(weekStart)).padStart(2, "0")}`,
      detail: displayShortDate(toISO(new Date(segmentStart))),
      ...position,
    });
    cursor = nextWeek;
  }

  return segments;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

const LEGACY_BUDGET_UNIT = 100_000;

function taskBudget(task: Activity) {
  return Math.max(0, Number(task.budget ?? task.weight * LEGACY_BUDGET_UNIT) || 0);
}

function migrateActivities(source: Activity[], mode: CalendarMode) {
  return source.map((activity) => {
    if (activity.kind === "group") return { ...activity, actualStart: activity.actualStart ?? "", actualEnd: activity.actualEnd ?? "", budget: 0 };
    const legacyProgress = clamp(Number(activity.progress) || 0, 0, 100);
    return {
      ...activity,
      actualStart: activity.actualStart ?? (legacyProgress > 0 ? activity.start : ""),
      actualEnd: activity.actualEnd ?? (legacyProgress >= 100 ? addDuration(activity.start, activity.duration, mode) : ""),
      budget: taskBudget(activity),
      earningMethod: activity.earningMethod ?? "certified",
    };
  });
}

function legacySnapshots(source: Activity[], statusDate: string, mode: CalendarMode): ActualSnapshot[] {
  return migrateActivities(source, mode)
    .filter((activity) => activity.kind === "task" && activity.progress > 0 && taskBudget(activity) > 0)
    .map((activity) => ({
      id: `legacy-${activity.id}`,
      activityId: activity.id,
      date: activity.progress >= 100 && activity.actualEnd ? activity.actualEnd : statusDate,
      earnedValue: Math.round(taskBudget(activity) * clamp(activity.progress, 0, 100) / 100),
    }));
}

function taskWeightMap(tasks: Activity[], planningModel: PlanningModel) {
  const bases = tasks.map((task) => planningModel === "intensive" ? taskBudget(task) : Math.max(1, task.duration));
  const total = bases.reduce((sum, basis) => sum + basis, 0);
  return new Map(tasks.map((task, index) => [task.id, total > 0 ? bases[index] / total * 100 : 0]));
}

function earnedValueAt(activityId: string, snapshots: ActualSnapshot[], date: string) {
  const eligible = snapshots
    .filter((snapshot) => snapshot.activityId === activityId && snapshot.date <= date)
    .sort((a, b) => a.date.localeCompare(b.date));
  return eligible.at(-1)?.earnedValue ?? 0;
}

function taskEarningMethod(task: Activity): EarningMethod {
  return task.earningMethod ?? "certified";
}

function taskEarnedValueAt(task: Activity, snapshots: ActualSnapshot[], date: string, mode: CalendarMode) {
  const budget = taskBudget(task);
  if (budget <= 0) return 0;

  const currentMs = parseDate(date).getTime();
  const actualStartMs = task.actualStart ? parseDate(task.actualStart).getTime() : 0;
  const actualEndMs = task.actualEnd ? parseDate(task.actualEnd).getTime() : 0;
  const method = taskEarningMethod(task);

  if (method === "certified") return clamp(earnedValueAt(task.id, snapshots, date), 0, budget);
  if (method === "zero-hundred") return actualEndMs > 0 && actualEndMs <= currentMs ? budget : 0;
  if (method === "fifty-fifty") {
    const started = actualStartMs > 0 && actualStartMs <= currentMs ? budget * 0.5 : 0;
    const finished = actualEndMs > 0 && actualEndMs <= currentMs ? budget * 0.5 : 0;
    return started + finished;
  }

  if (actualStartMs <= 0 || actualStartMs > currentMs) return 0;
  const levelOfEffortEnd = actualEndMs > 0
    ? actualEndMs
    : parseDate(addDuration(task.actualStart || task.start, task.duration, mode)).getTime();
  const levelOfEffortDuration = durationBetween(task.actualStart || task.start, toISO(new Date(levelOfEffortEnd)), mode);
  return budget * distributedProgressRatio(actualStartMs, levelOfEffortEnd, levelOfEffortDuration, currentMs, mode);
}

function earnedValueBoundsAt(activityId: string, snapshots: ActualSnapshot[], date: string, budget: number) {
  const previousEarned = snapshots
    .filter((snapshot) => snapshot.activityId === activityId && snapshot.date < date)
    .reduce((highest, snapshot) => Math.max(highest, snapshot.earnedValue), 0);
  const futureEarned = snapshots
    .filter((snapshot) => snapshot.activityId === activityId && snapshot.date > date)
    .reduce<number | null>((lowest, snapshot) => lowest === null ? snapshot.earnedValue : Math.min(lowest, snapshot.earnedValue), null);

  const min = Math.min(previousEarned, budget);
  return {
    min,
    max: Math.max(min, Math.min(budget, futureEarned ?? budget)),
  };
}

function hasInvalidEarnedHistory(task: Activity, snapshots: ActualSnapshot[]) {
  if (taskEarningMethod(task) !== "certified") return false;
  const budget = taskBudget(task);
  let previousEarned = 0;
  return snapshots
    .filter((snapshot) => snapshot.activityId === task.id)
    .sort((a, b) => a.date.localeCompare(b.date))
    .some((snapshot) => {
      const invalid = snapshot.earnedValue < previousEarned || snapshot.earnedValue > budget;
      previousEarned = Math.max(previousEarned, snapshot.earnedValue);
      return invalid;
    });
}

function taskActualProgress(task: Activity, planningModel: PlanningModel, statusDate: string, snapshots: ActualSnapshot[], mode: CalendarMode) {
  if (planningModel === "normal") return task.actualEnd && task.actualEnd <= statusDate ? 100 : 0;
  const budget = taskBudget(task);
  return budget > 0 ? clamp(taskEarnedValueAt(task, snapshots, statusDate, mode) / budget * 100, 0, 100) : 0;
}

function actualBarEnd(task: Activity, statusDate: string) {
  if (!task.actualStart) return "";
  if (task.actualEnd) return task.actualEnd;
  return task.actualStart <= statusDate ? statusDate : task.actualStart;
}

function timelineBounds(tasks: Activity[], mode: CalendarMode, statusDate: string) {
  const values = tasks.flatMap((task) => [task.start, addDuration(task.start, task.duration, mode), task.actualStart || "", actualBarEnd(task, statusDate)]).filter(Boolean);
  values.push(statusDate);
  return {
    startMs: Math.min(...values.map((value) => parseDate(value).getTime())),
    endMs: Math.max(...values.map((value) => parseDate(value).getTime())),
  };
}

function plannedRatioAt(task: Activity, current: number, mode: CalendarMode) {
  const taskStart = parseDate(task.start).getTime();
  const taskEnd = parseDate(addDuration(task.start, task.duration, mode)).getTime();
  return distributedProgressRatio(taskStart, taskEnd, task.duration, current, mode);
}

function plannedPeak(tasks: Activity[], mode: CalendarMode, planningModel: PlanningModel) {
  if (tasks.length === 0) return { index: 0, dateMs: 0, label: "" };
  const startMs = Math.min(...tasks.map((task) => parseDate(task.start).getTime()));
  const endMs = Math.max(...tasks.map((task) => parseDate(addDuration(task.start, task.duration, mode)).getTime()));
  const span = Math.max(1, Math.round((endMs - startMs) / DAY_MS));
  const weights = taskWeightMap(tasks, planningModel);
  const cumulativeAt = (current: number) => tasks.reduce((sum, task) => sum + plannedRatioAt(task, current, mode) * (weights.get(task.id) ?? 0), 0);
  const cumulativeValues = Array.from({ length: span + 1 }, (_, day) => cumulativeAt(startMs + day * DAY_MS));
  const peakIndex = peakIndexFromCumulative(cumulativeValues);

  return {
    index: peakIndex,
    dateMs: startMs + peakIndex * DAY_MS,
    label: displayDate(toISO(new Date(startMs + peakIndex * DAY_MS))).replace(/ \d{4}$/, ""),
  };
}

function Scurve({ tasks, mode, planningModel, statusDate, snapshots, curveView, showStatusDate }: { tasks: Activity[]; mode: CalendarMode; planningModel: PlanningModel; statusDate: string; snapshots: ActualSnapshot[]; curveView: CurveView; showStatusDate: boolean }) {
  if (tasks.length === 0) return null;
  const { startMs, endMs } = timelineBounds(tasks, mode, statusDate);
  const span = Math.max(1, Math.round((endMs - startMs) / DAY_MS));
  const statusDay = clamp(Math.round((parseDate(statusDate).getTime() - startMs) / DAY_MS), 0, span);
  const weights = taskWeightMap(tasks, planningModel);
  const inset = 24;
  const plotSize = 1000 - inset * 2;
  const measuredCurveLabel = planningModel === "intensive" ? "Earned progress" : "Completed progress";

  const plannedPoints = Array.from({ length: span + 1 }, (_, day) => {
    const current = startMs + day * DAY_MS;
    const cumulative = tasks.reduce((sum, task) => sum + plannedRatioAt(task, current, mode) * (weights.get(task.id) ?? 0), 0);
    return { x: (day / span) * 1000, y: inset + plotSize - (cumulative / 100) * plotSize };
  });

  const actualPoints = Array.from({ length: statusDay + 1 }, (_, day) => {
    const currentDate = toISO(new Date(startMs + day * DAY_MS));
    const cumulative = tasks.reduce((sum, task) => {
      const actualRatio = planningModel === "normal"
        ? (task.actualEnd && task.actualEnd <= currentDate ? 1 : 0)
        : (taskBudget(task) > 0 ? clamp(taskEarnedValueAt(task, snapshots, currentDate, mode) / taskBudget(task), 0, 1) : 0);
      return sum + actualRatio * (weights.get(task.id) ?? 0);
    }, 0);
    return { x: (day / span) * 1000, y: inset + plotSize - (cumulative / 100) * plotSize };
  });

  const toPath = (points: { x: number; y: number }[]) => points.map((point, index) => `${index === 0 ? "M" : "L"}${point.x.toFixed(2)} ${point.y.toFixed(2)}`).join(" ");
  const plannedPath = toPath(plannedPoints);
  const actualPath = toPath(actualPoints);
  const peak = plannedPeak(tasks, mode, planningModel);
  const peakIndex = clamp(Math.round((peak.dateMs - startMs) / DAY_MS), 0, span);
  const peakPoint = plannedPoints[peakIndex] ?? plannedPoints[0];
  const statusX = (statusDay / span) * 1000;

  return (
    <>
      <svg className="timeline-curve-canvas" viewBox="0 0 1000 1000" preserveAspectRatio="none" role="img" aria-label={`Baseline and ${measuredCurveLabel.toLowerCase()} cumulative S-curve overlaid directly on the timeline, with the peak planned slope marked`}>
        <title>Baseline and {measuredCurveLabel.toLowerCase()} cumulative S-curve</title>
        {showStatusDate && <line className="curve-status-line" x1={statusX} x2={statusX} y1={inset} y2={1000 - inset} />}
        {curveView !== "actual" && <>
          <line className="curve-peak-line" x1={peakPoint.x} x2={peakPoint.x} y1={inset} y2={1000 - inset} />
          <path className="curve-underlay" d={plannedPath} />
          <path className="curve-planned-path" d={plannedPath} />
        </>}
        {curveView !== "plan" && <>
          <path className="curve-underlay curve-underlay-actual" d={actualPath} />
          <path className="curve-actual-path" d={actualPath} />
        </>}
      </svg>
      {curveView !== "actual" && <span className="curve-peak-marker" style={{ left: `${peakPoint.x / 10}%`, top: `${peakPoint.y / 10}%` }} aria-hidden="true" />}
    </>
  );
}

function IntegratedTimeline({ rows, tasks, mode, showCurve, includeCurvePdf, showStatusDate, planningModel, statusDate, snapshots, curveView, reportMode = false }: { rows: TimelineChartRow[]; tasks: Activity[]; mode: CalendarMode; showCurve: boolean; includeCurvePdf: boolean; showStatusDate: boolean; planningModel: PlanningModel; statusDate: string; snapshots: ActualSnapshot[]; curveView: CurveView; reportMode?: boolean }) {
  if (tasks.length === 0) {
    return <div className="timeline-empty"><strong>No work packages yet</strong><span>Add a work package and its sub-plans to generate the timeline and S-curve.</span></div>;
  }

  const { startMs, endMs } = timelineBounds(tasks, mode, statusDate);
  const spanMs = Math.max(DAY_MS, endMs - startMs);
  const monthSegments = timelineMonthSegments(startMs, endMs);
  const weekSegments = timelineWeekSegments(startMs, endMs);
  const peak = plannedPeak(tasks, mode, planningModel);
  const peakRatio = clamp((peak.dateMs - startMs) / spanMs, 0, 1);
  const peakAnchor = peakRatio < 0.18 ? "anchor-start" : peakRatio > 0.82 ? "anchor-end" : "anchor-center";
  const statusRatio = clamp((parseDate(statusDate).getTime() - startMs) / spanMs, 0, 1);
  const progressMetric = planningModel === "intensive" ? "earned" : "completed";

  return (
    <div className={`combined-chart chart-view-${curveView} ${showStatusDate ? "show-status-date" : "hide-status-date"} ${reportMode ? "report-table-frame" : ""}`} style={{ "--timeline-row-count": Math.max(1, rows.length) } as CSSProperties}>
      <div className="timeline-axis-row">
        <div className="timeline-axis-label"><strong>Work package</strong><span>Month / ISO week</span></div>
        <div className="timeline-axis-track" aria-label="Shared project date axis grouped by month and ISO week">
          <div className="timeline-month-row">
            {monthSegments.map((segment) => (
              <span className="timeline-month-cell" key={segment.key} style={{ left: `${segment.left}%`, width: `${segment.width}%` }} title={`${segment.label} · ${segment.detail}`}><span className="month-label-full">{segment.label}</span><span className="month-label-short">{segment.shortLabel}</span></span>
            ))}
          </div>
          <div className="timeline-week-row">
            {weekSegments.map((segment) => (
              <span className="timeline-week-cell" key={segment.key} style={{ left: `${segment.left}%`, width: `${segment.width}%` }} title={`${segment.label} · ${segment.detail}`}><strong>{segment.label}</strong><time>{segment.detail}</time></span>
            ))}
          </div>
          <div className="timeline-axis-events">
            {curveView !== "actual" && <span className={`peak-axis-chip ${peakAnchor} ${showCurve ? "" : "curve-hidden-screen"} ${includeCurvePdf ? "" : "exclude-curve-print"}`} style={{ left: `${clamp(peakRatio * 100, 1, 99)}%` }} aria-label={`Peak planned workload ${peak.label}`}>
              <svg className="peak-axis-icon" viewBox="0 0 16 16" aria-hidden="true" focusable="false">
                <path d="M3 12.5V8.25M8 12.5v-9M13 12.5V8.25" />
                <circle cx="8" cy="3.5" r="1.15" />
              </svg>
              <span className="peak-axis-copy"><strong>Peak load</strong><time>{peak.label}</time></span>
            </span>}
            <span className="status-axis-chip" style={{ left: `${clamp(statusRatio * 100, 5, 95)}%` }}>STATUS · {displayShortDate(statusDate)}</span>
          </div>
        </div>
      </div>

      <div className="timeline-bar-list">
        {rows.map((row) => {
          const rowStart = parseDate(row.start).getTime();
          const rowEnd = parseDate(row.end).getTime();
          const left = clamp(((rowStart - startMs) / spanMs) * 100, 0, 100);
          const width = Math.max(1.2, ((rowEnd - rowStart + DAY_MS) / (spanMs + DAY_MS)) * 100);
          const boundedWidth = Math.min(width, 100 - left);
          const actualStartMs = row.actualStart ? parseDate(row.actualStart).getTime() : 0;
          const actualEndMs = row.actualEnd ? parseDate(row.actualEnd).getTime() : 0;
          const actualLeft = row.actualStart ? clamp(((actualStartMs - startMs) / spanMs) * 100, 0, 100) : 0;
          const actualWidth = row.actualStart && row.actualEnd ? Math.max(1.2, ((actualEndMs - actualStartMs + DAY_MS) / (spanMs + DAY_MS)) * 100) : 0;
          const boundedActualWidth = Math.min(actualWidth, 100 - actualLeft);
          const keepProgressInside = actualLeft + boundedActualWidth > 92;
          const owner = row.owner.trim();
          const reportOwner = owner && !/^(?:owner\s+)?tbc$/i.test(owner) ? owner : "";
          const rowDetails = reportMode
            ? [displayDate(row.start) + " - " + displayDate(row.end), `${row.duration} days`, reportOwner].filter(Boolean).join(" · ")
            : `${displayDate(row.start)} - ${displayDate(row.end)} · ${row.duration} days · ${owner || "Owner TBC"}${row.dependency && row.dependency !== "-" ? ` · Depends ${row.dependency}` : ""}`;
          return (
            <div className={`timeline-chart-row ${row.kind}`} key={row.id}>
              <div className="timeline-row-label">
                <span>{row.code}</span>
                <div><strong>{row.label}</strong><small>{rowDetails}</small></div>
              </div>
              <div className="timeline-row-track">
                <div className="timeline-guides" aria-hidden="true">
                  {weekSegments.slice(1).map((segment) => <i className="week-guide" key={segment.key} style={{ left: `${segment.left}%` }} />)}
                  {monthSegments.slice(1).map((segment) => <i className="month-guide" key={segment.key} style={{ left: `${segment.left}%` }} />)}
                </div>
                {showStatusDate && <i className="timeline-status-guide" style={{ left: `${statusRatio * 100}%` }} aria-hidden="true" />}
                {curveView !== "actual" && <div className="timeline-bar planned-timeline-bar" style={{ left: `${left}%`, width: `${boundedWidth}%` }} title={`${displayDate(row.start)} - ${displayDate(row.end)} / ${row.weight.toFixed(1)}% weight`} />}
                {curveView !== "plan" && row.actualStart && row.actualEnd && <div className={`timeline-bar actual-timeline-bar ${keepProgressInside ? "progress-label-inside" : ""}`} style={{ left: `${actualLeft}%`, width: `${boundedActualWidth}%` }} title={`Actual: ${displayDate(row.actualStart)} - ${displayDate(row.actualEnd)} / ${Math.round(row.actualProgress)}% ${progressMetric}`}><b>{row.actualProgress > 0 ? `${Math.round(row.actualProgress)}%` : "START"}</b></div>}
              </div>
            </div>
          );
        })}
        {reportMode && <div className="report-table-bottom-rule" aria-hidden="true" />}
        <div className={`timeline-curve-overlay ${showCurve ? "" : "curve-hidden-screen"} ${includeCurvePdf ? "" : "exclude-curve-print"}`}>
          <div className="curve-overlay-scale" aria-hidden="true"><span>100%</span><span>75%</span><span>50%</span><span>25%</span><span>0%</span></div>
          <Scurve tasks={tasks} mode={mode} planningModel={planningModel} statusDate={statusDate} snapshots={snapshots} curveView={curveView} showStatusDate={showStatusDate} />
        </div>
      </div>
    </div>
  );
}

export default function TimelinePlannerWorkspace() {
  const [project, setProject] = useState(initialProject);
  const [company, setCompany] = useState(initialCompany);
  const [activities, setActivities] = useState<Activity[]>(() =>
    migrateActivities(initialActivities, "calendar"),
  );
  const [actualSnapshots, setActualSnapshots] = useState<ActualSnapshot[]>(() => legacySnapshots(initialActivities, initialProject.statusDate, "calendar"));
  const [calendarMode, setCalendarMode] = useState<CalendarMode>("calendar");
  const [planningModel, setPlanningModel] = useState<PlanningModel>("normal");
  const [curveView, setCurveView] = useState<CurveView>("compare");
  const [showCurve, setShowCurve] = useState(true);
  const [includeCurvePdf, setIncludeCurvePdf] = useState(true);
  const [showStatusDate, setShowStatusDate] = useState(true);
  const [pdfOrientation, setPdfOrientation] = useState<PdfOrientation>("landscape");
  const [showTimelineSubplans, setShowTimelineSubplans] = useState(false);
  const [pdfPreview, setPdfPreview] = useState(false);
  const [printingPdf, setPrintingPdf] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(true);
  const [companyOpen, setCompanyOpen] = useState(false);
  const [logoMessage, setLogoMessage] = useState("PNG, JPG or WebP up to 1.5 MB");
  const [pendingDeleteGroup, setPendingDeleteGroup] = useState<Activity | null>(null);
  const [savedLabel, setSavedLabel] = useState("Opening planner workspace...");
  const [hydrated, setHydrated] = useState(false);
  const [planStorageMode, setPlanStorageMode] = useState<PlanStorageMode>("loading");
  const [cloudProjectId, setCloudProjectId] = useState<string | null>(null);
  const [savedCompanySignature, setSavedCompanySignature] = useState("");
  const [workspaceUsage, setWorkspaceUsage] = useState<WorkspaceUsagePayload | null>(null);
  const [usageState, setUsageState] = useState<UsageLoadState>("loading");
  const [usageRefreshToken, setUsageRefreshToken] = useState(0);
  const [activePage, setActivePage] = useState<ActiveWorkspacePage>("plan");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [projectLibrary, setProjectLibrary] = useState<TenantProjectSummary[]>([]);
  const [projectLibraryState, setProjectLibraryState] = useState<ProjectLibraryState>("idle");

  useEffect(() => {
    const syncPageFromHash = () => {
      const page = window.location.hash === "#workspace-usage" ? "usage" : window.location.hash === "#projects" ? "projects" : "plan";
      setActivePage(page);
      if (page === "projects") {
        setProjectLibrary(listLocalProjects(window.localStorage));
        setProjectLibraryState("ready");
      }
    };
    const frame = window.requestAnimationFrame(syncPageFromHash);
    window.addEventListener("hashchange", syncPageFromHash);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("hashchange", syncPageFromHash);
    };
  }, []);

  useEffect(() => {
    if (!mobileMenuOpen) return;
    const closeMenu = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileMenuOpen(false);
    };
    window.addEventListener("keydown", closeMenu);
    return () => window.removeEventListener("keydown", closeMenu);
  }, [mobileMenuOpen]);

  useEffect(() => {
    const applyPlan = (saved: SavedPlan) => {
      const mergedProject = { ...initialProject, ...saved.project };
      const savedCalendar = saved.calendarMode || "calendar";
      setProject(mergedProject);
      setCompany({
        ...initialCompany,
        ...saved.company,
        logoDataUrl: saved.company?.logoDataUrl || initialCompany.logoDataUrl,
      });
      setActivities(Array.isArray(saved.activities) ? migrateActivities(saved.activities, savedCalendar) : []);
      setActualSnapshots(Array.isArray(saved.actualSnapshots) ? saved.actualSnapshots : []);
      setCalendarMode(savedCalendar);
      setPlanningModel(saved.planningModel || "normal");
      setCurveView(saved.curveView || "compare");
      setShowCurve(saved.showCurve !== false);
      setIncludeCurvePdf(saved.includeCurvePdf !== false);
      setShowStatusDate(saved.showStatusDate !== false);
      setPdfOrientation(saved.pdfOrientation === "portrait" ? "portrait" : "landscape");
    };

    const storage = window.localStorage;
    let projectId = storage.getItem(ACTIVE_PROJECT_KEY) || DEFAULT_LOCAL_PROJECT_ID;
    let record = readLocalProject(storage, projectId);
    if (!record && projectId !== DEFAULT_LOCAL_PROJECT_ID) {
      projectId = DEFAULT_LOCAL_PROJECT_ID;
      record = readLocalProject(storage, projectId);
    }

    if (!record) {
      for (const legacyKey of OBSOLETE_STORAGE_KEYS) {
        const raw = storage.getItem(legacyKey);
        if (!raw) continue;
        try {
          const parsed = JSON.parse(raw) as SavedPlan | { data?: SavedPlan };
          const legacyPlan = parsed && typeof parsed === "object" && "data" in parsed ? parsed.data : parsed as SavedPlan;
          if (legacyPlan?.project && Array.isArray(legacyPlan.activities)) {
            record = { projectId: DEFAULT_LOCAL_PROJECT_ID, savedAt: new Date().toISOString(), data: legacyPlan };
            projectId = DEFAULT_LOCAL_PROJECT_ID;
            break;
          }
        } catch {
          // Keep a malformed legacy value untouched so the user can recover it manually.
        }
      }
    }

    if (record?.data) {
      applyPlan(record.data);
      setSavedCompanySignature(companyProfileSignature({ ...initialCompany, ...record.data.company }));
      setSavedLabel("Local project loaded");
    } else {
      setProject(createFreshProject());
      setSavedLabel("Local workspace ready");
    }

    setCloudProjectId(projectId);
    storage.setItem(ACTIVE_PROJECT_KEY, projectId);
    setPlanStorageMode("local");
    setUsageState("local");
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated || planStorageMode === "loading") return;
    const cachedPayload: SavedPlan = { project, company, activities, actualSnapshots, calendarMode, planningModel, curveView, showCurve, includeCurvePdf, showStatusDate, pdfOrientation };
    const projectId = cloudProjectId ?? DEFAULT_LOCAL_PROJECT_ID;
    const saved = window.setTimeout(() => {
      try {
        saveLocalProject(window.localStorage, projectId, cachedPayload);
        if (activePage === "projects") {
          setProjectLibrary(listLocalProjects(window.localStorage));
          setProjectLibraryState("ready");
        }
        if (activePage === "usage") setUsageRefreshToken((value) => value + 1);
        setSavedLabel(`Saved locally ${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`);
      } catch {
        setSavedLabel("Local save failed — reduce the imported logo size or download a JSON backup");
      }
    }, 180);
    return () => window.clearTimeout(saved);
  }, [project, company, activities, actualSnapshots, calendarMode, planningModel, curveView, showCurve, includeCurvePdf, showStatusDate, pdfOrientation, hydrated, planStorageMode, cloudProjectId, activePage]);

  useEffect(() => {
    if (!hydrated || planStorageMode !== "cloud") return;
    const planPayload: SavedPlan = { project, activities, actualSnapshots, calendarMode, planningModel, curveView, showCurve, includeCurvePdf, showStatusDate, pdfOrientation };
    if (!cloudProjectId && isEmptyPlan(planPayload)) return;

    const saving = window.setTimeout(
      () => setSavedLabel("Syncing plan to Cloudflare..."),
      0,
    );
    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      try {
        const response = await fetch("/api/tenant/plan", {
          method: "PUT",
          cache: "no-store",
          credentials: "same-origin",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ projectId: cloudProjectId, data: planPayload }),
          signal: controller.signal,
        });
        if (!response.ok) throw new Error("Cloud sync failed.");
        const record = (await response.json()) as TenantPlanRecord;
        setCloudProjectId(record.projectId);
        setSavedLabel(`Cloud synced ${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`);
        setUsageRefreshToken((value) => value + 1);
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setSavedLabel("Cloud sync unavailable — local cache saved");
      }
    }, 650);
    return () => {
      window.clearTimeout(saving);
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [project, activities, actualSnapshots, calendarMode, planningModel, curveView, showCurve, includeCurvePdf, showStatusDate, pdfOrientation, hydrated, planStorageMode, cloudProjectId]);

  useEffect(() => {
    if (!hydrated || planStorageMode !== "cloud") return;
    const signature = companyProfileSignature({
      name: company.name,
      location: company.location,
    });
    if (signature === savedCompanySignature) return;

    const controller = new AbortController();
    const saving = window.setTimeout(
      () => setSavedLabel("Saving company profile to Cloudflare..."),
      0,
    );
    const timeout = window.setTimeout(async () => {
      try {
        const response = await fetch("/api/tenant/company-profile", {
          method: "PUT",
          cache: "no-store",
          credentials: "same-origin",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ name: company.name, location: company.location }),
          signal: controller.signal,
        });
        if (!response.ok) throw new Error("Company profile sync failed.");
        const record = (await response.json()) as TenantCompanyProfileRecord;
        setCompany((current) => ({
          ...current,
          name: record.company.name,
          location: record.company.location,
          logoDataUrl: record.company.logoDataUrl || current.logoDataUrl,
        }));
        setSavedCompanySignature(companyProfileSignature(record.company));
        setSavedLabel(`Company profile synced ${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`);
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setSavedLabel("Company profile sync unavailable — local cache saved");
      }
    }, 650);

    return () => {
      window.clearTimeout(saving);
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [company.name, company.location, hydrated, planStorageMode, savedCompanySignature]);

  useEffect(() => {
    if (!pdfPreview) return;
    const exitPreview = (event: KeyboardEvent) => {
      if (event.key === "Escape") setPdfPreview(false);
    };
    window.addEventListener("keydown", exitPreview);
    return () => window.removeEventListener("keydown", exitPreview);
  }, [pdfPreview]);

  useEffect(() => {
    if (!hydrated) return;
    try {
      setWorkspaceUsage(buildLocalWorkspaceUsage(window.localStorage));
      setUsageState("ready");
    } catch {
      setWorkspaceUsage(null);
      setUsageState("error");
    }
  }, [hydrated, usageRefreshToken]);

  const groups = useMemo(() => activities.filter((activity) => activity.kind === "group"), [activities]);
  const tasks = useMemo(() => activities.filter((activity) => activity.kind === "task"), [activities]);
  const taskWeights = useMemo(() => taskWeightMap(tasks, planningModel), [tasks, planningModel]);
  const actualProgressMap = useMemo(() => new Map(tasks.map((task) => [task.id, taskActualProgress(task, planningModel, project.statusDate, actualSnapshots, calendarMode)])), [tasks, planningModel, project.statusDate, actualSnapshots, calendarMode]);
  const invalidEarnedHistoryCount = useMemo(() => tasks.filter((task) => hasInvalidEarnedHistory(task, actualSnapshots)).length, [tasks, actualSnapshots]);
  const storageBlocked = workspaceUsage?.blockedActions.includes("upload_file") ?? false;
  const cloudflareUsage = workspaceUsage?.cloudflare;
  const platformLevel = cloudflareUsage?.state === "ready" ? cloudflareUsage.overallLevel : "healthy";
  const combinedUsageLevel = workspaceUsage && usageLevelRank[platformLevel] > usageLevelRank[workspaceUsage.overallLevel]
    ? platformLevel
    : workspaceUsage?.overallLevel ?? "healthy";
  const combinedUsageMessage = workspaceUsage && usageLevelRank[platformLevel] > usageLevelRank[workspaceUsage.overallLevel]
    ? cloudflareUsage?.message ?? workspaceUsage.message
    : workspaceUsage?.message ?? "";

  const rollup = (groupId: string) => {
    const children = tasks.filter((task) => task.parentId === groupId);
    if (children.length === 0) return { start: project.baselineDate, end: project.baselineDate, duration: 0, progress: 0, weight: 0, budget: 0, earned: 0, actualStart: "", actualEnd: "" };
    const start = toISO(new Date(Math.min(...children.map((task) => parseDate(task.start).getTime()))));
    const end = toISO(new Date(Math.max(...children.map((task) => parseDate(addDuration(task.start, task.duration, calendarMode)).getTime()))));
    const weight = children.reduce((sum, task) => sum + (taskWeights.get(task.id) ?? 0), 0);
    const progress = weight > 0 ? children.reduce((sum, task) => sum + (actualProgressMap.get(task.id) ?? 0) * (taskWeights.get(task.id) ?? 0), 0) / weight : 0;
    const actualChildren = children.filter((task) => task.actualStart);
    const actualStart = actualChildren.length ? toISO(new Date(Math.min(...actualChildren.map((task) => parseDate(task.actualStart || task.start).getTime())))) : "";
    const actualEnd = actualChildren.length ? toISO(new Date(Math.max(...actualChildren.map((task) => parseDate(actualBarEnd(task, project.statusDate)).getTime())))) : "";
    const budget = children.reduce((sum, task) => sum + taskBudget(task), 0);
    const earned = children.reduce((sum, task) => sum + taskEarnedValueAt(task, actualSnapshots, project.statusDate, calendarMode), 0);
    return { start, end, duration: durationBetween(start, end, calendarMode), progress, weight, budget, earned, actualStart, actualEnd };
  };

  const projectSummary = useMemo(() => {
    if (tasks.length === 0) {
      return { start: project.baselineDate, end: project.baselineDate, duration: 0, totalWeight: 0, totalBudget: 0, totalEarned: 0, progress: 0, plannedAtStatus: 0, variance: 0 };
    }
    const start = toISO(new Date(Math.min(...tasks.map((task) => parseDate(task.start).getTime()))));
    const end = toISO(new Date(Math.max(...tasks.map((task) => parseDate(addDuration(task.start, task.duration, calendarMode)).getTime()))));
    const totalWeight = tasks.length > 0 ? 100 : 0;
    const progress = tasks.reduce((sum, task) => sum + (actualProgressMap.get(task.id) ?? 0) * (taskWeights.get(task.id) ?? 0) / 100, 0);
    const statusMs = parseDate(project.statusDate).getTime();
    const plannedAtStatus = tasks.reduce((sum, task) => sum + plannedRatioAt(task, statusMs, calendarMode) * (taskWeights.get(task.id) ?? 0), 0);
    const totalBudget = tasks.reduce((sum, task) => sum + taskBudget(task), 0);
    const totalEarned = tasks.reduce((sum, task) => sum + taskEarnedValueAt(task, actualSnapshots, project.statusDate, calendarMode), 0);
    return { start, end, duration: durationBetween(start, end, calendarMode), totalWeight, totalBudget, totalEarned, progress: Math.round(progress), plannedAtStatus: Math.round(plannedAtStatus), variance: Math.round(progress - plannedAtStatus) };
  }, [tasks, calendarMode, project.baselineDate, project.statusDate, taskWeights, actualProgressMap, actualSnapshots]);

  const updateProject = (field: keyof ProjectMeta, value: string) => setProject((current) => ({ ...current, [field]: value }));

  const applyProjectRecord = (record: TenantPlanRecord) => {
    if (!record.data) return false;
    const saved = record.data;
    const savedCalendar = saved.calendarMode || "calendar";
    setProject({ ...initialProject, ...saved.project });
    setActivities(migrateActivities(saved.activities || [], savedCalendar));
    setActualSnapshots(saved.actualSnapshots || []);
    setCalendarMode(savedCalendar);
    setPlanningModel(saved.planningModel || "normal");
    setCurveView(saved.curveView || "compare");
    setShowCurve(saved.showCurve !== false);
    setIncludeCurvePdf(saved.includeCurvePdf !== false);
    setShowStatusDate(saved.showStatusDate !== false);
    setPdfOrientation(saved.pdfOrientation === "portrait" ? "portrait" : "landscape");
    if (saved.company) setCompany((current) => ({ ...current, ...saved.company, logoDataUrl: saved.company?.logoDataUrl || current.logoDataUrl }));
    setCloudProjectId(record.projectId);
    return true;
  };

  const loadProjectLibrary = async () => {
    setProjectLibraryState("loading");
    try {
      setProjectLibrary(listLocalProjects(window.localStorage));
      setProjectLibraryState("ready");
    } catch {
      setProjectLibraryState("error");
    }
  };

  const createNewProject = () => {
    setProject(createFreshProject());
    setActivities([]);
    setActualSnapshots([]);
    setCalendarMode("calendar");
    setPlanningModel("normal");
    setCurveView("compare");
    setShowCurve(true);
    setIncludeCurvePdf(true);
    setShowStatusDate(true);
    setPdfOrientation("landscape");
    const projectId = createLocalProjectId();
    window.localStorage.setItem(ACTIVE_PROJECT_KEY, projectId);
    setCloudProjectId(projectId);
    setSavedLabel("New project ready — enter a project name to save");
    openWorkspacePage("plan");
  };

  const openSavedProject = async (projectId: string) => {
    if (projectId === cloudProjectId) {
      openWorkspacePage("plan");
      return;
    }
    setSavedLabel("Opening local project...");
    try {
      const record = readLocalProject(window.localStorage, projectId);
      if (!record) throw new Error("Could not open this project");
      if (!applyProjectRecord(record)) throw new Error("Project has no plan data");
      window.localStorage.setItem(ACTIVE_PROJECT_KEY, projectId);
      setSavedLabel("Local project loaded");
      openWorkspacePage("plan");
    } catch (error) {
      setSavedLabel(error instanceof Error ? error.message : "Could not open this project");
    }
  };

  const openWorkspacePage = (page: ActiveWorkspacePage) => {
    setActivePage(page);
    setPdfPreview(false);
    setMobileMenuOpen(false);
    const nextUrl = page === "usage"
      ? `${window.location.pathname}${window.location.search}#workspace-usage`
      : page === "projects"
        ? `${window.location.pathname}${window.location.search}#projects`
        : `${window.location.pathname}${window.location.search}`;
    window.history.replaceState(null, "", nextUrl);
    window.scrollTo({ top: 0, behavior: "smooth" });
    if (page === "projects") void loadProjectLibrary();
    if (page === "usage") setUsageRefreshToken((value) => value + 1);
  };

  const openPlanSection = (sectionId: string) => {
    openWorkspacePage("plan");
    window.setTimeout(() => document.getElementById(sectionId)?.scrollIntoView({ behavior: "smooth", block: "start" }), 0);
  };

  const refreshWorkspaceUsage = () => {
    setUsageState("loading");
    setUsageRefreshToken((value) => value + 1);
  };

  const updateCompany = (field: "name" | "location", value: string) => setCompany((current) => ({ ...current, [field]: value }));

  const importCompanyLogo = (event: React.ChangeEvent<HTMLInputElement>) => {
    const input = event.currentTarget;
    if (storageBlocked) {
      setLogoMessage("File storage limit reached - remove files before uploading");
      input.value = "";
      return;
    }
    const file = input.files?.[0];
    if (!file) return;
    const supportedTypes = new Set(["image/png", "image/jpeg", "image/webp"]);
    if (!supportedTypes.has(file.type)) {
      setLogoMessage("Use a PNG, JPG or WebP logo");
      input.value = "";
      return;
    }
    if (file.size > 1_500_000) {
      setLogoMessage("Logo must be 1.5 MB or smaller");
      input.value = "";
      return;
    }
    const previousLogo = company.logoDataUrl;
    const reader = new FileReader();
    reader.addEventListener("load", async () => {
      if (typeof reader.result !== "string") return;
      const preview = reader.result;
      setCompany((current) => ({ ...current, logoDataUrl: preview }));
      input.value = "";

      if (planStorageMode !== "cloud") {
        setLogoMessage(`${file.name} imported and saved locally`);
        return;
      }

      setLogoMessage(`Uploading ${file.name} to Cloudflare...`);
      try {
        const response = await fetch("/api/tenant/company-logo", {
          method: "PUT",
          cache: "no-store",
          credentials: "same-origin",
          headers: {
            "content-type": file.type,
            "x-file-name": encodeURIComponent(file.name),
          },
          body: file,
        });
        if (!response.ok) {
          const detail = await response.json().catch(() => null) as { error?: string } | null;
          throw new Error(detail?.error || "Logo upload failed.");
        }
        const record = (await response.json()) as TenantCompanyLogoRecord;
        setCompany((current) => ({ ...current, logoDataUrl: record.logoDataUrl }));
        setLogoMessage(`${file.name} uploaded and saved`);
        setSavedLabel("Company logo synced to Cloudflare");
        setUsageRefreshToken((value) => value + 1);
      } catch (error) {
        setCompany((current) => ({ ...current, logoDataUrl: previousLogo }));
        setLogoMessage(error instanceof Error ? error.message : "Could not upload this logo");
      }
    });
    reader.addEventListener("error", () => setLogoMessage("Could not read this logo file"));
    reader.readAsDataURL(file);
  };

  const removeCompanyLogo = async () => {
    const previousLogo = company.logoDataUrl;
    setCompany((current) => ({ ...current, logoDataUrl: initialCompany.logoDataUrl }));
    if (planStorageMode !== "cloud") {
      setLogoMessage("Custom logo removed - default logo restored");
      return;
    }

    setLogoMessage("Removing logo from Cloudflare...");
    try {
      const response = await fetch("/api/tenant/company-logo", {
        method: "DELETE",
        cache: "no-store",
        credentials: "same-origin",
      });
      if (!response.ok) throw new Error("Could not remove the cloud logo.");
      setLogoMessage("Custom logo removed - default logo restored");
      setSavedLabel("Company logo reset to default");
      setUsageRefreshToken((value) => value + 1);
    } catch (error) {
      setCompany((current) => ({ ...current, logoDataUrl: previousLogo }));
      setLogoMessage(error instanceof Error ? error.message : "Could not remove this logo");
    }
  };

  const updateActivity = (id: string, field: keyof Activity, value: string | number | null) => {
    setActivities((current) => current.map((activity) => activity.id === id ? { ...activity, [field]: value } : activity));
  };

  const updateEarnedValue = (task: Activity, rawValue: number) => {
    const requestedValue = Number(rawValue) || 0;
    const bounds = earnedValueBoundsAt(task.id, actualSnapshots, project.statusDate, taskBudget(task));
    const earnedValue = clamp(requestedValue, bounds.min, bounds.max);
    if (earnedValue !== requestedValue) {
      setSavedLabel(`EV must stay between THB ${Math.round(bounds.min).toLocaleString("en-US")} and ${Math.round(bounds.max).toLocaleString("en-US")} at this status date`);
    }
    setActualSnapshots((current) => [
      ...current.filter((snapshot) => !(snapshot.activityId === task.id && snapshot.date === project.statusDate)),
      { id: `${task.id}-${project.statusDate}`, activityId: task.id, date: project.statusDate, earnedValue },
    ]);
  };

  const updateTaskBudget = (task: Activity, rawValue: number) => {
    const highestEarned = actualSnapshots
      .filter((snapshot) => snapshot.activityId === task.id)
      .reduce((highest, snapshot) => Math.max(highest, snapshot.earnedValue), 0);
    const requestedValue = Math.max(0, Number(rawValue) || 0);
    const budget = Math.max(requestedValue, highestEarned);
    if (budget !== requestedValue) {
      setSavedLabel(`Budget cannot be lower than recorded EV of THB ${Math.round(highestEarned).toLocaleString("en-US")}`);
    }
    updateActivity(task.id, "budget", budget);
  };

  const updateEndDate = (task: Activity, end: string) => updateActivity(task.id, "duration", durationBetween(task.start, end, calendarMode));

  const addTask = (parentId: string) => {
    const groupTasks = tasks.filter((task) => task.parentId === parentId);
    const start = groupTasks.length ? addDuration(groupTasks[groupTasks.length - 1].start, groupTasks[groupTasks.length - 1].duration, calendarMode) : projectSummary.start;
    const nextId = `t-${Date.now()}`;
    const groupIndex = groups.findIndex((group) => group.id === parentId);
    const insertAfter = activities.reduce((last, activity, index) => activity.parentId === parentId || activity.id === parentId ? index : last, 0);
    const newTask: Activity = {
      id: nextId,
      parentId,
      kind: "task",
      description: "New fit-out activity",
      start,
      duration: 5,
      progress: 0,
      weight: 0,
      owner: "TBC",
      dependency: groupTasks.length ? `${groupIndex + 1}.${groupTasks.length}` : "-",
      actualStart: "",
      actualEnd: "",
      budget: 0,
      earningMethod: "certified",
    };
    setActivities((current) => [...current.slice(0, insertAfter + 1), newTask, ...current.slice(insertAfter + 1)]);
  };

  const addGroup = () => {
    const id = `g-${Date.now()}`;
    setActivities((current) => [...current, { id, parentId: null, kind: "group", description: "New work package", start: projectSummary.end, duration: 1, progress: 0, weight: 0, owner: "PM", dependency: "-", actualStart: "", actualEnd: "", budget: 0 }]);
  };

  const removeActivity = (id: string) => {
    const removedIds = new Set(activities.filter((activity) => activity.id === id || activity.parentId === id).map((activity) => activity.id));
    setActivities((current) => current.filter((activity) => !removedIds.has(activity.id)));
    setActualSnapshots((current) => current.filter((snapshot) => !removedIds.has(snapshot.activityId)));
  };

  const confirmDeleteGroup = () => {
    if (!pendingDeleteGroup) return;
    removeActivity(pendingDeleteGroup.id);
    setPendingDeleteGroup(null);
  };

  const clearPlan = async () => {
    if (!window.confirm("Clear this plan and remove its timeline data? This cannot be undone.")) return;
    removeLocalProject(window.localStorage, cloudProjectId ?? DEFAULT_LOCAL_PROJECT_ID);
    const nextProjectId = createLocalProjectId();
    window.localStorage.setItem(ACTIVE_PROJECT_KEY, nextProjectId);
    setProject(createFreshProject());
    setActivities([]);
    setActualSnapshots([]);
    setCalendarMode("calendar");
    setPlanningModel("normal");
    setCurveView("compare");
    setShowCurve(true);
    setIncludeCurvePdf(true);
    setShowStatusDate(true);
    setPdfOrientation("landscape");
    setCloudProjectId(nextProjectId);
    setProjectLibrary(listLocalProjects(window.localStorage));
    setSavedLabel("Local workspace cleared");
    setUsageRefreshToken((value) => value + 1);
  };

  const exportBackup = () => {
    const payload: SavedPlan = { project, company, activities, actualSnapshots, calendarMode, planningModel, curveView, showCurve, includeCurvePdf, showStatusDate, pdfOrientation };
    const tenantBackup = createTenantPlanEnvelope(
      CHOD_ORGANIZATION,
      cloudProjectId ?? DEFAULT_LOCAL_PROJECT_ID,
      payload,
    );
    const blob = new Blob([JSON.stringify(tenantBackup, null, 2)], { type: "application/json" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${project.name || "timeline-plan"}.json`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const printPlan = () => {
    const previousTitle = document.title;
    document.title = `${project.name || "Project"} - Timeline Plan - ${project.revision}`;
    setPrintingPdf(true);
    window.addEventListener("afterprint", () => {
      document.title = previousTitle;
      setPrintingPdf(false);
    }, { once: true });
    requestAnimationFrame(() => requestAnimationFrame(() => window.print()));
  };

  const groupSequence = new Map<string, number>();
  groups.forEach((group, index) => groupSequence.set(group.id, index + 1));

  const timelineRows: TimelineChartRow[] = groups.flatMap((group, groupIndex) => {
    const summary = rollup(group.id);
    const groupRow: TimelineChartRow = {
      id: group.id,
      code: pad(groupIndex + 1),
      label: group.description,
      start: summary.start,
      end: summary.end,
      duration: summary.duration,
      progress: summary.progress,
      actualStart: summary.actualStart,
      actualEnd: summary.actualEnd,
      actualProgress: summary.progress,
      weight: summary.weight,
      owner: group.owner,
      dependency: group.dependency,
      kind: "group",
    };

    if (!(showTimelineSubplans || pdfPreview || printingPdf)) return [groupRow];

    const childRows: TimelineChartRow[] = tasks
      .filter((task) => task.parentId === group.id)
      .map((task, taskIndex) => ({
        id: task.id,
        code: `${groupIndex + 1}.${taskIndex + 1}`,
        label: task.description,
        start: task.start,
        end: addDuration(task.start, task.duration, calendarMode),
        duration: task.duration,
        progress: actualProgressMap.get(task.id) ?? 0,
        actualStart: task.actualStart || "",
        actualEnd: actualBarEnd(task, project.statusDate),
        actualProgress: actualProgressMap.get(task.id) ?? 0,
        weight: taskWeights.get(task.id) ?? 0,
        owner: task.owner,
        dependency: task.dependency,
        kind: "task",
      }));

    return [groupRow, ...childRows];
  });

  // Paginate by visible rows, not only activities. Package headings therefore
  // consume real space and the chart no longer needs vertical distortion.
  const isPortraitPdf = pdfOrientation === "portrait";
  const firstPrintPageRowCapacity = isPortraitPdf ? 34 : 24;
  const continuationPrintPageRowCapacity = isPortraitPdf ? 40 : 30;
  const singlePrintPageRowCapacity = isPortraitPdf ? 38 : 28;
  const printTimelinePages: TimelineChartRow[][] = [];
  let printPageRows: TimelineChartRow[] = [];
  let activePrintGroup: TimelineChartRow | null = null;

  const currentPrintPageRowCapacity = () => printTimelinePages.length === 0
    ? firstPrintPageRowCapacity
    : continuationPrintPageRowCapacity;

  const commitPrintPage = () => {
    if (printPageRows.length === 0) return;
    printTimelinePages.push(printPageRows);
    printPageRows = [];
  };

  timelineRows.forEach((row) => {
    if (row.kind === "group") {
      // Keep room for the first activity so a package heading is not orphaned.
      if (printPageRows.length >= currentPrintPageRowCapacity() - 1) commitPrintPage();
      activePrintGroup = row;
      printPageRows.push(row);
      return;
    }

    if (printPageRows.length >= currentPrintPageRowCapacity()) {
      commitPrintPage();
      if (activePrintGroup) printPageRows.push(activePrintGroup);
    }

    printPageRows.push(row);
  });

  commitPrintPage();

  // Avoid a nearly empty second page. A short continuation can still fit on
  // page 1 at a readable row height, so merge it back and remove the repeated
  // package heading that pagination inserted at the page boundary.
  if (printTimelinePages.length === 2) {
    const firstPageRows = printTimelinePages[0];
    const firstPageIds = new Set(firstPageRows.map((row) => row.id));
    const continuationRows = printTimelinePages[1].filter((row, index) => !(
      index === 0 && row.kind === "group" && firstPageIds.has(row.id)
    ));
    const mergedRows = [...firstPageRows, ...continuationRows];
    if (mergedRows.length <= singlePrintPageRowCapacity) printTimelinePages.splice(0, 2, mergedRows);
  }

  if (printTimelinePages.length === 0) printTimelinePages.push([]);

  const measuredCurveLabel = planningModel === "intensive" ? "Earned progress" : "Completed progress";
  const measuredMetricLabel = planningModel === "intensive" ? "Earned" : "Completed";
  const reportOutputActive = pdfPreview || printingPdf;

  return (
    <main className={`app-shell pdf-orientation-${pdfOrientation} ${pdfPreview ? "pdf-preview-mode" : ""} ${activePage !== "plan" ? "utility-page-active" : ""} ${mobileMenuOpen ? "mobile-menu-open" : ""}`}>
      <style media="print">{`@page { size: A4 ${pdfOrientation}; margin: 7mm 8mm 9mm; }`}</style>
      <aside className={`sidebar no-print ${mobileMenuOpen ? "mobile-open" : ""}`} id="project-navigation" aria-label="Project controls and workspace navigation">
        <div className="brand-lockup">
          <span className={`brand-mark ${company.logoDataUrl ? "has-logo" : ""}`}>
            {company.logoDataUrl ? <Image src={company.logoDataUrl} width={52} height={46} unoptimized alt="" /> : "TP"}
          </span>
          <span>
            <strong>Timeline Plan</strong>
            <small>{CHOD_ORGANIZATION.name} workspace</small>
          </span>
          <button type="button" className="mobile-menu-close" aria-label="Close project menu" onClick={() => setMobileMenuOpen(false)}>×</button>
        </div>

        <nav className="rail-nav" aria-label="Workspace sections">
          <button type="button" className={`rail-link ${activePage === "projects" ? "active" : ""}`} aria-current={activePage === "projects" ? "page" : undefined} onClick={() => openWorkspacePage("projects")}><span>01</span> Projects</button>
          <button type="button" className={`rail-link ${activePage === "plan" ? "active" : ""}`} aria-current={activePage === "plan" ? "page" : undefined} onClick={() => openWorkspacePage("plan")}><span>02</span> Plan workspace</button>
          <button type="button" className="rail-link" onClick={() => { openWorkspacePage("plan"); setDetailsOpen(true); }}><span>03</span> Project information</button>
          <button type="button" className="rail-link" onClick={() => openPlanSection("curve-section")}><span>04</span> Timeline &amp; S-curve</button>
          <button type="button" className="rail-link" aria-expanded={companyOpen} aria-controls="company-profile" onClick={() => { openWorkspacePage("plan"); setCompanyOpen(true); }}><span>05</span> Company profile</button>
          <button type="button" className={`rail-link ${activePage === "usage" ? "active" : ""}`} aria-current={activePage === "usage" ? "page" : undefined} onClick={() => openWorkspacePage("usage")}><span>06</span> Workspace usage</button>
        </nav>

        <section className="rail-project">
          <div className="section-heading">
            <span>Project file</span>
            <button type="button" className="icon-button" title="Toggle project information" aria-label="Toggle project information" onClick={() => setDetailsOpen((value) => !value)}>{detailsOpen ? "−" : "+"}</button>
          </div>
          <label>Project name<input value={project.name} onChange={(event) => updateProject("name", event.target.value)} /></label>
          <label>Client<input value={project.client} onChange={(event) => updateProject("client", event.target.value)} /></label>
          <label>Location<textarea rows={2} value={project.location} onChange={(event) => updateProject("location", event.target.value)} /></label>
          <label>Project manager<input value={project.projectManager} onChange={(event) => updateProject("projectManager", event.target.value)} /></label>
          {detailsOpen && <>
            <label>Baseline date<input type="date" value={project.baselineDate} onChange={(event) => updateProject("baselineDate", event.target.value)} /></label>
            <label>Status date<input type="date" value={project.statusDate} onChange={(event) => updateProject("statusDate", event.target.value)} /></label>
            <label>Issue date<input type="date" value={project.issueDate} onChange={(event) => updateProject("issueDate", event.target.value)} /></label>
            <label>Revision<input value={project.revision} onChange={(event) => updateProject("revision", event.target.value)} /></label>
            <label>Prepared by<input value={project.preparedBy} onChange={(event) => updateProject("preparedBy", event.target.value)} /></label>
          </>}
        </section>

        <section className="rail-project rail-company" id="company-profile">
          <div className="section-heading">
            <span>Company profile</span>
            <button type="button" className="icon-button" title="Toggle company profile" aria-label="Toggle company profile" aria-expanded={companyOpen} onClick={() => setCompanyOpen((value) => !value)}>{companyOpen ? "-" : "+"}</button>
          </div>
          {companyOpen && <>
            <div className="rail-logo-preview" aria-label="Company logo preview">
              {company.logoDataUrl ? <Image src={company.logoDataUrl} width={72} height={52} unoptimized alt={`${company.name || "Company"} logo`} /> : <span>TP</span>}
              <div><strong>{company.name || "Company name"}</strong><small>PDF identity preview</small></div>
            </div>
            <label>Company name<input value={company.name} onChange={(event) => updateCompany("name", event.target.value)} /></label>
            <label>Company location<textarea rows={2} value={company.location} onChange={(event) => updateCompany("location", event.target.value)} /></label>
            <label className="logo-file-label">Company logo<input className="logo-file-input" type="file" accept="image/png,image/jpeg,image/webp,.png,.jpg,.jpeg,.webp" disabled={storageBlocked} onChange={importCompanyLogo} /></label>
            <div className="logo-import-status" role="status"><span>{logoMessage}</span>{company.logoDataUrl !== initialCompany.logoDataUrl && <button type="button" onClick={removeCompanyLogo}>Reset to default</button>}</div>
            <p className="company-note">Scoped to {CHOD_ORGANIZATION.name} and applied to PDF headers. The profile stays when the demo plan is reset.</p>
          </>}
        </section>

        <div className="rail-footer">
          <span className="save-dot" />
          <span>{savedLabel}</span>
        </div>
      </aside>

      <button type="button" className="mobile-nav-backdrop no-print" aria-label="Close project menu" tabIndex={mobileMenuOpen ? 0 : -1} onClick={() => setMobileMenuOpen(false)} />

      <section className={`workspace ${activePage === "usage" ? "workspace-usage-view" : ""} ${activePage === "projects" ? "workspace-project-library-view" : ""}`} id="pdf-preview-sheet">
        <header className={`topbar ${pdfPreview ? "pdf-preview-toolbar" : ""}`}>
          <div className="topbar-context">
            {!pdfPreview && <button type="button" className="mobile-menu-trigger no-print" aria-expanded={mobileMenuOpen} aria-controls="project-navigation" onClick={() => setMobileMenuOpen(true)}>
              <span className="mobile-menu-icon" aria-hidden="true"><i /><i /><i /></span>
              <span className="sr-only">Open project menu</span>
            </button>}
            {activePage === "usage" ? <div>
              <div className="breadcrumb">Workspace / Capacity &amp; limits</div>
              <h1 className="usage-page-title">Workspace usage</h1>
            </div> : activePage === "projects" ? <div>
              <div className="breadcrumb">Workspace / Saved timelines</div>
              <h1 className="usage-page-title">Projects</h1>
            </div> : pdfPreview ? <div className="preview-toolbar-copy" role="status"><strong>PDF preview</strong><span>A4 {pdfOrientation} / executive timeline / press Esc to exit</span></div> : <div>
              <div className="breadcrumb">Projects / Active plan / <strong>{project.name}</strong></div>
              <input className="project-title-input" value={project.name} placeholder="Untitled fit-out project" onChange={(event) => updateProject("name", event.target.value)} aria-label="Project name" />
            </div>}
          </div>
          <div className="topbar-actions no-print">
            {activePage === "usage" ? <button type="button" className="button quiet" onClick={() => openWorkspacePage("plan")}>Back to plan</button> : activePage === "projects" ? <button type="button" className="button primary" onClick={createNewProject}>+ New project</button> : <>
              {!pdfPreview && <button type="button" className="button quiet" onClick={exportBackup}>Backup JSON</button>}
              {!pdfPreview && cloudProjectId && <button type="button" className="button quiet danger-button" onClick={() => void clearPlan()}>Delete project</button>}
              <button type="button" className="button quiet preview-toggle" aria-pressed={pdfPreview} aria-controls="pdf-preview-sheet" onClick={() => setPdfPreview((value) => !value)}>{pdfPreview ? "Exit preview" : "Preview PDF"}</button>
              <button type="button" className="button primary" onClick={printPlan}><span aria-hidden="true">⇩</span> Export PDF</button>
            </>}
          </div>
        </header>

        {activePage === "usage" ? <WorkspaceUsageDashboard usageState={usageState} workspaceUsage={workspaceUsage} combinedLevel={combinedUsageLevel} combinedMessage={combinedUsageMessage} onRefresh={refreshWorkspaceUsage} /> : activePage === "projects" ? <ProjectLibrary projects={projectLibrary} state={projectLibraryState} currentProjectId={cloudProjectId} onNew={createNewProject} onOpen={(projectId) => void openSavedProject(projectId)} onRefresh={() => void loadProjectLibrary()} /> : <>

        {usageState === "ready" && workspaceUsage && combinedUsageLevel !== "healthy" && <div className={`usage-banner no-print usage-${combinedUsageLevel}`} role={combinedUsageLevel === "critical" || combinedUsageLevel === "blocked" ? "alert" : "status"}>
          <span className="usage-banner-mark" aria-hidden="true">!</span>
          <div><strong>{usageLevelLabel[combinedUsageLevel]}</strong><span>{combinedUsageMessage}</span></div>
          <button type="button" onClick={() => openWorkspacePage("usage")}>Review usage</button>
        </div>}

        <section className="print-title" aria-label="PDF document header">
          <div className="print-document-bar">
            <div className="print-company">
              {company.logoDataUrl ? <Image src={company.logoDataUrl} width={150} height={60} unoptimized alt={`${company.name || "Company"} logo`} /> : <span className="print-company-mark">TP</span>}
              <div><strong>{company.name || "Company name"}</strong><small>{company.location || "Company location"}</small></div>
            </div>
            <div className="print-document-id"><span>PROJECT TIMELINE &amp; S-CURVE</span><strong>{project.name || "Untitled project"}</strong><small>{project.revision} · Issued {displayDate(project.issueDate)}</small></div>
          </div>
        </section>

        <section className="method-bar no-print" aria-label="Calculation model">
          <div className="method-copy">
            <span>Calculation model</span>
            <strong>{planningModel === "normal" ? "Normal timeline" : "Cost-loaded intensive"}</strong>
            <p>{planningModel === "normal" ? "Weights are calculated from planned duration; completed progress is recognized only from actual completion dates." : "Weights are calculated from task budgets; earned progress follows each activity's selected earning rule at the status date."}</p>
          </div>
          <div className="segmented model-switch" role="group" aria-label="Timeline calculation model">
            <button type="button" className={planningModel === "normal" ? "active" : ""} onClick={() => setPlanningModel("normal")}><strong>Normal timeline</strong></button>
            <button type="button" className={planningModel === "intensive" ? "active" : ""} onClick={() => setPlanningModel("intensive")}><strong>Cost-loaded</strong></button>
          </div>
        </section>

        <section className={`summary-strip ${reportOutputActive ? "report-summary-strip" : ""} ${reportOutputActive && !showStatusDate ? "report-status-hidden" : ""}`} aria-label="Project summary">
          <div className="summary-main">
            <span>Overall period</span>
            <strong>{projectSummary.duration}<small>{calendarMode === "calendar" ? "calendar days" : "working days"}</small></strong>
            <p>{displayDate(projectSummary.start)} — {displayDate(projectSummary.end)}</p>
          </div>
          {!reportOutputActive && <div><span>Work packages</span><strong>{groups.length}</strong><p>{tasks.length} detailed activities</p></div>}
          {(!reportOutputActive || showStatusDate) && <div className="summary-status-metric"><span>Planned at data date</span><strong>{projectSummary.plannedAtStatus}%</strong><p>baseline programme</p></div>}
          {(!reportOutputActive || showStatusDate) && <div className="summary-status-metric"><span>{measuredMetricLabel} at data date</span><strong>{projectSummary.progress}%</strong><p>{projectSummary.variance > 0 ? "+" : ""}{projectSummary.variance} pt variance</p></div>}
          <div className="summary-client"><span>Client</span><strong>{project.client || "Not specified"}</strong><p>{project.location || "Project location not specified"}</p></div>
          <div className="calendar-control no-print">
            <span>Schedule calendar</span>
            <div className="segmented" role="group" aria-label="Schedule calendar mode">
              <button type="button" className={calendarMode === "calendar" ? "active" : ""} onClick={() => setCalendarMode("calendar")}>Calendar</button>
              <button type="button" className={calendarMode === "working" ? "active" : ""} onClick={() => setCalendarMode("working")}>Mon–Fri</button>
            </div>
            <p>1-day tasks finish on their start date</p>
          </div>
        </section>

        <section className="print-timeline-pages" aria-label="Paginated PDF timeline">
          {printTimelinePages.map((pageRows, pageIndex) => {
            const reportFrameGutterMm = 1.5;
            const reportFrameSafetyInsetMm = 0.8;
            const baseRowsHeightBudgetMm = isPortraitPdf
              ? pageIndex === 0 ? 182 : 234
              : pageIndex === 0 ? 112 : 148;
            const rowsHeightBudgetMm = baseRowsHeightBudgetMm - reportFrameGutterMm - reportFrameSafetyInsetMm;
            const minimumRowHeightMm = isPortraitPdf ? 4.8 : pageIndex === 0 ? 4.25 : 4.8;
            const maximumRowHeightMm = isPortraitPdf ? 7.4 : pageIndex === 0 ? 6.4 : 7.4;
            const printRowHeightMm = clamp(rowsHeightBudgetMm / Math.max(1, pageRows.length), minimumRowHeightMm, maximumRowHeightMm);

            return (
            <section className={`print-timeline-page ${pageIndex === 0 ? "first" : "continuation"}`} key={`print-timeline-page-${pageIndex + 1}`}>
              {pageIndex > 0 && <header className="print-continuation-header">
                <div className="print-continuation-company">
                  {company.logoDataUrl ? <Image src={company.logoDataUrl} width={90} height={36} unoptimized alt={`${company.name || "Company"} logo`} /> : <span className="print-continuation-mark">TP</span>}
                  <div><strong>{company.name || "Company name"}</strong><span>Timeline continuation</span></div>
                </div>
                <div className="print-continuation-project"><span>{project.revision} · Issued {displayDate(project.issueDate)}</span><strong>{project.name || "Untitled project"}</strong><span>Page {pageIndex + 1} of {printTimelinePages.length}</span></div>
              </header>}
              <section className="curve-panel print-page-chart" style={{ "--print-row-height": `${printRowHeightMm.toFixed(2)}mm` } as CSSProperties}>
                <div className="panel-heading curve-heading">
                  <div><h2>Timeline with S-curve overlay</h2><p>Baseline and {measuredCurveLabel.toLowerCase()} use one shared project date axis.</p></div>
                  <span className="print-page-count">Page {pageIndex + 1} / {printTimelinePages.length}</span>
                </div>
                <div className="chart-legend">
                  {curveView !== "actual" && <span><i className="legend-bar planned-bar" /> Planned period</span>}
                  {curveView !== "plan" && <span><i className="legend-bar actual-bar" /> Actual period</span>}
                  {curveView !== "actual" && includeCurvePdf && <span><i className="legend-line planned" /> Planned S-curve</span>}
                  {curveView !== "plan" && includeCurvePdf && <span><i className="legend-line actual" /> {measuredCurveLabel} S-curve</span>}
                  {showStatusDate && <span><i className="legend-status" /> Status date</span>}
                </div>
                <div className="combined-chart-scroll">
                  <IntegratedTimeline rows={pageRows} tasks={tasks} mode={calendarMode} showCurve={showCurve} includeCurvePdf={includeCurvePdf} showStatusDate={showStatusDate} planningModel={planningModel} statusDate={project.statusDate} snapshots={actualSnapshots} curveView={curveView} reportMode />
                </div>
              </section>
              <footer className="print-page-footer">
                <span>{company.name || "Company name"} · Project controls</span>
                <span>{project.name || "Untitled project"} · {project.revision}</span>
                <span>Page {pageIndex + 1} of {printTimelinePages.length}</span>
              </footer>
            </section>
            );
          })}
        </section>

        <section className="curve-panel screen-timeline-panel" id="curve-section">
          <div className="panel-heading curve-heading">
            <div><h2>Timeline with S-curve overlay</h2><p>Baseline and {measuredCurveLabel.toLowerCase()} share one date axis; measured progress stops at the status date.</p></div>
            <div className="chart-controls no-print">
              <div className="segmented curve-view-switch" role="group" aria-label="Timeline chart view">
                <button type="button" className={curveView === "compare" ? "active" : ""} onClick={() => setCurveView("compare")}>Compare</button>
                <button type="button" className={curveView === "plan" ? "active" : ""} onClick={() => setCurveView("plan")}>Plan</button>
                <button type="button" className={curveView === "actual" ? "active" : ""} onClick={() => setCurveView("actual")}>{measuredMetricLabel}</button>
              </div>
              <div className="segmented pdf-orientation-switch" role="group" aria-label="PDF page orientation">
                <button type="button" className={pdfOrientation === "landscape" ? "active" : ""} aria-pressed={pdfOrientation === "landscape"} onClick={() => setPdfOrientation("landscape")}>Landscape</button>
                <button type="button" className={pdfOrientation === "portrait" ? "active" : ""} aria-pressed={pdfOrientation === "portrait"} onClick={() => setPdfOrientation("portrait")}>Portrait</button>
              </div>
              <button type="button" className="button quiet" aria-pressed={showCurve} onClick={() => setShowCurve((value) => !value)}>{showCurve ? "Hide S-curve" : "Show S-curve"}</button>
              <button type="button" className="button quiet" aria-pressed={showStatusDate} onClick={() => setShowStatusDate((value) => !value)}>{showStatusDate ? "Hide status date" : "Show status date"}</button>
              <button type="button" className="button quiet" onClick={() => setShowTimelineSubplans((value) => !value)}>{showTimelineSubplans ? "Show packages only" : "Expand sub-plans"}</button>
              <label className="print-toggle"><input type="checkbox" checked={includeCurvePdf} onChange={(event) => setIncludeCurvePdf(event.target.checked)} /><span>Include S-curve in PDF</span></label>
            </div>
          </div>
          <div className="chart-legend">
            {curveView !== "actual" && <span><i className="legend-bar planned-bar" /> Planned period</span>}
            {curveView !== "plan" && <span><i className="legend-bar actual-bar" /> Actual period</span>}
            {curveView !== "actual" && <span className={`${showCurve ? "" : "curve-hidden-screen"} ${includeCurvePdf ? "" : "exclude-curve-print"}`}><i className="legend-line planned" /> Planned S-curve</span>}
            {curveView !== "plan" && <span className={`${showCurve ? "" : "curve-hidden-screen"} ${includeCurvePdf ? "" : "exclude-curve-print"}`}><i className="legend-line actual" /> {measuredCurveLabel} S-curve</span>}
            {showStatusDate && <span><i className="legend-status" /> Status date</span>}
          </div>
          <div className="combined-chart-scroll">
            <IntegratedTimeline rows={timelineRows} tasks={tasks} mode={calendarMode} showCurve={showCurve} includeCurvePdf={includeCurvePdf} showStatusDate={showStatusDate} planningModel={planningModel} statusDate={project.statusDate} snapshots={actualSnapshots} curveView={curveView} />
          </div>
          <div className="timeline-facts">
            <div><span>{measuredMetricLabel} at data date</span><strong>{projectSummary.progress}%</strong></div>
            <div><span>Planned at data date</span><strong>{projectSummary.plannedAtStatus}%</strong></div>
            <div><span>Schedule variance</span><strong className={projectSummary.variance < 0 ? "negative" : "positive"}>{projectSummary.variance > 0 ? "+" : ""}{projectSummary.variance} pt</strong></div>
            <div><span>Weight basis</span><strong>{planningModel === "normal" ? "Duration" : "Budget"}</strong></div>
          </div>
          {planningModel === "intensive" && tasks.some((task) => taskBudget(task) <= 0) && <div className="weight-warning">Cost-loaded mode requires a budget for every activity. Zero-budget rows receive 0% weight.</div>}
          {planningModel === "intensive" && invalidEarnedHistoryCount > 0 && <div className="weight-warning">{invalidEarnedHistoryCount} activit{invalidEarnedHistoryCount === 1 ? "y has" : "ies have"} non-monotonic EV history or EV above budget. Review the affected status-date records before issue.</div>}
          {tasks.some((task) => task.actualEnd && task.actualEnd > project.statusDate) && <div className="weight-warning">An actual finish is later than the status date. Review actual dates before issue.</div>}
        </section>

        <section className="schedule-panel no-print screen-only">
          <div className="panel-heading">
            <div><h2>Work breakdown & timeline</h2><p>Enter planned and actual dates. Weight and progress are calculated automatically from the selected model.</p></div>
            <div className="panel-actions no-print">
              <button type="button" className="button quiet" onClick={addGroup}>+ Work package</button>
            </div>
          </div>

          <div className="table-scroll">
            <table className={`schedule-table ${planningModel === "intensive" ? "cost-loaded-table" : "normal-table"}`}>
              <thead>
                <tr>
                  <th className="col-no">No.</th>
                  <th className="col-description">Description</th>
                  <th className="col-date-pair">Planned dates</th>
                  <th className="col-date-pair">Actual dates</th>
                  <th className="col-days">Days</th>
                  <th>Owner</th>
                  <th className="col-dependency" title="Predecessor activity that must happen first">Depends</th>
                  {planningModel === "intensive" && <th className="col-cost">Budget / earned</th>}
                  <th className="col-progress">Auto weight / actual</th>
                  <th className="col-action no-print"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody>
                {activities.map((activity) => {
                  if (activity.kind === "group") {
                    const index = groupSequence.get(activity.id) || 1;
                    const summary = rollup(activity.id);
                    return (
                      <tr key={activity.id} className="group-row">
                        <td data-label="No."><span className="group-number">{pad(index)}</span></td>
                        <td data-label="Description"><input value={activity.description} readOnly={pdfPreview} tabIndex={pdfPreview ? -1 : undefined} onChange={(event) => updateActivity(activity.id, "description", event.target.value)} aria-label={`Work package ${index} description`} /></td>
                        <td data-label="Planned dates"><div className="date-stack"><span><b>S</b>{displayShortDate(summary.start)}</span><span><b>F</b>{displayShortDate(summary.end)}</span></div></td>
                        <td data-label="Actual dates">{summary.actualStart ? <div className="date-stack actual"><span><b>S</b>{displayShortDate(summary.actualStart)}</span><span><b>{summary.actualEnd === project.statusDate ? "@" : "F"}</b>{displayShortDate(summary.actualEnd)}</span></div> : <span className="not-started">Not started</span>}</td>
                        <td data-label="Days"><strong>{summary.duration}</strong></td>
                        <td data-label="Owner"><input value={activity.owner} readOnly={pdfPreview} tabIndex={pdfPreview ? -1 : undefined} onChange={(event) => updateActivity(activity.id, "owner", event.target.value)} aria-label={`Work package ${index} owner`} /></td>
                        <td data-label="Depends">{activity.dependency}</td>
                        {planningModel === "intensive" && <td className="cost-cell" data-label="Budget / earned"><div className="money-summary"><span>THB {Math.round(summary.budget).toLocaleString("en-US")}</span><small>EV {Math.round(summary.earned).toLocaleString("en-US")}</small></div></td>}
                        <td className="metric-cell" data-label="Auto weight / actual"><div className="auto-metrics"><span>W {summary.weight.toFixed(1)}%</span><strong>{Math.round(summary.progress)}%</strong><i className="progress-track"><b style={{ width: `${summary.progress}%` }} /></i></div></td>
                        <td className="no-print action-cell" data-label="Actions"><div className="row-actions"><button type="button" className="row-action add" title="Add sub-plan" aria-label={`Add sub-plan to ${activity.description}`} onClick={() => addTask(activity.id)}>+</button><button type="button" className="row-action remove" title="Delete work package" aria-label={`Delete work package ${activity.description}`} onClick={() => setPendingDeleteGroup(activity)}>×</button></div></td>
                      </tr>
                    );
                  }
                  const parentIndex = groupSequence.get(activity.parentId || "") || 1;
                  const siblings = activities.filter((item) => item.kind === "task" && item.parentId === activity.parentId);
                  const childIndex = siblings.findIndex((item) => item.id === activity.id) + 1;
                  const end = addDuration(activity.start, activity.duration, calendarMode);
                  return (
                    <tr key={activity.id} className="task-row">
                      <td data-label="No.">{parentIndex}.{childIndex}</td>
                      <td data-label="Description"><div className="task-description"><span className="branch-mark" aria-hidden="true">↳</span><input value={activity.description} readOnly={pdfPreview} tabIndex={pdfPreview ? -1 : undefined} onChange={(event) => updateActivity(activity.id, "description", event.target.value)} aria-label={`Activity ${parentIndex}.${childIndex} description`} /></div></td>
                      <td data-label="Planned dates"><div className="date-pair editable-date-pair"><label><span>S</span><input type="date" value={activity.start} readOnly={pdfPreview} tabIndex={pdfPreview ? -1 : undefined} onChange={(event) => updateActivity(activity.id, "start", event.target.value)} aria-label={`Activity ${parentIndex}.${childIndex} planned start date`} /></label><label><span>F</span><input type="date" value={end} readOnly={pdfPreview} tabIndex={pdfPreview ? -1 : undefined} onInput={(event) => updateEndDate(activity, event.currentTarget.value)} aria-label={`Activity ${parentIndex}.${childIndex} planned finish date`} /></label></div><div className="date-stack print-date-value"><span><b>S</b>{displayShortDate(activity.start)}</span><span><b>F</b>{displayShortDate(end)}</span></div></td>
                      <td data-label="Actual dates"><div className="date-pair actual editable-date-pair"><label><span>S</span><input type="date" max={project.statusDate} value={activity.actualStart || ""} readOnly={pdfPreview} tabIndex={pdfPreview ? -1 : undefined} onChange={(event) => updateActivity(activity.id, "actualStart", event.target.value)} aria-label={`Activity ${parentIndex}.${childIndex} actual start date`} /></label><label><span>F</span><input type="date" min={activity.actualStart || undefined} max={project.statusDate} value={activity.actualEnd || ""} readOnly={pdfPreview} tabIndex={pdfPreview ? -1 : undefined} onChange={(event) => updateActivity(activity.id, "actualEnd", event.target.value)} aria-label={`Activity ${parentIndex}.${childIndex} actual finish date`} /></label></div>{activity.actualStart ? <div className="date-stack actual print-date-value"><span><b>S</b>{displayShortDate(activity.actualStart)}</span><span><b>{activity.actualEnd ? "F" : "@"}</b>{displayShortDate(actualBarEnd(activity, project.statusDate))}</span></div> : <span className="not-started print-date-value">Not started</span>}</td>
                      <td data-label="Days"><input type="number" min="1" value={activity.duration} readOnly={pdfPreview} tabIndex={pdfPreview ? -1 : undefined} onChange={(event) => updateActivity(activity.id, "duration", Math.max(1, Number(event.target.value)))} aria-label={`Activity ${parentIndex}.${childIndex} duration`} /></td>
                      <td data-label="Owner"><input value={activity.owner} readOnly={pdfPreview} tabIndex={pdfPreview ? -1 : undefined} onChange={(event) => updateActivity(activity.id, "owner", event.target.value)} aria-label={`Activity ${parentIndex}.${childIndex} owner`} /></td>
                      <td data-label="Depends"><input value={activity.dependency} readOnly={pdfPreview} tabIndex={pdfPreview ? -1 : undefined} onChange={(event) => updateActivity(activity.id, "dependency", event.target.value)} aria-label={`Activity ${parentIndex}.${childIndex} dependency`} /></td>
                      {planningModel === "intensive" && <td className="cost-cell" data-label="Budget / earned"><div className="money-editor"><label className="earning-method-row"><span>Earn</span><select value={taskEarningMethod(activity)} disabled={pdfPreview} tabIndex={pdfPreview ? -1 : undefined} onChange={(event) => updateActivity(activity.id, "earningMethod", event.target.value as EarningMethod)} aria-label={`Activity ${parentIndex}.${childIndex} earning method`}><option value="certified">Certified EV</option><option value="zero-hundred">0 / 100</option><option value="fifty-fifty">50 / 50</option><option value="level-of-effort">LOE linear</option></select></label><label><span>Budget</span><input type="number" min="0" step="1000" value={taskBudget(activity)} readOnly={pdfPreview} tabIndex={pdfPreview ? -1 : undefined} onChange={(event) => updateTaskBudget(activity, Number(event.target.value))} aria-label={`Activity ${parentIndex}.${childIndex} task budget`} /></label><label><span>EV @ {displayShortDate(project.statusDate)}</span><input type="number" min={taskEarningMethod(activity) === "certified" ? earnedValueBoundsAt(activity.id, actualSnapshots, project.statusDate, taskBudget(activity)).min : 0} max={taskEarningMethod(activity) === "certified" ? earnedValueBoundsAt(activity.id, actualSnapshots, project.statusDate, taskBudget(activity)).max : taskBudget(activity)} step="1000" value={taskEarnedValueAt(activity, actualSnapshots, project.statusDate, calendarMode)} readOnly={pdfPreview || taskEarningMethod(activity) !== "certified"} tabIndex={pdfPreview || taskEarningMethod(activity) !== "certified" ? -1 : undefined} onChange={(event) => updateEarnedValue(activity, Number(event.target.value))} aria-label={`Activity ${parentIndex}.${childIndex} ${taskEarningMethod(activity) === "certified" ? "certified" : "calculated"} earned value`} /></label></div></td>}
                      <td className="metric-cell" data-label="Auto weight / actual"><div className="auto-metrics"><span>W {(taskWeights.get(activity.id) ?? 0).toFixed(1)}%</span><strong>{Math.round(actualProgressMap.get(activity.id) ?? 0)}%</strong><i className="progress-track"><b style={{ width: `${actualProgressMap.get(activity.id) ?? 0}%` }} /></i></div></td>
                      <td className="no-print action-cell" data-label="Actions"><button type="button" className="row-action remove" title="Remove activity" aria-label={`Remove ${activity.description}`} onClick={() => removeActivity(activity.id)}>×</button></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        <footer className="workspace-footer">
          <span>Timeline Plan Creator / fit-out edition</span>
          <span>End-date calculation is inclusive of the start date.</span>
        </footer>
        <footer className="print-footer" aria-label="PDF document footer">
          <span>{company.name || "Company name"} · Project controls</span>
          <span>{project.name || "Untitled project"} • {project.revision}</span>
          <span>Issued {displayDate(project.issueDate)}</span>
        </footer>
        </>}
      </section>

      {pendingDeleteGroup && <div className="confirm-backdrop no-print" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setPendingDeleteGroup(null); }}>
        <section className="confirm-dialog" role="alertdialog" aria-modal="true" aria-labelledby="delete-package-title" aria-describedby="delete-package-description">
          <span className="confirm-kicker">Destructive action</span>
          <h2 id="delete-package-title">Delete work package?</h2>
          <p id="delete-package-description"><strong>{pendingDeleteGroup.description}</strong> and {tasks.filter((task) => task.parentId === pendingDeleteGroup.id).length} sub-plan(s) will be removed from the table, timeline, and S-curve.</p>
          <div className="confirm-actions">
            <button type="button" className="button quiet" onClick={() => setPendingDeleteGroup(null)}>Cancel</button>
            <button type="button" className="button danger" onClick={confirmDeleteGroup}>Delete package</button>
          </div>
        </section>
      </div>}
    </main>
  );
}
