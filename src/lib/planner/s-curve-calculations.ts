export const DAY_MS = 86_400_000;

export type ScheduleCalendarMode = "calendar" | "working";

export function workdaysBetweenInclusive(startMs: number, endMs: number) {
  if (endMs < startMs) return 0;
  const totalDays = Math.floor((endMs - startMs) / DAY_MS) + 1;
  const fullWeeks = Math.floor(totalDays / 7);
  const remainingDays = totalDays % 7;
  const startDay = new Date(startMs).getUTCDay();
  let workdays = fullWeeks * 5;

  for (let offset = 0; offset < remainingDays; offset += 1) {
    const day = (startDay + offset) % 7;
    if (day !== 0 && day !== 6) workdays += 1;
  }

  return workdays;
}

export function distributedProgressRatio(
  startMs: number,
  endMs: number,
  rawDuration: number,
  currentMs: number,
  mode: ScheduleCalendarMode,
) {
  const duration = Math.max(1, rawDuration);
  if (currentMs < startMs) return 0;
  if (currentMs >= endMs) return 1;

  const completedUnits = mode === "working"
    ? workdaysBetweenInclusive(startMs, currentMs)
    : Math.floor((currentMs - startMs) / DAY_MS) + 1;

  return Math.min(1, Math.max(0, completedUnits / duration));
}

export function peakIndexFromCumulative(cumulativeValues: number[]) {
  if (cumulativeValues.length === 0) return 0;
  let peakIndex = 0;
  let peakIncrement = Number.NEGATIVE_INFINITY;
  let previous = 0;

  cumulativeValues.forEach((current, index) => {
    const increment = current - previous;
    if (increment > peakIncrement) {
      peakIncrement = increment;
      peakIndex = index;
    }
    previous = current;
  });

  return peakIndex;
}

