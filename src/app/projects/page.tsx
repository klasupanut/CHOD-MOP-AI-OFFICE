import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
import { BudgetUtilizeModuleFrame } from "@/components/projects/BudgetUtilizeModuleFrame";
import { requireModule } from "@/lib/auth/session";

export default async function ProjectsPage() {
  const user = await requireModule("Projects");
  return (
    <main className="hq-shell module-shell">
      <Sidebar user={user} />
      <section className="module-main">
        <TopBar />
        <BudgetUtilizeModuleFrame />
      </section>
    </main>
  );
}
