"use client";

import { useMemo } from "react";
import { useApp } from "@/store/app-store";
import { bucketProgress, currentStreakDays } from "@/lib/metrics";
import type { BucketProgress } from "@/lib/metrics";

export interface DailyProgressData {
  today: BucketProgress;
  week: BucketProgress;
  month: BucketProgress;
  streak: number;
  streakLabel: string;
}

/** Single source of truth for the dashboard progress metrics.
 *  Everything here is derived from task checkmarks — no session math. */
export function useDailyDashboard(): DailyProgressData {
  const { tasks } = useApp();

  return useMemo(() => {
    const today = bucketProgress(tasks, "daily");
    const week = bucketProgress(tasks, "weekly");
    const month = bucketProgress(tasks, "monthly");
    const streak = currentStreakDays(tasks);
    return {
      today,
      week,
      month,
      streak,
      streakLabel: `${streak} ${streak === 1 ? "day" : "days"}`,
    };
  }, [tasks]);
}