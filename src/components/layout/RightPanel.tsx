import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  CheckCircle2,
  ClipboardCheck,
  ClipboardPlus,
  FilePlus2,
  Hammer,
  Plus,
  Send,
  SunMedium,
  Wrench,
} from "lucide-react";
import type { OfficePanelData } from "@/lib/office/office-panel-data";

const actions: Array<{ label: string; href: string; icon: LucideIcon }> = [
  { label: "Create New Task", href: "/tasks", icon: Plus },
  { label: "Create Work Order", href: "/tasks", icon: ClipboardPlus },
  { label: "New Quotation", href: "/quotations", icon: FilePlus2 },
  { label: "New Fit-out Job", href: "/projects", icon: Hammer },
  { label: "Request Approval", href: "/approvals", icon: Send },
];

export function RightPanel({ data }: { data: OfficePanelData }) {
  return (
    <aside className="right-panel">
      <div className="right-panel-heading">
        <div><span>LIVE OVERVIEW</span><h2>SUMMARY</h2></div>
        <CheckCircle2 size={22} />
      </div>

      <div className="metric-grid">
        {data.metrics.map((metric) => (
          <article className={`metric metric-${metric.tone}`} key={metric.label}>
            <span>{metric.label}</span>
            <strong>{String(metric.value).padStart(2, "0")}</strong>
          </article>
        ))}
      </div>

      <section className="rail-section">
        <div className="rail-title"><h3>Activity Feed</h3><span>LIVE</span></div>
        <div className="activity-list">
          {data.activities.length ? data.activities.map((item) => (
            <article key={item.id}>
              <i className={`activity-dot dot-${item.tone}`} />
              <div><p>{item.message}</p><time>{item.time}</time></div>
            </article>
          )) : (
            <article>
              <i className="activity-dot dot-info" />
              <div><p>No live activity yet</p><time>Waiting for Tasks / Projects / Approvals update</time></div>
            </article>
          )}
        </div>
      </section>

      <section className="rail-section quick-actions">
        <div className="rail-title"><h3>Quick Actions</h3><Wrench size={20} /></div>
        <div className="action-grid">
          {actions.map(({ label, href, icon: Icon }) => (
            <Link key={label} href={href}>
              <Icon size={21} /><span>{label}</span>
            </Link>
          ))}
        </div>
      </section>

      <div className="solar-strip">
        <SunMedium size={20} />
        <div><strong>{data.solarStatus.title}</strong><span>{data.solarStatus.detail}</span></div>
      </div>
    </aside>
  );
}
