import { redirect } from "next/navigation";
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
    <ScheduleWorkspace
      currentUser={user}
      initialEvents={scheduleData.events}
      dataMessage={scheduleData.message}
    />
  );
}
