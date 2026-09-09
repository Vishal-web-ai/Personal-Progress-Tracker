import type { Task, TaskBucket } from "@/types";
import { startOfDay } from "@/lib/time";

export interface BucketProgress {
  done: number;
  total: number;
  pct: number;
}

export function bucketProgress(tasks: Task[], bucket: TaskBucket): BucketProgress {
  const list = tasks.filter((t) => t.bucket === bucket && !t.archived);
  const total = list.length;
  const done = list.filter((t) => t.status === "done").length;
  return { done, total, pct: total === 0 ? 0 : Math.round((done / total) * 100) };
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