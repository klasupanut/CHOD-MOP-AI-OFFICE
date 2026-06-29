import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
import { ReportsWorkspace } from "@/components/reports/ReportsWorkspace";
import { requireModule } from "@/lib/auth/session";
import { getLiveDashboardData } from "@/lib/dashboard/live-dashboard-data";

export default async function ReportsPage() {
  const user = await requireModule("Reports");
  const data = await getLiveDashboardData();
  return (
    <main className="hq-shell module-shell">
      <Sidebar user={user} />
      <section className="module-main">
        <TopBar />
        <ReportsWorkspace data={data} />
      </section>
    </main>
  );
}
