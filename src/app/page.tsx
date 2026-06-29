import { OfficeStage } from "@/components/office/OfficeStage";
import { RightPanel } from "@/components/layout/RightPanel";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
import { requireApprovedUser } from "@/lib/auth/session";
import { getLiveDashboardData } from "@/lib/dashboard/live-dashboard-data";
import { getOfficePanelData } from "@/lib/office/office-panel-data";

export default async function Home() {
  const user = await requireApprovedUser();
  const [panelData, dashboardData] = await Promise.all([
    getOfficePanelData(),
    getLiveDashboardData(),
  ]);
  return (
    <main className="hq-shell">
      <Sidebar user={user} />
      <section className="center-deck">
        <TopBar />
        <div className="office-frame">
          <OfficeStage currentUser={user} dashboardData={dashboardData} />
        </div>
      </section>
      <RightPanel data={panelData} />
    </main>
  );
}
