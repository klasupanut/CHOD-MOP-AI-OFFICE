import { redirect } from "next/navigation";
import { PlannerModuleFrame } from "@/components/planner/PlannerModuleFrame";
import { requireApprovedUser } from "@/lib/auth/session";

function canUsePlanner(modules: string[]) {
  return modules.includes("Projects")
    || modules.includes("Calendar / Schedule")
    || modules.includes("Tasks")
    || modules.includes("Fit-out Project");
}

export default async function PlannerPage() {
  const user = await requireApprovedUser();
  if (!canUsePlanner(user.modulePermissions)) redirect("/access-denied");
  return <PlannerModuleFrame />;
}
