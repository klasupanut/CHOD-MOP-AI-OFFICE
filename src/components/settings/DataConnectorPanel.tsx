"use client";

import { AlertTriangle, CheckCircle2, DatabaseZap, ExternalLink, FlaskConical, LockKeyhole, PauseCircle, PlugZap } from "lucide-react";
import type { SettingsDataConnectorStatus, SettingsConnectorItem } from "@/lib/settings/data-connectors";

const statusCopy: Record<SettingsConnectorItem["status"], { label: string; className: string }> = {
  connected: { label: "Connected", className: "connected" },
  degraded: { label: "Degraded", className: "degraded" },
  "not-configured": { label: "Not configured", className: "not-configured" },
  disabled: { label: "Disabled", className: "disabled" },
  "future-ready": { label: "Future ready", className: "future-ready" },
};

function ConnectorIcon({ status }: { status: SettingsConnectorItem["status"] }) {
  if (status === "connected") return <CheckCircle2 size={22} />;
  if (status === "degraded") return <AlertTriangle size={22} />;
  if (status === "disabled") return <PauseCircle size={22} />;
  if (status === "future-ready") return <FlaskConical size={22} />;
  return <PlugZap size={22} />;
}

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

export function DataConnectorPanel({ status }: { status: SettingsDataConnectorStatus }) {
  return (
    <section className="settings-panel data-connector-panel">
      <header className="data-connector-header">
        <div>
          <span>LIVE DATA CONTROL</span>
          <h2>Data Connector</h2>
          <p>Official connector status for live Google Sheets, Apps Script, auth and future deployment sources.</p>
        </div>
        <a href="/api/health?deep=1" target="_blank" rel="noreferrer">
          <DatabaseZap size={18} />
          Open deep health
        </a>
      </header>

      <div className="data-connector-summary">
        <article><strong>{status.summary.connected}</strong><span>Connected</span></article>
        <article><strong>{status.summary.degraded}</strong><span>Degraded</span></article>
        <article><strong>{status.summary.notConfigured}</strong><span>Not configured</span></article>
        <article><strong>{status.summary.futureReady}</strong><span>Future ready</span></article>
        <article><strong>{status.summary.disabled}</strong><span>Disabled</span></article>
      </div>

      <div className="data-connector-grid">
        {status.connectors.map((connector) => {
          const statusMeta = statusCopy[connector.status];
          return (
            <article className={`data-connector-card ${statusMeta.className}`} key={connector.id}>
              <header>
                <ConnectorIcon status={connector.status} />
                <div>
                  <small>{connector.category}</small>
                  <strong>{connector.name}</strong>
                </div>
                <em>{statusMeta.label}</em>
              </header>
              <p>{connector.description}</p>
              <dl>
                <div><dt>Source</dt><dd>{connector.source}</dd></div>
                <div><dt>Tabs / Actions</dt><dd>{connector.tabs.length ? connector.tabs.join(" · ") : "-"}</dd></div>
                <div><dt>Env</dt><dd>{connector.envKeys.length ? connector.envKeys.join(" · ") : "No env required yet"}</dd></div>
                <div><dt>Status note</dt><dd>{connector.message}</dd></div>
              </dl>
              <footer>
                {connector.openUrl ? (
                  <a href={connector.openUrl} target="_blank" rel="noreferrer">
                    <ExternalLink size={15} />
                    Open source
                  </a>
                ) : <span><LockKeyhole size={15} /> No public source</span>}
                {connector.testUrl ? <a href={connector.testUrl}>Test / View</a> : null}
              </footer>
            </article>
          );
        })}
      </div>

      <aside className="data-connector-safety">
        <strong>Safety / cost control</strong>
        <ul>
          {status.safetyNotes.map((note) => <li key={note}>{note}</li>)}
        </ul>
        <small>Last checked: {formatCheckedAt(status.checkedAt)} ICT</small>
      </aside>
    </section>
  );
}
