import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");

test("calendar exposes an authenticated no-store refresh endpoint", async () => {
  const route = await read("../src/app/api/schedule/route.ts");

  assert.match(route, /export async function GET\(request: Request\)/);
  assert.match(route, /const user = await getApiUser\(\)/);
  assert.match(route, /canAccessSchedule\(user\)/);
  assert.match(route, /listScheduleData\(\{ forceRefresh \}\)/);
  assert.match(route, /isStale: Boolean\(schedule\.isStale\)/);
  assert.match(route, /\[schedule\] calendar loaded/);
  assert.match(route, /Cache-Control": "private, no-store, max-age=0"/);
});

test("schedule connector can bypass its instance cache on demand", async () => {
  const connector = await read("../src/lib/connectors/google-sheet-task-project.ts");

  assert.match(connector, /listScheduleData\(options: \{ forceRefresh\?: boolean \} = \{\}\)/);
  assert.match(connector, /listTaskProjectScheduleData\(options\)/);
  assert.match(connector, /if \(taskProjectSchedulePromise\) return taskProjectSchedulePromise/);
  assert.match(connector, /isStale: true,[\s\S]*Using recently cached schedule data/);
});

test("calendar refreshes visible sessions without aggressive Google polling", async () => {
  const component = await read("../src/components/workspace/ScheduleWorkspace.tsx");

  assert.match(component, /const scheduleRefreshIntervalMs = 60_000/);
  assert.match(component, /document\.visibilityState !== "visible"/);
  assert.match(component, /window\.addEventListener\("focus", refreshWhenVisible\)/);
  assert.match(component, /fetch\(`\/api\/schedule\$\{options\.force \? "\?refresh=1" : ""\}`/);
  assert.match(component, /cache: "no-store"/);
  assert.match(component, /showCalendarMonth\(monthStartKeyForValue\(createdEvent\.startAt\)\)/);
  assert.match(component, /url\.searchParams\.set\("month", normalized\.slice\(0, 7\)\)/);
  assert.match(component, /showCalendarMonth\(monthStartKeyForValue\(event\.startAt\)\)/);
  assert.match(component, /if \(payload\.isStale\)/);
  assert.match(component, /pendingCreatedEventsRef\.current\.set\(createdEvent\.eventId/);
  assert.match(component, /calendarRef\.current\?\.scrollIntoView/);
  assert.doesNotMatch(component, /setTimeout\(\(\) => void refreshEvents/);
});

test("busy calendar days expose every event", async () => {
  const component = await read("../src/components/workspace/ScheduleWorkspace.tsx");
  const css = await read("../src/app/globals.css");

  assert.match(component, /const shownEvents = dayExpanded \? dayEvents : dayEvents\.slice\(0, 5\)/);
  assert.match(component, /className="schedule-more-button"/);
  assert.match(component, /dayExpanded \? "Show less"/);
  assert.match(css, /\.schedule-more-button\s*\{/);
});

test("calendar refresh restores the viewed or most recently created event month", async () => {
  const page = await read("../src/app/calendar-schedule/page.tsx");
  const component = await read("../src/components/workspace/ScheduleWorkspace.tsx");

  assert.match(page, /searchParams: Promise<\{ month\?: string \}>/);
  assert.match(page, /recentManualEventMonth\(scheduleData\.manualEvents, user\.name\)/);
  assert.match(page, /initialMonth=/);
  assert.match(component, /normalizedMonthStart\(initialMonth\)/);
  assert.match(component, /calendarDayEvents\(visibleEvents, day\.key\)/);
  assert.match(component, /a\.source === "manual" && b\.source !== "manual"/);
});
