import { describe, expect, it } from "vitest";
import type { Task } from "@/types";
import {
  isTodayTask,
  isTaskOnDay,
  occurrenceDates,
  repeatStep,
  rolloverTasks,
  upcomingTasks,
} from "@/lib/tasks";

let seq = 0;

function makeTask(over: Partial<Task> = {}): Task {
  seq += 1;
  return {
    id: `t-${seq}`,
    title: "Task",
    areaId: "cloud",
    areaName: "Cloud",
    priority: "medium",
    status: "todo",
    bucket: "daily",
    icon: "cloud",
    archived: false,
    createdAt: 1_700_000_000_000,
    ...over,
  };
}

function daysBetween(a: string, b: string): number {
  const [ay, am, ad] = a.split("-").map(Number);
  const [by, bm, bd] = b.split("-").map(Number);
  return Math.round(
    (new Date(by, bm - 1, bd).getTime() - new Date(ay, am - 1, ad).getTime()) / 86_400_000
  );
}

describe("repeatStep", () => {
  it("is 0 for a one-time task", () => {
    expect(repeatStep(makeTask())).toBe(0);
  });

  it("is 0 when repeatEvery is absent", () => {
    expect(repeatStep(makeTask({ repeatEvery: undefined }))).toBe(0);
  });

  it("is 0 when repeatEvery is 0", () => {
    expect(repeatStep(makeTask({ repeatEvery: 0 }))).toBe(0);
  });

  it("is 0 above the 30-day ceiling", () => {
    expect(repeatStep(makeTask({ repeatEvery: 45 }))).toBe(0);
  });

  it("is 0 for a negative or fractional value", () => {
    expect(repeatStep(makeTask({ repeatEvery: -3 }))).toBe(0);
    expect(repeatStep(makeTask({ repeatEvery: 2.5 }))).toBe(0);
  });

  it("passes through 1", () => {
    expect(repeatStep(makeTask({ repeatEvery: 1 }))).toBe(1);
  });

  it("passes through 30", () => {
    expect(repeatStep(makeTask({ repeatEvery: 30 }))).toBe(30);
  });
});

describe("occurrenceDates", () => {
  it("steps by the interval from the anchor", () => {
    expect(occurrenceDates("2026-10-07", 3, 3)).toEqual([
      "2026-10-07",
      "2026-10-10",
      "2026-10-13",
    ]);
  });

  it("returns a single date when count is 1", () => {
    expect(occurrenceDates("2026-10-07", 5, 1)).toEqual(["2026-10-07"]);
  });

  it("returns nothing when count is 0", () => {
    expect(occurrenceDates("2026-10-07", 2, 0)).toEqual([]);
  });
});

describe("isTaskOnDay / isTodayTask", () => {
  it("matches an exact day", () => {
    const t = makeTask({ day: "2026-10-05" });
    expect(isTaskOnDay(t, "2026-10-05")).toBe(true);
    expect(isTaskOnDay(t, "2026-10-06")).toBe(false);
  });

  it("rejects archived tasks", () => {
    expect(isTaskOnDay(makeTask({ day: "2026-10-05", archived: true }), "2026-10-05")).toBe(false);
  });

  it("rejects non-daily buckets", () => {
    expect(isTaskOnDay(makeTask({ day: "2026-10-05", bucket: "weekly" }), "2026-10-05")).toBe(false);
  });

  it("does not match a future day", () => {
    expect(isTodayTask(makeTask({ day: "2026-10-06" }), "2026-10-05")).toBe(false);
  });
});

describe("upcomingTasks", () => {
  it("returns only future live daily tasks, ascending", () => {
    const tasks = [
      makeTask({ id: "c", day: "2026-10-09" }),
      makeTask({ id: "a", day: "2026-10-07" }),
      makeTask({ id: "b", day: "2026-10-08" }),
      makeTask({ id: "today", day: "2026-10-05" }),
      makeTask({ id: "past", day: "2026-10-04" }),
      makeTask({ id: "gone", day: "2026-10-07", archived: true }),
      makeTask({ id: "wk", day: "2026-10-07", bucket: "weekly" }),
    ];
    expect(upcomingTasks(tasks, "2026-10-05").map((t) => t.id)).toEqual(["a", "b", "c"]);
  });

  it("is empty when nothing is scheduled ahead", () => {
    expect(upcomingTasks([makeTask({ day: "2026-10-05" })], "2026-10-05")).toEqual([]);
  });
});

describe("rolloverTasks — one-time tasks", () => {
  it("archives a one-time task whose day has passed", () => {
    const out = rolloverTasks([makeTask({ day: "2026-10-01" })], "2026-10-05");
    expect(out).toHaveLength(1);
    expect(out[0].archived).toBe(true);
    expect(out[0].day).toBe("2026-10-01");
    expect(out[0].repeatEvery).toBeUndefined();
  });

  it("leaves a task dated today alone", () => {
    const out = rolloverTasks([makeTask({ day: "2026-10-05" })], "2026-10-05");
    expect(out).toHaveLength(1);
    expect(out[0].archived).toBe(false);
  });

  it("leaves a future task alone", () => {
    const out = rolloverTasks([makeTask({ day: "2026-10-09" })], "2026-10-05");
    expect(out).toHaveLength(1);
    expect(out[0].archived).toBe(false);
    expect(out[0].day).toBe("2026-10-09");
  });

  it("is idempotent — an already-archived task is not re-archived", () => {
    const out = rolloverTasks([makeTask({ day: "2026-10-01", archived: true })], "2026-10-05");
    expect(out).toHaveLength(1);
  });
});

describe("rolloverTasks — repeating tasks, fixed anchor", () => {
  it("moves the live instance onto today when today is on the cadence", () => {
    const out = rolloverTasks([makeTask({ day: "2026-10-01", repeatEvery: 2 })], "2026-10-05");
    expect(out.map((t) => [t.day, t.archived])).toEqual([
      ["2026-10-01", true],
      ["2026-10-03", true],
      ["2026-10-05", false],
    ]);
    expect(out[2]).toMatchObject({ status: "todo", completedAt: undefined });
  });

  it("skips to the next occurrence when today is off-cadence, backfilling the gap", () => {
    const out = rolloverTasks([makeTask({ day: "2026-10-07", repeatEvery: 3 })], "2026-10-14");
    expect(out.map((t) => [t.day, t.archived])).toEqual([
      ["2026-10-07", true],
      ["2026-10-10", true],
      ["2026-10-13", true],
      ["2026-10-16", false],
    ]);
  });

  it("does not drift when an occurrence is missed", () => {
    const out = rolloverTasks([makeTask({ day: "2026-10-07", repeatEvery: 3 })], "2026-10-20");
    expect(out.filter((t) => !t.archived).map((t) => t.day)).toEqual(["2026-10-22"]);
  });

  it("preserves completed status on backfilled records and clears it on the live one", () => {
    const done = makeTask({ day: "2026-10-07", repeatEvery: 1, status: "done", completedAt: 123 });
    const out = rolloverTasks([done], "2026-10-09");
    expect(out[0]).toMatchObject({
      day: "2026-10-07",
      status: "done",
      completedAt: 123,
      archived: true,
    });
    expect(out[2]).toMatchObject({ day: "2026-10-09", status: "todo", completedAt: undefined });
  });

  it("carries repeatEvery, hasTimer and icon onto every generated record", () => {
    const src = makeTask({ day: "2026-10-07", repeatEvery: 1, hasTimer: true, icon: "brain" });
    const out = rolloverTasks([src], "2026-10-09");
    for (const t of out) {
      expect(t.repeatEvery).toBe(1);
      expect(t.hasTimer).toBe(true);
      expect(t.icon).toBe("brain");
    }
  });

  it("gives every generated record a unique id", () => {
    const out = rolloverTasks([makeTask({ day: "2026-10-07", repeatEvery: 1 })], "2026-10-10");
    expect(new Set(out.map((t) => t.id)).size).toBe(out.length);
  });

  it("treats every 1 day exactly like the legacy repeat flag", () => {
    const out = rolloverTasks([makeTask({ day: "2026-10-07", repeatEvery: 1 })], "2026-10-08");
    expect(out).toHaveLength(2);
    expect(out[1]).toMatchObject({ day: "2026-10-08", archived: false, status: "todo" });
  });

  it("treats an out-of-range repeatEvery as one-time", () => {
    const out = rolloverTasks([makeTask({ day: "2026-10-07", repeatEvery: 99 })], "2026-10-08");
    expect(out).toHaveLength(1);
    expect(out[0].archived).toBe(true);
  });
});

describe("rolloverTasks — catch-up cap", () => {
  it("caps at 30 backfilled records and lands back on the cadence", () => {
    const out = rolloverTasks([makeTask({ day: "2025-01-01", repeatEvery: 1 })], "2026-10-05");
    const missed = out.filter((t) => t.archived);
    expect(missed).toHaveLength(30);
    const live = out.filter((t) => !t.archived);
    expect(live).toHaveLength(1);
    expect(live[0].day).toBe("2026-10-05");
  });

  it("keeps a 3-day cadence on its grid across a long absence", () => {
    const out = rolloverTasks([makeTask({ day: "2024-01-05", repeatEvery: 3 })], "2026-10-05");
    const liveDay = out.find((t) => !t.archived)!.day!;
    expect(daysBetween("2024-01-05", liveDay) % 3).toBe(0);
    expect(liveDay >= "2026-10-05").toBe(true);
  });
});

describe("rolloverTasks — other buckets", () => {
  it("never touches weekly tasks", () => {
    const wk = makeTask({ bucket: "weekly", weekStart: "2020-01-06" });
    const out = rolloverTasks([wk], "2026-10-05");
    expect(out).toHaveLength(1);
    expect(out[0].weekStart).toBe("2020-01-06");
  });

  it("still rolls incomplete monthly tasks forward", () => {
    const m = makeTask({ bucket: "monthly", monthKey: "2020-01", day: undefined });
    const out = rolloverTasks([m], "2026-10-05");
    expect(out[0].monthKey).toBe("2026-10");
  });

  it("leaves a completed past monthly task alone", () => {
    const m = makeTask({
      bucket: "monthly",
      monthKey: "2020-01",
      day: undefined,
      status: "done",
    });
    const out = rolloverTasks([m], "2026-10-05");
    expect(out[0].monthKey).toBe("2020-01");
  });
});