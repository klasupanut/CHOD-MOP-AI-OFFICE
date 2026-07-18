"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import {
  CHOD_ORGANIZATION,
  DEFAULT_LOCAL_PROJECT_ID,
  createTenantPlanEnvelope,
  isTenantPlanEnvelope,
  tenantStorageKey,
} from "@/lib/planner/tenancy";
import type {
  UsageLevel,
  WorkspaceUsageSummary,
} from "@/lib/planner/usage-guard";
import type {
  CloudflareFreeMetric,
  CloudflareFreeTierTelemetry,
} from "@/lib/planner/cloudflare-telemetry";

type CalendarMode = "calendar" | "working";
type PlanningModel = "normal" | "intensive";
type CurveView = "compare" | "plan" | "actual";
type UsageLoadState = "loading" | "ready" | "local" | "error";
type WorkspaceUsagePayload = WorkspaceUsageSummary & {
  cloudflare?: CloudflareFreeTierTelemetry;
};

type ProjectMeta = {
  name: string;
  code: string;
  client: string;
  location: string;
  projectManager: string;
  contractNo: string;
  baselineDate: string;
  statusDate: string;
  issueDate: string;
  revision: string;
  preparedBy: string;
  approvedBy: string;
};

type CompanyProfile = {
  name: string;
  location: string;
  logoDataUrl: string;
};

type Activity = {
  id: string;
  parentId: string | null;
  kind: "group" | "task";
  description: string;
  start: string;
  duration: number;
  progress: number;
  weight: number;
  owner: string;
  dependency: string;
  actualStart?: string;
  actualEnd?: string;
  budget?: number;
};

type ActualSnapshot = {
  id: string;
  activityId: string;
  date: string;
  earnedValue: number;
};

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
  kind: "group" | "task";
};

type SavedPlan = {
  project: ProjectMeta;
  company?: CompanyProfile;
  activities: Activity[];
  actualSnapshots?: ActualSnapshot[];
  calendarMode: CalendarMode;
  planningModel?: PlanningModel;
  curveView?: CurveView;
  showCurve: boolean;
  includeCurvePdf: boolean;
};

const LEGACY_STORAGE_KEY = "timeline-plan-creator-v3";
const STORAGE_KEY = tenantStorageKey(
  CHOD_ORGANIZATION.id,
  DEFAULT_LOCAL_PROJECT_ID,
);

const initialProject: ProjectMeta = {
  name: "Central Embassy Retail Fit-out",
  code: "CE-RTL-2607",
  client: "Northstar Retail Co., Ltd.",
  location: "Central Embassy, Level 4, Bangkok",
  projectManager: "Narin Chantarasorn",
  contractNo: "NSR/FO/2026-041",
  baselineDate: "2026-07-13",
  statusDate: "2026-08-07",
  issueDate: "2026-07-14",
  revision: "Rev 01 / Tender Plan",
  preparedBy: "CHOD MOP Team",
  approvedBy: "Client Project Director",
};

const initialCompany: CompanyProfile = {
  name: "CHODTHANAWAT CO., LTD.",
  location: "Bangkok, Thailand",
  logoDataUrl: "",
};

const initialActivities: Activity[] = [
  { id: "g1", parentId: null, kind: "group", description: "Pre-construction & approvals", start: "2026-07-15", duration: 1, progress: 0, weight: 0, owner: "PM", dependency: "-" },
  { id: "t1", parentId: "g1", kind: "task", description: "Site survey & existing condition verification", start: "2026-07-15", duration: 4, progress: 100, weight: 3, owner: "Site / QS", dependency: "-" },
  { id: "t2", parentId: "g1", kind: "task", description: "Shop drawings and coordination set", start: "2026-07-18", duration: 12, progress: 72, weight: 6, owner: "Design", dependency: "1.1" },
  { id: "t3", parentId: "g1", kind: "task", description: "Material samples and client approval", start: "2026-07-23", duration: 14, progress: 42, weight: 5, owner: "Procurement", dependency: "1.2" },
  { id: "g2", parentId: null, kind: "group", description: "Mobilization & site protection", start: "2026-08-01", duration: 1, progress: 0, weight: 0, owner: "Site", dependency: "1" },
  { id: "t4", parentId: "g2", kind: "task", description: "Mobilization, permits and temporary utilities", start: "2026-08-01", duration: 5, progress: 60, weight: 4, owner: "Site", dependency: "1.1" },
  { id: "t5", parentId: "g2", kind: "task", description: "Hoarding, dust control and common-area protection", start: "2026-08-03", duration: 5, progress: 35, weight: 4, owner: "Site", dependency: "2.1" },
  { id: "t6", parentId: "g2", kind: "task", description: "Setting out and benchmark confirmation", start: "2026-08-06", duration: 3, progress: 0, weight: 3, owner: "Site / QA", dependency: "2.1" },
  { id: "g3", parentId: null, kind: "group", description: "MEP first fix", start: "2026-08-09", duration: 1, progress: 0, weight: 0, owner: "MEP", dependency: "2" },
  { id: "t7", parentId: "g3", kind: "task", description: "Electrical containment and cable pulling", start: "2026-08-09", duration: 15, progress: 0, weight: 8, owner: "Electrical", dependency: "2.3" },
  { id: "t8", parentId: "g3", kind: "task", description: "HVAC ductwork, piping and controls", start: "2026-08-11", duration: 16, progress: 0, weight: 8, owner: "HVAC", dependency: "2.3" },
  { id: "t9", parentId: "g3", kind: "task", description: "Fire alarm and sprinkler modification", start: "2026-08-13", duration: 12, progress: 0, weight: 6, owner: "Fire", dependency: "2.3" },
  { id: "g4", parentId: null, kind: "group", description: "Architectural & joinery works", start: "2026-08-18", duration: 1, progress: 0, weight: 0, owner: "Arch", dependency: "2" },
  { id: "t10", parentId: "g4", kind: "task", description: "Partitions, backing and ceiling framing", start: "2026-08-18", duration: 18, progress: 0, weight: 6, owner: "Architectural", dependency: "2.3" },
  { id: "t11", parentId: "g4", kind: "task", description: "Bespoke joinery fabrication off-site", start: "2026-08-05", duration: 35, progress: 12, weight: 10, owner: "Joinery", dependency: "1.3" },
  { id: "t12", parentId: "g4", kind: "task", description: "Joinery delivery and installation", start: "2026-09-09", duration: 16, progress: 0, weight: 9, owner: "Joinery", dependency: "4.2" },
  { id: "t13", parentId: "g4", kind: "task", description: "Feature metalwork and glazing", start: "2026-09-13", duration: 12, progress: 0, weight: 5, owner: "Specialist", dependency: "4.1" },
  { id: "g5", parentId: null, kind: "group", description: "Finishes, fixtures & commissioning", start: "2026-09-04", duration: 1, progress: 0, weight: 0, owner: "Arch / MEP", dependency: "3,4" },
  { id: "t14", parentId: "g5", kind: "task", description: "Floor, wall and ceiling finishes", start: "2026-09-04", duration: 24, progress: 0, weight: 7, owner: "Architectural", dependency: "4.1" },
  { id: "t15", parentId: "g5", kind: "task", description: "Lighting, devices, fixtures and final connections", start: "2026-09-22", duration: 14, progress: 0, weight: 6, owner: "MEP", dependency: "3" },
  { id: "t16", parentId: "g5", kind: "task", description: "Testing, balancing and system commissioning", start: "2026-10-02", duration: 7, progress: 0, weight: 4, owner: "MEP / QA", dependency: "5.2" },
  { id: "g6", parentId: null, kind: "group", description: "Close-out & handover", start: "2026-10-07", duration: 1, progress: 0, weight: 0, owner: "PM / QA", dependency: "5" },
  { id: "t17", parentId: "g6", kind: "task", description: "Inspection, snagging and rectification", start: "2026-10-07", duration: 6, progress: 0, weight: 4, owner: "QA / Site", dependency: "5.3" },
  { id: "t18", parentId: "g6", kind: "task", description: "As-built documents, training and handover", start: "2026-10-11", duration: 4, progress: 0, weight: 2, owner: "PM", dependency: "6.1" },
];

const usageLevelLabel: Record<UsageLevel, string> = {
  healthy: "Safe",
  notice: "70% notice",
  warning: "85% warning",
  critical: "95% critical",
  blocked: "Limit reached",
};

function formatUsageValue(metric: Pick<CloudflareFreeMetric, "used" | "limit" | "unit">) {
  if (metric.unit === "count") {
    return `${metric.used.toLocaleString("en-US")} / ${metric.limit.toLocaleString("en-US")}`;
  }
  return `${formatBytes(metric.used)} / ${formatBytes(metric.limit)}`;
}

const usageLevelRank: Record<UsageLevel, number> = {
  healthy: 0,
  notice: 1,
  warning: 2,
  critical: 3,
  blocked: 4,
};

function platformPeriodLabel(period: CloudflareFreeMetric["period"]) {
  if (period === "daily") return "today";
  if (period === "monthly") return "this month";
  return "current";
}

function formatBytes(bytes: number) {
  if (bytes >= 1_000_000_000) return `${(bytes / 1_000_000_000).toFixed(1)} GB`;
  if (bytes >= 1_000_000) return `${(bytes / 1_000_000).toFixed(1)} MB`;
  if (bytes >= 1_000) return `${(bytes / 1_000).toFixed(1)} KB`;
  return `${Math.max(0, Math.round(bytes))} B`;
}

const pad = (value: number) => String(value).padStart(2, "0");

function parseDate(value: string) {
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
  return parseDate(value).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" });
}

function displayShortDate(value: string) {
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

const DAY_MS = 86_400_000;
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

function taskActualProgress(task: Activity, planningModel: PlanningModel, statusDate: string, snapshots: ActualSnapshot[]) {
  if (planningModel === "normal") return task.actualEnd && task.actualEnd <= statusDate ? 100 : 0;
  const budget = taskBudget(task);
  return budget > 0 ? clamp(earnedValueAt(task.id, snapshots, statusDate) / budget * 100, 0, 100) : 0;
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
  const inclusiveSpan = Math.max(DAY_MS, taskEnd - taskStart + DAY_MS);
  return clamp((current - taskStart + DAY_MS) / inclusiveSpan, 0, 1);
}

function plannedPeak(tasks: Activity[], mode: CalendarMode, planningModel: PlanningModel) {
  if (tasks.length === 0) return { index: 0, dateMs: 0, label: "" };
  const startMs = Math.min(...tasks.map((task) => parseDate(task.start).getTime()));
  const endMs = Math.max(...tasks.map((task) => parseDate(addDuration(task.start, task.duration, mode)).getTime()));
  const span = Math.max(1, Math.round((endMs - startMs) / DAY_MS));
  const weights = taskWeightMap(tasks, planningModel);
  let peakIndex = 1;
  let peakIncrement = -1;

  const cumulativeAt = (current: number) => tasks.reduce((sum, task) => sum + plannedRatioAt(task, current, mode) * (weights.get(task.id) ?? 0), 0);

  for (let day = 1; day <= span; day += 1) {
    const previous = cumulativeAt(startMs + (day - 1) * DAY_MS);
    const current = cumulativeAt(startMs + day * DAY_MS);
    const increment = current - previous;
    if (increment > peakIncrement) {
      peakIncrement = increment;
      peakIndex = day;
    }
  }

  return {
    index: peakIndex,
    dateMs: startMs + peakIndex * DAY_MS,
    label: displayDate(toISO(new Date(startMs + peakIndex * DAY_MS))).replace(/ \d{4}$/, ""),
  };
}

function Scurve({ tasks, mode, planningModel, statusDate, snapshots, curveView }: { tasks: Activity[]; mode: CalendarMode; planningModel: PlanningModel; statusDate: string; snapshots: ActualSnapshot[]; curveView: CurveView }) {
  if (tasks.length === 0) return null;
  const { startMs, endMs } = timelineBounds(tasks, mode, statusDate);
  const span = Math.max(1, Math.round((endMs - startMs) / DAY_MS));
  const statusDay = clamp(Math.round((parseDate(statusDate).getTime() - startMs) / DAY_MS), 0, span);
  const weights = taskWeightMap(tasks, planningModel);
  const inset = 24;
  const plotSize = 1000 - inset * 2;

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
        : (taskBudget(task) > 0 ? clamp(earnedValueAt(task.id, snapshots, currentDate) / taskBudget(task), 0, 1) : 0);
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
    <svg className="timeline-curve-canvas" viewBox="0 0 1000 1000" preserveAspectRatio="none" role="img" aria-label="Planned and actual cumulative progress S-curve overlaid directly on the timeline, with the peak planned slope marked">
      <title>Planned and actual cumulative progress S-curve</title>
      <line className="curve-status-line" x1={statusX} x2={statusX} y1={inset} y2={1000 - inset} />
      {curveView !== "actual" && <>
        <line className="curve-peak-line" x1={peakPoint.x} x2={peakPoint.x} y1={inset} y2={1000 - inset} />
        <path className="curve-underlay" d={plannedPath} />
        <path className="curve-planned-path" d={plannedPath} />
        <g className="curve-peak-marker" aria-hidden="true">
          <ellipse className="curve-peak-halo" cx={peakPoint.x} cy={peakPoint.y} rx="12" ry="40" />
          <ellipse className="curve-peak-ring" cx={peakPoint.x} cy={peakPoint.y} rx="7.5" ry="25" />
          <ellipse className="curve-peak-dot" cx={peakPoint.x} cy={peakPoint.y} rx="3.5" ry="12" />
        </g>
      </>}
      {curveView !== "plan" && <>
        <path className="curve-underlay curve-underlay-actual" d={actualPath} />
        <path className="curve-actual-path" d={actualPath} />
      </>}
    </svg>
  );
}

function IntegratedTimeline({ rows, tasks, mode, showCurve, includeCurvePdf, planningModel, statusDate, snapshots, curveView }: { rows: TimelineChartRow[]; tasks: Activity[]; mode: CalendarMode; showCurve: boolean; includeCurvePdf: boolean; planningModel: PlanningModel; statusDate: string; snapshots: ActualSnapshot[]; curveView: CurveView }) {
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

  return (
    <div className={`combined-chart chart-view-${curveView}`}>
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
              <svg className="peak-axis-icon" viewBox="0 0 18 18" aria-hidden="true" focusable="false">
                <path d="M2.5 13.5 6.4 8.8l2.2 2.4L12.2 5l3.3 8.5" />
                <circle cx="12.2" cy="5" r="1.45" />
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
          return (
            <div className={`timeline-chart-row ${row.kind}`} key={row.id}>
              <div className="timeline-row-label">
                <span>{row.code}</span>
                <div><strong>{row.label}</strong><small>{displayDate(row.start)} - {displayDate(row.end)} / {row.duration} days</small></div>
              </div>
              <div className="timeline-row-track">
                <div className="timeline-guides" aria-hidden="true">
                  {weekSegments.slice(1).map((segment) => <i className="week-guide" key={segment.key} style={{ left: `${segment.left}%` }} />)}
                  {monthSegments.slice(1).map((segment) => <i className="month-guide" key={segment.key} style={{ left: `${segment.left}%` }} />)}
                </div>
                <i className="timeline-status-guide" style={{ left: `${statusRatio * 100}%` }} aria-hidden="true" />
                {curveView !== "actual" && <div className="timeline-bar planned-timeline-bar" style={{ left: `${left}%`, width: `${boundedWidth}%` }} title={`Plan: ${displayDate(row.start)} - ${displayDate(row.end)} / ${row.weight.toFixed(1)}% weight`}><b>PLAN</b></div>}
                {curveView !== "plan" && row.actualStart && row.actualEnd && <div className={`timeline-bar actual-timeline-bar ${keepProgressInside ? "progress-label-inside" : ""}`} style={{ left: `${actualLeft}%`, width: `${boundedActualWidth}%` }} title={`Actual: ${displayDate(row.actualStart)} - ${displayDate(row.actualEnd)} / ${Math.round(row.actualProgress)}% earned`}><b>{row.actualProgress > 0 ? `${Math.round(row.actualProgress)}%` : "START"}</b></div>}
              </div>
            </div>
          );
        })}
        <div className={`timeline-curve-overlay ${showCurve ? "" : "curve-hidden-screen"} ${includeCurvePdf ? "" : "exclude-curve-print"}`}>
          <div className="curve-overlay-scale" aria-hidden="true"><span>100%</span><span>75%</span><span>50%</span><span>25%</span><span>0%</span></div>
          <Scurve tasks={tasks} mode={mode} planningModel={planningModel} statusDate={statusDate} snapshots={snapshots} curveView={curveView} />
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
  const [showTimelineSubplans, setShowTimelineSubplans] = useState(false);
  const [pdfPreview, setPdfPreview] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(true);
  const [companyOpen, setCompanyOpen] = useState(false);
  const [logoMessage, setLogoMessage] = useState("PNG, JPG or WebP up to 1.5 MB");
  const [pendingDeleteGroup, setPendingDeleteGroup] = useState<Activity | null>(null);
  const [savedLabel, setSavedLabel] = useState(
    `Autosaved for ${CHOD_ORGANIZATION.name}`,
  );
  const [hydrated, setHydrated] = useState(false);
  const [workspaceUsage, setWorkspaceUsage] = useState<WorkspaceUsagePayload | null>(null);
  const [usageState, setUsageState] = useState<UsageLoadState>("loading");
  const [usageRefreshToken, setUsageRefreshToken] = useState(0);

  useEffect(() => {
    const hydration = window.setTimeout(() => {
      const tenantStored = window.localStorage.getItem(STORAGE_KEY);
      const legacyStored = window.localStorage.getItem(LEGACY_STORAGE_KEY);
      const stored = tenantStored ?? legacyStored;
      if (stored) {
        try {
          const parsed = JSON.parse(stored) as unknown;
          const saved = isTenantPlanEnvelope<SavedPlan>(parsed)
            ? parsed.data
            : (parsed as SavedPlan);
          const mergedProject = { ...initialProject, ...saved.project };
          const savedCalendar = saved.calendarMode || "calendar";
          const migrated = Array.isArray(saved.activities) ? migrateActivities(saved.activities, savedCalendar) : migrateActivities(initialActivities, savedCalendar);
          setProject(mergedProject);
          setCompany({ ...initialCompany, ...saved.company });
          setActivities(migrated);
          setActualSnapshots(Array.isArray(saved.actualSnapshots) ? saved.actualSnapshots : legacySnapshots(migrated, mergedProject.statusDate, savedCalendar));
          setCalendarMode(savedCalendar);
          setPlanningModel(saved.planningModel || "normal");
          setCurveView(saved.curveView || "compare");
          if (typeof saved.showCurve === "boolean") setShowCurve(saved.showCurve);
          if (typeof saved.includeCurvePdf === "boolean") setIncludeCurvePdf(saved.includeCurvePdf);

          if (!tenantStored && legacyStored) {
            window.localStorage.setItem(
              STORAGE_KEY,
              JSON.stringify(
                createTenantPlanEnvelope(
                  CHOD_ORGANIZATION,
                  DEFAULT_LOCAL_PROJECT_ID,
                  saved,
                ),
              ),
            );
          }
        } catch {
          if (tenantStored) window.localStorage.removeItem(STORAGE_KEY);
        }
      }
      setHydrated(true);
    }, 0);
    return () => window.clearTimeout(hydration);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    const saving = window.setTimeout(() => setSavedLabel("Saving..."), 0);
    const timeout = window.setTimeout(() => {
      const payload: SavedPlan = { project, company, activities, actualSnapshots, calendarMode, planningModel, curveView, showCurve, includeCurvePdf };
      try {
        window.localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify(
            createTenantPlanEnvelope(
              CHOD_ORGANIZATION,
              DEFAULT_LOCAL_PROJECT_ID,
              payload,
            ),
          ),
        );
        setSavedLabel(`Saved ${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`);
      } catch {
        setSavedLabel("Logo is too large for local storage");
      }
    }, 350);
    return () => {
      window.clearTimeout(saving);
      window.clearTimeout(timeout);
    };
  }, [project, company, activities, actualSnapshots, calendarMode, planningModel, curveView, showCurve, includeCurvePdf, hydrated]);

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
    // CHOD MOP OFFICE currently keeps Planner drafts inside the authenticated
    // browser. The original D1/R2 persistence foundation remains isolated
    // until a production tenant database is explicitly approved and wired.
    setWorkspaceUsage(null);
    setUsageState("local");
  }, [hydrated, usageRefreshToken]);

  const groups = useMemo(() => activities.filter((activity) => activity.kind === "group"), [activities]);
  const tasks = useMemo(() => activities.filter((activity) => activity.kind === "task"), [activities]);
  const taskWeights = useMemo(() => taskWeightMap(tasks, planningModel), [tasks, planningModel]);
  const actualProgressMap = useMemo(() => new Map(tasks.map((task) => [task.id, taskActualProgress(task, planningModel, project.statusDate, actualSnapshots)])), [tasks, planningModel, project.statusDate, actualSnapshots]);
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
    const earned = children.reduce((sum, task) => sum + earnedValueAt(task.id, actualSnapshots, project.statusDate), 0);
    return { start, end, duration: durationBetween(start, end, calendarMode), progress, weight, budget, earned, actualStart, actualEnd };
  };

  const projectSummary = useMemo(() => {
    if (tasks.length === 0) {
      return { start: project.baselineDate, end: project.baselineDate, duration: 0, totalWeight: 0, totalBudget: 0, progress: 0, plannedAtStatus: 0, variance: 0 };
    }
    const start = toISO(new Date(Math.min(...tasks.map((task) => parseDate(task.start).getTime()))));
    const end = toISO(new Date(Math.max(...tasks.map((task) => parseDate(addDuration(task.start, task.duration, calendarMode)).getTime()))));
    const totalWeight = tasks.length > 0 ? 100 : 0;
    const progress = tasks.reduce((sum, task) => sum + (actualProgressMap.get(task.id) ?? 0) * (taskWeights.get(task.id) ?? 0) / 100, 0);
    const statusMs = parseDate(project.statusDate).getTime();
    const plannedAtStatus = tasks.reduce((sum, task) => sum + plannedRatioAt(task, statusMs, calendarMode) * (taskWeights.get(task.id) ?? 0), 0);
    const totalBudget = tasks.reduce((sum, task) => sum + taskBudget(task), 0);
    return { start, end, duration: durationBetween(start, end, calendarMode), totalWeight, totalBudget, progress: Math.round(progress), plannedAtStatus: Math.round(plannedAtStatus), variance: Math.round(progress - plannedAtStatus) };
  }, [tasks, calendarMode, project.baselineDate, project.statusDate, taskWeights, actualProgressMap]);

  const updateProject = (field: keyof ProjectMeta, value: string) => setProject((current) => ({ ...current, [field]: value }));

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
    const reader = new FileReader();
    reader.addEventListener("load", () => {
      if (typeof reader.result !== "string") return;
      setCompany((current) => ({ ...current, logoDataUrl: reader.result as string }));
      setLogoMessage(`${file.name} imported`);
      input.value = "";
    });
    reader.addEventListener("error", () => setLogoMessage("Could not read this logo file"));
    reader.readAsDataURL(file);
  };

  const removeCompanyLogo = () => {
    setCompany((current) => ({ ...current, logoDataUrl: "" }));
    setLogoMessage("Logo removed - the CHOD monogram will be used");
  };

  const updateActivity = (id: string, field: keyof Activity, value: string | number | null) => {
    setActivities((current) => current.map((activity) => activity.id === id ? { ...activity, [field]: value } : activity));
  };

  const updateEarnedValue = (task: Activity, rawValue: number) => {
    const earnedValue = clamp(Number(rawValue) || 0, 0, taskBudget(task));
    setActualSnapshots((current) => [
      ...current.filter((snapshot) => !(snapshot.activityId === task.id && snapshot.date === project.statusDate)),
      { id: `${task.id}-${project.statusDate}`, activityId: task.id, date: project.statusDate, earnedValue },
    ]);
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

  const resetDemo = () => {
    if (!window.confirm("Replace the current plan with the fit-out demo plan?")) return;
    setProject(initialProject);
    setActivities(migrateActivities(initialActivities, "calendar"));
    setActualSnapshots(legacySnapshots(initialActivities, initialProject.statusDate, "calendar"));
    setCalendarMode("calendar");
    setPlanningModel("normal");
    setCurveView("compare");
    setShowCurve(true);
    setIncludeCurvePdf(true);
  };

  const exportBackup = () => {
    const payload: SavedPlan = { project, company, activities, actualSnapshots, calendarMode, planningModel, curveView, showCurve, includeCurvePdf };
    const tenantBackup = createTenantPlanEnvelope(
      CHOD_ORGANIZATION,
      DEFAULT_LOCAL_PROJECT_ID,
      payload,
    );
    const blob = new Blob([JSON.stringify(tenantBackup, null, 2)], { type: "application/json" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${project.code || "timeline-plan"}.json`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const printPlan = () => {
    const previousTitle = document.title;
    document.title = `${project.code || "Project"} - Timeline Plan - ${project.revision}`;
    window.addEventListener("afterprint", () => { document.title = previousTitle; }, { once: true });
    window.print();
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
      kind: "group",
    };

    if (!showTimelineSubplans) return [groupRow];

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
        kind: "task",
      }));

    return [groupRow, ...childRows];
  });

  return (
    <main className={`app-shell ${pdfPreview ? "pdf-preview-mode" : ""}`}>
      <aside className="sidebar no-print">
        <div className="brand-lockup">
          <span className={`brand-mark ${company.logoDataUrl ? "has-logo" : ""}`}>
            {company.logoDataUrl ? <Image src={company.logoDataUrl} width={52} height={46} unoptimized alt="" /> : "CHOD"}
          </span>
          <span>
            <strong>Timeline Plan</strong>
            <small>{CHOD_ORGANIZATION.name} workspace</small>
          </span>
        </div>

        <nav className="rail-nav" aria-label="Workspace sections">
          <button type="button" className="rail-link active"><span>01</span> Plan workspace</button>
          <button type="button" className="rail-link" onClick={() => setDetailsOpen((value) => !value)}><span>02</span> Project information</button>
          <button type="button" className="rail-link" onClick={() => document.getElementById("curve-section")?.scrollIntoView({ behavior: "smooth" })}><span>03</span> Timeline &amp; S-curve</button>
          <button type="button" className="rail-link" aria-expanded={companyOpen} aria-controls="company-profile" onClick={() => setCompanyOpen((value) => !value)}><span>04</span> Company profile</button>
          <button type="button" className="rail-link" onClick={() => document.getElementById("workspace-usage")?.scrollIntoView({ behavior: "smooth", block: "start" })}><span>05</span> Workspace usage</button>
        </nav>

        <section className="rail-project">
          <div className="section-heading">
            <span>Project file</span>
            <button type="button" className="icon-button" title="Toggle project information" aria-label="Toggle project information" onClick={() => setDetailsOpen((value) => !value)}>{detailsOpen ? "−" : "+"}</button>
          </div>
          <label>Project code<input value={project.code} onChange={(event) => updateProject("code", event.target.value)} /></label>
          <label>Client<input value={project.client} onChange={(event) => updateProject("client", event.target.value)} /></label>
          <label>Location<textarea rows={2} value={project.location} onChange={(event) => updateProject("location", event.target.value)} /></label>
          <label>Project manager<input value={project.projectManager} onChange={(event) => updateProject("projectManager", event.target.value)} /></label>
          {detailsOpen && <>
            <label>Contract no.<input value={project.contractNo} onChange={(event) => updateProject("contractNo", event.target.value)} /></label>
            <label>Baseline date<input type="date" value={project.baselineDate} onChange={(event) => updateProject("baselineDate", event.target.value)} /></label>
            <label>Status date<input type="date" value={project.statusDate} onChange={(event) => updateProject("statusDate", event.target.value)} /></label>
            <label>Issue date<input type="date" value={project.issueDate} onChange={(event) => updateProject("issueDate", event.target.value)} /></label>
            <label>Revision<input value={project.revision} onChange={(event) => updateProject("revision", event.target.value)} /></label>
            <label>Prepared by<input value={project.preparedBy} onChange={(event) => updateProject("preparedBy", event.target.value)} /></label>
            <label>Approved by<input value={project.approvedBy} onChange={(event) => updateProject("approvedBy", event.target.value)} /></label>
          </>}
        </section>

        <section className="rail-project rail-company" id="company-profile">
          <div className="section-heading">
            <span>Company profile</span>
            <button type="button" className="icon-button" title="Toggle company profile" aria-label="Toggle company profile" aria-expanded={companyOpen} onClick={() => setCompanyOpen((value) => !value)}>{companyOpen ? "-" : "+"}</button>
          </div>
          {companyOpen && <>
            <div className="rail-logo-preview" aria-label="Company logo preview">
              {company.logoDataUrl ? <Image src={company.logoDataUrl} width={72} height={52} unoptimized alt={`${company.name || "Company"} logo`} /> : <span>CHOD</span>}
              <div><strong>{company.name || "Company name"}</strong><small>PDF identity preview</small></div>
            </div>
            <label>Company name<input value={company.name} onChange={(event) => updateCompany("name", event.target.value)} /></label>
            <label>Company location<textarea rows={2} value={company.location} onChange={(event) => updateCompany("location", event.target.value)} /></label>
            <label className="logo-file-label">Company logo<input className="logo-file-input" type="file" accept="image/png,image/jpeg,image/webp,.png,.jpg,.jpeg,.webp" disabled={storageBlocked} onChange={importCompanyLogo} /></label>
            <div className="logo-import-status" role="status"><span>{logoMessage}</span>{company.logoDataUrl && <button type="button" onClick={removeCompanyLogo}>Remove logo</button>}</div>
            <p className="company-note">Scoped to {CHOD_ORGANIZATION.name} and applied to PDF headers. The profile stays when the demo plan is reset.</p>
          </>}
        </section>

        <section className={`rail-usage ${workspaceUsage ? `usage-${workspaceUsage.overallLevel}` : ""}`} id="workspace-usage" aria-labelledby="workspace-usage-title">
          <div className="section-heading">
            <span id="workspace-usage-title">Workspace usage</span>
            <button type="button" className="icon-button usage-refresh" title="Refresh workspace usage" aria-label="Refresh workspace usage" disabled={usageState === "loading"} onClick={() => { setUsageState("loading"); setUsageRefreshToken((value) => value + 1); }}>↻</button>
          </div>

          {usageState === "loading" && <div className="usage-loading" role="status"><span /><span /><span className="sr-only">Loading workspace usage</span></div>}

          {usageState === "local" && <div className="usage-connection-state" role="status"><strong>Local draft mode</strong><p>Cloud quota monitoring activates after Cloudflare Access and D1 are connected. This browser draft is not using R2 storage.</p></div>}

          {usageState === "error" && <div className="usage-connection-state usage-error" role="status"><strong>Usage unavailable</strong><p>The plan stays editable. Refresh after checking the Cloudflare connection.</p></div>}

          {usageState === "ready" && workspaceUsage && <>
            <div className="usage-plan-row"><span>{workspaceUsage.plan.label}</span><strong>{usageLevelLabel[workspaceUsage.overallLevel]}</strong></div>
            <div className="usage-metrics">
              {workspaceUsage.metrics.map((metric) => <div className={`usage-metric level-${metric.level}`} key={metric.key}>
                <div><span>{metric.label}</span><strong>{formatUsageValue(metric)}</strong></div>
                <div className="usage-track" role="progressbar" aria-label={`${metric.label} usage`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.min(100, Math.round(metric.percent))}><i style={{ width: `${metric.barPercent}%` }} /></div>
                <small>{metric.percent.toFixed(metric.percent % 1 === 0 ? 0 : 1)}% used</small>
              </div>)}
            </div>
            <p className="usage-message" role={workspaceUsage.overallLevel === "critical" || workspaceUsage.overallLevel === "blocked" ? "alert" : "status"}>{workspaceUsage.message}</p>
            <small className="usage-source">D1 counts + active R2 file ledger · updated {new Date(workspaceUsage.measuredAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</small>

            <details className={`platform-usage ${cloudflareUsage?.state === "ready" ? `usage-${cloudflareUsage.overallLevel}` : ""}`}>
              <summary><span>Cloudflare Free limits</span><strong>{cloudflareUsage?.state === "ready" ? usageLevelLabel[cloudflareUsage.overallLevel] : cloudflareUsage?.state === "unavailable" ? "Unavailable" : "Setup required"}</strong></summary>
              <div className="platform-usage-body">
                {cloudflareUsage?.state === "ready" ? <>
                  <div className="usage-metrics platform-metrics">
                    {cloudflareUsage.metrics.map((metric) => <div className={`usage-metric level-${metric.level}`} key={metric.key}>
                      <div><span>{metric.label}</span><strong>{formatUsageValue(metric)}</strong></div>
                      <div className="usage-track" role="progressbar" aria-label={`${metric.label} estimated usage`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.min(100, Math.round(metric.percent))}><i style={{ width: `${metric.barPercent}%` }} /></div>
                      <small>{metric.percent.toFixed(metric.percent % 1 === 0 ? 0 : 1)}% · {platformPeriodLabel(metric.period)} · est.</small>
                    </div>)}
                  </div>
                  <p className="platform-note" role={cloudflareUsage.overallLevel === "critical" || cloudflareUsage.overallLevel === "blocked" ? "alert" : "status"}>{cloudflareUsage.message}</p>
                  <small className="usage-source">{cloudflareUsage.disclaimer}</small>
                </> : <div className="usage-connection-state" role="status"><strong>{cloudflareUsage?.state === "unavailable" ? "Analytics unavailable" : "Optional setup"}</strong><p>{cloudflareUsage?.message ?? "Add read-only Account Analytics credentials to display platform usage."}</p></div>}
              </div>
            </details>
          </>}
        </section>

        <div className="rail-footer">
          <span className="save-dot" />
          <span>{savedLabel}</span>
        </div>
      </aside>

      <section className="workspace" id="pdf-preview-sheet">
        <header className={`topbar ${pdfPreview ? "pdf-preview-toolbar" : ""}`}>
          {pdfPreview ? <div className="preview-toolbar-copy" role="status"><strong>PDF preview</strong><span>A4 landscape / executive timeline + detailed schedule / press Esc to exit</span></div> : <div>
            <div className="breadcrumb">Projects / Active plan / <strong>{project.code}</strong></div>
            <input className="project-title-input" value={project.name} onChange={(event) => updateProject("name", event.target.value)} aria-label="Project name" />
          </div>}
          <div className="topbar-actions no-print">
            {!pdfPreview && <button type="button" className="button quiet" onClick={exportBackup}>Backup JSON</button>}
            {!pdfPreview && <button type="button" className="button quiet" onClick={resetDemo}>Reset demo</button>}
            <button type="button" className="button quiet preview-toggle" aria-pressed={pdfPreview} aria-controls="pdf-preview-sheet" onClick={() => setPdfPreview((value) => !value)}>{pdfPreview ? "Exit preview" : "Preview PDF"}</button>
            <button type="button" className="button primary" onClick={printPlan}><span aria-hidden="true">⇩</span> Export PDF</button>
          </div>
        </header>

        {usageState === "ready" && workspaceUsage && combinedUsageLevel !== "healthy" && <div className={`usage-banner no-print usage-${combinedUsageLevel}`} role={combinedUsageLevel === "critical" || combinedUsageLevel === "blocked" ? "alert" : "status"}>
          <span className="usage-banner-mark" aria-hidden="true">!</span>
          <div><strong>{usageLevelLabel[combinedUsageLevel]}</strong><span>{combinedUsageMessage}</span></div>
          <a href="#workspace-usage">Review usage</a>
        </div>}

        <section className="print-title" aria-label="PDF document header">
          <div className="print-document-bar">
            <div className="print-company">
              {company.logoDataUrl ? <Image src={company.logoDataUrl} width={150} height={60} unoptimized alt={`${company.name || "Company"} logo`} /> : <span className="print-company-mark">CHOD</span>}
              <div><strong>{company.name || "Company name"}</strong><small>{company.location || "Company location"}</small></div>
            </div>
            <div className="print-document-id"><span>CONTROLLED DOCUMENT</span><strong>TIMELINE PLAN</strong><small>{project.code} / {project.revision}</small></div>
          </div>
          <div className="print-project-heading">
            <span>FIT-OUT DELIVERY PROGRAMME</span>
            <h1>{project.name}</h1>
            <p>{project.client} / {project.location}</p>
          </div>
          <dl>
            <div><dt>Project code</dt><dd>{project.code}</dd></div>
            <div><dt>Project manager</dt><dd>{project.projectManager}</dd></div>
            <div><dt>Contract no.</dt><dd>{project.contractNo}</dd></div>
            <div><dt>Baseline</dt><dd>{displayDate(project.baselineDate)}</dd></div>
            <div><dt>Status date</dt><dd>{displayDate(project.statusDate)}</dd></div>
            <div><dt>Issue date</dt><dd>{displayDate(project.issueDate)}</dd></div>
            <div><dt>Calendar</dt><dd>{calendarMode === "calendar" ? "Calendar days" : "Monday-Friday"}</dd></div>
            <div><dt>Weight basis</dt><dd>{planningModel === "normal" ? "Planned duration" : "Task budget"}</dd></div>
            <div><dt>Prepared by</dt><dd>{project.preparedBy}</dd></div>
            <div><dt>Approved by</dt><dd>{project.approvedBy}</dd></div>
          </dl>
        </section>

        <section className="method-bar no-print" aria-label="Calculation model">
          <div className="method-copy">
            <span>Calculation model</span>
            <strong>{planningModel === "normal" ? "Normal timeline" : "Cost-loaded intensive"}</strong>
            <p>{planningModel === "normal" ? "Weights are calculated from planned duration; actual progress is recognized only from actual completion dates." : "Weights are calculated from task budgets; actual progress comes from certified earned value saved at each status date."}</p>
          </div>
          <div className="segmented model-switch" role="group" aria-label="Timeline calculation model">
            <button type="button" className={planningModel === "normal" ? "active" : ""} onClick={() => setPlanningModel("normal")}><strong>Normal timeline</strong></button>
            <button type="button" className={planningModel === "intensive" ? "active" : ""} onClick={() => setPlanningModel("intensive")}><strong>Cost-loaded</strong></button>
          </div>
        </section>

        <section className="summary-strip" aria-label="Project summary">
          <div className="summary-main">
            <span>Overall period</span>
            <strong>{projectSummary.duration}<small>{calendarMode === "calendar" ? "calendar days" : "working days"}</small></strong>
            <p>{displayDate(projectSummary.start)} — {displayDate(projectSummary.end)}</p>
          </div>
          <div><span>Work packages</span><strong>{groups.length}</strong><p>roll-up automatically</p></div>
          <div><span>Activities</span><strong>{tasks.length}</strong><p>{planningModel === "intensive" ? `THB ${projectSummary.totalBudget.toLocaleString("en-US")}` : "duration-weighted automatically"}</p></div>
          <div><span>Auto actual progress</span><strong>{projectSummary.progress}%</strong><div className="summary-progress"><i style={{ width: `${projectSummary.progress}%` }} /></div></div>
          <div className="calendar-control no-print">
            <span>Schedule calendar</span>
            <div className="segmented" role="group" aria-label="Schedule calendar mode">
              <button type="button" className={calendarMode === "calendar" ? "active" : ""} onClick={() => setCalendarMode("calendar")}>Calendar</button>
              <button type="button" className={calendarMode === "working" ? "active" : ""} onClick={() => setCalendarMode("working")}>Mon–Fri</button>
            </div>
            <p>1-day tasks finish on their start date</p>
          </div>
        </section>

        <section className="curve-panel" id="curve-section">
          <div className="panel-heading curve-heading">
            <div><h2>Timeline with S-curve overlay</h2><p>Plan and Actual use separate bars and curves on one date axis; the Actual curve stops at the status date.</p></div>
            <div className="chart-controls no-print">
              <div className="segmented curve-view-switch" role="group" aria-label="Timeline chart view">
                <button type="button" className={curveView === "compare" ? "active" : ""} onClick={() => setCurveView("compare")}>Compare</button>
                <button type="button" className={curveView === "plan" ? "active" : ""} onClick={() => setCurveView("plan")}>Plan</button>
                <button type="button" className={curveView === "actual" ? "active" : ""} onClick={() => setCurveView("actual")}>Actual</button>
              </div>
              <button type="button" className="button quiet" aria-pressed={showCurve} onClick={() => setShowCurve((value) => !value)}>{showCurve ? "Hide S-curve" : "Show S-curve"}</button>
              <button type="button" className="button quiet" onClick={() => setShowTimelineSubplans((value) => !value)}>{showTimelineSubplans ? "Show packages only" : "Expand sub-plans"}</button>
              <label className="print-toggle"><input type="checkbox" checked={includeCurvePdf} onChange={(event) => setIncludeCurvePdf(event.target.checked)} /><span>Include S-curve in PDF</span></label>
            </div>
          </div>
          <div className="chart-legend">
            {curveView !== "actual" && <span><i className="legend-bar planned-bar" /> Planned period</span>}
            {curveView !== "plan" && <span><i className="legend-bar actual-bar" /> Actual period</span>}
            {curveView !== "actual" && <span className={`${showCurve ? "" : "curve-hidden-screen"} ${includeCurvePdf ? "" : "exclude-curve-print"}`}><i className="legend-line planned" /> Planned S-curve</span>}
            {curveView !== "plan" && <span className={`${showCurve ? "" : "curve-hidden-screen"} ${includeCurvePdf ? "" : "exclude-curve-print"}`}><i className="legend-line actual" /> Actual S-curve</span>}
            <span><i className="legend-status" /> Status date</span>
          </div>
          <div className="combined-chart-scroll">
            <IntegratedTimeline rows={timelineRows} tasks={tasks} mode={calendarMode} showCurve={showCurve} includeCurvePdf={includeCurvePdf} planningModel={planningModel} statusDate={project.statusDate} snapshots={actualSnapshots} curveView={curveView} />
          </div>
          <div className="timeline-facts">
            <div><span>Actual at status</span><strong>{projectSummary.progress}%</strong></div>
            <div><span>Planned at status</span><strong>{projectSummary.plannedAtStatus}%</strong></div>
            <div><span>Schedule variance</span><strong className={projectSummary.variance < 0 ? "negative" : "positive"}>{projectSummary.variance > 0 ? "+" : ""}{projectSummary.variance} pt</strong></div>
            <div><span>Weight basis</span><strong>{planningModel === "normal" ? "Duration" : "Budget"}</strong></div>
          </div>
          {planningModel === "intensive" && tasks.some((task) => taskBudget(task) <= 0) && <div className="weight-warning">Cost-loaded mode requires a budget for every activity. Zero-budget rows receive 0% weight.</div>}
          {tasks.some((task) => task.actualEnd && task.actualEnd > project.statusDate) && <div className="weight-warning">An actual finish is later than the status date. Review actual dates before issue.</div>}
        </section>

        <section className="schedule-panel">
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
                      {planningModel === "intensive" && <td className="cost-cell" data-label="Budget / earned"><div className="money-editor"><label><span>Budget</span><input type="number" min="0" step="1000" value={taskBudget(activity)} readOnly={pdfPreview} tabIndex={pdfPreview ? -1 : undefined} onChange={(event) => updateActivity(activity.id, "budget", Math.max(0, Number(event.target.value)))} aria-label={`Activity ${parentIndex}.${childIndex} task budget`} /></label><label><span>EV @ {displayShortDate(project.statusDate)}</span><input type="number" min="0" max={taskBudget(activity)} step="1000" value={earnedValueAt(activity.id, actualSnapshots, project.statusDate)} readOnly={pdfPreview} tabIndex={pdfPreview ? -1 : undefined} onChange={(event) => updateEarnedValue(activity, Number(event.target.value))} aria-label={`Activity ${parentIndex}.${childIndex} certified earned value`} /></label></div></td>}
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
          <span>{company.name || "Company name"} / Controlled schedule</span>
          <span>{project.code} / {project.revision}</span>
          <span>Issued {displayDate(project.issueDate)}</span>
        </footer>
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
