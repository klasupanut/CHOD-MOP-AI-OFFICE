import { ArrowRight, Clock3 } from "lucide-react";
import type { LiveDashboardData } from "@/lib/dashboard/live-dashboard-data";

function reportTone(tone: LiveDashboardData["activity"][number]["tone"]) {
  if (tone === "info") return "cyan";
  return tone;
}

export function TeamActivityTimeline({ activity }: { activity: LiveDashboardData["activity"] }) {
  return (
    <section className="workspace-main-card reports-timeline-card">
      <div className="workspace-section-title">
        <div><span>TEAM ACTIVITY TIMELINE</span><h2>Latest operation movement</h2></div>
        <button className="reports-subtle-action" type="button">View Full Activity Log <ArrowRight size={15} /></button>
      </div>
      <div className="reports-timeline">
        {activity.map((item) => (
          <article className={`tone-${reportTone(item.tone)}`} key={item.id}>
            <Clock3 size={18} />
            <time>{item.time}</time>
            <strong>{item.agent}</strong>
            <span>{item.message}</span>
          </article>
        ))}
        {!activity.length ? <p className="empty-workspace">No live activity found yet.</p> : null}
      </div>
    </section>
  );
}
