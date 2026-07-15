import { BudgetUtilizeModuleFrame } from "@/components/projects/BudgetUtilizeModuleFrame";
import { requireModule } from "@/lib/auth/session";

export default async function ProjectsPage() {
  const user = await requireModule("Projects");
  void user;
  return <BudgetUtilizeModuleFrame />;
}
