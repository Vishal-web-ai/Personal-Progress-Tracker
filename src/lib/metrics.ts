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
  const byDay = new Map<string, { total: number; done: number }>();
  tasks.forEach((t) => {
    if (t.bucket !== "daily" || t.archived || !t.day) return;
    const rec = byDay.get(t.day) ?? { total: 0, done: 0 };
    rec.total += 1;
    if (t.status === "done") rec.done += 1;
    byDay.set(t.day, rec);
  });

  let streak = 0;
  let cursor = dayKey(new Date(reference));

  // If today is fully complete, count it
  const todayRec = byDay.get(cursor);
  if (todayRec && todayRec.done === todayRec.total && todayRec.total > 0) {
    streak += 1;
  }

  // Walk backward counting fully-complete days
  for (let i = 1; i < 365; i++) {
    cursor = addDaysKey(cursor, -1);
    const rec = byDay.get(cursor);
    if (!rec) continue; // rest day - neutral
    if (rec.done === rec.total && rec.total > 0) {
      streak += 1;
    } else {
      break; // missed day ends the run
    }
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