export const TENANT_STATE_VERSION = 4;

export type TenantReference = {
  id: string;
  slug: string;
  name: string;
};

export type TenantPlanEnvelope<T> = {
  schemaVersion: typeof TENANT_STATE_VERSION;
  organization: TenantReference;
  projectId: string;
  savedAt: string;
  data: T;
};

export const CHOD_ORGANIZATION: TenantReference = {
  id: "org-chod-mop-office",
  slug: "chod-mop-office",
  name: "CHOD MOP OFFICE",
};

export const DEFAULT_LOCAL_PROJECT_ID = "project-local-primary";

export function tenantStorageKey(
  organizationId: string,
  projectId: string,
): string {
  return `timeline-plan-creator-v${TENANT_STATE_VERSION}:${safeSegment(organizationId)}:${safeSegment(projectId)}`;
}

export function createTenantPlanEnvelope<T>(
  organization: TenantReference,
  projectId: string,
  data: T,
): TenantPlanEnvelope<T> {
  return {
    schemaVersion: TENANT_STATE_VERSION,
    organization,
    projectId,
    savedAt: new Date().toISOString(),
    data,
  };
}

export function isTenantPlanEnvelope<T>(
  value: unknown,
): value is TenantPlanEnvelope<T> {
  if (!value || typeof value !== "object") return false;

  const candidate = value as Partial<TenantPlanEnvelope<T>>;
  return (
    candidate.schemaVersion === TENANT_STATE_VERSION &&
    typeof candidate.projectId === "string" &&
    Boolean(candidate.organization) &&
    typeof candidate.organization?.id === "string" &&
    typeof candidate.organization?.slug === "string" &&
    typeof candidate.organization?.name === "string" &&
    "data" in candidate
  );
}

export function tenantObjectKey(
  organizationId: string,
  projectId: string | null,
  category: string,
  fileName: string,
): string {
  const projectScope = projectId
    ? `projects/${safeSegment(projectId)}`
    : "company";
  return `organizations/${safeSegment(organizationId)}/${projectScope}/${safeSegment(category)}/${safeFileName(fileName)}`;
}

function safeSegment(value: string): string {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);

  if (!normalized) throw new Error("Tenant storage segments cannot be empty.");
  return normalized;
}

function safeFileName(value: string): string {
  const leaf = value.trim().split(/[\\/]/).pop() || "file";
  const normalized = leaf
    .normalize("NFKC")
    .replace(/[^\p{L}\p{N}._-]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 160);

  return normalized || "file";
}
