import { ReportsWorkspace } from "@/components/reports/ReportsWorkspace";
import { requireModule } from "@/lib/auth/session";
import { getLiveDashboardData } from "@/lib/dashboard/live-dashboard-data";

export default async function ReportsPage() {
  const user = await requireModule("Reports");
  const data = await getLiveDashboardData();
  void user;
  return <ReportsWorkspace data={data} />;
}
