import { TaskWorkspace } from "@/components/workspace/TaskWorkspace";
import { listTaskProjectData } from "@/lib/connectors/google-sheet-task-project";
import { requireModule } from "@/lib/auth/session";

export default async function TasksPage() {
  const user = await requireModule("Tasks");
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
    <TaskWorkspace
      currentUser={user}
      initialTasks={taskProjectData.tasks}
      initialProjects={taskProjectData.projects}
      dataMessage={taskProjectData.message}
    />
  );
}
