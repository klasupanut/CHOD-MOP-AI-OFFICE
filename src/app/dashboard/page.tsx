import { DashboardWorkspace } from "@/components/workspace/DashboardWorkspace";
import { requireModule } from "@/lib/auth/session";
import { getLiveDashboardData } from "@/lib/dashboard/live-dashboard-data";

export default async function DashboardPage() {
  const user = await requireModule("Dashboard");
  const data = await getLiveDashboardData();
  void user;
  return <DashboardWorkspace data={data} />;
}
