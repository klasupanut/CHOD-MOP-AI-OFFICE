import {
  AlertTriangle,
  BarChart3,
  CalendarClock,
  CheckCircle2,
  CircleDollarSign,
  ClipboardCheck,
  Gauge,
  LayoutDashboard,
  ListChecks,
  ShieldAlert,
  SunMedium,
} from "lucide-react";
import type { ReactNode } from "react";
import type { LiveDashboardData } from "@/lib/dashboard/live-dashboard-data";

const metricIcons = [CircleDollarSign, ClipboardCheck, Gauge, AlertTriangle, SunMedium, CheckCircle2];

function money(value: number) {
  return new Intl.NumberFormat("th-TH", { style: "currency", currency: "THB", maximumFractionDigits: 0 }).format(value);
}

export function DashboardWorkspace({ data }: { data: LiveDashboardData }) {
  const {
    executiveKPIs,
    projectStatus,
    taskOverview,
    budget,
    fitout,
    pmLoop,
    solar,
    quotation,
    annualDivisionRevenue,
    alerts,
    activity,
    deadlines,
  } = data;
  const maxProjectStatus = Math.max(...projectStatus.map((item) => item.value), 1);
  const maxDivisionValue = Math.max(
    ...annualDivisionRevenue.divisions.flatMap((division) => [division.revenue, division.profit]),
    1,
  );

  return (
    <div className="workspace-page dashboard-workspace">
      <div className="workspace-hero dashboard-hero">
        <div>
          <span>EXECUTIVE CONTROL TOWER</span>
          <h1>Dashboard</h1>
        </div>
      </div>

      <section className="dashboard-metric-grid">
        {executiveKPIs.map((metric, index) => {
          const Icon = metricIcons[index] || BarChart3;
          return (
            <article className={`dashboard-metric metric-${metric.tone}`} key={metric.id}>
              <Icon size={22} />
              <span>{metric.label}</span>
              <strong>{metric.value}</strong>
              <small>{metric.detail}</small>
            </article>
          );
        })}
      </section>

      <div className="dashboard-grid">
        <section className="workspace-main-card dashboard-command-card">
          <div className="workspace-section-title">
            <div><span>PROJECT STATUS</span><h2>Operation portfolio health</h2></div>
            <small>Dashboard menu owns the detailed data UI. Office monitor stays dark to avoid visual collision.</small>
          </div>
          <div className="dashboard-status-chart">
            {projectStatus.map((item) => (
              <article className={`status-chart-row chart-${item.tone}`} key={item.label}>
                <div>
                  <strong>{item.label}</strong>
                  <span>{item.value} project{item.value === 1 ? "" : "s"}</span>
                </div>
                <i><b style={{ width: `${Math.max(5, (item.value / maxProjectStatus) * 100)}%` }} /></i>
                <em>{item.value}</em>
              </article>
            ))}
          </div>
          <div className="dashboard-signal-row dashboard-task-row">
            <span>Total Tasks <strong>{taskOverview.totalTasks}</strong></span>
            <span>Due Today <strong>{taskOverview.dueToday}</strong></span>
            <span>Overdue <strong>{taskOverview.overdue}</strong></span>
            <span>Waiting Approval <strong>{taskOverview.waitingApproval}</strong></span>
            <span>Completed This Week <strong>{taskOverview.completedThisWeek}</strong></span>
          </div>
        </section>

        <aside className="workspace-detail-panel dashboard-right-panel">
          <div className="workspace-section-title">
            <div><span>RIGHT PANEL</span><h2>Command actions</h2></div>
          </div>
          <section className="dashboard-side-section">
            <h3>Activity Feed</h3>
            {activity.map((item) => (
              <article className={`side-feed feed-${item.tone}`} key={item.id}>
                <strong>{item.agent}</strong>
                <span>{item.message}</span>
                <small>{item.time}</small>
              </article>
            ))}
          </section>
          <section className="dashboard-side-section">
            <h3>Upcoming Deadlines</h3>
            {deadlines.map((item) => (
              <article className={`deadline-${item.tone}`} key={item.id}>
                <CalendarClock size={16} />
                <span>{item.label}</span>
                <strong>{item.due}</strong>
              </article>
            ))}
          </section>
          <section className="dashboard-side-section">
            <h3>Quick Actions</h3>
            <div className="dashboard-action-grid">
              <a href="/approvals"><ClipboardCheck size={16} />View Approvals</a>
              <a href="#dashboard-alerts"><ShieldAlert size={16} />View Alerts</a>
            </div>
          </section>
        </aside>
      </div>

      <section className="workspace-main-card dashboard-division-revenue-card">
        <div className="workspace-section-title">
          <div><span>ANNUAL DIVISION REVENUE SUMMARY</span><h2>{annualDivisionRevenue.year} CHOD revenue / profit</h2></div>
          <small>Live Google Sheet source only: FIT-OUT + RESTORATION. Contractor-side pricing is excluded.</small>
        </div>
        <div className="division-revenue-grid">
          <article className="division-total">
            <span>Total CHOD Revenue</span>
            <strong>{money(annualDivisionRevenue.totalRevenue)}</strong>
            <small>Fit-out + Restoration</small>
          </article>
          <article className="division-total profit">
            <span>Total Profit</span>
            <strong>{money(annualDivisionRevenue.totalProfit)}</strong>
            <small>{annualDivisionRevenue.profitMargin.toFixed(1)}% blended margin</small>
          </article>
          <div className="division-breakdown">
            {annualDivisionRevenue.divisions.map((division) => {
              const revenueWidth = Math.max(4, (division.revenue / maxDivisionValue) * 100);
              const profitWidth = Math.max(4, (division.profit / maxDivisionValue) * 100);
              return (
                <article key={division.id}>
                  <header>
                    <strong>{division.label}</strong>
                    <small>{division.note}</small>
                  </header>
                  <div className="division-bars">
                    <p><span>Revenue</span><i><b style={{ width: `${revenueWidth}%` }} /></i><em>{money(division.revenue)}</em></p>
                    <p><span>Profit</span><i><b style={{ width: `${profitWidth}%` }} /></i><em>{money(division.profit)}</em></p>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="workspace-main-card dashboard-budget-card">
        <div className="workspace-section-title">
          <div><span>APPROVED ANNUAL COST</span><h2>Financial utilization</h2></div>
          <small>Full budget of approved operational work only. Progress percentage is not used for cost.</small>
        </div>
        <div className="budget-overview-grid">
          <article><span>Total Budget</span><strong>{money(budget.totalBudget)}</strong></article>
          <article><span>Approved Project Budget</span><strong>{money(budget.committedBudget)}</strong></article>
          <article><span>Annual Cost</span><strong>{money(budget.actualCost)}</strong></article>
          <article><span>Remaining Budget</span><strong>{money(budget.remainingBudget)}</strong></article>
          <article className="budget-utilization"><span>Utilization</span><strong>{budget.utilization}%</strong><i><b style={{ width: `${budget.utilization}%` }} /></i></article>
        </div>
      </section>

      <section className="dashboard-module-grid">
        <ModuleCard title="Fit-out Overview" icon={<LayoutDashboard size={20} />} items={[
          ["Active Fit-out Jobs", fitout.activeJobs],
          ["Fit-out", fitout.fitout],
          ["Restoration", fitout.restoration],
          ["Fit-out Pending Approval", fitout.pendingApproval],
          ["Fit-out Overdue", fitout.overdue],
          ["Handover Pending", fitout.handoverPending],
        ]} />
        <ModuleCard title="PM Loop Overview" icon={<ListChecks size={20} />} items={[
          ["PM Compliance", `${pmLoop.compliance}%`],
          ["PM Overdue", pmLoop.overdue],
          ["Near Cycle Alerts", pmLoop.nearCycleAlerts],
          ["Work Orders This Week", pmLoop.workOrdersThisWeek],
        ]} />
        <ModuleCard title="Solar Performance Overview" icon={<SunMedium size={20} />} items={[
          ["Solar Sites", solar.sites],
          ["Total Capacity", `${solar.totalCapacityKw} kW`],
          ["Today Output", `${solar.todayOutputKwh.toLocaleString()} kWh`],
          ["Monthly Generation", `${solar.monthlyGenerationKwh.toLocaleString()} kWh`],
          ["Output Variance Alert", solar.varianceAlerts],
          ["System Warning", solar.systemWarnings],
        ]} />
        <ModuleCard title="Quotation / Approval Overview" icon={<ClipboardCheck size={20} />} items={[
          ["Waiting Approval", quotation.waitingApproval],
          ["Approved This Month", quotation.approvedThisMonth],
          ["Rejected / Revision Required", quotation.rejectedOrRevision],
          ["Total Pending Value", money(quotation.totalPendingValue)],
          ["Main Approver", quotation.mainApprover],
        ]} />
      </section>

      <section className="workspace-main-card dashboard-alert-card" id="dashboard-alerts">
        <div className="workspace-section-title">
          <div><span>ALERT SUMMARY</span><h2>Risk levels by operation type</h2></div>
          <small>PM overdue, Fit-out overdue, Solar variance, Quotation approval, Budget overrun, Document missing / expiring.</small>
        </div>
        <div className="dashboard-alert-grid">
          {alerts.map((alert) => (
            <article className={`alert-${alert.level.toLowerCase()}`} key={alert.level}>
              <ShieldAlert size={22} />
              <span>{alert.level}</span>
              <strong>{alert.count}</strong>
              <small>{alert.types.join(" / ")}</small>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

function ModuleCard({ title, icon, items }: { title: string; icon: ReactNode; items: Array<[string, string | number]> }) {
  return (
    <article className="dashboard-module-card">
      <header>{icon}<h2>{title}</h2></header>
      <div>
        {items.map(([label, value]) => (
          <p key={label}><span>{label}</span><strong>{value}</strong></p>
        ))}
      </div>
    </article>
  );
}
