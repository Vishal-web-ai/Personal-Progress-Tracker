import type { Task, WorkSession } from "@/types";
import { startOfDay, startOfWeek, startOfMonth, parseDayKey, WEEKDAYS_SHORT, MONTHS } from "@/lib/time";

export type AnalyticsPeriod = "daily" | "weekly" | "monthly";

export interface PeriodPoint {
  key: string;
  start: number; // period start timestamp
  label: string; // short x-axis label
  title: string; // full label (tooltip)
  planned: number; // occurrences scheduled in this period
  completed: number; // occurrences of this period marked done
  focusMinutes: number; // session active time in this period
  pct: number | null; // completion rate (0-100), null when nothing was planned
  /** True only when the period recorded real activity. Charts must draw
   *  no-data periods as gaps — plotting them as 0% makes a line dive to the
   *  floor on every day the user did nothing, and future days of the current
   *  week look like a collapse instead of "no data yet". */
  hasData: boolean;
}

/** A period counts as data when it recorded tasks or focus time. */
export function pointHasData(p: {
  planned: number;
  completed: number;
  focusMinutes: number;
}): boolean {
  return p.planned > 0 || p.completed > 0 || p.focusMinutes > 0;
}

function makePoint(
  start: number,
  label: string,
  title: string,
  planned: number,
  completed: number,
  focusMinutes: number
): PeriodPoint {
  return {
    key: String(start),
    start,
    label,
    title,
    planned,
    completed,
    focusMinutes,
    pct: planned === 0 ? null : Math.round((completed / planned) * 100),
    hasData: pointHasData({ planned, completed, focusMinutes }),
  };
}

/** Calendar-day arithmetic. Fixed 24h stepping drifts across DST, so bucket
 *  keys (local midnights from `startOfDay`) stop matching point keys and days
 *  silently render as zero. */
function addDaysTs(ts: number, days: number): number {
  const d = new Date(ts);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + days).getTime();
}

/** The day an occurrence belongs to, matching what the dashboard shows:
 *  daily → its `day`, weekly → its `weekStart` (lands on the Monday), monthly
 *  → the 1st of its month. One anchor per occurrence, so history counts each
 *  planned unit exactly once — createdAt-based counting inflated the creation
 *  day with every repeat fan-out copy and credited completions to days that
 *  had no plan. */
function scheduledDayStart(t: Task): number | null {
  if (t.bucket === "weekly" && t.weekStart) return startOfDay(parseDayKey(t.weekStart));
  if (t.bucket === "monthly" && t.monthKey) {
    const [y, m] = t.monthKey.split("-").map(Number);
    if (Number.isInteger(y) && Number.isInteger(m)) return startOfDay(new Date(y, m - 1, 1));
    return null;
  }
  return t.day ? startOfDay(parseDayKey(t.day)) : null;
}

/** Buckets every occurrence/session into day-start keys. Days after `now` are
 *  not history yet — counting their plan made the current week's trend dive to
 *  0% into the future (gaps are the intended read for days that haven't
 *  happened). */
function bucketByDay(
  tasks: Task[],
  sessions: WorkSession[],
  now: number
): { planned: Map<number, number>; completed: Map<number, number>; focus: Map<number, number> } {
  const planned = new Map<number, number>();
  const completed = new Map<number, number>();
  const focus = new Map<number, number>();
  const todayStart = startOfDay(new Date(now));

  const touch = (map: Map<number, number>, dayStart: number, delta: number) => {
    map.set(dayStart, (map.get(dayStart) ?? 0) + delta);
  };

  for (const t of tasks) {
    const dayStart = scheduledDayStart(t);
    if (dayStart === null || dayStart > todayStart) continue;
    touch(planned, dayStart, 1);
    // Count completions from both live done tasks AND archived tasks (historical rollover records)
    if (t.status === "done" || t.archived === true) touch(completed, dayStart, 1);
  }

  for (const s of sessions) {
    if (s.status !== "saved") continue;
    const anchor = s.endedAt ?? s.startedAt;
    if (!anchor) continue;
    const mins = (s.activeDuration ?? 0) / 60000;
    if (mins <= 0) continue;
    touch(focus, startOfDay(new Date(anchor)), mins);
  }

  return { planned, completed, focus };
}

export interface PeriodSet {
  period: AnalyticsPeriod;
  points: PeriodPoint[];
  current: PeriodPoint | null;
  previous: PeriodPoint | null;
}

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
  const monday = startOfWeek(new Date(addDaysTs(now, weekOffset * 7)));
  const sunday = addDaysTs(monday, 6);

  const { planned, completed, focus } = bucketByDay(tasks, sessions, now);

  const points: PeriodPoint[] = [];
  for (let i = 0; i < 7; i++) {
    const dayStart = addDaysTs(monday, i);
    const d = new Date(dayStart);
    points.push(
      makePoint(
        dayStart,
        WEEKDAYS_SHORT[i],
        `${WEEKDAYS_SHORT[i]}, ${d.getDate()} ${MONTHS[d.getMonth()].slice(0, 3)}`,
        planned.get(dayStart) ?? 0,
        completed.get(dayStart) ?? 0,
        focus.get(dayStart) ?? 0
      )
    );
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

/**
 * Mon–Sun week blocks for the calendar month containing `monthStart`, aligned to
 * real weeks and labelled "Week 1", "Week 2", … counted from the first full week
 * in the month. The leading block is skipped when the month starts mid-week — it
 * would be a 1–6 day stub whose length varies with the calendar, so it made the
 * x-axis both ugly and inconsistent month to month. Every month still yields 4–5
 * full weeks. The real date range stays on `title` for the tooltip; the month
 * nav above the chart carries the month itself.
 */
export function buildMonthWeeks(
  monthStart: number,
  tasks: Task[],
  sessions: WorkSession[],
  now: number = Date.now()
): { points: PeriodPoint[]; title: string } {
  const first = startOfMonth(new Date(monthStart));
  const monthStartDate = new Date(first);
  const nextMonth = new Date(monthStartDate.getFullYear(), monthStartDate.getMonth() + 1, 1).getTime();

  const { planned, completed, focus } = bucketByDay(tasks, sessions, now);

  const points: PeriodPoint[] = [];
  const firstMonday = startOfWeek(new Date(first));
  // A month that doesn't begin on a Monday has its `startOfWeek` in the previous
  // month. The stub days fold into the first block so occurrences anchored there
  // (e.g. a monthly task on the 1st) are still counted; the x-axis stays aligned
  // to full in-month weeks.
  const blockStarts: number[] = [];
  let cursor = firstMonday < first ? addDaysTs(firstMonday, 7) : firstMonday;
  for (; cursor < nextMonth; cursor = addDaysTs(cursor, 7)) blockStarts.push(cursor);

  for (let i = 0; i < blockStarts.length; i++) {
    const weekStart = blockStarts[i];

    const days: number[] = [];
    // Block 0 also covers the month's leading days before the first in-month Monday.
    if (i === 0) {
      for (let d = first; d < weekStart; d = addDaysTs(d, 1)) days.push(d);
    }
    for (let d = weekStart; d < addDaysTs(weekStart, 7); d = addDaysTs(d, 1)) days.push(d);

    let plannedCount = 0;
    let completedCount = 0;
    let focusMinutes = 0;
    for (const d of days) {
      // Days past "now" haven't happened yet — never count them.
      if (d > now) break;
      plannedCount += planned.get(d) ?? 0;
      completedCount += completed.get(d) ?? 0;
      focusMinutes += focus.get(d) ?? 0;
    }

    // Clip the week to the month for the tooltip's date range.
    const overlapStart = Math.max(weekStart, first);
    const overlapEnd = Math.min(addDaysTs(weekStart, 6), nextMonth - 1);
    const from = new Date(overlapStart);
    const to = new Date(overlapEnd);
    const sameMonth = from.getMonth() === to.getMonth();
    const range = sameMonth
      ? `${from.getDate()}–${to.getDate()} ${MONTHS[from.getMonth()].slice(0, 3)}`
      : `${from.getDate()} ${MONTHS[from.getMonth()].slice(0, 3)} – ${to.getDate()} ${MONTHS[to.getMonth()].slice(0, 3)}`;

    points.push(
      makePoint(
        weekStart,
        `Week ${i + 1}`,
        `${range}, ${from.getFullYear()}`,
        plannedCount,
        completedCount,
        focusMinutes
      )
    );
  }

  points.sort((a, b) => a.start - b.start);

  const title = `${monthStartDate.getDate()} ${MONTHS[monthStartDate.getMonth()].slice(0, 3)} – ${new Date(nextMonth - 1).getDate()} ${MONTHS[new Date(nextMonth - 1).getMonth()].slice(0, 3)}, ${monthStartDate.getFullYear()}`;

  return { points, title };
}

function bucketStart(period: AnalyticsPeriod, ts: number): number {
  if (period === "daily") return startOfDay(new Date(ts));
  if (period === "weekly") return startOfWeek(new Date(ts));
  return startOfMonth(new Date(ts));
}

/** Bucket every occurrence/session into period-sized counters, counting only
 *  days up to and including `now`. */
function bucketByPeriod(
  period: AnalyticsPeriod,
  tasks: Task[],
  sessions: WorkSession[],
  now: number
): {
  planned: Map<number, number>;
  completed: Map<number, number>;
  focus: Map<number, number>;
  minStart: number | null;
} {
  const planned = new Map<number, number>();
  const completed = new Map<number, number>();
  const focus = new Map<number, number>();
  let minStart: number | null = null;
  const todayStart = startOfDay(new Date(now));

  const touch = (map: Map<number, number>, start: number, delta: number) => {
    map.set(start, (map.get(start) ?? 0) + delta);
    if (minStart === null || start < minStart) minStart = start;
  };

  for (const t of tasks) {
    const dayStart = scheduledDayStart(t);
    if (dayStart === null || dayStart > todayStart) continue;
    touch(planned, bucketStart(period, dayStart), 1);
    // Count completions from both live done tasks AND archived tasks (historical rollover records)
    if (t.status === "done" || t.archived === true) touch(completed, bucketStart(period, dayStart), 1);
  }

  for (const s of sessions) {
    if (s.status !== "saved") continue;
    const anchor = s.endedAt ?? s.startedAt;
    if (!anchor) continue;
    const mins = (s.activeDuration ?? 0) / 60000;
    if (mins <= 0) continue;
    touch(focus, bucketStart(period, anchor), mins);
  }

  return { planned, completed, focus, minStart };
}

function nextPeriod(period: AnalyticsPeriod, start: number): number {
  if (period === "daily") return addDaysTs(start, 1);
  if (period === "weekly") return addDaysTs(start, 7);
  const d = new Date(start);
  return new Date(d.getFullYear(), d.getMonth() + 1, 1).getTime();
}

function periodLabel(period: AnalyticsPeriod, start: number): { label: string; title: string } {
  const d = new Date(start);
  if (period === "daily") {
    const today = startOfDay(new Date());
    const yesterday = addDaysTs(today, -1);
    if (start === today) return { label: "Today", title: "Today" };
    if (start === yesterday) return { label: "Yesterday", title: "Yesterday" };
    return {
      label: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      title: d.toLocaleDateString("en-US", { weekday: "short", month: "long", day: "numeric" }),
    };
  }
if (period === "weekly") {
     const end = new Date(addDaysTs(start, 6));
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
 * Aggregate every task into the chosen historical periods — "planned" and
 * "completed" from each occurrence's *scheduled day* (daily `day`, weekly
 * `weekStart`, monthly 1st of `monthKey`), focus minutes from saved sessions
 * (by endedAt fallback startedAt). Every occurrence counts exactly once, on the
 * same day the dashboard and task lists show it. Spans every period from the
 * earliest event up to the current period, capped at MAX_PERIODS. Returns
 * points newest-first.
 */
export function buildPeriodSet(
  period: AnalyticsPeriod,
  tasks: Task[],
  sessions: WorkSession[],
  now: number = Date.now()
): PeriodSet {
  const buckets = bucketByPeriod(period, tasks, sessions, now);
  const { planned, completed, focus, minStart } = buckets;

  const nowStart = bucketStart(period, now);
  const firstStart =
    minStart === null ? nowStart : Math.max(Math.min(minStart, nowStart), nextPeriod(period, shiftBack(nowStart, period, MAX_PERIODS - 1)));

  const points: PeriodPoint[] = [];
  for (let start = firstStart; start <= nowStart; start = nextPeriod(period, start)) {
    const { label, title } = periodLabel(period, start);
    points.push(
      makePoint(
        start,
        label,
        title,
        planned.get(start) ?? 0,
        completed.get(start) ?? 0,
        focus.get(start) ?? 0
      )
    );
  }

  points.sort((a, b) => b.start - a.start);

  const current = points[0] ?? null;
  const previous = points[1] ?? null;

  return { period, points, current, previous };
}

/** Upper bound on periods rendered at once, so a corrupt timestamp can't blow
 *  up the DOM. Weekly ≈ 2 years, monthly ≈ 3 years. */
const MAX_PERIODS = 104;

function shiftBack(start: number, period: AnalyticsPeriod, count: number): number {
  let s = start;
  for (let i = 0; i < count; i++) s = prevPeriod(period, s);
  return s;
}

function prevPeriod(period: AnalyticsPeriod, start: number): number {
  if (period === "daily") return addDaysTs(start, -1);
  if (period === "weekly") return addDaysTs(start, -7);
  const d = new Date(start);
  return new Date(d.getFullYear(), d.getMonth() - 1, 1).getTime();
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
