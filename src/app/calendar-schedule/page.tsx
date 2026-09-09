import { redirect } from "next/navigation";
import { ScheduleWorkspace } from "@/components/workspace/ScheduleWorkspace";
import { requireApprovedUser } from "@/lib/auth/session";
import { listScheduleData } from "@/lib/connectors/google-sheet-task-project";

function validMonthStart(value?: string) {
  const match = /^(\d{4})-(\d{2})(?:$|-)/.exec(String(value || "").trim());
  if (!match) return "";
  const month = Number(match[2]);
  if (month < 1 || month > 12) return "";
  return `${match[1]}-${match[2]}-01`;
}

function recentManualEventMonth(events: Awaited<ReturnType<typeof listScheduleData>>["manualEvents"], userName: string) {
  const normalizedUserName = userName.trim().toLowerCase();
  const now = Date.now();
  const recentWindowMs = 30 * 60_000;
  const recentEvent = events
    .filter((event) => event.createdBy.trim().toLowerCase() === normalizedUserName)
    .map((event) => {
      const timestamp = Date.parse(`${event.lastUpdate.replace(" ", "T").replace(/Z$/, "")}Z`);
      return { event, timestamp };
    })
    .filter(({ timestamp }) => Number.isFinite(timestamp) && timestamp <= now + 5 * 60_000 && now - timestamp <= recentWindowMs)
    .sort((a, b) => b.timestamp - a.timestamp)[0]?.event;

  return validMonthStart(recentEvent?.startAt);
}

export default async function CalendarSchedulePage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const user = await requireApprovedUser();
  const allowed = user.modulePermissions.includes("Calendar / Schedule") || user.modulePermissions.includes("Tasks") || user.modulePermissions.includes("Projects");
  if (!allowed) redirect("/access-denied");

  let scheduleData: Awaited<ReturnType<typeof listScheduleData>>;
  try {
    scheduleData = await listScheduleData();
  } catch (error) {
    scheduleData = {
      mode: "fallback",
      isStale: true,
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
      initialMonth={validMonthStart((await searchParams).month) || recentManualEventMonth(scheduleData.manualEvents, user.name)}
      dataMessage={scheduleData.message}
    />
  );
}
