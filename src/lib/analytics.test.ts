import { describe, expect, it } from "vitest";
import type { Task, WorkSession } from "@/types";
import { rolloverTasks } from "@/lib/tasks";
import { buildWeekDays, buildPeriodSet, buildMonthWeeks } from "@/lib/analytics";
import { addDaysKey, dayKey, startOfDay, parseDayKey, startOfWeek, startOfMonth, monthKey } from "@/lib/time";

const NOW = Date.now();
const TODAY = dayKey(new Date(NOW));
const MONDAY = startOfWeek(new Date(NOW));
const m = (offset: number) => dayKey(new Date(MONDAY + offset * 86400000));

function noonOf(key: string): number {
  const [y, mo, d] = key.split("-").map(Number);
  return new Date(y, mo - 1, d, 12).getTime();
}

function task(over: Partial<Task> & Pick<Task, "id" | "createdAt">): Task {
  return {
    title: "t",
    areaId: "a",
    areaName: "A",
    priority: "medium",
    status: "todo",
    bucket: "daily",
    icon: "cloud",
    hasTimer: false,
    day: TODAY,
    ...over,
  };
}

function dayStartOf(key: string): number {
  return startOfDay(parseDayKey(key));
}

describe("analytics occurrence counting", () => {
  it("counts each rollover occurrence on its own day — planned is never inflated by fan-out", () => {
    const seed = task({
      id: "r1",
      day: addDaysKey(TODAY, -4),
      createdAt: noonOf(addDaysKey(TODAY, -4)),
      repeatEvery: 1,
      status: "done",
      completedAt: noonOf(addDaysKey(TODAY, -4)),
    });
    const rolled = rolloverTasks([seed], TODAY);
    const withCompletions = rolled.map((t) =>
      t.day === addDaysKey(TODAY, -3) || t.day === addDaysKey(TODAY, -2)
        ? { ...t, status: "done" as const, completedAt: noonOf(t.day!) }
        : t
    );

    const set = buildPeriodSet("daily", withCompletions, [], NOW);
    for (const p of set.points) {
      expect(p.planned).toBeLessThanOrEqual(1);
      if (p.completed > 0) {
        expect(p.planned).toBe(p.completed);
        expect(p.pct).toBe(100);
      }
      expect(p.pct === null || p.pct <= 100).toBe(true);
    }
    const doneDay = set.points.find((p) => p.start === dayStartOf(addDaysKey(TODAY, -3)));
    expect(doneDay?.completed).toBe(1);
    expect(doneDay?.planned).toBe(1);
  });

  it("never exceeds 100% when completions trail the creation day", () => {
    const tasks = [
      task({ id: "a", day: addDaysKey(TODAY, -2), createdAt: noonOf(addDaysKey(TODAY, -2)), status: "done", completedAt: noonOf(addDaysKey(TODAY, -1)) }),
      task({ id: "b", day: addDaysKey(TODAY, -1), createdAt: noonOf(addDaysKey(TODAY, -1)), status: "done", completedAt: noonOf(addDaysKey(TODAY, -1)) }),
    ];
    const set = buildPeriodSet("daily", tasks, [], NOW);
    for (const p of set.points) {
      expect(p.pct === null || p.pct <= 100).toBe(true);
      expect(p.completed).toBeLessThanOrEqual(p.planned);
    }
    const dayA = set.points.find((p) => p.start === dayStartOf(addDaysKey(TODAY, -2)));
    expect(dayA).toMatchObject({ planned: 1, completed: 1, pct: 100 });
  });

  it("credits a future-scheduled task to its scheduled day, not its creation day", () => {
    const tasks = [task({ id: "f", day: m(2), createdAt: noonOf(m(0)) })];
    const week = buildWeekDays(0, tasks, [], NOW);
    const monday = week.points.find((p) => p.start === dayStartOf(m(0)));
    const wednesday = week.points.find((p) => p.start === dayStartOf(m(2)));
    expect(monday?.planned).toBe(0);
    expect(wednesday?.planned).toBe(1);
  });

  it("places weekly tasks on their weekStart and monthly tasks on the 1st", () => {
    const pastMonday = startOfWeek(new Date(NOW - 14 * 86400000));
    const pastWeekKey = dayKey(new Date(pastMonday));
    const weekly = task({ id: "w", bucket: "weekly", day: undefined, weekStart: pastWeekKey, createdAt: NOW - 30 * 86400000 });

    const pastMonthStart = startOfMonth(new Date(NOW - 90 * 86400000));
    const firstOfMonth = new Date(pastMonthStart);
    const monthKeyPast = monthKey(firstOfMonth);
    const monthly = task({ id: "mo", bucket: "monthly", day: undefined, monthKey: monthKeyPast, createdAt: pastMonthStart });
    const dailyOn1st = task({ id: "d", day: dayKey(firstOfMonth), createdAt: pastMonthStart });

    const week = buildWeekDays(-2, [weekly], [], NOW);
    const thatMonday = week.points.find((p) => p.start === dayStartOf(pastWeekKey));
    expect(thatMonday?.planned).toBe(1);

    const month = buildMonthWeeks(pastMonthStart, [monthly, dailyOn1st], [], pastMonthStart + 40 * 86400000);
    const monthTotal = month.points.reduce((sum, p) => sum + p.planned, 0);
    expect(monthTotal).toBe(2); // monthly on the 1st + daily on the 1st, counted once even across the leading stub week

    const monthlySet = buildPeriodSet("monthly", [monthly, dailyOn1st], [], NOW);
    const pastMonthPoint = monthlySet.points.find((p) => p.start === pastMonthStart);
    expect(pastMonthPoint?.planned).toBe(2); // both anchored to the 1st of that month
  });

  it("keeps focus minutes bucketed by session end time", () => {
    const sessions: WorkSession[] = [
      {
        id: "s1",
        taskId: "x",
        mode: "stopwatch",
        startedAt: noonOf(TODAY) - 3600000,
        endedAt: noonOf(TODAY),
        activeDuration: 60 * 60000,
        pausedDuration: 0,
        status: "saved",
      },
    ];
    const set = buildPeriodSet("daily", [], sessions, NOW);
    const today = set.points.find((p) => p.start === dayStartOf(TODAY));
    expect(today?.focusMinutes).toBe(60);
  });
});
