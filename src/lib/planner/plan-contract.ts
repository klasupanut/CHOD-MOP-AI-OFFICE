export type CalendarMode = "calendar" | "working";
export type PlanningModel = "normal" | "intensive";
export type CurveView = "compare" | "plan" | "actual";
export type PdfOrientation = "landscape" | "portrait";
export type EarningMethod = "certified" | "zero-hundred" | "fifty-fifty" | "level-of-effort";

export type ProjectMeta = {
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

export type CompanyProfile = {
  name: string;
  location: string;
  logoDataUrl: string;
};

export type TenantCompanyProfileRecord = {
  company: CompanyProfile;
  updatedAt: string;
};

export type TenantCompanyLogoRecord = {
  logoDataUrl: string;
  updatedAt: string;
};

export type Activity = {
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
  earningMethod?: EarningMethod;
};

export type ActualSnapshot = {
  id: string;
  activityId: string;
  date: string;
  earnedValue: number;
};

export type SavedPlan = {
  project: ProjectMeta;
  company?: CompanyProfile;
  activities: Activity[];
  actualSnapshots?: ActualSnapshot[];
  calendarMode: CalendarMode;
  planningModel?: PlanningModel;
  curveView?: CurveView;
  showCurve: boolean;
  includeCurvePdf: boolean;
  showStatusDate?: boolean;
  pdfOrientation?: PdfOrientation;
};

export type TenantPlanRecord = {
  projectId: string | null;
  savedAt: string | null;
  data: SavedPlan | null;
};

export type TenantProjectSummary = {
  id: string;
  name: string;
  client: string;
  location: string;
  status: "draft" | "active" | "archived";
  activityCount: number;
  baselineDate: string;
  statusDate: string;
  updatedAt: string;
};

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const MAX_ACTIVITIES = 2_000;
const MAX_SNAPSHOTS = 10_000;

export function sanitizeSavedPlan(value: unknown): SavedPlan | null {
  if (!isRecord(value) || !isRecord(value.project)) return null;
  if (!Array.isArray(value.activities) || value.activities.length > MAX_ACTIVITIES) return null;

  const project = sanitizeProject(value.project);
  const activities = value.activities.map(sanitizeActivity);
  if (!project || activities.some((activity) => !activity)) return null;

  const validActivities = activities as Activity[];
  const activityIds = new Set(validActivities.map((activity) => activity.id));
  if (activityIds.size !== validActivities.length) return null;

  const rawSnapshots = value.actualSnapshots ?? [];
  if (!Array.isArray(rawSnapshots) || rawSnapshots.length > MAX_SNAPSHOTS) return null;
  const snapshots = rawSnapshots.map((snapshot) => sanitizeSnapshot(snapshot, activityIds));
  if (snapshots.some((snapshot) => !snapshot)) return null;

  const calendarMode = value.calendarMode === "working" ? "working" : "calendar";
  const planningModel = value.planningModel === "intensive" ? "intensive" : "normal";
  const curveView = value.curveView === "plan" || value.curveView === "actual" ? value.curveView : "compare";

  return {
    project,
    company: sanitizeCompanyProfile(value.company) ?? undefined,
    activities: validActivities,
    actualSnapshots: snapshots as ActualSnapshot[],
    calendarMode,
    planningModel,
    curveView,
    showCurve: value.showCurve !== false,
    includeCurvePdf: value.includeCurvePdf !== false,
    showStatusDate: value.showStatusDate !== false,
    pdfOrientation: value.pdfOrientation === "portrait" ? "portrait" : "landscape",
  };
}

function sanitizeProject(value: Record<string, unknown>): ProjectMeta | null {
  const baselineDate = date(value.baselineDate);
  const statusDate = date(value.statusDate);
  const issueDate = date(value.issueDate);
  if (!baselineDate || !statusDate || !issueDate) return null;

  return {
    name: text(value.name, 180),
    code: text(value.code, 80),
    client: text(value.client, 180),
    location: text(value.location, 240),
    projectManager: text(value.projectManager, 160),
    contractNo: text(value.contractNo, 100),
    baselineDate,
    statusDate,
    issueDate,
    revision: text(value.revision, 80) || "Rev 00",
    preparedBy: text(value.preparedBy, 160),
    approvedBy: text(value.approvedBy, 160),
  };
}

export function sanitizeCompanyProfile(value: unknown): CompanyProfile | null {
  if (!isRecord(value)) return null;
  return {
    name: text(value.name, 180),
    location: text(value.location, 240),
    // Binary company assets stay out of D1. R2 owns the persisted logo object.
    logoDataUrl: "",
  };
}

function sanitizeActivity(value: unknown): Activity | null {
  if (!isRecord(value)) return null;
  const id = text(value.id, 160);
  const start = date(value.start);
  const kind = value.kind === "group" || value.kind === "task" ? value.kind : null;
  if (!id || !start || !kind) return null;

  return {
    id,
    parentId: typeof value.parentId === "string" ? text(value.parentId, 160) || null : null,
    kind,
    description: text(value.description, 500),
    start,
    duration: integer(value.duration, 1, 36_500),
    progress: number(value.progress, 0, 100),
    weight: number(value.weight, 0, 100),
    owner: text(value.owner, 160),
    dependency: text(value.dependency, 200) || "-",
    actualStart: optionalDate(value.actualStart),
    actualEnd: optionalDate(value.actualEnd),
    budget: number(value.budget, 0, 1_000_000_000_000),
    earningMethod: value.earningMethod === "zero-hundred" || value.earningMethod === "fifty-fifty" || value.earningMethod === "level-of-effort"
      ? value.earningMethod
      : "certified",
  };
}

function sanitizeSnapshot(value: unknown, activityIds: Set<string>): ActualSnapshot | null {
  if (!isRecord(value)) return null;
  const id = text(value.id, 180);
  const activityId = text(value.activityId, 160);
  const snapshotDate = date(value.date);
  if (!id || !activityId || !activityIds.has(activityId) || !snapshotDate) return null;
  return {
    id,
    activityId,
    date: snapshotDate,
    earnedValue: number(value.earnedValue, 0, 1_000_000_000_000),
  };
}

function text(value: unknown, maxLength: number): string {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function date(value: unknown): string | null {
  return typeof value === "string" && ISO_DATE.test(value) ? value : null;
}

function optionalDate(value: unknown): string {
  return value === "" || value == null ? "" : date(value) ?? "";
}

function number(value: unknown, min: number, max: number): number {
  return Math.min(max, Math.max(min, Number(value) || 0));
}

function integer(value: unknown, min: number, max: number): number {
  return Math.round(number(value, min, max));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

