export const TIMELINE_DAY_MS = 86_400_000;

export type TimelinePrintScale = "day" | "week";
export type TimelinePrintOrientation = "landscape" | "portrait";

export type TimelinePrintWindow = {
  startMs: number;
  endMs: number;
  index: number;
  total: number;
};

/**
 * Split a long day-scale Gantt axis into readable A4-width windows.
 * Week scale intentionally remains a single full-project window.
 */
export function buildTimelinePrintWindows(
  rawStartMs: number,
  rawEndMs: number,
  scale: TimelinePrintScale,
  orientation: TimelinePrintOrientation,
): TimelinePrintWindow[] {
  const safeStartMs = Number.isFinite(rawStartMs) ? rawStartMs : 0;
  const safeEndMs = Number.isFinite(rawEndMs) ? rawEndMs : safeStartMs;
  const startMs = Math.min(safeStartMs, safeEndMs);
  const endMs = Math.max(safeStartMs, safeEndMs);

  if (scale === "week") {
    return [{ startMs, endMs, index: 0, total: 1 }];
  }

  // These limits keep each printed day cell wide enough for a clear date.
  const daysPerWindow = orientation === "portrait" ? 14 : 28;
  const totalDays = Math.max(1, Math.floor((endMs - startMs) / TIMELINE_DAY_MS) + 1);
  const total = Math.ceil(totalDays / daysPerWindow);

  return Array.from({ length: total }, (_, index) => {
    const windowStartMs = startMs + index * daysPerWindow * TIMELINE_DAY_MS;
    const windowEndMs = Math.min(
      endMs,
      windowStartMs + (daysPerWindow - 1) * TIMELINE_DAY_MS,
    );
    return { startMs: windowStartMs, endMs: windowEndMs, index, total };
  });
}
