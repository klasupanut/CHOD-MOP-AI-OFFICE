import { redirect } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
import { ScheduleWorkspace } from "@/components/workspace/ScheduleWorkspace";
import { requireApprovedUser } from "@/lib/auth/session";
import { listScheduleData } from "@/lib/connectors/google-sheet-task-project";

export default async function CalendarSchedulePage() {
  const user = await requireApprovedUser();
  const allowed = user.modulePermissions.includes("Calendar / Schedule") || user.modulePermissions.includes("Tasks") || user.modulePermissions.includes("Projects");
  if (!allowed) redirect("/access-denied");

  let scheduleData: Awaited<ReturnType<typeof listScheduleData>>;
  try {
    scheduleData = await listScheduleData();
  } catch (error) {
    scheduleData = {
      mode: "fallback",
      events: [],
      manualEvents: [],
      derivedEvents: [],
      message: error instanceof Error ? error.message : "Schedule Google Sheet is unavailable.",
    };
  }

  return (
    <main className="hq-shell module-shell">
      <Sidebar user={user} />
      <section className="module-main">
        <TopBar />
        <ScheduleWorkspace
          currentUser={user}
          initialEvents={scheduleData.events}
          dataMessage={scheduleData.message}
        />
      </section>
    </main>
  );
}
