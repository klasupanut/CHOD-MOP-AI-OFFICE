import {
  usageLevelForPercent,
  type UsageLevel,
} from "./usage-guard";

const CLOUDFLARE_GRAPHQL_ENDPOINT =
  "https://api.cloudflare.com/client/v4/graphql";

export const CLOUDFLARE_FREE_LIMITS = {
  workersRequestsPerDay: 100_000,
  d1RowsReadPerDay: 5_000_000,
  d1RowsWrittenPerDay: 100_000,
  d1DatabaseStorageBytes: 500_000_000,
  d1AccountStorageBytes: 5_000_000_000,
  r2StorageBytes: 10_000_000_000,
  r2ClassAOperationsPerMonth: 1_000_000,
  r2ClassBOperationsPerMonth: 10_000_000,
} as const;

export type CloudflareTelemetryState =
  | "ready"
  | "not_configured"
  | "unavailable";

export type CloudflareFreeMetric = {
  key: keyof typeof CLOUDFLARE_FREE_LIMITS;
  label: string;
  used: number;
  limit: number;
  percent: number;
  barPercent: number;
  level: UsageLevel;
  unit: "count" | "bytes";
  period: "daily" | "monthly" | "current";
  estimated: true;
};

export type CloudflareFreeTierTelemetry = {
  state: CloudflareTelemetryState;
  metrics: CloudflareFreeMetric[];
  overallLevel: UsageLevel;
  message: string;
  measuredAt: string;
  partial: boolean;
  disclaimer: string;
};

type CloudflareTelemetryConfig = {
  accountId?: string;
  apiToken?: string;
};

type AnalyticsGroup = {
  sum?: Record<string, number | string | null | undefined>;
  max?: Record<string, number | string | null | undefined>;
  dimensions?: Record<string, string | null | undefined>;
};

export type CloudflareAnalyticsResponse = {
  data?: {
    viewer?: {
      accounts?: Array<{
        workers?: AnalyticsGroup[];
        d1Daily?: AnalyticsGroup[];
        d1Storage?: AnalyticsGroup[];
        r2Operations?: AnalyticsGroup[];
        r2Storage?: AnalyticsGroup[];
      }>;
    };
  };
  errors?: Array<{ message?: string }> | null;
};

const CLASS_A_ACTIONS = new Set(
  [
    "ListBuckets",
    "PutBucket",
    "ListObjects",
    "PutObject",
    "CopyObject",
    "CompleteMultipartUpload",
    "CreateMultipartUpload",
    "LifecycleStorageTierTransition",
    "ListMultipartUploads",
    "UploadPart",
    "UploadPartCopy",
    "ListParts",
    "PutBucketEncryption",
    "PutBucketCors",
    "PutBucketLifecycleConfiguration",
  ].map(normalizeAction),
);

const CLASS_B_ACTIONS = new Set(
  [
    "HeadBucket",
    "HeadObject",
    "GetObject",
    "UsageSummary",
    "GetBucketEncryption",
    "GetBucketLocation",
    "GetBucketCors",
    "GetBucketLifecycleConfiguration",
  ].map(normalizeAction),
);

const FREE_TIER_QUERY = `
  query TimelinePlanFreeTierUsage(
    $accountTag: string!
    $day: Date!
    $recentStart: Date!
    $dayStart: Time!
    $monthStart: Time!
    $now: Time!
  ) {
    viewer {
      accounts(filter: { accountTag: $accountTag }) {
        workers: workersInvocationsAdaptive(
          limit: 10000
          filter: { datetime_geq: $dayStart, datetime_leq: $now }
        ) {
          sum { requests }
        }
        d1Daily: d1AnalyticsAdaptiveGroups(
          limit: 10000
          filter: { date_geq: $day, date_leq: $day }
        ) {
          sum { rowsRead rowsWritten }
        }
        d1Storage: d1StorageAdaptiveGroups(
          limit: 10000
          filter: { date_geq: $recentStart, date_leq: $day }
          orderBy: [date_DESC]
        ) {
          max { databaseSizeBytes }
          dimensions { databaseId date }
        }
        r2Operations: r2OperationsAdaptiveGroups(
          limit: 10000
          filter: { datetime_geq: $monthStart, datetime_leq: $now }
        ) {
          sum { requests }
          dimensions { actionType }
        }
        r2Storage: r2StorageAdaptiveGroups(
          limit: 10000
          filter: { datetime_geq: $dayStart, datetime_leq: $now }
          orderBy: [datetime_DESC]
        ) {
          max { payloadSize metadataSize }
          dimensions { bucketName datetime }
        }
      }
    }
  }
`;

export async function loadCloudflareFreeTierTelemetry(
  config: CloudflareTelemetryConfig,
  fetcher: typeof fetch = fetch,
  now = new Date(),
): Promise<CloudflareFreeTierTelemetry> {
  if (!config.accountId?.trim() || !config.apiToken?.trim()) {
    return telemetryState(
      "not_configured",
      "Add an Account Analytics Read token to monitor Cloudflare Free limits.",
      now,
    );
  }

  const day = now.toISOString().slice(0, 10);
  const recent = new Date(now);
  recent.setUTCDate(recent.getUTCDate() - 2);
  const monthStart = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1),
  );

  try {
    const response = await fetcher(CLOUDFLARE_GRAPHQL_ENDPOINT, {
      method: "POST",
      headers: {
        authorization: `Bearer ${config.apiToken.trim()}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        query: FREE_TIER_QUERY,
        variables: {
          accountTag: config.accountId.trim(),
          day,
          recentStart: recent.toISOString().slice(0, 10),
          dayStart: `${day}T00:00:00.000Z`,
          monthStart: monthStart.toISOString(),
          now: now.toISOString(),
        },
      }),
    });

    if (!response.ok) {
      return telemetryState(
        "unavailable",
        "Cloudflare analytics could not be loaded. Workspace limits remain active.",
        now,
      );
    }

    const payload = (await response.json()) as CloudflareAnalyticsResponse;
    return summarizeCloudflareAnalytics(payload, now);
  } catch {
    return telemetryState(
      "unavailable",
      "Cloudflare analytics could not be loaded. Workspace limits remain active.",
      now,
    );
  }
}

export function summarizeCloudflareAnalytics(
  payload: CloudflareAnalyticsResponse,
  now = new Date(),
): CloudflareFreeTierTelemetry {
  const account = payload.data?.viewer?.accounts?.[0];
  if (!account) {
    return telemetryState(
      "unavailable",
      "Cloudflare analytics returned no account data. Check the token scope.",
      now,
    );
  }

  const metrics: CloudflareFreeMetric[] = [];

  if (Array.isArray(account.workers)) {
    metrics.push(
      metric(
        "workersRequestsPerDay",
        "Workers requests",
        sumGroups(account.workers, "sum", "requests"),
        "count",
        "daily",
      ),
    );
  }

  if (Array.isArray(account.d1Daily)) {
    metrics.push(
      metric(
        "d1RowsReadPerDay",
        "D1 rows read",
        sumGroups(account.d1Daily, "sum", "rowsRead"),
        "count",
        "daily",
      ),
      metric(
        "d1RowsWrittenPerDay",
        "D1 rows written",
        sumGroups(account.d1Daily, "sum", "rowsWritten"),
        "count",
        "daily",
      ),
    );
  }

  if (Array.isArray(account.d1Storage)) {
    const databaseSizes = latestEntitySizes(
      account.d1Storage,
      "databaseId",
      (group) => numeric(group.max?.databaseSizeBytes),
    );
    const sizes = [...databaseSizes.values()];
    metrics.push(
      metric(
        "d1DatabaseStorageBytes",
        "Largest D1 database",
        Math.max(0, ...sizes),
        "bytes",
        "current",
      ),
      metric(
        "d1AccountStorageBytes",
        "D1 account storage",
        sizes.reduce((sum, value) => sum + value, 0),
        "bytes",
        "current",
      ),
    );
  }

  if (Array.isArray(account.r2Storage)) {
    const bucketSizes = latestEntitySizes(
      account.r2Storage,
      "bucketName",
      (group) =>
        numeric(group.max?.payloadSize) + numeric(group.max?.metadataSize),
    );
    metrics.push(
      metric(
        "r2StorageBytes",
        "R2 current storage",
        [...bucketSizes.values()].reduce((sum, value) => sum + value, 0),
        "bytes",
        "current",
      ),
    );
  }

  if (Array.isArray(account.r2Operations)) {
    const operations = classifyR2Operations(account.r2Operations);
    metrics.push(
      metric(
        "r2ClassAOperationsPerMonth",
        "R2 Class A operations",
        operations.classA,
        "count",
        "monthly",
      ),
      metric(
        "r2ClassBOperationsPerMonth",
        "R2 Class B operations",
        operations.classB,
        "count",
        "monthly",
      ),
    );
  }

  if (metrics.length === 0) {
    return telemetryState(
      "unavailable",
      "Cloudflare analytics datasets are unavailable for this account.",
      now,
    );
  }

  const overallLevel = highestLevel(metrics.map((item) => item.level));
  const partial = Boolean(payload.errors?.length);
  return {
    state: "ready",
    metrics,
    overallLevel,
    message: telemetryMessage(overallLevel, partial),
    measuredAt: now.toISOString(),
    partial,
    disclaimer:
      "Analytics values are estimates and may lag. The Cloudflare dashboard remains authoritative for billing and hard platform limits.",
  };
}

function classifyR2Operations(groups: AnalyticsGroup[]) {
  return groups.reduce(
    (totals, group) => {
      const action = normalizeAction(group.dimensions?.actionType ?? "");
      const requests = numeric(group.sum?.requests);
      if (CLASS_A_ACTIONS.has(action)) totals.classA += requests;
      if (CLASS_B_ACTIONS.has(action)) totals.classB += requests;
      return totals;
    },
    { classA: 0, classB: 0 },
  );
}

function latestEntitySizes(
  groups: AnalyticsGroup[],
  dimension: string,
  sizeOf: (group: AnalyticsGroup) => number,
) {
  const sizes = new Map<string, number>();
  groups.forEach((group, index) => {
    const key = group.dimensions?.[dimension] || `unknown-${index}`;
    if (!sizes.has(key)) sizes.set(key, Math.max(0, sizeOf(group)));
  });
  return sizes;
}

function sumGroups(
  groups: AnalyticsGroup[],
  aggregate: "sum" | "max",
  field: string,
) {
  return groups.reduce(
    (total, group) => total + numeric(group[aggregate]?.[field]),
    0,
  );
}

function metric(
  key: keyof typeof CLOUDFLARE_FREE_LIMITS,
  label: string,
  used: number,
  unit: CloudflareFreeMetric["unit"],
  period: CloudflareFreeMetric["period"],
): CloudflareFreeMetric {
  const limit = CLOUDFLARE_FREE_LIMITS[key];
  const percent = Math.round((Math.max(0, used) / limit) * 1000) / 10;
  return {
    key,
    label,
    used: Math.max(0, used),
    limit,
    percent,
    barPercent: Math.min(100, percent),
    level: usageLevelForPercent(percent),
    unit,
    period,
    estimated: true,
  };
}

function telemetryState(
  state: Exclude<CloudflareTelemetryState, "ready">,
  message: string,
  now: Date,
): CloudflareFreeTierTelemetry {
  return {
    state,
    metrics: [],
    overallLevel: "healthy",
    message,
    measuredAt: now.toISOString(),
    partial: false,
    disclaimer:
      "Cloudflare platform telemetry is separate from tenant workspace quotas.",
  };
}

function telemetryMessage(level: UsageLevel, partial: boolean) {
  const suffix = partial ? " Some analytics datasets are unavailable." : "";
  if (level === "blocked") {
    return `A Cloudflare Free limit is at capacity. Platform requests may fail.${suffix}`;
  }
  if (level === "critical") {
    return `A Cloudflare Free limit has reached 95%. Take action before service is interrupted.${suffix}`;
  }
  if (level === "warning") {
    return `A Cloudflare Free limit has reached 85%. Review platform usage soon.${suffix}`;
  }
  if (level === "notice") {
    return `A Cloudflare Free limit has reached 70%. Monitor platform usage closely.${suffix}`;
  }
  return `Cloudflare Free usage is below 70%.${suffix}`;
}

function highestLevel(levels: UsageLevel[]) {
  const order: UsageLevel[] = [
    "healthy",
    "notice",
    "warning",
    "critical",
    "blocked",
  ];
  return levels.reduce<UsageLevel>(
    (highest, level) =>
      order.indexOf(level) > order.indexOf(highest) ? level : highest,
    "healthy",
  );
}

function numeric(value: number | string | null | undefined) {
  return Math.max(0, Number(value) || 0);
}

function normalizeAction(value: string) {
  return value.replace(/[^a-z0-9]/gi, "").toLowerCase();
}
