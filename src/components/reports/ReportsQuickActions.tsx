import { CalendarPlus, Download, FilePlus2, Settings2, SlidersHorizontal, WandSparkles } from "lucide-react";
import { reportQuickActions } from "@/data/reports";

const icons = [FilePlus2, CalendarPlus, SlidersHorizontal, Download, Settings2, WandSparkles];

export function ReportsQuickActions() {
  return (
    <section className="workspace-main-card reports-quick-actions">
      <div className="workspace-section-title">
        <div><span>QUICK ACTIONS</span><h2>Report command shortcuts</h2></div>
      </div>
      <div>
        {reportQuickActions.map((action, index) => {
          const Icon = icons[index] || FilePlus2;
          return (
            <button type="button" key={action}>
              <Icon size={20} />
              {action}
            </button>
          );
        })}
      </div>
    </section>
  );
}
