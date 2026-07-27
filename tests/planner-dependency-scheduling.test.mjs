import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  parseDependency,
  rebaseDependencyReferences,
  scheduleDependentActivities,
  serializeDependency,
  wouldCreateDependencyCycle,
} from "../src/lib/planner/dependency-scheduling.ts";

const group = (id, description = id) => ({
  id,
  parentId: null,
  kind: "group",
  description,
  start: "2026-07-01",
  duration: 1,
  progress: 0,
  weight: 0,
  owner: "PM",
  dependency: "-",
});

const task = (id, parentId, start, duration, dependency = "-") => ({
  id,
  parentId,
  kind: "task",
  description: id,
  start,
  duration,
  progress: 0,
  weight: 0,
  owner: "Kla",
  dependency,
});

test("dependency text stays backward-compatible while persisting lag days", () => {
  assert.deepEqual(parseDependency("1.2"), {
    predecessorCode: "1.2",
    lagDays: 0,
  });
  assert.deepEqual(parseDependency("1.2 +3d"), {
    predecessorCode: "1.2",
    lagDays: 3,
  });
  assert.equal(serializeDependency("1.2", 0), "1.2");
  assert.equal(serializeDependency("1.2", 3), "1.2 +3d");
  assert.equal(serializeDependency("", 3), "-");
});

test("calendar dependencies cascade start dates through multiple sub-plans", () => {
  const scheduled = scheduleDependentActivities([
    group("g-1"),
    task("t-1", "g-1", "2026-07-01", 3),
    task("t-2", "g-1", "2026-07-01", 2, "1.1"),
    task("t-3", "g-1", "2026-07-01", 1, "1.2 +2d"),
  ], "calendar");

  assert.equal(scheduled.find((item) => item.id === "t-2")?.start, "2026-07-04");
  assert.equal(scheduled.find((item) => item.id === "t-3")?.start, "2026-07-08");
});

test("working-day dependencies skip weekends and honor extra lag", () => {
  const scheduled = scheduleDependentActivities([
    group("g-1"),
    task("t-1", "g-1", "2026-07-03", 1),
    task("t-2", "g-1", "2026-07-01", 1, "1.1"),
    task("t-3", "g-1", "2026-07-01", 1, "1.2 +1d"),
  ], "working");

  assert.equal(scheduled.find((item) => item.id === "t-2")?.start, "2026-07-06");
  assert.equal(scheduled.find((item) => item.id === "t-3")?.start, "2026-07-08");
});

test("dependency cycle validation rejects direct and chained loops", () => {
  const activities = [
    group("g-1"),
    task("t-1", "g-1", "2026-07-01", 1),
    task("t-2", "g-1", "2026-07-02", 1, "1.1"),
    task("t-3", "g-1", "2026-07-03", 1, "1.2"),
  ];

  assert.equal(wouldCreateDependencyCycle(activities, "t-1", "1.1"), true);
  assert.equal(wouldCreateDependencyCycle(activities, "t-1", "1.3"), true);
  assert.equal(wouldCreateDependencyCycle(activities, "t-3", "1.1"), false);
});

test("dependency references follow the same predecessor after a row is removed", () => {
  const previous = [
    group("g-1"),
    task("t-1", "g-1", "2026-07-01", 1),
    task("t-2", "g-1", "2026-07-02", 1),
    task("t-3", "g-1", "2026-07-03", 1, "1.2 +2d"),
  ];
  const remaining = previous.filter((item) => item.id !== "t-1");
  const rebased = rebaseDependencyReferences(previous, remaining);

  assert.equal(rebased.find((item) => item.id === "t-3")?.dependency, "1.1 +2d");
  assert.equal(
    rebaseDependencyReferences(previous, previous.filter((item) => item.id !== "t-2"))
      .find((item) => item.id === "t-3")?.dependency,
    "-",
  );
});

test("Planner renders a predecessor selector and lag control instead of free-text dependency input", async () => {
  const source = await readFile(
    new URL("../src/components/planner/TimelinePlannerWorkspace.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /predecessor sub-plan/);
  assert.match(source, /dependency lag days/);
  assert.match(source, /scheduleDependentActivities/);
  assert.match(source, /wouldCreateDependencyCycle/);
  assert.match(source, /activities:\s*scheduleDependentActivities\(migratedActivities,\s*calendarMode\)/);
  assert.doesNotMatch(source, /onChange=\{\(event\) => updateActivity\(activity\.id, "dependency"/);
});
