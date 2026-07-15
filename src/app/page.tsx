import { OfficeStage } from "@/components/office/OfficeStage";
import { RightPanel } from "@/components/layout/RightPanel";
import { TopBar } from "@/components/layout/TopBar";
import { listApprovedUsers } from "@/lib/auth/google-sheets-store";
import { getOnlineCharacterIds } from "@/lib/auth/presence";
import { requireApprovedUser } from "@/lib/auth/session";
import { getLiveDashboardData } from "@/lib/dashboard/live-dashboard-data";
import { getOfficePanelData } from "@/lib/office/office-panel-data";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function Home() {
  const user = await requireApprovedUser();
  const [panelData, dashboardData, approvedUsers] = await Promise.all([
    getOfficePanelData(),
    getLiveDashboardData(),
    listApprovedUsers().catch(() => [user]),
  ]);
  const onlineCharacterIds = getOnlineCharacterIds(approvedUsers);

  return (
    <>
      <section className="center-deck">
        <TopBar />
        <div className="office-frame">
          <OfficeStage currentUser={user} dashboardData={dashboardData} onlineCharacterIds={onlineCharacterIds} />
        </div>
      </section>
      <RightPanel data={panelData} />
    </>
  );
}
