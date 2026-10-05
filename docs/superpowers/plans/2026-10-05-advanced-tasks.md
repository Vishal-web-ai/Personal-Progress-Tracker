# Advanced Tasks Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a daily task be scheduled for a future calendar day, and let it repeat on a fixed-anchor interval (every N days) instead of only "every day".

**Architecture:** `Task.repeat?: boolean` is replaced by `Task.repeatEvery?: number` (days). Every occurrence of a repeat is its own `Task` record whose `day` advances by exactly `repeatEvery`, so the series is self-describing and needs no anchor field. All day-membership and recurrence logic moves into a new pure module `src/lib/tasks.ts`, including `rolloverTasks`, which currently lives module-private inside the 1025-line store. The composer's Repeat switch gains an interval stepper with a live cadence preview, and a new `DayPicker` is derived from the existing `WeekPicker` by extracting their shared month calendar.

**Tech Stack:** Next.js 16.3.4 (App Router, `output: "export"`, webpack), React 19.2.8, TypeScript, Tailwind v4, lucide-react, vitest 2.1.9 (new devDependency).

**Spec:** `docs/superpowers/specs/2026-10-05-advanced-tasks-design.md` — the plan argues from the spec; executors read both.

## Global Constraints

- Task order matters. Do not start a task before the one before it is committed.
- `repeatEvery` is an integer clamped to **1…30**. Out-of-range or non-integer values coerce to `undefined` (one-time). Read it **only** through `repeatStep(task)` in `src/lib/tasks.ts`; never test `task.repeatEvery` directly.
- `Task.repeat` is **removed** from the type. Any surviving `repeat` reference is a bug.
- `day` is a **local-time** `"YYYY-MM-DD"` key. String `<` / `>` is a valid chronological comparison because the format is fixed-width zero-padded. Never `new Date("YYYY-MM-DD")` (that parses as UTC and can shift the day).
- No new runtime dependencies. `vitest` is the only added dependency and is dev-only.
- Design system (`DESIGN.md`, Operate mode): Lime `#b8ff4a` only where the user acts or progress is earned, never on idle chrome. No glow, no gradient, no backdrop blur. Cards `rounded-[18px]`, controls `rounded-[12px]`, pills `rounded-full`. Borders `border-border` (hairline). Inputs `bg-surface-elevated`. Chips: pill, `bg-surface-elevated` / `text-muted`; selected → `bg-accent text-[#061B14]`. Hover transitions `duration-150`; every interactive element carries `pressable`. Floating surfaces only: `dropdown-in` + `card-shadow-sm`.
- Every new interactive element needs `aria-expanded`/`aria-checked`/`aria-label` as appropriate, and must be keyboard reachable.
- Zero comments in code. Explain intent in commit messages and the spec instead.
- Package scripts to add in Task 1: `"test": "vitest run"`, `"typecheck": "tsc --noEmit"`.

---

## File Structure

**Created:**
- `src/lib/tasks.ts` — day-membership predicates and recurrence math. Owns `rolloverTasks`.
- `src/lib/tasks.test.ts` — vitest coverage for the above.
- `src/components/ui/MonthCalendar.tsx` — shared portal month calendar extracted from `WeekPicker`.
- `src/components/ui/DayPicker.tsx` — thin day wrapper over `MonthCalendar` with `minDay`.
- `src/components/tasks/IntervalStepper.tsx` — `−/+` stepper plus live cadence preview.
- `src/components/dashboard/UpcomingTasks.tsx` — collapsible grouped list of future tasks.
- `src/components/dashboard/UpcomingTaskRow.tsx` — one future-task row (no checkbox, no timer).

**Modified:**
- `src/types/index.ts` — `repeat` → `repeatEvery`.
- `src/lib/time.ts` — add `daysBetweenKeys`, fix `formatFullDate` weekday.
- `src/lib/metrics.ts` — use `isTodayTask`.
- `src/store/app-store.tsx` — remove local `rolloverTasks`, import from `lib/tasks`, fix `migrateTask`, `addTask`, `setTaskRepeatEvery`, `reAddTask`.
- `src/components/tasks/CreateTaskModal.tsx` — Date row, interval stepper, `repeatEvery` patch.
- `src/components/tasks/TaskGroup.tsx` — use `isTodayTask`.
- `src/components/dashboard/TaskList.tsx` — use `isTodayTask`, render `<UpcomingTasks />`.
- `src/components/dashboard/TaskRow.tsx` — repeat badge uses `repeatStep`.
- `src/components/celebration/DayCelebration.tsx` — use `isTodayTask`.
- `src/components/dashboard/TaskDetailModal.tsx` — migrate off `setTaskRepeat` (dead code, but must typecheck).
- `package.json` — `test`, `typecheck` scripts.

---

### Task 1: Test harness and `daysBetweenKeys`

**Files:**
- Modify: `package.json`
- Modify: `src/lib/time.ts:145-153`
- Create: `src/lib/time.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `daysBetweenKeys(a: string, b: string): number` in `@/lib/time` — whole days from `a` to `b`, signed, DST-safe. `daysBetweenKeys("2026-10-05", "2026-10-05") === 0`. `daysBetweenKeys("2026-10-05", "2026-10-07") === 2`. Also fixes `formatFullDate` to render the real weekday.

- [ ] **Step 1: Add scripts to package.json**

Replace the `"scripts"` block with:

```json
  "scripts": {
    "dev": "next dev --webpack",
    "build": "next build --webpack",
    "start": "next start",
    "lint": "eslint",
    "typecheck": "tsc --noEmit",
    "test": "vitest run"
  },
```

- [ ] **Step 2: Write the failing test**

Create `src/lib/time.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { addDaysKey, daysBetweenKeys, formatFullDate, parseDayKey } from "@/lib/time";

describe("daysBetweenKeys", () => {
  it("is zero for the same day", () => {
    expect(daysBetweenKeys("2026-10-05", "2026-10-05")).toBe(0);
  });

  it("counts forward days", () => {
    expect(daysBetweenKeys("2026-10-05", "2026-10-07")).toBe(2);
  });

  it("counts backward days as negative", () => {
    expect(daysBetweenKeys("2026-10-07", "2026-10-05")).toBe(-2);
  });

  it("crosses a month boundary", () => {
    expect(daysBetweenKeys("2026-09-28", "2026-10-03")).toBe(5);
  });

  it("crosses a year boundary", () => {
    expect(daysBetweenKeys("2026-12-30", "2027-01-02")).toBe(3);
  });

  it("agrees with addDaysKey in both directions", () => {
    let cursor = "2026-01-01";
    for (let i = 0; i < 400; i++) {
      const next = addDaysKey(cursor, 1);
      expect(daysBetweenKeys(cursor, next)).toBe(1);
      expect(daysBetweenKeys(next, cursor)).toBe(-1);
      cursor = next;
    }
  });
});

describe("parseDayKey", () => {
  it("round-trips through dayKey", () => {
    expect(parseDayKey("2026-10-05").getFullYear()).toBe(2026);
    expect(parseDayKey("2026-10-05").getMonth()).toBe(9);
    expect(parseDayKey("2026-10-05").getDate()).toBe(5);
  });
});

describe("formatFullDate", () => {
  it("uses the real weekday, not a hardcoded Monday", () => {
    expect(formatFullDate(parseDayKey("2026-10-05").getTime())).toBe("Mon, 5 Oct 2026");
    expect(formatFullDate(parseDayKey("2026-10-07").getTime())).toBe("Wed, 7 Oct 2026");
  });
});
```

- [ ] **Step 3: Run the tests to confirm they fail**

Run: `npm test`

Expected: FAIL. `daysBetweenKeys` and `parseDayKey` are not exported from `@/lib/time` (Vitest reports a load/import error or `TypeError: daysBetweenKeys is not a function`). The three `formatFullDate` assertions fail too.

- [ ] **Step 4: Implement `parseDayKey` and `daysBetweenKeys`**

In `src/lib/time.ts`, insert after `addDaysKey` (line 15):

```ts
export function parseDayKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function daysBetweenKeys(a: string, b: string): number {
  const start = startOfDay(parseDayKey(a));
  const end = startOfDay(parseDayKey(b));
  return Math.round((end - start) / 86_400_000);
}
```

`startOfDay` is declared later in the file (line 72). Function declarations hoist, so calling it above its definition is valid; leave it where it is.

- [ ] **Step 5: Fix `formatFullDate`**

Replace lines 130-135:

```ts
export function formatFullDate(ts: number): string {
  const d = new Date(ts);
  return `${WEEKDAYS_SHORT[d.getDay() === 0 ? 6 : d.getDay() - 1]}, ${d.getDate()} ${
    MONTHS[d.getMonth()].slice(0, 3)
  } ${d.getFullYear()}`;
}
```

- [ ] **Step 6: Run the tests to confirm they pass**

Run: `npm test`

Expected: PASS, 10 tests.

- [ ] **Step 7: Typecheck and lint**

Run: `npm run typecheck; npm run lint`

Expected: both clean, no output.

- [ ] **Step 8: Commit**

```bash
git add package.json src/lib/time.ts src/lib/time.test.ts
git commit -m "test: add vitest harness, typecheck script; add parseDayKey/daysBetweenKeys, fix formatFullDate weekday"
```

---

### Task 2: `Task` type — `repeatEvery`

**Files:**
- Modify: `src/types/index.ts:24-27`
- Test: `src/lib/tasks.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `Task.repeatEvery?: number` — days between occurrences, `1…30`. `Task.repeat` no longer exists.

- [ ] **Step 1: Replace the field in the type**

In `src/types/index.ts`, replace lines 24-27:

```ts
  hasTimer?: boolean;
  /** Daily tasks only: always reappear on the next day's list on their own. */
  repeat?: boolean;
}
```

with:

```ts
  hasTimer?: boolean;
  /** Daily only: repeat cadence in days. 1 = every day (the legacy `repeat: true`).
   *  Absent or 0 = one-time task. Every occurrence is its own record and advances
   *  its own `day` by exactly this step, so a series needs no separate anchor. */
  repeatEvery?: number;
}
```

- [ ] **Step 2: Confirm the compiler now reports every stale `repeat` site**

Run: `npm run typecheck`

Expected: FAIL with errors for `task.repeat` in `TaskRow.tsx:87`, `TaskDetailModal.tsx:61,63,68,73,81`, and `Boolean(editTask.repeat)` / `repeat:` in `CreateTaskModal.tsx:100,147`.

- [ ] **Step 3: Commit the type change on its own**

```bash
git add src/types/index.ts
git commit -m "refactor: replace Task.repeat boolean with repeatEvery day interval"
```

The tree is intentionally broken between this commit and Task 3. That is fine — Task 3 repairs it.

---

### Task 3: `src/lib/tasks.ts` — predicates, `repeatStep`, `rolloverTasks`

**Files:**
- Create: `src/lib/tasks.ts`
- Create: `src/lib/tasks.test.ts`

**Interfaces:**
- Consumes: `Task` from `@/types`; `addDaysKey`, `dayKey`, `daysBetweenKeys` from `@/lib/time`.
- Produces (all from `@/lib/tasks`):
  - `isLiveTask(t: Task): boolean` — `!t.archived`.
  - `isTaskOnDay(t: Task, day: string): boolean` — live, `bucket === "daily"`, `t.day === day`.
  - `isTodayTask(t: Task, day?: string): boolean` — `isTaskOnDay(t, day ?? dayKey(new Date()))`.
  - `upcomingTasks(tasks: Task[], day?: string): Task[]` — live daily tasks with `day` strictly after `day ?? today`, ascending by `day`.
  - `repeatStep(t: Task): number` — `repeatEvery` when an integer in `1…30`, else `0`.
  - `occurrenceDates(start: string, step: number, count: number): string[]` — `count` dates from `start`, each `step` days after the last.
  - `rolloverTasks(tasks: Task[], today?: string): Task[]` — moved out of `app-store.tsx` unchanged in signature.

- [ ] **Step 1: Write the failing tests**

Create `src/lib/tasks.test.ts`:

```ts
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
    createdAt: 1_700_000_000_000,
    ...over,
  };
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
    const out = rolloverTasks(
      [makeTask({ day: "2026-10-01", repeatEvery: 2 })],
      "2026-10-05"
    );
    expect(out).toHaveLength(2);
    expect(out[0]).toMatchObject({ day: "2026-10-01", archived: true });
    expect(out[1]).toMatchObject({ day: "2026-10-05", archived: false, status: "todo" });
  });

  it("skips to the next occurrence when today is off-cadence, backfilling the gap", () => {
    const out = rolloverTasks(
      [makeTask({ day: "2026-10-07", repeatEvery: 3 })],
      "2026-10-14"
    );
    expect(out.map((t) => [t.day, t.archived])).toEqual([
      ["2026-10-07", true],
      ["2026-10-10", true],
      ["2026-10-13", true],
      ["2026-10-16", false],
    ]);
  });

  it("does not drift when an occurrence is missed", () => {
    const out = rolloverTasks(
      [makeTask({ day: "2026-10-07", repeatEvery: 3 })],
      "2026-10-20"
    );
    expect(out.filter((t) => !t.archived).map((t) => t.day)).toEqual(["2026-10-22"]);
  });

  it("preserves completed status on backfilled records and clears it on the live one", () => {
    const done = makeTask({ day: "2026-10-07", repeatEvery: 1, status: "done", completedAt: 123 });
    const out = rolloverTasks([done], "2026-10-09");
    expect(out[0]).toMatchObject({ day: "2026-10-07", status: "done", completedAt: 123, archived: true });
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
    const out = rolloverTasks(
      [makeTask({ day: "2025-01-01", repeatEvery: 1 })],
      "2026-10-05"
    );
    const missed = out.filter((t) => t.archived);
    expect(missed).toHaveLength(30);
    const live = out.filter((t) => !t.archived);
    expect(live).toHaveLength(1);
    expect(live[0].day).toBe("2026-10-05");
  });

  it("keeps a 3-day cadence on its grid across a long absence", () => {
    const out = rolloverTasks(
      [makeTask({ day: "2024-01-05", repeatEvery: 3 })],
      "2026-10-05"
    );
    const live = out.find((t) => !t.archived)!;
    const gap = daysBetween("2024-01-05", live.day);
    expect(gap % 3).toBe(0);
    expect(live.day >= "2026-10-05").toBe(true);
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
    const m = makeTask({ bucket: "monthly", monthKey: "2020-01", day: undefined, status: "done" });
    const out = rolloverTasks([m], "2026-10-05");
    expect(out[0].monthKey).toBe("2020-01");
  });
});

function daysBetween(a: string, b: string): number {
  const [ay, am, ad] = a.split("-").map(Number);
  const [by, bm, bd] = b.split("-").map(Number);
  return Math.round(
    (new Date(by, bm - 1, bd).getTime() - new Date(ay, am - 1, ad).getTime()) / 86_400_000
  );
}
```

- [ ] **Step 2: Run the tests to confirm they fail**

Run: `npm test`

Expected: FAIL — `@/lib/tasks` cannot be resolved.

- [ ] **Step 3: Implement the module**

Create `src/lib/tasks.ts`:

```ts
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

function missedCopy(t: Task, day: string, salt: number): Task {
  return { ...t, id: `${t.id}-m${salt}`, day, archived: true };
}

export function rolloverTasks(tasks: Task[], today: string = dayKey(new Date())): Task[] {
  const thisMonth = `${today.slice(0, 7)}`;
  return tasks.flatMap((t) => {
    if (t.bucket === "daily" && t.day && t.day < today && isLiveTask(t)) {
      const step = repeatStep(t);
      if (step === 0) return [{ ...t, archived: true }];

      const missed: Task[] = [];
      let cursor = t.day;
      let salt = 0;
      while (cursor < today) {
        missed.push(missedCopy(t, cursor, salt++));
        if (salt >= MAX_CATCHUP) {
          const gap = daysBetweenKeys(cursor, today);
          const jump = Math.ceil(gap / step) * step;
          cursor = addDaysKey(cursor, jump);
          break;
        }
        cursor = addDaysKey(cursor, step);
      }

      const live: Task = {
        ...t,
        id: `${t.id}-n${salt}`,
        day: cursor,
        status: "todo",
        completedAt: undefined,
        archived: false,
      };
      return [...missed, live];
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
```

Note on ids: `${t.id}-m<n>` and `${t.id}-n<n>` are deterministic, so a repeated rollover over the same input cannot produce duplicates. The live record's `createdAt` is inherited from its source, which is correct — it is the same task continuing, not a new one.

- [ ] **Step 4: Run the tests to confirm they pass**

Run: `npm test`

Expected: PASS, 30 tests. If the catch-up tests fail, the jump arithmetic in the `salt >= MAX_CATCHUP` branch is wrong — recheck that `jump` keeps `cursor` on the anchor grid.

- [ ] **Step 5: Commit**

```bash
git add src/lib/tasks.ts src/lib/tasks.test.ts
git commit -m "feat: extract task day/recurrence logic into lib/tasks with fixed-anchor rollover and 30-occurrence catch-up cap"
```

---

### Task 4: Store rewiring

**Files:**
- Modify: `src/store/app-store.tsx:85-177` (migrateTask + local rolloverTasks), `:39-50` (interface), `:424-442` (addTask), `:506-514` (setTaskRepeat), `:539-572` (reAddTask), `:940-1008` (value + deps)
- Test: `src/lib/tasks.test.ts`

**Interfaces:**
- Consumes: `rolloverTasks`, `repeatStep`, `isTodayTask` from `@/lib/tasks` (Task 3); `parseDayKey`, `weekRange` from `@/lib/time`.
- Produces: `setTaskRepeatEvery(id: string, repeatEvery?: number): void` on `AppContextValue`. `setTaskRepeat` is removed.

- [ ] **Step 1: Add the imports and delete the local `rolloverTasks`**

In `src/store/app-store.tsx`, extend the `@/lib/time` import with `parseDayKey`, and add:

```ts
import { isTodayTask, repeatStep, rolloverTasks } from "@/lib/tasks";
```

Then delete the entire module-private `rolloverTasks` function (lines 141-177) and its doc comment. All four call sites now resolve to the imported one with an identical signature.

- [ ] **Step 2: Fix `migrateTask`**

Three edits inside the returned literal, plus one new helper.

First, replace the `status` line at 120:

```ts
    status: raw.status === "done" || raw.status === "in_progress" ? raw.status : "todo",
```

Second, replace the `repeat` line at 136:

```ts
    repeatEvery: migrateRepeatEvery(raw.repeatEvery, raw.repeat === true),
```

Third, add a `hasTimer` line immediately after `archived` (line 134):

```ts
    hasTimer: raw.hasTimer !== false,
```

Fourth, add the helper above `migrateTask`:

```ts
/** Legacy records stored a boolean `repeat`, meaning "every day". Map it onto
 *  the interval model, and drop anything outside the supported range. */
function migrateRepeatEvery(value: unknown, legacyRepeat: boolean): number | undefined {
  if (value === undefined && legacyRepeat) return 1;
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isInteger(n) || n < 1 || n > 30) return undefined;
  return n;
}
```

Two live bugs are repaired here. `hasTimer` was absent from the returned literal, so every load erased it and the Timer toggle never persisted. `status` was collapsed to `"done" | "todo"`, so `in_progress` never survived a refresh and `TaskRow`'s accent ring reset on every reload.

- [ ] **Step 3: Replace `setTaskRepeat` with `setTaskRepeatEvery`**

In the interface (line 45) replace:

```ts
  setTaskRepeat: (id: string, repeat: boolean) => void;
```

with:

```ts
  setTaskRepeatEvery: (id: string, repeatEvery?: number) => void;
```

Replace the implementation (lines 506-514):

```ts
  const setTaskRepeatEvery: AppContextValue["setTaskRepeatEvery"] = useCallback(
    (id, repeatEvery) => {
      setState((s) => {
        if (!s) return s;
        return {
          ...s,
          tasks: s.tasks.map((t) =>
            t.id === id
              ? {
                  ...t,
                  repeatEvery: repeatStep({ ...t, repeatEvery }) === 0 ? undefined : repeatEvery,
                }
              : t
          ),
        };
      });
    },
    []
  );
```

Update the `value` object (line 954) and the dependency array (line 986) to use `setTaskRepeatEvery` in place of `setTaskRepeat`.

- [ ] **Step 4: Honour `task.day` in `addTask`**

Replace line 434:

```ts
            day: task.bucket === "daily" ? dayKey(new Date()) : undefined,
```

with:

```ts
            day: task.bucket === "daily" ? task.day ?? dayKey(new Date()) : undefined,
```

- [ ] **Step 5: Propagate `repeatEvery` in `reAddTask`**

Replace line 565:

```ts
            repeat: src.repeat,
```

with:

```ts
            repeatEvery: repeatStep(src) === 0 ? undefined : src.repeatEvery,
```

- [ ] **Step 6: Typecheck**

Run: `npm run typecheck`

Expected: errors only in `TaskRow.tsx:87`, `TaskDetailModal.tsx`, and `CreateTaskModal.tsx` — the three UI files fixed in Tasks 5, 9 and 10. No errors in `app-store.tsx` itself.

- [ ] **Step 7: Run the tests to confirm nothing regressed**

Run: `npm test`

Expected: PASS, 40 tests.

- [ ] **Step 8: Commit**

```bash
git add src/store/app-store.tsx
git commit -m "refactor: rewire store to repeatEvery, honour task.day in addTask, fix migrateTask dropping hasTimer and in_progress"
```

---

### Task 5: Replace the four duplicated "is today" filters

**Files:**
- Modify: `src/components/dashboard/TaskList.tsx:23-24`
- Modify: `src/lib/metrics.ts:16-24`
- Modify: `src/components/tasks/TaskGroup.tsx:34-36`
- Modify: `src/components/celebration/DayCelebration.tsx:31`

**Interfaces:**
- Consumes: `isTodayTask(t, day?)` from `@/lib/tasks`.
- Produces: nothing new.

- [ ] **Step 1: `TaskList.tsx`**

Replace lines 23-24:

```ts
  const sorted = [...tasks]
    .filter((t) => t.bucket === "daily" && !t.archived && t.day === dayKey(new Date()))
```

with:

```ts
  const sorted = [...tasks]
    .filter((t) => isTodayTask(t))
```

Remove `dayKey` from the `@/lib/time` import, leaving `formatFullDate`. Add `import { isTodayTask } from "@/lib/tasks";`.

- [ ] **Step 2: `metrics.ts`**

Replace lines 16-24:

```ts
export function bucketProgress(tasks: Task[], bucket: TaskBucket): BucketProgress {
  const today = bucket === "daily" ? dayKey(new Date()) : undefined;
  return progressOf(
    tasks.filter(
      (t) =>
        t.bucket === bucket && !t.archived && (today === undefined || t.day === today)
    )
  );
}
```

with:

```ts
export function bucketProgress(tasks: Task[], bucket: TaskBucket): BucketProgress {
  if (bucket === "daily") {
    return progressOf(tasks.filter((t) => isTodayTask(t)));
  }
  return progressOf(tasks.filter((t) => t.bucket === bucket && isLiveTask(t)));
}
```

Add `import { isLiveTask, isTodayTask } from "@/lib/tasks";`. `dayKey` is still used by `currentStreakDays` (line 57), so keep that import.

- [ ] **Step 3: `TaskGroup.tsx`**

Replace the `items` filter:

```ts
  const items = sortByPriority(
    tasks.filter((t) => t.bucket === bucket && !t.archived && (bucket !== "daily" || t.day === dayKey(new Date())))
  );
```

with:

```ts
  const items = sortByPriority(
    tasks.filter((t) =>
      bucket === "daily" ? isTodayTask(t) : t.bucket === bucket && isLiveTask(t)
    )
  );
```

Import `isLiveTask` and `isTodayTask` from `@/lib/tasks`. Then remove `dayKey` from the `@/lib/time` import on line 9 — it is used on line 35 and nowhere else, leaving `import { formatWeekSpan, monthKey, monthLabel } from "@/lib/time";`.

- [ ] **Step 4: `DayCelebration.tsx`**

Read line 31 and replace its inline `t.bucket === "daily" && !t.archived && t.day === dayKey(new Date())` predicate with `isTodayTask(t)`. Leave the surrounding logic untouched.

- [ ] **Step 5: Verify no inline duplicate remains**

Run: `rg -n 'archived && .*day ===' src`

Expected: no matches.

- [ ] **Step 6: Typecheck and test**

Run: `npm run typecheck; npm test`

Expected: typecheck errors only in `TaskRow.tsx:87`, `TaskDetailModal.tsx`, `CreateTaskModal.tsx`. Tests PASS.

- [ ] **Step 7: Commit**

```bash
git add src/components/dashboard/TaskList.tsx src/lib/metrics.ts src/components/tasks/TaskGroup.tsx src/components/celebration/DayCelebration.tsx
git commit -m "refactor: route all four today-filters through isTodayTask so future-dated tasks are excluded"
```

---

### Task 6: `MonthCalendar` extraction and `DayPicker`

**Files:**
- Create: `src/components/ui/MonthCalendar.tsx`
- Create: `src/components/ui/DayPicker.tsx`
- Modify: `src/components/ui/WeekPicker.tsx` (replace body with a wrapper)

**Interfaces:**
- Consumes: `dayKey`, `formatDayKey` from `@/lib/time`.
- Produces:
  - `MonthCalendar({ value, onSelect, minDay?, triggerLabel, ariaLabel, icon, className }: { value: string; onSelect: (key: string) => void; minDay?: string; triggerLabel: string; ariaLabel: string; icon?: React.ReactNode; className?: string })`
  - `DayPicker({ value, onChange, className }: { value: string; onChange: (key: string) => void; className?: string })` — `minDay` pinned to today.

**Visual verification for this task:** the existing `/tasks` page renders a `WeekPicker` for weekly tasks. Any change to the calendar grid shows up there immediately.

- [ ] **Step 1: Create `MonthCalendar.tsx`**

Move the portal shell, month grid and day-cell styling out of `WeekPicker.tsx` verbatim, parameterising only what differs:

```tsx
"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CalendarRange, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { addMonthsKey, dayKey, parseDayKey } from "@/lib/time";

const WEEKDAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];
const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
const PANEL_WIDTH = 284;

function monthViewOf(key: string): string {
  return key.slice(0, 7);
}

/** Shared themed month calendar. Owns the portal, the month grid and day-cell
 *  styling; callers only decide the trigger label and, optionally, the earliest
 *  selectable day. `minDay` dims and disables past days so a future-only picker
 *  is enforced by the control itself. */
export function MonthCalendar({
  value,
  onSelect,
  minDay,
  triggerLabel,
  ariaLabel,
  icon,
  className,
}: {
  value: string;
  onSelect: (key: string) => void;
  minDay?: string;
  triggerLabel: string;
  ariaLabel: string;
  icon?: React.ReactNode;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<string>(() => monthViewOf(value || dayKey(new Date())));
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);

  const close = useCallback(() => {
    setOpen(false);
    setPos(null);
  }, []);

  const openPanel = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const left = Math.max(8, Math.min(r.left, window.innerWidth - PANEL_WIDTH - 8));
    setPos({ top: r.bottom + 6, left });
    setView(monthViewOf(value || dayKey(new Date())));
    setOpen(true);
  }, [value]);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: MouseEvent | TouchEvent) => {
      const t = e.target as Node;
      if (panelRef.current?.contains(t) || triggerRef.current?.contains(t)) return;
      close();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("touchstart", onPointer);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("touchstart", onPointer);
      window.removeEventListener("keydown", onKey);
    };
  }, [open, close]);

  const todayKey = dayKey(new Date());
  const shiftMonth = (delta: number) => setView((v) => addMonthsKey(v, delta));
  const isCurrentMonth = monthViewOf(todayKey) === view;

  const select = (key: string) => {
    onSelect(key);
    close();
  };

  const first = parseDayKey(`${view}-01`);
  const firstOffset = (first.getDay() + 6) % 7;
  const daysInMonth = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
  const cells: (string | null)[] = [];
  for (let i = 0; i < firstOffset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(dayKey(new Date(first.getFullYear(), first.getMonth(), d)));
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => (open ? close() : openPanel())}
        className={cn(
          "pressable flex w-full items-center justify-between gap-2 rounded-[12px] border bg-surface-elevated px-3.5 py-2.5 text-left text-[14px] text-primary outline-none transition-colors duration-150",
          open
            ? "border-accent/60 ring-2 ring-accent/20"
            : "border-border focus:border-accent/60 focus:ring-2 focus:ring-accent/20",
          className
        )}
      >
        <span className="truncate">{triggerLabel}</span>
        <span className={cn("shrink-0", open ? "text-accent" : "text-muted")}>
          {icon ?? <CalendarRange size={16} aria-hidden />}
        </span>
      </button>

      {open &&
        pos &&
        createPortal(
          <div
            ref={panelRef}
            role="dialog"
            aria-label={ariaLabel}
            className="dropdown-in card-shadow-sm fixed z-[60] rounded-[14px] border border-border bg-surface-elevated p-3"
            style={{ top: pos.top, left: pos.left, width: PANEL_WIDTH }}
          >
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => shiftMonth(-1)}
                aria-label="Previous month"
                className="pressable flex h-8 w-8 items-center justify-center rounded-lg text-secondary transition-colors hover:bg-surface-soft hover:text-primary"
              >
                <ChevronLeft size={17} />
              </button>
              <p className="text-[14px] font-semibold text-primary">
                {MONTHS[first.getMonth()]} {first.getFullYear()}
              </p>
              <button
                type="button"
                onClick={() => shiftMonth(1)}
                aria-label="Next month"
                className="pressable flex h-8 w-8 items-center justify-center rounded-lg text-secondary transition-colors hover:bg-surface-soft hover:text-primary"
              >
                <ChevronRight size={17} />
              </button>
            </div>

            <div className="mt-3 grid grid-cols-7 gap-1">
              {WEEKDAYS.map((w) => (
                <div key={w} className="text-center text-[11px] font-medium text-muted">
                  {w}
                </div>
              ))}
              {cells.map((k, i) => {
                if (k === null) return <div key={`e${i}`} aria-hidden />;
                const disabled = !!minDay && k < minDay;
                const d = parseDayKey(k);
                return (
                  <button
                    key={k}
                    type="button"
                    disabled={disabled}
                    aria-label={d.toLocaleDateString("en-US", {
                      weekday: "long",
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                    aria-pressed={k === value}
                    onClick={() => select(k)}
                    className={cn(
                      "pressable flex h-9 w-full items-center justify-center rounded-[10px] text-[13px] tabular-nums transition-colors",
                      k === value
                        ? "bg-accent font-semibold text-[#061B14]"
                        : disabled
                          ? "cursor-not-allowed text-muted/40"
                          : k === todayKey
                            ? "border border-accent/50 text-accent hover:bg-accent/10"
                            : "text-secondary hover:bg-surface-soft hover:text-primary"
                    )}
                  >
                    {d.getDate()}
                  </button>
                );
              })}
            </div>

            {!isCurrentMonth && (
              <div className="mt-2 flex items-center justify-between border-t border-border-soft pt-2">
                {minDay && <span className="text-[11px] text-muted">Past days unavailable</span>}
                <button
                  type="button"
                  onClick={() => setView(monthViewOf(todayKey))}
                  className={cn(
                    "pressable text-[12px] font-medium text-accent transition-colors hover:text-accent-soft",
                    minDay && "ml-auto"
                  )}
                >
                  This month
                </button>
              </div>
            )}
          </div>,
          document.body
        )}
    </>
  );
}
```

- [ ] **Step 2: Reduce `WeekPicker.tsx` to a wrapper**

Replace the whole file with:

```tsx
"use client";

import React from "react";
import { CalendarRange } from "lucide-react";
import { MonthCalendar } from "@/components/ui/MonthCalendar";
import { formatWeekSpan } from "@/lib/time";

/** Themed week picker: a full month calendar whose selection is the week-start
 *  day key. */
export function WeekPicker({
  value,
  onChange,
  className,
}: {
  value: string;
  onChange: (key: string) => void;
  className?: string;
}) {
  return (
    <MonthCalendar
      value={value}
      onSelect={onChange}
      triggerLabel={formatWeekSpan(value)}
      ariaLabel="Pick a week"
      icon={<CalendarRange size={16} aria-hidden />}
      className={className}
    />
  );
}
```

- [ ] **Step 3: Create `DayPicker.tsx`**

```tsx
"use client";

import React from "react";
import { CalendarDays } from "lucide-react";
import { MonthCalendar } from "@/components/ui/MonthCalendar";
import { dayKey, formatDayKey } from "@/lib/time";

/** Themed single-day picker. Past days are dimmed and disabled, so a
 *  future-only date is enforced by the control rather than by validation. */
export function DayPicker({
  value,
  onChange,
  className,
}: {
  value: string;
  onChange: (key: string) => void;
  className?: string;
}) {
  return (
    <MonthCalendar
      value={value}
      onSelect={onChange}
      minDay={dayKey(new Date())}
      triggerLabel={formatDayKey(value)}
      ariaLabel="Pick a date"
      icon={<CalendarDays size={16} aria-hidden />}
      className={className}
    />
  );
}
```

- [ ] **Step 4: Typecheck and lint**

Run: `npm run typecheck; npm run lint`

Expected: clean apart from the known `TaskRow` / `TaskDetailModal` / `CreateTaskModal` errors.

- [ ] **Step 5: Verify the week picker still works**

Run `npm run dev`, open `/tasks`, click **+** on the Weekly group, open the week picker. Confirm: the grid renders, month arrows work, Escape and outside-click close it, "Today" jumps to the current month, and the trigger still reads e.g. `Oct 5 – 11`.

- [ ] **Step 6: Commit**

```bash
git add src/components/ui/MonthCalendar.tsx src/components/ui/DayPicker.tsx src/components/ui/WeekPicker.tsx
git commit -m "refactor: extract shared MonthCalendar from WeekPicker; add future-only DayPicker"
```

---

### Task 7: `IntervalStepper`

**Files:**
- Create: `src/components/tasks/IntervalStepper.tsx`

**Interfaces:**
- Consumes: `occurrenceDates` from `@/lib/tasks`; `formatDayKey` from `@/lib/time`.
- Produces: `IntervalStepper({ startDay, value, onChange }: { startDay: string; value: number; onChange: (n: number) => void })`. Clamps to 1…30 internally.

- [ ] **Step 1: Create the component**

```tsx
"use client";

import React from "react";
import { Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { occurrenceDates } from "@/lib/tasks";
import { formatDayKey } from "@/lib/time";

const MIN = 1;
const MAX = 30;

/** Interval stepper for a daily repeat, with a live preview of the dates the
 *  chosen cadence actually produces. The preview is the point: a fixed-anchor
 *  cadence is invisible until you show the user the real occurrences. */
export function IntervalStepper({
  startDay,
  value,
  onChange,
}: {
  startDay: string;
  value: number;
  onChange: (n: number) => void;
}) {
  const clamp = (n: number) => Math.min(MAX, Math.max(MIN, n));
  const step = clamp(value);
  const preview = occurrenceDates(startDay, step, 4);
  const noun = step === 1 ? "day" : "days";

  return (
    <div className="mt-2 rounded-[12px] border border-border bg-surface px-3.5 py-3">
      <div className="flex items-center justify-between gap-3">
        <span className="text-[13px] text-secondary">Every</span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onChange(clamp(step - 1))}
            disabled={step <= MIN}
            aria-label="Decrease interval"
            className="pressable flex h-8 w-8 items-center justify-center rounded-full border border-border bg-surface-elevated text-primary transition-colors hover:bg-surface-soft disabled:opacity-40 disabled:hover:bg-surface-elevated"
          >
            <Minus size={14} strokeWidth={2.4} />
          </button>
          <span className="w-16 text-center text-[15px] font-semibold text-primary tabular-nums">
            {step} {noun}
          </span>
          <button
            type="button"
            onClick={() => onChange(clamp(step + 1))}
            disabled={step >= MAX}
            aria-label="Increase interval"
            className="pressable flex h-8 w-8 items-center justify-center rounded-full border border-border bg-surface-elevated text-primary transition-colors hover:bg-surface-soft disabled:opacity-40 disabled:hover:bg-surface-elevated"
          >
            <Plus size={14} strokeWidth={2.4} />
          </button>
        </div>
      </div>

      <p className="mt-2.5 border-t border-border-soft pt-2.5 text-[12px] leading-[17px] text-muted">
        <span className="font-semibold uppercase tracking-[0.08em]">Next</span>{" "}
        <span className="tabular-nums">{preview.map(formatDayKey).join(" · ")}</span>
      </p>
    </div>
  );
}
```

- [ ] **Step 2: Typecheck and lint**

Run: `npm run typecheck; npm run lint`

Expected: clean for this file.

- [ ] **Step 3: Commit**

```bash
git add src/components/tasks/IntervalStepper.tsx
git commit -m "feat: add interval stepper with live cadence preview"
```

---

### Task 8: Composer — Date row and interval repeat

**Files:**
- Modify: `src/components/tasks/CreateTaskModal.tsx`

**Interfaces:**
- Consumes: `DayPicker` (Task 6), `IntervalStepper` (Task 7), `formatDayKey`, `addDaysKey`, `dayKeyFor` from `@/lib/time`.
- Produces: a composer patch carrying `day` and `repeatEvery`.

- [ ] **Step 1: Replace the `repeat` state with date + interval state**

Replace line 61:

```ts
  const [repeat, setRepeat] = useState(false);
```

with:

```ts
  const [taskDay, setTaskDay] = useState(dayKeyFor());
  const [dayMode, setDayMode] = useState<"today" | "tomorrow" | "pick">("today");
  const [repeatEvery, setRepeatEvery] = useState<number | undefined>(undefined);
```

Replace the existing `@/lib/time` import, which currently reads `import { dayKeyFor, monthKey } from "@/lib/time";`, with:

```ts
import { addDaysKey, dayKeyFor, daysBetweenKeys, formatDayKey, monthKey } from "@/lib/time";
```

- [ ] **Step 2: Add the other two imports**

```ts
import { DayPicker } from "@/components/ui/DayPicker";
import { IntervalStepper } from "@/components/tasks/IntervalStepper";
```

- [ ] **Step 3: Hydrate the new state on the open transition — edit branch**

Replace line 100:

```ts
        setRepeat(Boolean(editTask.repeat));
```

with:

```ts
        setTaskDay(editTask.day ?? dayKeyFor());
        setDayMode(
          editTask.day === undefined || editTask.day === dayKeyFor()
            ? "today"
            : editTask.day === addDaysKey(dayKeyFor(), 1)
              ? "tomorrow"
              : "pick"
        );
        setRepeatEvery(editTask.repeatEvery);
```

- [ ] **Step 4: Hydrate the new state on the open transition — create branch**

Replace line 111:

```ts
        setRepeat(false);
```

with:

```ts
        setTaskDay(dayKeyFor());
        setDayMode("today");
        setRepeatEvery(undefined);
```

- [ ] **Step 5: Build the patch**

Replace line 147:

```ts
      repeat: bucket === "daily" && repeat ? true : undefined,
```

with:

```ts
      day: bucket === "daily" ? taskDay : undefined,
      repeatEvery: bucket === "daily" ? repeatEvery : undefined,
```

- [ ] **Step 6: Insert the Date row**

Immediately after the closing `</div>` of the Area/Schedule grid (line 277) and before the `{bucket === "weekly" && (` block, insert:

```tsx
        {bucket === "daily" && (
          <Field label="Date">
            <div className="flex flex-wrap gap-2">
              {(
                [
                  { key: "today", label: "Today" },
                  { key: "tomorrow", label: "Tomorrow" },
                  { key: "pick", label: "Pick a date" },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.key}
                  type="button"
                  aria-pressed={dayMode === opt.key}
                  onClick={() => {
                    setDayMode(opt.key);
                    if (opt.key === "today") setTaskDay(dayKeyFor());
                    if (opt.key === "tomorrow") setTaskDay(addDaysKey(dayKeyFor(), 1));
                  }}
                  className={cn(
                    "pressable rounded-full px-3.5 py-2 text-[13px] font-medium transition-colors duration-150",
                    dayMode === opt.key
                      ? "bg-accent text-[#061B14]"
                      : "bg-surface-elevated text-secondary hover:bg-surface-soft hover:text-primary"
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {dayMode === "pick" && (
              <div className="mt-2">
                <DayPicker value={taskDay} onChange={setTaskDay} />
                <p className="mt-1 text-[12px] text-muted">
                  {taskDay === dayKeyFor()
                    ? `Due ${formatDayKey(taskDay)} — that is today.`
                    : `Due ${formatDayKey(taskDay)} — ${daysBetweenKeys(
                        dayKeyFor(),
                        taskDay
                      )} days out.`}
                </p>
              </div>
            )}
          </Field>
        )}
```

Replace the relative-day hint with a call to a `daysBetweenKeys` helper rather than the inline arithmetic above. Add `daysBetweenKeys` to the `@/lib/time` import and use:

```tsx
                <p className="mt-1 text-[12px] text-muted">
                  Due {formatDayKey(taskDay)}
                  {taskDay === dayKeyFor()
                    ? " — that is today."
                    : ` — ${daysBetweenKeys(dayKeyFor(), taskDay)} days out.`}
                </p>
```

- [ ] **Step 7: Extend the Repeat field**

Replace the whole `{bucket === "daily" && (<Field label="Repeat">…</Field>)}` block (lines 367-401) with:

```tsx
        {bucket === "daily" && (
          <Field label="Repeat">
            <button
              type="button"
              role="switch"
              aria-checked={repeatEvery !== undefined}
              aria-label={
                repeatEvery === undefined
                  ? "Do not repeat this task"
                  : `Repeat every ${repeatEvery} ${repeatEvery === 1 ? "day" : "days"}`
              }
              onClick={() => setRepeatEvery(repeatEvery === undefined ? 1 : undefined)}
              className="pressable flex w-full items-center justify-between rounded-[12px] border border-border bg-surface-elevated px-3.5 py-2.5"
            >
              <span className="flex items-center gap-2 text-[14px] text-primary">
                {repeatEvery === undefined ? (
                  taskDay === dayKeyFor() ? (
                    "Only today"
                  ) : (
                    <>Only on {formatDayKey(taskDay)}</>
                  )
                ) : (
                  <>
                    Repeats every {repeatEvery} {repeatEvery === 1 ? "day" : "days"}
                    <Repeat size={14} className="text-accent" />
                  </>
                )}
              </span>
              <span
                className={cn(
                  "relative h-7 w-12 shrink-0 rounded-full border transition-colors duration-150",
                  repeatEvery !== undefined
                    ? "border-accent/60 bg-accent/15"
                    : "border-border bg-surface-soft"
                )}
              >
                <span
                  className={cn(
                    "absolute left-0.5 top-0.5 h-[22px] w-[22px] rounded-full transition-transform duration-150",
                    repeatEvery !== undefined ? "translate-x-5 bg-accent" : "bg-muted"
                  )}
                />
              </span>
            </button>

            {repeatEvery !== undefined && (
              <IntervalStepper
                startDay={taskDay}
                value={repeatEvery}
                onChange={setRepeatEvery}
              />
            )}

            <p className="mt-1 text-[12px] text-muted">
              {repeatEvery === undefined
                ? "This task appears once, on its date."
                : "Each occurrence is its own record, so a missed day stays missed and never shifts the ones after it."}
            </p>
          </Field>
        )}
```

- [ ] **Step 8: Typecheck and lint**

Run: `npm run typecheck; npm run lint`

Expected: clean. The `CreateTaskModal` errors from Task 2 are resolved.

- [ ] **Step 9: Verify in the browser**

Run `npm run dev`, open the dashboard, click **+** on Task List. Confirm:

1. Date chips render; `Today` is lime-selected by default.
2. `Tomorrow` selects and the hint is hidden (it only shows in `pick` mode).
3. `Pick a date` reveals the DayPicker; past days are dimmed and unclickable; selecting the 15th shows `Due Tue, 15 Oct — 10 days out.`
4. Flip the Repeat switch → `Repeats every day` + the stepper appears showing `Next: <today> · <+1> · <+2> · <+3>`.
5. `+` three times → `Repeats every 4 days` and the preview shifts to +4 spacing.
6. `−` clamps at 1 and disables; `+` clamps at 30 and disables.
7. Turning repeat off restores `Only today` / `Only on <date>`.
8. Switching Schedule to Weekly hides both the Date row and the Repeat field, and the saved task has no `day`/`repeatEvery`.
9. At 360px the chips wrap without horizontal overflow.

- [ ] **Step 10: Commit**

```bash
git add src/components/tasks/CreateTaskModal.tsx
git commit -m "feat: add scheduled date chips, DayPicker and interval repeat stepper to the task composer"
```

---

### Task 9: `UpcomingTasks` section

**Files:**
- Create: `src/components/dashboard/UpcomingTaskRow.tsx`
- Create: `src/components/dashboard/UpcomingTasks.tsx`
- Modify: `src/components/dashboard/TaskList.tsx`

**Interfaces:**
- Consumes: `upcomingTasks` from `@/lib/tasks`; `formatDayKey`, `addDaysKey`, `dayKeyFor` from `@/lib/time`; `CreateTaskModal`.
- Produces: `UpcomingTasks()` — renders `null` when nothing is scheduled ahead.

- [ ] **Step 1: Create `UpcomingTaskRow.tsx`**

A future task cannot be completed early and has no work to focus on yet, so this row deliberately omits the checkbox and the play button that `TaskRow` carries.

```tsx
"use client";

import React, { useState } from "react";
import { Repeat } from "lucide-react";
import type { Task } from "@/types";
import { repeatStep } from "@/lib/tasks";
import { TaskIcon } from "@/components/ui/TaskIcon";
import { CreateTaskModal } from "@/components/tasks/CreateTaskModal";
import { formatDayKey } from "@/lib/time";

export function UpcomingTaskRow({ task }: { task: Task }) {
  const [editOpen, setEditOpen] = useState(false);
  const step = repeatStep(task);

  return (
    <>
      <button
        type="button"
        onClick={() => setEditOpen(true)}
        aria-label={`Edit ${task.title}`}
        className="pressable flex w-full items-center gap-3.5 rounded-[14px] bg-surface-elevated px-4 py-3 text-left transition-colors duration-150 hover:bg-surface-soft/80"
      >
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] bg-surface-soft text-secondary">
          <TaskIcon name={task.icon} size={20} />
        </div>

        <div className="min-w-0 flex-1">
          <span className="block truncate text-[16px] font-medium leading-[22px] text-primary">
            {task.title}
          </span>
          <span className="mt-0.5 flex items-center gap-1.5 text-[13px] leading-[18px] text-secondary">
            <span className="truncate">{task.areaName}</span>
            {step > 0 && (
              <span className="flex shrink-0 items-center gap-1 rounded-full bg-accent/10 px-1.5 py-px text-[10px] text-accent">
                <Repeat size={10} strokeWidth={2.4} />
                <span className="tabular-nums">{step}d</span>
              </span>
            )}
          </span>
        </div>

        <span className="shrink-0 text-[12px] font-medium text-muted tabular-nums">
          {task.day ? formatDayKey(task.day) : ""}
        </span>
      </button>

      <CreateTaskModal open={editOpen} onClose={() => setEditOpen(false)} editTask={task} />
    </>
  );
}
```

- [ ] **Step 2: Create `UpcomingTasks.tsx`**

The card, header, count chip, chevron and accordion markup deliberately mirror `TaskList`'s priority groups so the section reads as part of the same family.

```tsx
"use client";

import React, { useMemo, useState } from "react";
import { CalendarClock, ChevronDown } from "lucide-react";
import { useApp } from "@/store/app-store";
import { upcomingTasks } from "@/lib/tasks";
import { UpcomingTaskRow } from "@/components/dashboard/UpcomingTaskRow";
import { addDaysKey, dayKeyFor, formatDayKey } from "@/lib/time";
import { cn } from "@/lib/utils";

export function UpcomingTasks() {
  const { tasks } = useApp();
  const [open, setOpen] = useState(false);

  const groups = useMemo(() => {
    const list = upcomingTasks(tasks);
    const byDay = new Map<string, typeof list>();
    for (const t of list) {
      const key = t.day!;
      const bucket = byDay.get(key);
      if (bucket) bucket.push(t);
      else byDay.set(key, [t]);
    }
    return Array.from(byDay.entries())
      .sort((a, b) => (a[0] < b[0] ? -1 : 1))
      .map(([day, items]) => ({ day, items }));
  }, [tasks]);

  if (groups.length === 0) return null;

  const total = groups.reduce((n, g) => n + g.items.length, 0);
  const nextDay = groups[0].day;
  const tomorrow = addDaysKey(dayKeyFor(), 1);
  const nextLabel = nextDay === tomorrow ? "Tomorrow" : formatDayKey(nextDay);

  return (
    <div className="mt-2.5 rounded-[18px] border border-border bg-surface">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls="upcoming-tasks"
        className="pressable flex w-full items-center gap-2.5 px-4 py-3 text-left"
      >
        <CalendarClock size={16} strokeWidth={2} className="shrink-0 text-muted" />
        <span className="text-[14px] font-semibold text-primary">Upcoming</span>
        <span className="rounded-full bg-surface-soft px-2 py-0.5 text-[11px] font-medium text-muted tabular-nums">
          {total}
        </span>
        <span className="ml-auto text-[12px] text-muted">next {nextLabel}</span>
        <ChevronDown
          size={16}
          className={cn("shrink-0 text-muted transition-transform duration-200", open && "rotate-180")}
        />
      </button>

      <div id="upcoming-tasks" className={cn("accordion-content", open && "open")}>
        <div className="accordion-inner">
          <div className="space-y-3 px-3 pb-3">
            {groups.map(({ day, items }) => (
              <div key={day}>
                <div className="flex items-center gap-2 px-1 pb-1.5">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted">
                    {day === tomorrow ? "Tomorrow" : formatDayKey(day)}
                  </span>
                  <span className="h-px flex-1 bg-border-soft" />
                  <span className="text-[11px] text-muted tabular-nums">{items.length}</span>
                </div>
                <div className="space-y-2">
                  {items.map((t) => (
                    <UpcomingTaskRow key={t.id} task={t} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Render it on the dashboard**

In `src/components/dashboard/TaskList.tsx`, add the import and render it between the priority groups and `<TaskHistory mode="yesterday" />`:

```ts
import { UpcomingTasks } from "@/components/dashboard/UpcomingTasks";
```

```tsx
          </div>
        )}
      </div>

      <UpcomingTasks />

      <TaskHistory mode="yesterday" />
```

The `</div>` above closes the `space-y-2.5` wrapper that is only rendered in the non-empty branch. Place `<UpcomingTasks />` **after** that conditional block closes, so the section appears whether or not today has tasks.

- [ ] **Step 4: Typecheck and lint**

Run: `npm run typecheck; npm run lint`

Expected: clean.

- [ ] **Step 5: Verify in the browser**

Run `npm run dev`, open the dashboard. Confirm:

1. With no future tasks the section renders nothing at all — the dashboard is byte-identical to before.
2. With one future task: a quiet `Upcoming · 1 · next Tue, 15 Oct` row appears below the task groups, with no lime anywhere.
3. Expanding groups by day, nearest first, header reading `Tomorrow` for tomorrow.
4. A repeating future task shows the `3d` badge.
5. Clicking a row opens the edit modal with the Date row and Repeat switch pre-filled.
6. At 360px nothing overflows; long titles truncate.

- [ ] **Step 6: Commit**

```bash
git add src/components/dashboard/UpcomingTasks.tsx src/components/dashboard/UpcomingTaskRow.tsx src/components/dashboard/TaskList.tsx
git commit -m "feat: add collapsible Upcoming section listing future-dated tasks"
```

---

### Task 10: `TaskRow` badge and `TaskDetailModal` migration

**Files:**
- Modify: `src/components/dashboard/TaskRow.tsx:87-94`
- Modify: `src/components/dashboard/TaskDetailModal.tsx:26,57-85`

**Interfaces:**
- Consumes: `repeatStep` from `@/lib/tasks`; `setTaskRepeatEvery` from `@/store/app-store`.
- Produces: nothing new.

- [ ] **Step 1: `TaskRow.tsx` repeat badge**

Replace lines 87-94:

```tsx
              {task.repeat && !done && (
                <span
                  className="flex shrink-0 items-center gap-1 rounded-full bg-accent/10 px-1.5 py-px text-[10px] text-accent"
                  title="Repeats daily"
                >
                  <Repeat size={10} strokeWidth={2.4} />
                </span>
              )}
```

with:

```tsx
              {repeatStep(task) > 0 && !done && (
                <span
                  className="flex shrink-0 items-center gap-1 rounded-full bg-accent/10 px-1.5 py-px text-[10px] text-accent"
                  title={`Repeats every ${repeatStep(task)} ${repeatStep(task) === 1 ? "day" : "days"}`}
                >
                  <Repeat size={10} strokeWidth={2.4} />
                  {repeatStep(task) > 1 && (
                    <span className="tabular-nums">{repeatStep(task)}d</span>
                  )}
                </span>
              )}
```

Add `import { repeatStep } from "@/lib/tasks";` and drop the unused `Pencil` import from the existing `lucide-react` line.

- [ ] **Step 2: `TaskDetailModal.tsx`**

This component is unreferenced dead code, but it carries a second copy of the repeat switch and must typecheck. Migrate it rather than delete it — deleting it is not this change's call.

Replace the store destructure at line 26:

```ts
  const { tasks, toggleTask, setTaskRepeat, removeTask } = useApp();
```

with:

```ts
  const { tasks, toggleTask, setTaskRepeatEvery, removeTask } = useApp();
```

Replace the repeat block (lines 57-85) with:

```tsx
      {task.bucket === "daily" && (
        <button
          type="button"
          role="switch"
          aria-checked={repeatStep(task) > 0}
          aria-label="Repeat this task"
          onClick={() => setTaskRepeatEvery(task.id, repeatStep(task) > 0 ? undefined : 1)}
          className="pressable flex w-full items-center justify-between rounded-[12px] border border-border bg-surface-elevated px-3.5 py-2.5"
        >
          <span className="flex items-center gap-2 text-[14px] text-primary">
            {repeatStep(task) > 0
              ? `Repeats every ${repeatStep(task)} ${repeatStep(task) === 1 ? "day" : "days"}`
              : "Does not repeat"}
            <Repeat size={15} className={repeatStep(task) > 0 ? "text-accent" : "text-muted"} />
          </span>
          <span
            className={cn(
              "relative h-7 w-12 shrink-0 rounded-full border transition-colors duration-150",
              repeatStep(task) > 0 ? "border-accent/60 bg-accent/15" : "border-border bg-surface-soft"
            )}
          >
            <span
              className={cn(
                "absolute left-0.5 top-0.5 h-[22px] w-[22px] rounded-full transition-transform duration-150",
                repeatStep(task) > 0 ? "translate-x-5 bg-accent" : "bg-muted"
              )}
            />
          </span>
        </button>
      )}
```

Add `import { repeatStep } from "@/lib/tasks";`.

- [ ] **Step 3: Typecheck, lint and test**

Run: `npm run typecheck; npm run lint; npm test`

Expected: all clean; tests PASS (40).

- [ ] **Step 4: Confirm no `repeat` boolean remains**

Run: `rg -n '\brepeat\b' src --glob '!*.test.ts'`

Expected: no matches other than `repeatEvery`, `setTaskRepeatEvery`, `setRepeatEvery` and prose in UI copy.

- [ ] **Step 5: Commit**

```bash
git add src/components/dashboard/TaskRow.tsx src/components/dashboard/TaskDetailModal.tsx
git commit -m "refactor: read repeat cadence through repeatStep in task rows"
```

---

### Task 11: Full verification

**Files:** none — verification only.

- [ ] **Step 1: Static checks**

Run: `npm run typecheck; npm run lint; npm test; npm run build`

Expected: typecheck clean, lint clean, all tests pass, build succeeds with the webpack header and the same static route count as before.

- [ ] **Step 2: Work the manual matrix from the spec**

With `npm run dev` running, verify all twelve rows of the spec's manual verification matrix. Pay particular attention to:

- Row 6 — close the app for 5 days on an every-2-days task. Since you cannot wait 5 days, force it: create the task, then in DevTools edit the IndexedDB `tasks` record's `day` back 5 days (or temporarily edit `today` in `lib/tasks.ts`, run the check, and revert). Confirm missed days land in history, the streak breaks, and the next occurrence sits on the grid.
- Row 8 and 9 — the `migrateTask` fixes. Set Timer on, reload, confirm it survived. Start a task so it goes `in_progress`, reload, confirm the accent ring survived.

- [ ] **Step 3: Check the accessibility sweep**

Tab through the composer and the Upcoming section. Every chip, stepper button, calendar day and accordion header must be reachable and show a visible focus ring. Confirm the switch reports its real interval through `aria-label`.

- [ ] **Step 4: Confirm reduced motion**

Emulate `prefers-reduced-motion: reduce`. The Upcoming accordion and the priority accordions must expand instantly with no data hidden.

- [ ] **Step 5: Run the design detector**

Run:

```bash
"C:\Users\Vishal\.config\opencode\skills\impeccable\scripts\impeccable.cmd" detect --json src/components/tasks/CreateTaskModal.tsx src/components/tasks/IntervalStepper.tsx src/components/ui/DayPicker.tsx src/components/ui/MonthCalendar.tsx src/components/dashboard/UpcomingTasks.tsx src/components/dashboard/UpcomingTaskRow.tsx
```

Fix everything it reports in one batch, then re-run at most once more and stop.

- [ ] **Step 6: Commit any detector fixes**

```bash
git add -A
git commit -m "fix: address design detector findings on the advanced-tasks surfaces"
```

Only commit if Step 5 produced changes.

---

## Self-Review

**Spec coverage:** every section of the spec maps to a task — data model (2, 3), migration and the two `migrateTask` bug fixes (4), `lib/tasks.ts` and the four deduplicated filters (3, 5), `daysBetweenKeys` (1), store wiring (4), composer UI (7, 8), `DayPicker`/`MonthCalendar` (6), Upcoming section (9), row badge and dead-code migration (10), testing (1, 3), manual matrix (11).

**Placeholder scan:** no TBD, no "handle edge cases", no "similar to Task N". Every code step carries real content.

**Type consistency:** `repeatStep`, `isTodayTask`, `isTaskOnDay`, `isLiveTask`, `upcomingTasks`, `occurrenceDates`, `rolloverTasks`, `setTaskRepeatEvery`, `MonthCalendar`, `DayPicker`, `IntervalStepper` are each introduced once with an exact signature and consumed consistently afterwards. `repeatEvery` is named identically in the type, the migration helper, the store, the composer state and both row components.