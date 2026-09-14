import type { Task, TaskBucket } from "@/types";
import { addDaysKey, dayKey, monthKey, startOfDay, startOfWeek } from "@/lib/time";

export interface BucketProgress {
  done: number;
  total: number;
  pct: number;
}

function progressOf(list: Task[]): BucketProgress {
  const total = list.length;
  const done = list.filter((t) => t.status === "done").length;
  return { done, total, pct: total === 0 ? 0 : Math.round((done / total) * 100) };
}

export function bucketProgress(tasks: Task[], bucket: TaskBucket): BucketProgress {
  const today = bucket === "daily" ? dayKey(new Date()) : undefined;
  return progressOf(
    tasks.filter(
      (t) =>
        t.bucket === bucket && !t.archived && (today === undefined || t.day === today)
    )
  );
}

/** Weekly tasks whose weekStart falls inside this week (Mon–Sun of `now`). */
export function currentWeekProgress(tasks: Task[], now: Date = new Date()): BucketProgress {
  const start = dayKey(new Date(startOfWeek(now)));
  const end = addDaysKey(start, 6);
  return progressOf(
    tasks.filter(
      (t) =>
        t.bucket === "weekly" && !t.archived && t.weekStart && t.weekStart >= start && t.weekStart <= end
    )
  );
}

/** Monthly tasks whose monthKey is the current month. */
export function currentMonthProgress(tasks: Task[], now: Date = new Date()): BucketProgress {
  const thisMonth = monthKey(now);
  return progressOf(
    tasks.filter((t) => t.bucket === "monthly" && !t.archived && t.monthKey === thisMonth)
  );
}

export function currentStreakDays(tasks: Task[], reference: number = Date.now()): number {
  // A "day" counts if the user completed a task that day.
  const activeDays = new Set<number>();
  tasks.forEach((t) => {
    if (t.completedAt) activeDays.add(startOfDay(new Date(t.completedAt)));
  });

  let streak = 0;
  const cursor = new Date(reference);
  cursor.setHours(0, 0, 0, 0);
  // if today has no activity yet, start counting from yesterday
  if (!activeDays.has(startOfDay(new Date(reference)))) {
    cursor.setDate(cursor.getDate() - 1);
  }
  while (activeDays.has(cursor.getTime())) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

export function completionByArea(
  tasks: Task[]
): { areaName: string; done: number; total: number; pct: number }[] {
  const map = new Map<string, { done: number; total: number }>();
  tasks.forEach((t) => {
    const cur = map.get(t.areaName) ?? { done: 0, total: 0 };
    cur.total += 1;
    if (t.status === "done") cur.done += 1;
    map.set(t.areaName, cur);
  });
  return Array.from(map.entries())
    .map(([areaName, { done, total }]) => ({
      areaName,
      done,
      total,
      pct: total === 0 ? 0 : Math.round((done / total) * 100),
    }))
    .sort((a, b) => b.done - a.done);
}

export function recentCompletions(tasks: Task[], limit = 8): Task[] {
  return tasks
    .filter((t) => t.status === "done" && t.completedAt)
    .sort((a, b) => (b.completedAt ?? 0) - (a.completedAt ?? 0))
    .slice(0, limit);
}