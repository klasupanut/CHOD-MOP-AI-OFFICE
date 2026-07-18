export const WORKSPACE_USAGE_THRESHOLDS = {
  notice: 70,
  warning: 85,
  critical: 95,
  blocked: 100,
} as const;

export const DEFAULT_INTERNAL_PLAN_LIMITS = {
  projects: 25,
  members: 10,
  storageBytes: 8_000_000_000,
} as const;

export type UsageLevel =
  | "healthy"
  | "notice"
  | "warning"
  | "critical"
  | "blocked";

export type UsageMetricKey = "projects" | "members" | "storageBytes";
export type CapacityAction =
  | "create_project"
  | "invite_member"
  | "upload_file";

export type WorkspaceUsageInput = Record<UsageMetricKey, number>;
export type WorkspacePlanLimits = Record<UsageMetricKey, number>;

export type WorkspaceUsageMetric = {
  key: UsageMetricKey;
  label: string;
  used: number;
  limit: number;
  remaining: number;
  percent: number;
  barPercent: number;
  level: UsageLevel;
  unit: "count" | "bytes";
};

export type WorkspaceUsageSummary = {
  plan: {
    code: string;
    label: string;
  };
  metrics: WorkspaceUsageMetric[];
  overallLevel: UsageLevel;
  highestPercent: number;
  message: string;
  blockedActions: CapacityAction[];
  measuredAt: string;
  source: "cloudflare-d1-r2-ledger";
};

const LEVEL_RANK: Record<UsageLevel, number> = {
  healthy: 0,
  notice: 1,
  warning: 2,
  critical: 3,
  blocked: 4,
};

const METRIC_DEFINITIONS: Record<
  UsageMetricKey,
  Pick<WorkspaceUsageMetric, "label" | "unit">
> = {
  projects: { label: "Projects", unit: "count" },
  members: { label: "Members", unit: "count" },
  storageBytes: { label: "File storage", unit: "bytes" },
};

const ACTION_METRIC: Record<CapacityAction, UsageMetricKey> = {
  create_project: "projects",
  invite_member: "members",
  upload_file: "storageBytes",
};

export class WorkspaceCapacityError extends Error {
  readonly status = 409;
  readonly action: CapacityAction;
  readonly metric: WorkspaceUsageMetric;

  constructor(action: CapacityAction, metric: WorkspaceUsageMetric) {
    super(
      `${metric.label} limit reached. Existing plans remain available for viewing and PDF export.`,
    );
    this.name = "WorkspaceCapacityError";
    this.action = action;
    this.metric = metric;
  }
}

export function usageLevelForPercent(percent: number): UsageLevel {
  if (percent >= WORKSPACE_USAGE_THRESHOLDS.blocked) return "blocked";
  if (percent >= WORKSPACE_USAGE_THRESHOLDS.critical) return "critical";
  if (percent >= WORKSPACE_USAGE_THRESHOLDS.warning) return "warning";
  if (percent >= WORKSPACE_USAGE_THRESHOLDS.notice) return "notice";
  return "healthy";
}

export function buildWorkspaceUsageSummary(
  usage: WorkspaceUsageInput,
  limits: WorkspacePlanLimits = DEFAULT_INTERNAL_PLAN_LIMITS,
  options: { planCode?: string; measuredAt?: string } = {},
): WorkspaceUsageSummary {
  const metrics = (Object.keys(METRIC_DEFINITIONS) as UsageMetricKey[]).map(
    (key) => buildMetric(key, usage[key], limits[key]),
  );
  const overallLevel = metrics.reduce<UsageLevel>(
    (highest, metric) =>
      LEVEL_RANK[metric.level] > LEVEL_RANK[highest]
        ? metric.level
        : highest,
    "healthy",
  );
  const highestPercent = Math.max(0, ...metrics.map((metric) => metric.percent));

  return {
    plan: {
      code: options.planCode ?? "internal_free",
      label: "Internal Free",
    },
    metrics,
    overallLevel,
    highestPercent,
    message: usageMessage(overallLevel),
    blockedActions: metrics
      .filter((metric) => metric.level === "blocked")
      .map((metric) => actionForMetric(metric.key)),
    measuredAt: options.measuredAt ?? new Date().toISOString(),
    source: "cloudflare-d1-r2-ledger",
  };
}

export function assertWorkspaceCapacity(
  summary: WorkspaceUsageSummary,
  action: CapacityAction,
  requestedAmount = 1,
): void {
  const metricKey = ACTION_METRIC[action];
  const metric = summary.metrics.find((candidate) => candidate.key === metricKey);
  if (!metric) throw new Error(`Missing usage metric: ${metricKey}`);

  const normalizedAmount = Math.max(0, Number(requestedAmount) || 0);
  if (metric.used + normalizedAmount > metric.limit) {
    throw new WorkspaceCapacityError(action, metric);
  }
}

function buildMetric(
  key: UsageMetricKey,
  rawUsed: number,
  rawLimit: number,
): WorkspaceUsageMetric {
  const used = Math.max(0, Number(rawUsed) || 0);
  const limit = Math.max(0, Number(rawLimit) || 0);
  const rawPercent = limit > 0 ? (used / limit) * 100 : 100;
  const percent = Math.round(rawPercent * 10) / 10;

  return {
    key,
    ...METRIC_DEFINITIONS[key],
    used,
    limit,
    remaining: Math.max(0, limit - used),
    percent,
    barPercent: Math.min(100, percent),
    level: usageLevelForPercent(percent),
  };
}

function actionForMetric(metric: UsageMetricKey): CapacityAction {
  if (metric === "projects") return "create_project";
  if (metric === "members") return "invite_member";
  return "upload_file";
}

function usageMessage(level: UsageLevel): string {
  if (level === "blocked") {
    return "A workspace limit is full. New items for that limit are paused; viewing and PDF export remain available.";
  }
  if (level === "critical") {
    return "A workspace limit has reached 95%. Free capacity is almost full.";
  }
  if (level === "warning") {
    return "A workspace limit has reached 85%. Review usage before adding more data.";
  }
  if (level === "notice") {
    return "A workspace limit has reached 70%. Plan cleanup before capacity gets tight.";
  }
  return "Workspace usage is within the safe range.";
}
