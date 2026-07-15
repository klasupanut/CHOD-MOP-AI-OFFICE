import { ReportByMemberPanel } from "@/components/reports/ReportByMemberPanel";
import { ReportInsightsPanel } from "@/components/reports/ReportInsightsPanel";
import { RecommendedReportsPanel } from "@/components/reports/RecommendedReportsPanel";
import { ReportsOverviewCards } from "@/components/reports/ReportsOverviewCards";
import { ReportsQuickActions } from "@/components/reports/ReportsQuickActions";
import { TeamActivityTimeline } from "@/components/reports/TeamActivityTimeline";
import { TeamMemberReportCards } from "@/components/reports/TeamMemberReportCards";
import type { LiveDashboardData } from "@/lib/dashboard/live-dashboard-data";

export function ReportsWorkspace({ data }: { data: LiveDashboardData }) {
  return (
    <div className="workspace-page reports-workspace">
      <div className="workspace-hero reports-hero">
        <div>
          <span>TEAM PERFORMANCE & OPERATION REVIEW CENTER</span>
          <h1>Reports</h1>
        </div>
      </div>

      <ReportsOverviewCards items={data.reports.overviewKpis} />

      <div className="reports-main-grid">
        <div className="reports-main-stack">
          <TeamMemberReportCards members={data.reports.teamMembers} />
          <ReportByMemberPanel data={data} />
        </div>
        <RecommendedReportsPanel reports={data.reports.recommended} />
      </div>

      <ReportInsightsPanel insights={data.reports.insights} />

      <div className="reports-bottom-grid">
        <TeamActivityTimeline activity={data.activity} />
        <ReportsQuickActions />
      </div>
    </div>
  );
}
