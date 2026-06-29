"use client";

import { AlertTriangle, CheckCircle2, ExternalLink, Info, ServerCog, ShieldCheck, Wrench } from "lucide-react";
import type { SettingsSystemStatus } from "@/lib/settings/runtime-status";

function formatCheckedAt(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString("en-GB", {
    timeZone: "Asia/Bangkok",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function CheckRow({ item }: { item: { label: string; ok: boolean; detail: string } }) {
  return (
    <article className={item.ok ? "ok" : "warn"}>
      {item.ok ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
      <div>
        <strong>{item.label}</strong>
        <span>{item.detail}</span>
      </div>
    </article>
  );
}

export function SystemSettingsPanel({ status }: { status: SettingsSystemStatus }) {
  return (
    <section className="settings-panel settings-info-panel">
      <header className="settings-info-header">
        <div>
          <span>RUNTIME & DEPLOYMENT</span>
          <h2>System</h2>
          <p>Health, auth readiness, deployment checklist and maintenance guidance for official rollout.</p>
        </div>
        <div className="settings-info-stamp">
          <ServerCog size={20} />
          Checked {formatCheckedAt(status.checkedAt)} ICT
        </div>
      </header>

      <div className="settings-status-card-grid">
        {status.runtimeCards.map((card) => (
          <article className={`settings-status-card ${card.tone}`} key={card.label}>
            <ServerCog size={22} />
            <span>{card.label}</span>
            <strong>{card.value}</strong>
            <small>{card.detail}</small>
          </article>
        ))}
      </div>

      <div className="system-health-links">
        {status.healthLinks.map((link) => (
          <a href={link.href} target="_blank" rel="noreferrer" key={link.href}>
            <ExternalLink size={17} />
            <span>
              <strong>{link.label}</strong>
              <small>{link.detail}</small>
            </span>
          </a>
        ))}
      </div>

      <div className="system-readiness-grid">
        <section>
          <h3><ShieldCheck size={18} /> Auth readiness</h3>
          <div>{status.authReadiness.map((item) => <CheckRow item={item} key={item.label} />)}</div>
        </section>
        <section>
          <h3><Info size={18} /> Deployment readiness</h3>
          <div>{status.deploymentReadiness.map((item) => <CheckRow item={item} key={item.label} />)}</div>
        </section>
      </div>

      <aside className="system-maintenance-panel">
        <h3><Wrench size={18} /> Maintenance playbook</h3>
        <div>
          {status.maintenance.map((item) => (
            <article key={item.title}>
              <strong>{item.title}</strong>
              <span>{item.detail}</span>
            </article>
          ))}
        </div>
      </aside>
    </section>
  );
}
