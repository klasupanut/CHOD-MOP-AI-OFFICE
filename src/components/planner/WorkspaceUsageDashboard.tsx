import type { CloudflareFreeMetric, CloudflareFreeTierTelemetry } from "@/lib/planner/cloudflare-telemetry";
import type { UsageLevel, WorkspaceUsageMetric, WorkspaceUsageSummary } from "@/lib/planner/usage-guard";

export type UsageLoadState = "loading" | "ready" | "local" | "error";
export type WorkspaceUsagePayload = WorkspaceUsageSummary & { cloudflare?: CloudflareFreeTierTelemetry };

type Props = {
  usageState: UsageLoadState;
  workspaceUsage: WorkspaceUsagePayload | null;
  combinedLevel: UsageLevel;
  combinedMessage: string;
  onRefresh: () => void;
};

const levelLabel: Record<UsageLevel, string> = {
  healthy: "Safe",
  notice: "70% notice",
  warning: "85% warning",
  critical: "95% critical",
  blocked: "Limit reached",
};

const workspaceMetricDetail: Record<WorkspaceUsageMetric["key"], string> = {
  projects: "Active project records",
  members: "Workspace member seats",
  storageBytes: "Active R2 file ledger",
};

const thresholdItems: Array<{ level: UsageLevel; range: string; detail: string }> = [
  { level: "healthy", range: "Below 70%", detail: "Operating normally" },
  { level: "notice", range: "70–84%", detail: "Plan cleanup" },
  { level: "warning", range: "85–94%", detail: "Review capacity" },
  { level: "critical", range: "95–99%", detail: "Almost full" },
  { level: "blocked", range: "100%", detail: "New writes paused" },
];

function formatBytes(bytes: number) {
  if (bytes >= 1_000_000_000) return `${(bytes / 1_000_000_000).toFixed(1)} GB`;
  if (bytes >= 1_000_000) return `${(bytes / 1_000_000).toFixed(1)} MB`;
  if (bytes >= 1_000) return `${(bytes / 1_000).toFixed(1)} KB`;
  return `${Math.max(0, Math.round(bytes))} B`;
}

function formatMetricValue(metric: Pick<CloudflareFreeMetric, "used" | "limit" | "unit">) {
  if (metric.unit === "count") return `${metric.used.toLocaleString("en-US")} / ${metric.limit.toLocaleString("en-US")}`;
  return `${formatBytes(metric.used)} / ${formatBytes(metric.limit)}`;
}

function periodLabel(period: CloudflareFreeMetric["period"]) {
  if (period === "daily") return "Today";
  if (period === "monthly") return "This month";
  return "Current";
}

function percentLabel(percent: number) {
  return `${percent.toFixed(percent > 0 && percent < 1 ? 1 : 0)}%`;
}

function StatusIcon({ level }: { level: UsageLevel }) {
  return <svg viewBox="0 0 24 24" aria-hidden="true">{level === "healthy" ? <path d="M20 6 9 17l-5-5" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" /> : <><path d="M12 4 21 20H3L12 4Z" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinejoin="round" /><path d="M12 9v5m0 3h.01" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" /></>}</svg>;
}

function UsageProgress({ label, percent, level }: { label: string; percent: number; level: UsageLevel }) {
  return <div className={`usage-page-progress level-${level}`} role="progressbar" aria-label={`${label} usage`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.min(100, Math.round(percent))}><i style={{ width: `${Math.min(100, Math.max(0, percent))}%` }} /></div>;
}

function WorkspaceMetricCard({ metric }: { metric: WorkspaceUsageMetric }) {
  return <article className={`usage-overview-item level-${metric.level}`}>
    <div className="usage-overview-index" aria-hidden="true">{metric.key === "projects" ? "01" : metric.key === "members" ? "02" : "03"}</div>
    <div className="usage-overview-copy">
      <span>{metric.label}</span>
      <strong>{formatMetricValue(metric)}</strong>
      <small>{workspaceMetricDetail[metric.key]}</small>
      <UsageProgress label={metric.label} percent={metric.percent} level={metric.level} />
      <div className="usage-overview-foot"><b>{percentLabel(metric.percent)} used</b><span>{metric.unit === "bytes" ? formatBytes(metric.remaining) : metric.remaining.toLocaleString("en-US")} remaining</span></div>
    </div>
  </article>;
}

function PlatformMetricRow({ metric }: { metric: CloudflareFreeMetric }) {
  return <article className={`usage-platform-row level-${metric.level}`}>
    <div className="usage-platform-heading"><div><h3>{metric.label}</h3><p>{periodLabel(metric.period)} measurement</p></div><span>{levelLabel[metric.level]}</span></div>
    <strong>{formatMetricValue(metric)}</strong>
    <UsageProgress label={`${metric.label} estimated`} percent={metric.percent} level={metric.level} />
    <div className="usage-platform-foot"><b>{percentLabel(metric.percent)} used</b><span>{periodLabel(metric.period)} · estimated</span></div>
  </article>;
}

function UsageConnectionState({ state }: { state: Exclude<UsageLoadState, "ready"> }) {
  const content = state === "loading"
    ? { title: "Loading workspace usage", message: "Reading D1, R2 and Cloudflare Analytics data." }
    : state === "local"
      ? { title: "Local draft mode", message: "Cloud quota monitoring activates after Cloudflare Access and D1 are connected." }
      : { title: "Usage unavailable", message: "The plan stays editable. Refresh after checking the Cloudflare connection." };
  return <section className={`usage-page-empty usage-page-empty-${state}`} role="status"><span className="usage-page-empty-mark" aria-hidden="true" /><div><h2>{content.title}</h2><p>{content.message}</p></div></section>;
}

export function WorkspaceUsageDashboard({ usageState, workspaceUsage, combinedLevel, combinedMessage, onRefresh }: Props) {
  if (usageState !== "ready" || !workspaceUsage) {
    return <div className="workspace-usage-page"><UsageConnectionState state={usageState === "ready" ? "error" : usageState} /><button type="button" className="button quiet usage-page-retry" onClick={onRefresh} disabled={usageState === "loading"}>Refresh usage</button></div>;
  }

  const cloudflareUsage = workspaceUsage.cloudflare;
  const updatedAt = new Date(workspaceUsage.measuredAt).toLocaleString([], { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

  return <div className="workspace-usage-page">
    <section className={`usage-page-health usage-${combinedLevel}`} aria-labelledby="usage-health-title">
      <div className="usage-health-main"><span className="usage-health-icon"><StatusIcon level={combinedLevel} /></span><div><h2 id="usage-health-title">{levelLabel[combinedLevel]}</h2><p>{combinedMessage}</p><small>{workspaceUsage.plan.label} workspace</small></div></div>
      <div className="usage-health-actions"><button type="button" className="button quiet usage-page-refresh" onClick={onRefresh}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 11a8 8 0 1 0-2.34 5.66M20 5v6h-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>Refresh usage</button><small>Last updated {updatedAt}</small></div>
    </section>

    <section className="usage-page-section" aria-labelledby="workspace-capacity-title">
      <header className="usage-page-section-heading"><div><h2 id="workspace-capacity-title">Workspace capacity</h2><p>Current tenant records and active file storage against the internal free plan.</p></div></header>
      <div className="usage-overview-grid">{workspaceUsage.metrics.map((metric) => <WorkspaceMetricCard metric={metric} key={metric.key} />)}</div>
      <p className={`usage-page-callout usage-${workspaceUsage.overallLevel}`} role={workspaceUsage.overallLevel === "critical" || workspaceUsage.overallLevel === "blocked" ? "alert" : "status"}>{workspaceUsage.message}</p>
    </section>

    <section className="usage-page-section" aria-labelledby="platform-limits-title">
      <header className="usage-page-section-heading"><div><h2 id="platform-limits-title">Cloudflare Free limits</h2><p>Detailed platform estimates for Workers, D1 and R2.</p></div>{cloudflareUsage?.state === "ready" ? <strong className={`usage-section-status level-${cloudflareUsage.overallLevel}`}>{levelLabel[cloudflareUsage.overallLevel]}</strong> : null}</header>
      {cloudflareUsage?.state === "ready" ? <><div className="usage-platform-grid">{cloudflareUsage.metrics.map((metric) => <PlatformMetricRow metric={metric} key={metric.key} />)}</div><p className={`usage-page-callout usage-${cloudflareUsage.overallLevel}`} role={cloudflareUsage.overallLevel === "critical" || cloudflareUsage.overallLevel === "blocked" ? "alert" : "status"}>{cloudflareUsage.message}</p></> : <div className="usage-page-inline-state" role="status"><strong>{cloudflareUsage?.state === "unavailable" ? "Analytics unavailable" : "Optional setup"}</strong><p>{cloudflareUsage?.message ?? "Add read-only Account Analytics credentials to display platform usage."}</p></div>}
    </section>

    <div className="usage-page-reference-grid">
      <section className="usage-page-section usage-thresholds" aria-labelledby="usage-thresholds-title">
        <header className="usage-page-section-heading"><div><h2 id="usage-thresholds-title">Usage thresholds</h2><p>The highest percentage across all metrics determines the overall status.</p></div></header>
        <div className="usage-threshold-list">{thresholdItems.map((item) => <div className={`level-${item.level}`} key={item.level}><strong>{levelLabel[item.level]}</strong><span>{item.range}</span><small>{item.detail}</small></div>)}</div>
      </section>
      <section className="usage-page-section usage-data-sources" aria-labelledby="usage-data-title">
        <header className="usage-page-section-heading"><div><h2 id="usage-data-title">Data sources</h2><p>How each usage figure is measured.</p></div></header>
        <ul><li><strong>D1 counts</strong><span>Projects, members, rows and database storage from the tenant account.</span></li><li><strong>R2 ledger</strong><span>Active file records and current object storage usage.</span></li><li><strong>Cloudflare Analytics</strong><span>Platform values are estimates and may lag behind the dashboard.</span></li></ul>
        {cloudflareUsage?.state === "ready" ? <small className="usage-page-disclaimer">{cloudflareUsage.disclaimer}</small> : null}
      </section>
    </div>
  </div>;
}

