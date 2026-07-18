import { redirect } from "next/navigation";
import TimelinePlannerWorkspace from "@/components/planner/TimelinePlannerWorkspace";
import { requireApprovedUser } from "@/lib/auth/session";

export default async function PlannerWorkspacePage() {
  const user = await requireApprovedUser();
  const allowed = user.modulePermissions.includes("Projects")
    || user.modulePermissions.includes("Calendar / Schedule")
    || user.modulePermissions.includes("Tasks")
    || user.modulePermissions.includes("Fit-out Project");
  if (!allowed) redirect("/access-denied");
  return <TimelinePlannerWorkspace />;
}
