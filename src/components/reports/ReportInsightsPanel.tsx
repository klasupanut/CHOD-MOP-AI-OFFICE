import { ArrowRight, Radar } from "lucide-react";
import type { LiveDashboardData } from "@/lib/dashboard/live-dashboard-data";

export function ReportInsightsPanel({ insights }: { insights: LiveDashboardData["reports"]["insights"] }) {
  return (
    <section className="reports-insight-grid">
      {insights.map((insight) => (
        <article className={`reports-insight-card tone-${insight.tone}`} key={insight.id}>
          <Radar size={22} />
          <strong>{insight.title}</strong>
          <span>{insight.summary}</span>
          <button type="button">{insight.action} <ArrowRight size={15} /></button>
        </article>
      ))}
    </section>
  );
}
