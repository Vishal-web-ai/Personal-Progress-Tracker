"use client";

import { useMemo } from "react";
import { useApp } from "@/store/app-store";
import { bucketProgress, currentMonthProgress, currentWeekProgress } from "@/lib/metrics";
import type { BucketProgress } from "@/lib/metrics";

export interface DailyProgressData {
  today: BucketProgress;
  week: BucketProgress;
  month: BucketProgress;
}

/** Single source of truth for the dashboard progress metrics.
 *  Everything here is derived from task checkmarks — no session math.
 *  Weekly/monthly are scoped to the current week / current month. */
export function useDailyDashboard(): DailyProgressData {
  const { tasks } = useApp();

  return useMemo(() => {
    const today = bucketProgress(tasks, "daily");
    const week = currentWeekProgress(tasks);
    const month = currentMonthProgress(tasks);
    return {
      today,
      week,
      month,
    };
  }, [tasks]);
}