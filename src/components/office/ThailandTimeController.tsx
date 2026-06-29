"use client";

import { useEffect, useState } from "react";

export type OfficePeriod = "dawn" | "day" | "afternoon" | "evening" | "night" | "late-night";

const bangkokTime = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Bangkok",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

export function getThailandPeriod(date = new Date()): OfficePeriod {
  const [hour, minute] = bangkokTime.format(date).split(":").map(Number);
  const totalMinutes = hour * 60 + minute;

  if (totalMinutes >= 330 && totalMinutes < 480) return "dawn";
  if (totalMinutes >= 480 && totalMinutes < 720) return "day";
  if (totalMinutes >= 720 && totalMinutes < 960) return "afternoon";
  if (totalMinutes >= 960 && totalMinutes < 1110) return "evening";
  if (totalMinutes >= 1110) return "night";
  return "late-night";
}

export function useThailandTime() {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const timer = window.setInterval(() => setNow(new Date()), 1_000);
    return () => window.clearInterval(timer);
  }, []);

  return {
    now,
    period: now ? getThailandPeriod(now) : "late-night",
    timeLabel: now ? new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Bangkok",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    }).format(now) : "--:--",
  };
}
