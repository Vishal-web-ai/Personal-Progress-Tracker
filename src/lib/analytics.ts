import type { Task, WorkSession } from "@/types";
import { startOfDay, startOfWeek, startOfMonth, WEEKDAYS_SHORT, MONTHS } from "@/lib/time";

export type AnalyticsPeriod = "daily" | "weekly" | "monthly";

export interface PeriodPoint {
  key: string;
  start: number; // period start timestamp
  label: string; // short x-axis label
  title: string; // full label (tooltip)
  planned: number; // tasks created in this period
  completed: number; // tasks completed in this period
  focusMinutes: number; // session active time in this period
  pct: number | null; // completion rate (0-100), null when nothing was planned
}

export interface PeriodSet {
  period: AnalyticsPeriod;
  points: PeriodPoint[];
  current: PeriodPoint | null;
  previous: PeriodPoint | null;
}

const DAY = 86400000;

/**
 * Build 7 data points (Mon–Sun) for a specific week.
 * `weekOffset` 0 = this week, -1 = last week, etc.
 */
export function buildWeekDays(
  weekOffset: number,
  tasks: Task[],
  sessions: WorkSession[],
  now: number = Date.now()
): { points: PeriodPoint[]; title: string } {
  const monday = startOfWeek(new Date(now + weekOffset * 7 * DAY));
  const sunday = monday + 6 * DAY;

  const planned = new Map<number, number>();
  const completed = new Map<number, number>();
  const focus = new Map<number, number>();

  const touch = (map: Map<number, number>, dayStart: number, delta: number) => {
    map.set(dayStart, (map.get(dayStart) ?? 0) + delta);
  };

  for (const t of tasks) {
    if (t.createdAt) touch(planned, startOfDay(new Date(t.createdAt)), 1);
    if (t.completedAt) touch(completed, startOfDay(new Date(t.completedAt)), 1);
  }

  for (const s of sessions) {
    if (s.status !== "saved") continue;
    const anchor = s.endedAt ?? s.startedAt;
    if (!anchor) continue;
    const mins = (s.activeDuration ?? 0) / 60000;
    if (mins <= 0) continue;
    touch(focus, startOfDay(new Date(anchor)), mins);
  }

  const points: PeriodPoint[] = [];
  for (let i = 0; i < 7; i++) {
    const dayStart = monday + i * DAY;
    const d = new Date(dayStart);
    const plannedCount = planned.get(dayStart) ?? 0;
    const completedCount = completed.get(dayStart) ?? 0;
    const focusMinutes = focus.get(dayStart) ?? 0;
    points.push({
      key: String(dayStart),
      start: dayStart,
      label: WEEKDAYS_SHORT[i],
      title: `${WEEKDAYS_SHORT[i]}, ${d.getDate()} ${MONTHS[d.getMonth()].slice(0, 3)}`,
      planned: plannedCount,
      completed: completedCount,
      focusMinutes,
      pct: plannedCount === 0 ? null : Math.round((completedCount / plannedCount) * 100),
    });
  }

  points.sort((a, b) => a.start - b.start);

  const mon = new Date(monday);
  const sun = new Date(sunday);
  const monLabel = `${mon.getDate()} ${MONTHS[mon.getMonth()].slice(0, 3)}`;
  const sunLabel = `${sun.getDate()} ${MONTHS[sun.getMonth()].slice(0, 3)}`;
  const title = weekOffset === 0
    ? `This week · ${monLabel} – ${sunLabel}`
    : `${monLabel} – ${sunLabel}`;

  return { points, title };
}

function bucketStart(period: AnalyticsPeriod, ts: number): number {
  if (period === "daily") return startOfDay(new Date(ts));
  if (period === "weekly") return startOfWeek(new Date(ts));
  return startOfMonth(new Date(ts));
}

function nextPeriod(period: AnalyticsPeriod, start: number): number {
  if (period === "daily") return start + DAY;
  if (period === "weekly") return start + 7 * DAY;
  const d = new Date(start);
  return new Date(d.getFullYear(), d.getMonth() + 1, 1).getTime();
}

function periodLabel(period: AnalyticsPeriod, start: number): { label: string; title: string } {
  const d = new Date(start);
  if (period === "daily") {
    const today = startOfDay(new Date());
    const yesterday = today - DAY;
    if (start === today) return { label: "Today", title: "Today" };
    if (start === yesterday) return { label: "Yesterday", title: "Yesterday" };
    return {
      label: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      title: d.toLocaleDateString("en-US", { weekday: "short", month: "long", day: "numeric" }),
    };
  }
if (period === "weekly") {
     const end = new Date(start + 6 * DAY);
     const startMonth = d.getMonth();
     const endMonth = end.getMonth();
     const startDay = d.getDate();
     const endDay = end.getDate();
     const monthShort = d.toLocaleDateString("en-US", { month: "short" });
     const endMonthShort = end.toLocaleDateString("en-US", { month: "short" });
     let label;
     if (startMonth === endMonth) {
       label = `${monthShort} ${startDay}–${endDay}`;
     } else {
       label = `${monthShort} ${startDay}–${endMonthShort} ${endDay}`;
     }
     const title = `${label}, ${d.getFullYear()}`;
     return start === startOfWeek(new Date()) ? { label: "This wk", title: title } : { label, title };
   }
  const label = d.toLocaleDateString("en-US", { month: "short" });
  const title = d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  const now = new Date();
  return now.getMonth() === d.getMonth() && now.getFullYear() === d.getFullYear()
    ? { label: "This mo", title }
    : { label, title };
}

/**
 * Aggregate every task into the chosen historical periods — "planned" from
 * `createdAt`, "completed" from `completedAt`, focus minutes from saved sessions
 * (by endedAt fallback startedAt). Spans every period from the earliest event up
 * to the current period. Returns points newest-first.
 */
export function buildPeriodSet(
  period: AnalyticsPeriod,
  tasks: Task[],
  sessions: WorkSession[],
  now: number = Date.now()
): PeriodSet {
  const planned = new Map<number, number>();
  const completed = new Map<number, number>();
  const focus = new Map<number, number>();

  let minStart: number | null = null;

  const touch = (map: Map<number, number>, start: number, delta: number) => {
    map.set(start, (map.get(start) ?? 0) + delta);
    if (minStart === null || start < minStart) minStart = start;
  };

  for (const t of tasks) {
    if (t.createdAt) touch(planned, bucketStart(period, t.createdAt), 1);
    if (t.completedAt) touch(completed, bucketStart(period, t.completedAt), 1);
  }

  for (const s of sessions) {
    if (s.status !== "saved") continue;
    const anchor = s.endedAt ?? s.startedAt;
    if (!anchor) continue;
    const mins = (s.activeDuration ?? 0) / 60000;
    if (mins <= 0) continue;
    touch(focus, bucketStart(period, anchor), mins);
  }

  const nowStart = bucketStart(period, now);
  const firstStart = minStart === null ? nowStart : Math.min(minStart, nowStart);

  const points: PeriodPoint[] = [];
  for (let start = firstStart; start <= nowStart; start = nextPeriod(period, start)) {
    const plannedCount = planned.get(start) ?? 0;
    const completedCount = completed.get(start) ?? 0;
    const focusMinutes = focus.get(start) ?? 0;
    points.push({
      key: String(start),
      start,
      ...periodLabel(period, start),
      planned: plannedCount,
      completed: completedCount,
      focusMinutes,
      pct: plannedCount === 0 ? null : Math.round((completedCount / plannedCount) * 100),
    });
  }

  points.sort((a, b) => b.start - a.start);

  const current = points[0] ?? null;
  const previous = points[1] ?? null;

  return { period, points, current, previous };
}

export interface Delta {
  diff: number; // absolute change vs previous
  pct: number | null; // relative % change vs previous (null when previous is 0)
}

function computeDelta(current: number, previous: number): Delta {
  if (previous === 0) {
    return { diff: current, pct: current === 0 ? null : 100 };
  }
  return { diff: current - previous, pct: Math.round(((current - previous) / previous) * 100) };
}

export function percentDelta(current: PeriodPoint | null, previous: PeriodPoint | null): Delta {
  // A rate is only comparable when both periods actually had planned tasks.
  if (current?.pct == null || previous?.pct == null) return { diff: 0, pct: null };
  return computeDelta(current.pct, previous.pct);
}

export function countDelta(current: PeriodPoint | null, previous: PeriodPoint | null): Delta {
  return computeDelta(current?.completed ?? 0, previous?.completed ?? 0);
}

export function focusDelta(current: PeriodPoint | null, previous: PeriodPoint | null): Delta {
  return computeDelta(current?.focusMinutes ?? 0, previous?.focusMinutes ?? 0);
}
