"use client";

import { useMemo, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import { BarChart3, Building2, DatabaseZap, Hammer, LineChart, RefreshCw } from "lucide-react";
import type { FitoutAnnualRow, FitoutProjectRow, FitoutViewMode, FitoutWorkspaceData } from "@/lib/fitout/fitout-google-sheet";

const modes: Array<{ value: FitoutViewMode; label: string }> = [
  { value: "annual", label: "Annual performance summary" },
  { value: "mega", label: "Fit-out" },
  { value: "mini", label: "Restoration" },
];

const fitoutPalettes = {
  mini: {
    capex: "#35d8ff",
    revenue: "#20e3a2",
    profit: "#ffd166",
  },
  mega: {
    capex: "#7c3aed",
    revenue: "#00a8e8",
    profit: "#ff3d8b",
  },
} as const;

export function FitoutProjectWorkspace({ data }: { data: FitoutWorkspaceData }) {
  const [mode, setMode] = useState<FitoutViewMode>("annual");
  const activeRows = mode === "mega" ? data.megaRows : data.miniRows;
  const activeSummary = useMemo(() => summarizeRows(activeRows), [activeRows]);
  const maxRevenue = Math.max(...data.annualRows.map((row) => row.realizedRevenue), 1);

  return (
    <div className="workspace-page fitout-workspace">
      <section className="workspace-hero fitout-hero">
        <div>
          <span>FIT-OUT PROJECT MODULE</span>
          <h1>Fit-out Project Workspace</h1>
        </div>
        <div className={`fitout-source-card ${data.source.status}`}>
          <DatabaseZap size={22} />
          <div>
            <strong>{data.source.status === "live" ? "Google Sheet Live" : "Fallback Data"}</strong>
            <small>{data.source.status === "live" ? "RESTORATION / FIT-OUT synced" : data.source.message}</small>
          </div>
          <a href={data.source.sheetUrl} target="_blank" rel="noreferrer">Open source sheet</a>
        </div>
      </section>

      <section className="workspace-summary">
        <article><strong>{data.summary.totalJobs}</strong><span>Total Fit-out Jobs</span></article>
        <article><strong>{formatCurrency(data.summary.realizedRevenue)}</strong><span>Realized Revenue</span></article>
        <article><strong>{formatCurrency(data.summary.netOperatingProfit)}</strong><span>Net Operating Profit</span></article>
        <article><strong>{formatPercent(data.summary.profitMargin)}</strong><span>Profit Margin</span></article>
      </section>

      <section className="workspace-create-panel fitout-control-panel">
        <div>
          <span>WORKSPACE VIEW</span>
          <h2>Choose Fit-out display</h2>
          <p>Dropdown controls the module view without changing the source Google Sheet.</p>
        </div>
        <div className="fitout-select-wrap">
          <select value={mode} onChange={(event) => setMode(event.target.value as FitoutViewMode)}>
            {modes.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
          </select>
          <button type="button" onClick={() => window.location.reload()}><RefreshCw size={17} /> Refresh</button>
        </div>
      </section>

      {mode === "annual" ? (
        <AnnualPerformanceView rows={data.annualRows} maxRevenue={maxRevenue} />
      ) : (
        <FitoutRegisterView rows={activeRows} summary={activeSummary} mode={mode} />
      )}
    </div>
  );
}

function AnnualPerformanceView({ rows, maxRevenue }: { rows: FitoutAnnualRow[]; maxRevenue: number }) {
  const currentYear = new Date().getFullYear();
  const current = rows.find((row) => row.year === currentYear) || rows[0];
  const miniSegments = [
    { label: "CapEx", value: current?.miniActualCapex || 0, color: fitoutPalettes.mini.capex },
    { label: "Revenue", value: current?.miniRevenue || 0, color: fitoutPalettes.mini.revenue },
    { label: "Profit", value: current?.miniProfit || 0, color: fitoutPalettes.mini.profit },
  ];
  const megaSegments = [
    { label: "CapEx", value: current?.megaActualCapex || 0, color: fitoutPalettes.mega.capex },
    { label: "Revenue", value: current?.megaRevenue || 0, color: fitoutPalettes.mega.revenue },
    { label: "Profit", value: current?.megaProfit || 0, color: fitoutPalettes.mega.profit },
  ];

  return (
    <section className="workspace-grid">
      <div className="workspace-main-card">
        <div className="workspace-section-title">
          <div><span>ANNUAL PERFORMANCE</span><h2>Revenue / CapEx / Profit by year</h2></div>
          <small>Annual performance is calculated from RESTORATION and FIT-OUT tabs so the view stays stable even if the summary tab layout changes.</small>
        </div>
        <div className="fitout-donut-grid">
          <FinancialDonut title="Restoration mix" subtitle={`${current?.year || currentYear} financial donut`} segments={miniSegments} />
          <FinancialDonut title="Fit-out mix" subtitle={`${current?.year || currentYear} financial donut`} segments={megaSegments} />
        </div>
        <div className="fitout-annual-bars">
          {rows.map((row) => (
            <article key={row.year}>
              <div><strong>{row.year}</strong><span>{row.totalJobs} jobs</span></div>
              <div className="fitout-bar-stack" aria-label={`${row.year} revenue ${row.realizedRevenue}`}>
                <i className="revenue" style={{ width: `${Math.max(4, (row.realizedRevenue / maxRevenue) * 100)}%` }} />
                <i className="profit" style={{ width: `${Math.max(3, (row.netOperatingProfit / maxRevenue) * 100)}%` }} />
              </div>
              <em>{formatCurrency(row.realizedRevenue)}</em>
            </article>
          ))}
        </div>
        <div className="workspace-table-wrap annual-table">
          <table className="workspace-table">
            <thead>
              <tr>
                <th>Year</th><th>Total Jobs</th><th>Restoration</th><th>Fit-out</th><th>CapEx</th><th>Revenue</th><th>Profit</th><th>Margin</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.year}>
                  <td>{row.year}</td>
                  <td>{row.totalJobs}</td>
                  <td>{row.miniJobs}</td>
                  <td>{row.megaJobs}</td>
                  <td>{formatCurrency(row.actualCapex)}</td>
                  <td>{formatCurrency(row.realizedRevenue)}</td>
                  <td className="fitout-profit">{formatCurrency(row.netOperatingProfit)}</td>
                  <td>{formatPercent(row.profitMargin)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <aside className="workspace-detail-panel">
        <div className="detail-heading">
          <span>EXECUTIVE SNAPSHOT</span>
          <h2>{current?.year || currentYear}</h2>
          <p>Current-year summary from the same Google Sheet source used by the original operation dashboard.</p>
        </div>
        <div className="detail-stack">
          <Kpi label="Revenue" value={formatCurrency(current?.realizedRevenue || 0)} />
          <Kpi label="CapEx" value={formatCurrency(current?.actualCapex || 0)} />
          <Kpi label="Net Operating Profit" value={formatCurrency(current?.netOperatingProfit || 0)} />
          <Kpi label="Average Revenue / Job" value={formatCurrency(current?.averageRevenue || 0)} />
        </div>
      </aside>
    </section>
  );
}

function FitoutRegisterView({ rows, summary, mode }: { rows: FitoutProjectRow[]; summary: ReturnType<typeof summarizeRows>; mode: FitoutViewMode }) {
  const palette = mode === "mega" ? fitoutPalettes.mega : fitoutPalettes.mini;
  const segments = [
    { label: "CapEx", value: summary.capex, color: palette.capex },
    { label: "Revenue", value: summary.revenue, color: palette.revenue },
    { label: "Profit", value: summary.profit, color: palette.profit },
  ];

  return (
    <section className="workspace-grid">
      <div className="workspace-main-card">
        <div className="workspace-section-title">
          <div><span>{mode === "mega" ? "FIT-OUT" : "RESTORATION"}</span><h2>Workspace register</h2></div>
          <small>Display-only table from Google Sheet. No writeback. No Google API mutation.</small>
        </div>
        <div className="fitout-mini-metrics">
          <Kpi label="Jobs" value={String(summary.jobs)} icon={<Hammer size={18} />} />
          <Kpi label="Revenue" value={formatCurrency(summary.revenue)} icon={<LineChart size={18} />} />
          <Kpi label="CapEx" value={formatCurrency(summary.capex)} icon={<Building2 size={18} />} />
          <Kpi label="Profit" value={formatCurrency(summary.profit)} icon={<BarChart3 size={18} />} />
        </div>
        <div className="workspace-table-wrap">
          <table className="workspace-table">
            <thead>
              <tr>
                <th>Project</th><th>Unit</th><th>Start</th><th>Finish</th><th>CapEx</th><th>Revenue</th><th>Profit</th><th>Margin</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const margin = row.realizedRevenue ? row.netOperatingProfit / row.realizedRevenue : 0;
                return (
                  <tr key={row.id}>
                    <td><strong>{row.project}</strong><small>{row.type}</small></td>
                    <td>{row.unit}</td>
                    <td>{formatDate(row.startDate)}</td>
                    <td>{formatDate(row.finishDate)}</td>
                    <td>{formatCurrency(row.actualCapex)}</td>
                    <td>{formatCurrency(row.realizedRevenue)}</td>
                    <td className="fitout-profit">{formatCurrency(row.netOperatingProfit)}</td>
                    <td>{formatPercent(margin)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      <aside className="workspace-detail-panel">
        <div className="detail-heading">
          <span>PROJECT BREAKDOWN</span>
          <h2>{mode === "mega" ? "Fit-out" : "Restoration"}</h2>
        </div>
        <FinancialDonut title="Financial mix" subtitle="CapEx / Revenue / Profit" segments={segments} />
        <div className="fitout-project-breakdown">
          {Object.entries(groupRevenueByProject(rows)).map(([project, value]) => (
            <article key={project}>
              <strong>{project}</strong>
              <span>{formatCurrency(value)}</span>
            </article>
          ))}
        </div>
      </aside>
    </section>
  );
}

type DonutSegment = {
  label: string;
  value: number;
  color: string;
};

function FinancialDonut({ title, subtitle, segments }: { title: string; subtitle: string; segments: DonutSegment[] }) {
  const safeSegments = segments.map((segment) => ({ ...segment, value: Math.max(0, segment.value) }));
  const total = safeSegments.reduce((sum, segment) => sum + segment.value, 0);
  let cursor = 0;
  const conicStops = total > 0
    ? safeSegments.map((segment) => {
      const start = cursor;
      const end = cursor + (segment.value / total) * 100;
      cursor = end;
      return `${segment.color} ${start.toFixed(2)}% ${end.toFixed(2)}%`;
    }).join(", ")
    : "rgba(57, 208, 255, .2) 0% 100%";
  const style = { "--fitout-donut-gradient": `conic-gradient(${conicStops})` } as CSSProperties;

  return (
    <article className="fitout-donut-card">
      <div className="fitout-donut-copy">
        <span>{subtitle}</span>
        <strong>{title}</strong>
      </div>
      <div className="fitout-donut-row">
        <div className="fitout-donut" style={style} aria-label={`${title} ${formatCurrency(total)}`}>
          <div className="fitout-donut-core">
            <span>Total</span>
            <strong>{formatCurrency(total)}</strong>
          </div>
        </div>
        <ul className="fitout-donut-legend">
          {safeSegments.map((segment) => {
            const percent = total ? segment.value / total : 0;
            return (
              <li key={segment.label}>
                <i style={{ background: segment.color, boxShadow: `0 0 14px ${segment.color}88` }} />
                <span>{segment.label}</span>
                <strong>{formatCurrency(segment.value)}</strong>
                <em>{formatPercent(percent)}</em>
              </li>
            );
          })}
        </ul>
      </div>
    </article>
  );
}

function Kpi({ label, value, icon }: { label: string; value: string; icon?: ReactNode }) {
  return <article className="detail-kpi">{icon}<span>{label}</span><strong>{value}</strong></article>;
}

function summarizeRows(rows: FitoutProjectRow[]) {
  const capex = rows.reduce((sum, row) => sum + row.actualCapex, 0);
  const revenue = rows.reduce((sum, row) => sum + row.realizedRevenue, 0);
  const profit = rows.reduce((sum, row) => sum + row.netOperatingProfit, 0);
  return { jobs: rows.length, capex, revenue, profit };
}

function groupRevenueByProject(rows: FitoutProjectRow[]) {
  return rows.reduce<Record<string, number>>((result, row) => {
    result[row.project] = (result[row.project] || 0) + row.realizedRevenue;
    return result;
  }, {});
}

function formatCurrency(value: number) {
  if (Math.abs(value) >= 1_000_000) return `฿${(value / 1_000_000).toFixed(2)}M`;
  return `฿${Math.round(value).toLocaleString("en-US")}`;
}

function formatPercent(value: number) {
  return `${(value * 100).toFixed(1)}%`;
}

function formatDate(value: string) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}
