import type { LiveDashboardData } from "@/lib/dashboard/live-dashboard-data";

function moneyCompact(value: number) {
  return new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(value);
}

function displayValue(value: string | number) {
  return typeof value === "number" && Math.abs(value) >= 1000 ? moneyCompact(value) : value;
}

function safePercent(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function TammasitDashboardWall({ data }: { data: LiveDashboardData }) {
  const totalProjects = data.projectStatus.reduce((sum, item) => sum + item.value, 0);
  const onTrackProjects = data.projectStatus
    .filter((item) => ["In Progress", "Completed"].includes(item.label))
    .reduce((sum, item) => sum + item.value, 0);
  const projectHealth = totalProjects ? safePercent((onTrackProjects / totalProjects) * 100) : 0;
  const maxStatus = Math.max(...data.projectStatus.map((item) => item.value), 1);
  const maxRevenue = Math.max(...data.annualDivisionRevenue.divisions.flatMap((division) => [division.revenue, division.profit]), 1);
  const kpiCards = [
    { label: "Total Projects", value: totalProjects },
    { label: "Active Projects", value: data.executiveKPIs[0]?.value || 0 },
    { label: "Total Budget", value: data.budget.totalBudget },
    { label: "Budget Utilization", value: `${data.budget.utilization}%` },
    { label: "Open Tasks", value: data.taskOverview.totalTasks - data.taskOverview.completedThisWeek },
    { label: "Pending Approvals", value: data.quotation.waitingApproval },
  ];
  const taskBars = [
    data.taskOverview.totalTasks,
    data.taskOverview.inProgress,
    data.taskOverview.waitingApproval,
    data.taskOverview.overdue,
    data.quotation.waitingApproval,
    data.fitout.activeJobs,
  ];
  const maxTaskBar = Math.max(...taskBars, 1);

  return (
    <div className="tammasit-dashboard-wall-layer" aria-label="Tammasit executive live dashboard screen">
      <div className="tammasit-dashboard-wall">
        <section className="tammasit-wall-reference-grid">
          <article className="wall-panel wall-kpi-overview">
            <h3>KPI Overview</h3>
            <div className="wall-kpi-grid">
              {kpiCards.map((item) => (
                <p key={item.label}>
                  <span>{item.label}</span>
                  <strong>{displayValue(item.value)}</strong>
                </p>
              ))}
            </div>
          </article>

          <article className="wall-panel wall-executive-summary">
            <h3>Executive Summary</h3>
            <div className="wall-executive-content">
              <div className="wall-money-stack">
                <p>
                  <span>Financial Utilization</span>
                  <strong>{data.budget.utilization}%</strong>
                  <small>Committed budget</small>
                </p>
                <p>
                  <span>Annual Profit</span>
                  <strong>{moneyCompact(data.annualDivisionRevenue.totalProfit)}</strong>
                  <small>Fit-out + Restoration</small>
                </p>
              </div>
              <div className="wall-line-chart wall-revenue-bars" aria-hidden="true">
                {data.annualDivisionRevenue.divisions.map((division) => (
                  <p key={division.id}>
                    <span>{division.label}</span>
                    <i><b style={{ width: `${safePercent((division.revenue / maxRevenue) * 100)}%` }} /></i>
                    <strong>{moneyCompact(division.revenue)}</strong>
                  </p>
                ))}
              </div>
              <div className="wall-donut" aria-hidden="true">
                <span>{safePercent(data.annualDivisionRevenue.profitMargin)}%</span>
              </div>
              <div className="wall-scope-split">
                {data.annualDivisionRevenue.divisions.map((division) => (
                  <p key={division.id}>
                    <b>{division.label}</b>
                    <strong>{moneyCompact(division.profit)}</strong>
                  </p>
                ))}
              </div>
            </div>
          </article>

          <div className="wall-right-stack">
            <article className="wall-panel wall-project-status">
              <h3>Project Status</h3>
              <div className="wall-project-status-content">
                <div className="wall-progress-ring" aria-hidden="true">
                  <span>{projectHealth}%</span>
                </div>
                <div>
                  {data.projectStatus.slice(0, 3).map((item) => (
                    <p className={`wall-status-${item.tone}`} key={item.label}>
                      <b>{item.label}</b>
                      <strong>{item.value}</strong>
                    </p>
                  ))}
                  {!data.projectStatus.length ? <p className="wall-status-blue"><b>No live projects</b><strong>0</strong></p> : null}
                </div>
              </div>
            </article>
            <article className="wall-panel wall-approvals">
              <h3>Approvals</h3>
              <div>
                <p><b>Pending</b><strong>{data.quotation.waitingApproval}</strong></p>
                <p><b>In Review</b><strong>{data.taskOverview.waitingApproval}</strong></p>
                <p><b>Signed</b><strong>{data.quotation.signedThisMonth}</strong></p>
              </div>
            </article>
          </div>

          <article className="wall-panel wall-budget-summary">
            <h3>Budget Summary</h3>
            <div className="wall-budget-row">
              <p><span>Planned</span><strong>{moneyCompact(data.budget.totalBudget)}</strong></p>
              <p><span>Annual</span><strong>{moneyCompact(data.budget.actualCost)}</strong></p>
              <p><span>Remaining</span><strong>{moneyCompact(data.budget.remainingBudget)}</strong></p>
            </div>
            <div className="wall-budget-progress"><i style={{ width: `${safePercent(data.budget.utilization)}%` }} /><span>{data.budget.utilization}%</span></div>
          </article>

          <article className="wall-panel wall-task-overview">
            <h3>Task Overview</h3>
            <div className="wall-task-row">
              <p><span>Total Tasks</span><strong>{data.taskOverview.totalTasks}</strong></p>
              <p><span>Completed</span><strong>{data.taskOverview.completedThisWeek}</strong></p>
              <p><span>In Progress</span><strong>{data.taskOverview.inProgress}</strong></p>
              <p><span>Overdue</span><strong>{data.taskOverview.overdue}</strong></p>
              <div className="wall-mini-bars" aria-hidden="true">
                {taskBars.map((value, index) => (
                  <i key={`${value}-${index}`} style={{ height: `${Math.max(8, (value / maxTaskBar) * 100)}%` }} />
                ))}
              </div>
            </div>
          </article>
        </section>
      </div>
    </div>
  );
}
