import type { Activity, CalendarMode } from "@/lib/planner/plan-contract";

const DEPENDENCY_PATTERN = /^(\d+\.\d+)(?:\s*\+\s*(\d+)\s*d(?:ays?)?)?$/i;
const MAX_LAG_DAYS = 3_650;

export type ParsedDependency = {
  predecessorCode: string;
  lagDays: number;
};

export type TaskCodeIndex = {
  codeById: Map<string, string>;
  taskByCode: Map<string, Activity>;
};

export function parseDependency(value: string | null | undefined): ParsedDependency | null {
  const normalized = String(value || "").trim();
  if (!normalized || normalized === "-") return null;
  const match = normalized.match(DEPENDENCY_PATTERN);
  if (!match) return null;
  return {
    predecessorCode: match[1],
    lagDays: clampLagDays(match[2]),
  };
}

export function serializeDependency(predecessorCode: string, rawLagDays: number) {
  const code = predecessorCode.trim();
  if (!code) return "-";
  const lagDays = clampLagDays(rawLagDays);
  return lagDays > 0 ? `${code} +${lagDays}d` : code;
}

export function buildTaskCodeIndex(activities: Activity[]): TaskCodeIndex {
  const codeById = new Map<string, string>();
  const taskByCode = new Map<string, Activity>();
  const groups = activities.filter((activity) => activity.kind === "group");

  groups.forEach((group, groupIndex) => {
    activities
      .filter((activity) => activity.kind === "task" && activity.parentId === group.id)
      .forEach((task, taskIndex) => {
        const code = `${groupIndex + 1}.${taskIndex + 1}`;
        codeById.set(task.id, code);
        taskByCode.set(code, task);
      });
  });

  return { codeById, taskByCode };
}

export function wouldCreateDependencyCycle(
  activities: Activity[],
  activityId: string,
  predecessorCode: string,
) {
  const { taskByCode } = buildTaskCodeIndex(activities);
  let predecessor = taskByCode.get(predecessorCode);
  const visited = new Set<string>();

  while (predecessor) {
    if (predecessor.id === activityId || visited.has(predecessor.id)) return true;
    visited.add(predecessor.id);
    const dependency = parseDependency(predecessor.dependency);
    predecessor = dependency ? taskByCode.get(dependency.predecessorCode) : undefined;
  }

  return false;
}

export function scheduleDependentActivities(
  activities: Activity[],
  calendarMode: CalendarMode,
) {
  const scheduled = activities.map((activity) => ({ ...activity }));
  const { taskByCode } = buildTaskCodeIndex(scheduled);
  const taskById = new Map(
    scheduled
      .filter((activity) => activity.kind === "task")
      .map((activity) => [activity.id, activity]),
  );
  const complete = new Set<string>();
  const visiting = new Set<string>();

  const scheduleTask = (task: Activity): boolean => {
    if (complete.has(task.id)) return true;
    if (visiting.has(task.id)) return false;
    visiting.add(task.id);

    const dependency = parseDependency(task.dependency);
    const predecessor = dependency
      ? taskById.get(taskByCode.get(dependency.predecessorCode)?.id || "")
      : undefined;

    if (predecessor) {
      if (!scheduleTask(predecessor)) {
        visiting.delete(task.id);
        return false;
      }
      const predecessorFinish = addDuration(
        predecessor.start,
        predecessor.duration,
        calendarMode,
      );
      task.start = startAfterPredecessor(
        predecessorFinish,
        dependency?.lagDays ?? 0,
        calendarMode,
      );
    }

    visiting.delete(task.id);
    complete.add(task.id);
    return true;
  };

  scheduled
    .filter((activity) => activity.kind === "task")
    .forEach((activity) => scheduleTask(activity));

  return scheduled;
}

export function rebaseDependencyReferences(
  previousActivities: Activity[],
  nextActivities: Activity[],
) {
  const previousIndex = buildTaskCodeIndex(previousActivities);
  const nextIndex = buildTaskCodeIndex(nextActivities);

  return nextActivities.map((activity) => {
    if (activity.kind !== "task") return activity;
    const dependency = parseDependency(activity.dependency);
    if (!dependency) return activity;

    const predecessorId = previousIndex.taskByCode.get(dependency.predecessorCode)?.id;
    if (!predecessorId) return activity;

    const nextCode = nextIndex.codeById.get(predecessorId);
    return {
      ...activity,
      dependency: nextCode
        ? serializeDependency(nextCode, dependency.lagDays)
        : "-",
    };
  });
}

function startAfterPredecessor(
  predecessorFinish: string,
  lagDays: number,
  calendarMode: CalendarMode,
) {
  const date = parseDate(predecessorFinish);
  let remaining = clampLagDays(lagDays) + 1;

  while (remaining > 0) {
    date.setUTCDate(date.getUTCDate() + 1);
    if (calendarMode === "calendar" || isWorkday(date)) remaining -= 1;
  }

  return toISO(date);
}

function addDuration(start: string, rawDuration: number, mode: CalendarMode) {
  const duration = Math.max(1, Number(rawDuration) || 1);
  const date = parseDate(start);
  if (mode === "calendar") {
    date.setUTCDate(date.getUTCDate() + duration - 1);
    return toISO(date);
  }

  let counted = isWorkday(date) ? 1 : 0;
  while (counted < duration) {
    date.setUTCDate(date.getUTCDate() + 1);
    if (isWorkday(date)) counted += 1;
  }
  return toISO(date);
}

function parseDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function toISO(date: Date) {
  return [
    date.getUTCFullYear(),
    String(date.getUTCMonth() + 1).padStart(2, "0"),
    String(date.getUTCDate()).padStart(2, "0"),
  ].join("-");
}

function isWorkday(date: Date) {
  const day = date.getUTCDay();
  return day !== 0 && day !== 6;
}

function clampLagDays(value: string | number | undefined) {
  return Math.min(MAX_LAG_DAYS, Math.max(0, Math.round(Number(value) || 0)));
}
