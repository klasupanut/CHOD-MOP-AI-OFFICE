import assert from "node:assert/strict";
import test from "node:test";

import {
  TIMELINE_DAY_MS,
  buildTimelinePrintWindows,
} from "../src/lib/planner/timeline-print-pagination.ts";

test("week PDF keeps the complete project axis on one sheet window", () => {
  const start = Date.UTC(2026, 0, 1);
  const end = start + 90 * TIMELINE_DAY_MS;
  assert.deepEqual(buildTimelinePrintWindows(start, end, "week", "landscape"), [
    { startMs: start, endMs: end, index: 0, total: 1 },
  ]);
});

test("landscape day PDF creates continuous readable 28-day windows", () => {
  const start = Date.UTC(2026, 0, 1);
  const end = start + 60 * TIMELINE_DAY_MS;
  const windows = buildTimelinePrintWindows(start, end, "day", "landscape");

  assert.equal(windows.length, 3);
  assert.equal(windows[0].endMs - windows[0].startMs, 27 * TIMELINE_DAY_MS);
  assert.equal(windows[1].startMs, windows[0].endMs + TIMELINE_DAY_MS);
  assert.equal(windows[2].startMs, windows[1].endMs + TIMELINE_DAY_MS);
  assert.equal(windows.at(-1).endMs, end);
  assert.deepEqual(windows.map(({ index, total }) => ({ index, total })), [
    { index: 0, total: 3 },
    { index: 1, total: 3 },
    { index: 2, total: 3 },
  ]);
});

test("portrait day PDF uses narrower 14-day windows without losing dates", () => {
  const start = Date.UTC(2026, 3, 10);
  const end = start + 28 * TIMELINE_DAY_MS;
  const windows = buildTimelinePrintWindows(start, end, "day", "portrait");

  assert.equal(windows.length, 3);
  assert.equal(windows[0].endMs - windows[0].startMs, 13 * TIMELINE_DAY_MS);
  assert.equal(windows[1].startMs, windows[0].endMs + TIMELINE_DAY_MS);
  assert.equal(windows.at(-1).endMs, end);
});
