import { ArrowUpRight, Sparkles } from "lucide-react";
import type { LiveDashboardData } from "@/lib/dashboard/live-dashboard-data";

export function RecommendedReportsPanel({ reports }: { reports: LiveDashboardData["reports"]["recommended"] }) {
  return (
    <aside className="workspace-detail-panel reports-recommended-panel">
      <div className="workspace-section-title">
        <div><span>RECOMMENDED TODAY</span><h2>Reports Tammasit should see</h2></div>
      </div>
      <div className="reports-recommend-list">
        {reports.map((report) => (
          <button className={`reports-recommend-item tone-${report.tone}`} type="button" key={report.id}>
            <i>{report.owner}</i>
            <strong>{report.title}</strong>
            <span>{report.reason}</span>
            <ArrowUpRight size={17} />
          </button>
        ))}
      </div>
      <button className="reports-generate-all" type="button">
        <Sparkles size={18} />
        Generate All Team Weekly Report
      </button>
    </aside>
  );
}
