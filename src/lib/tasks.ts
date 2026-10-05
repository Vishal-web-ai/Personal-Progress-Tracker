import type { Task } from "@/types";
import { addDaysKey, dayKey, daysBetweenKeys } from "@/lib/time";

const MAX_REPEAT_DAYS = 30;
const MAX_CATCHUP = 30;

export function isLiveTask(t: Task): boolean {
  return !t.archived;
}

export function isTaskOnDay(t: Task, day: string): boolean {
  return isLiveTask(t) && t.bucket === "daily" && t.day === day;
}

export function isTodayTask(t: Task, day: string = dayKey(new Date())): boolean {
  return isTaskOnDay(t, day);
}

export function upcomingTasks(tasks: Task[], day: string = dayKey(new Date())): Task[] {
  return tasks
    .filter((t) => isLiveTask(t) && t.bucket === "daily" && !!t.day && t.day > day)
    .sort((a, b) => (a.day! < b.day! ? -1 : a.day! > b.day! ? 1 : 0));
}

export function repeatStep(t: Task): number {
  const n = t.repeatEvery;
  if (typeof n !== "number" || !Number.isInteger(n) || n < 1 || n > MAX_REPEAT_DAYS) return 0;
  return n;
}

export function occurrenceDates(start: string, step: number, count: number): string[] {
  const out: string[] = [];
  let cursor = start;
  for (let i = 0; i < count; i++) {
    out.push(cursor);
    cursor = addDaysKey(cursor, step);
  }
  return out;
}

/** "Tomorrow" / "In 4 days" for a future day, "" otherwise.
 *
 *  Used on the Upcoming group heading, where it sits opposite a plain date — so
 *  it can say the relative distance at any range without ever repeating the
 *  date it is paired with. Returns "" for today or the past, where a relative
 *  label would mislead. */
export function relativeDayLabel(today: string, day: string): string {
  const diff = daysBetweenKeys(today, day);
  if (diff <= 0) return "";
  if (diff === 1) return "Tomorrow";
  return `In ${diff} days`;
}

/** Archive daily tasks whose calendar day is behind today, rollout incomplete
 *  monthly tasks forward to the current month. A repeating task keeps every
 *  occurrence it passed — each archived with its own status, so a done day and
 *  a missed day stay distinguishable — and hands the first occurrence on or
 *  after today a fresh live copy. Because each step advances exactly one
 *  interval, the cadence stays anchored to the original start date and a missed
 *  occurrence never shifts the ones after it. */
export function rolloverTasks(tasks: Task[], today: string = dayKey(new Date())): Task[] {
  const thisMonth = today.slice(0, 7);
  return tasks.flatMap((t) => {
    if (t.bucket === "daily" && t.day && t.day < today && isLiveTask(t)) {
      const step = repeatStep(t);
      if (step === 0) return [{ ...t, archived: true }];

      const missed: Task[] = [];
      let cursor = t.day;
      let salt = 0;
      while (cursor < today) {
        missed.push({ ...t, id: `${t.id}-m${salt}`, day: cursor, archived: true });
        salt += 1;
        if (salt >= MAX_CATCHUP) {
          const jump = Math.ceil(daysBetweenKeys(cursor, today) / step) * step;
          cursor = addDaysKey(cursor, jump);
          break;
        }
        cursor = addDaysKey(cursor, step);
      }

      return [
        ...missed,
        {
          ...t,
          id: `${t.id}-n${salt}`,
          day: cursor,
          status: "todo",
          completedAt: undefined,
          archived: false,
        },
      ];
    }
    if (
      t.bucket === "monthly" &&
      t.monthKey &&
      t.monthKey < thisMonth &&
      isLiveTask(t) &&
      t.status !== "done"
    ) {
      return [{ ...t, monthKey: thisMonth }];
    }
    return [t];
  });
}