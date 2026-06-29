import { AlertTriangle, BarChart3, CheckCircle2, ClipboardCheck, Gauge, UsersRound } from "lucide-react";
import type { LiveDashboardData } from "@/lib/dashboard/live-dashboard-data";

const icons = [UsersRound, CheckCircle2, AlertTriangle, ClipboardCheck, BarChart3, Gauge];

export function ReportsOverviewCards({ items }: { items: LiveDashboardData["reports"]["overviewKpis"] }) {
  return (
    <section className="reports-kpi-grid">
      {items.map((item, index) => {
        const Icon = icons[index] || BarChart3;
        return (
          <article className={`reports-kpi-card tone-${item.tone}`} key={item.label}>
            <Icon size={23} />
            <span>{item.label}</span>
            <strong>{item.value}</strong>
            <small>{item.detail}</small>
          </article>
        );
      })}
    </section>
  );
}
