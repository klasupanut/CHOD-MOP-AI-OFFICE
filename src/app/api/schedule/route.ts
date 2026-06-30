import { NextResponse } from "next/server";
import type { ScheduleEvent } from "@/data/schedule";
import { createScheduleEventInSheet } from "@/lib/connectors/google-sheet-task-project";
import { getApiUser } from "@/lib/auth/api";

export async function POST(request: Request) {
  const user = await getApiUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = (await request.json()) as { event?: ScheduleEvent };
    if (!body.event?.title) throw new Error("Event title is required.");
    if (!body.event.startAt) throw new Error("Start date/time is required.");
    const event = await createScheduleEventInSheet({
      ...body.event,
      createdBy: user.name,
      owner: body.event.owner || user.name,
      source: "manual",
    });
    return NextResponse.json({ event, mode: "google-sheet" });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to create schedule event." },
      { status: 400 },
    );
  }
}
