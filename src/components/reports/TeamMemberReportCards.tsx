import Image from "next/image";
import type { LiveDashboardData } from "@/lib/dashboard/live-dashboard-data";

function moneyCompact(value: number) {
  return `฿${new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(value)}`;
}

export function TeamMemberReportCards({ members }: { members: LiveDashboardData["reports"]["teamMembers"] }) {
  return (
    <section className="workspace-main-card reports-team-section">
      <div className="workspace-section-title">
        <div><span>TEAM MEMBER OVERVIEW</span><h2>Who owns the work value</h2></div>
        <small>Each card expands the score cards into owner-level project count, active workload, watch items, and responsible value.</small>
      </div>
      <div className="reports-team-grid">
        {members.map((member) => {
          const topProject = member.projectSummary.topProjects[0];
          return (
            <article className="reports-member-card" key={member.id}>
              <header>
                <div className="reports-avatar">
                  <Image src={member.avatar} alt={member.name} fill sizes="78px" />
                </div>
                <div>
                  <strong>{member.name}</strong>
                  <span>{member.role}</span>
                </div>
              </header>
              <div className="reports-member-metrics">
                <p><span>Active Tasks</span><strong>{member.activeTasks}</strong></p>
                <p><span>Completed This Week</span><strong>{member.completedThisWeek}</strong></p>
              </div>
              <div className="reports-member-projects">
                <span>PROJECTS &amp; BUDGETS RESPONSIBILITY</span>
                <div>
                  <p><small>Active Projects</small><strong>{member.projectSummary.activeProjects}</strong></p>
                  <p><small>Total Projects</small><strong>{member.projectSummary.totalProjects}</strong></p>
                  <p><small>Work Value</small><strong>{moneyCompact(member.projectSummary.totalBudget)}</strong></p>
                  <p><small>Watch Items</small><strong>{member.projectSummary.overdueProjects}</strong></p>
                </div>
                <small className="reports-member-top-project">
                  {topProject ? `Top project: ${topProject}` : "No project ownership found from Projects & Budgets."}
                </small>
              </div>
              <div className={`reports-member-workload tone-${member.workload.tone}`}>
                <div>
                  <span>TEAM WORKLOAD</span>
                  <strong>{member.workload.percent}%</strong>
                </div>
                <i><b style={{ width: `${member.workload.percent}%` }} /></i>
                <small>{member.workload.label} · {member.workload.detail} · score {member.workload.score}</small>
              </div>
              <div className="reports-member-kpis">
                {member.kpis.map((kpi) => (
                  <em className={`tone-${kpi.tone}`} key={kpi.label}>
                    <span>{kpi.label}</span>
                    <strong>{kpi.value}</strong>
                  </em>
                ))}
              </div>
              <footer>
                <span>Main Area</span>
                <strong>{member.mainArea}</strong>
                <small>Suggested Report: {member.suggestedReport}</small>
              </footer>
            </article>
          );
        })}
      </div>
    </section>
  );
}
