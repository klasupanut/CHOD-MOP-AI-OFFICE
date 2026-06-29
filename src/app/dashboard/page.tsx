import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
import { DashboardWorkspace } from "@/components/workspace/DashboardWorkspace";
import { requireModule } from "@/lib/auth/session";
import { getLiveDashboardData } from "@/lib/dashboard/live-dashboard-data";

export default async function DashboardPage() {
  const user = await requireModule("Dashboard");
  const data = await getLiveDashboardData();
  return (
    <main className="hq-shell module-shell">
      <Sidebar user={user} />
      <section className="module-main">
        <TopBar />
        <DashboardWorkspace data={data} />
      </section>
    </main>
  );
}
