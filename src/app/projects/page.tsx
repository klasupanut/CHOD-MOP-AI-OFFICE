import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
import { ProjectWorkspace } from "@/components/workspace/ProjectWorkspace";
import { listTaskProjectData } from "@/lib/connectors/google-sheet-task-project";
import { requireModule } from "@/lib/auth/session";

export default async function ProjectsPage() {
  const user = await requireModule("Projects");
  let taskProjectData: Awaited<ReturnType<typeof listTaskProjectData>>;
  try {
    taskProjectData = await listTaskProjectData();
  } catch (error) {
    taskProjectData = {
      mode: "not-configured",
      projects: [],
      tasks: [],
      message: error instanceof Error ? error.message : "Task / Project Google Sheet is unavailable.",
    };
  }
  return (
    <main className="hq-shell module-shell">
      <Sidebar user={user} />
      <section className="module-main">
        <TopBar />
        <ProjectWorkspace
          currentUser={user}
          initialProjects={taskProjectData.projects}
          initialTasks={taskProjectData.tasks}
          dataMessage={taskProjectData.message}
        />
      </section>
    </main>
  );
}
