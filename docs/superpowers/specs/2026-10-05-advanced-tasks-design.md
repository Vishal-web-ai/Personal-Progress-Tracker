# Advanced Tasks — scheduling and interval recurrence

Date: 2026-10-05
Status: approved in chat (approach A, fixed-anchor cadence, backfill missed days, no end condition, daily-only, collapsed Upcoming section, 30-occurrence catch-up cap)

## Problem

Two things cannot be expressed today.

1. **A task dated in the future.** `addTask` hard-codes `day: dayKey(new Date())` (`src/store/app-store.tsx:434`), so today is the only reachable date. The single forward-scheduling path in the product is "Re-add on another day" inside the history sheet's missed-task sheet — a native `<input type="date">` that is visually inconsistent with every other date control.
2. **A repeat that is not every day.** `Task.repeat` is a boolean meaning "reappear tomorrow". There is no interval, no anchor, and no way to express "every three days".

These are the same feature. A dated task with an interval is a recurrence series; a dated task without one is a single future occurrence.

## Decisions this design rests on

| Decision | Choice | Consequence accepted |
|---|---|---|
| Cadence | **Fixed anchor.** Occurrence dates derive from the first occurrence; missing one does not shift the rest. | A missed occurrence stays missed. |
| Missed occurrences | **Backfilled as archived records.** | Being away now correctly *breaks* a streak. Today an absence is neutral (`src/lib/metrics.ts:69`), so this is a deliberate behaviour change. |
| End condition | **None.** Cancelled by turning repeat off. | No "until" field, no occurrence counter. |
| Scope | **Daily bucket only.** Weekly/monthly untouched. | Weekly never auto-advances and monthly still silently re-targets forward — both pre-existing, neither in scope. |
| Storage shape | **Interval on each occurrence record.** No separate series entity. | Editing the interval affects the current instance only; past occurrences keep the cadence they were created under. |
| Catch-up size | **30 occurrences per task per rollover pass**, remainder collapsed into one missed marker. | A very long absence produces a coarse record rather than hundreds of rows. |

## Data model

### `Task` (`src/types/index.ts`)

`repeat?: boolean` is **removed** and replaced:

```ts
/** Daily only: repeat cadence in days. 1 = every day (the legacy `repeat: true`).
 *  Absent or 0 = one-time task. Every occurrence is its own record and advances
 *  its own `day` by exactly this step, so the series needs no separate anchor
 *  field — the chain is self-describing. */
repeatEvery?: number;
```

`day` already exists and already means "the calendar day this occurrence belongs to". It is now allowed to be in the future. No new date field is introduced.

Bounds: `repeatEvery` is coerced on read to an integer in `1…30`. 30 is the ceiling because "every 45 days" is a monthly-bucket job, not a daily one.

### Migration (`migrateTask`, `src/store/app-store.tsx:85`)

```ts
repeatEvery: coerceRepeatEvery(raw.repeatEvery, raw.repeat === true)
```

where `coerceRepeatEvery(v, legacyFlag)` returns `1` when `legacyFlag` is set and `v` is absent, otherwise the clamped integer or `undefined`. Existing daily habits survive untouched.

### Two data-loss bugs fixed in the same function

`migrateTask` runs on **every** load (hydrate, cross-tab refresh) and rebuilds the object field by field. Two fields are currently omitted from the returned literal and are therefore silently erased on every page load:

- `hasTimer` — omitted, so the Timer toggle never survives a reload. The interval copy path propagates `hasTimer`, so the loss is visible in repeats too.
- `status: "in_progress"` — collapsed to `"done" | "todo"`, so `TaskRow`'s in-progress ring (`src/components/dashboard/TaskRow.tsx:49`) never survives a refresh.

Both are added to the returned literal. This is in-scope: it is the function being edited, and both fixes are two lines.

## New module: `src/lib/tasks.ts`

Single responsibility: *which day does a task belong to, and when does a repeat recur.* `rolloverTasks` moves here out of `app-store.tsx` so it is a pure, testable export instead of a module-private function.

```ts
export function isLiveTask(t: Task): boolean
export function isTaskOnDay(t: Task, day: string): boolean
export function isTodayTask(t: Task, day?: string): boolean
export function upcomingTasks(tasks: Task[], day?: string): Task[]
export function repeatStep(t: Task): number          // 0 when one-time
export function occurrenceDates(start: string, step: number, count: number): string[]
export function rolloverTasks(tasks: Task[], today?: string): Task[]
```

### The four duplicated "is today" filters

`src/components/dashboard/TaskList.tsx:24`, `src/lib/metrics.ts:21`, `src/components/tasks/TaskGroup.tsx:36` and `src/components/celebration/DayCelebration.tsx:31` each inline `!archived && day === dayKey(new Date())`. With future-dated tasks now possible, that predicate is load-bearing, so all four call `isTodayTask`.

### `rolloverTasks` — new algorithm

Existing behaviour: a daily task with `day < today` is archived, and a repeating one additionally spawns exactly one fresh copy dated today.

New behaviour, per daily non-archived task with `day < today`:

- **`step === 0` (one-time):** archive it. The date passed while the app was shut; this is now a missed task and belongs in history.
- **`step > 0` (repeating):** walk the occurrence chain. Every occurrence before today is archived as a missed record; the first occurrence on or after today becomes the new live instance.

```
cursor = t.day
while (cursor < today) {
  missed.push(archive(t, day = cursor))
  cursor = addDaysKey(cursor, step)
}
live = { ...t, day: cursor, status: "todo", archived: false, completedAt: undefined }
```

The chain stays on the anchor grid because each step is exactly `step` days from the previous occurrence, so the fixed-anchor property is structural rather than something recomputed from a stored anchor.

**Worked example** — anchor 7 Oct, `step` 3, app opened 14 Oct:

```
7 Oct  missed (archived)
10 Oct missed (archived)
13 Oct missed (archived)
16 Oct live  ← next occurrence; nothing appears on the 14th
```

The task correctly does **not** appear on the 14th, because the 14th is not on its cadence.

**Worked example** — anchor 7 Oct, `step` 3, app opened 10 Oct: the 7 Oct occurrence is archived *preserving its own status* (done if the user completed it, otherwise missed), and the live instance becomes 10 Oct, appearing today.

Archiving preserves `status` and `completedAt`, so a backfilled record distinguishes "did it" from "missed it". Only the live instance is reset to `todo`.

**Cap.** After 30 archived records for one task, the loop stops stepping: it archives one marker for the whole remainder and jumps `cursor` forward by `ceil(daysBetween(cursor, today) / step) * step` — still on the anchor grid — so the loop terminates.

Weekly and monthly branches are unchanged.

### Store wiring (`src/store/app-store.tsx`)

- `addTask` honours `task.day` for the daily bucket instead of overwriting it, falling back to today. It does not silently rewrite a past date; the composer prevents one.
- `setTaskRepeat(id, repeat: boolean)` becomes `setTaskRepeatEvery(id, repeatEvery?: number)`.
- `reAddTask` propagates `repeatEvery` instead of `repeat`.
- The midnight timer, IDB hydrate, legacy-localStorage hydrate and cross-tab refresh all call the relocated `rolloverTasks` unchanged.

### New: `daysBetweenKeys(a, b)` in `src/lib/time.ts`

Whole days from `a` to `b`. Needed by the catch-up jump. `Date`-based and DST-safe, consistent with `addDaysKey`.

## Composer UI

`src/components/tasks/CreateTaskModal.tsx`, daily bucket only. Operate mode: scanability over expression, lime rationed to action and selection.

### Date row — new, placed directly under the Area/Schedule grid

A chip row, because "Today" and "Tomorrow" cover most real intent and a calendar is a poor first thing to hit a user with:

- `Today` · `Tomorrow` · `Pick a date`
- Selected chip uses the existing chip-selected treatment (Lime fill, Forest Deep text).
- Choosing `Pick a date` reveals a `DayPicker` trigger reading e.g. `Thu, 15 Oct`. Selecting `Today` or `Tomorrow` hides the trigger again.

### `DayPicker` and the `MonthCalendar` extraction

`src/components/ui/WeekPicker.tsx` is already a complete themed month calendar whose value *is* a day key — it just labels the trigger with a week span. Rather than hand-roll a second calendar, the portal shell and month grid move into a shared `src/components/ui/MonthCalendar.tsx`:

```ts
MonthCalendar({ value, onSelect, minDay?, triggerLabel, ariaLabel, icon, className })
```

- `WeekPicker` becomes a thin wrapper passing `formatWeekSpan` as `triggerLabel`.
- `DayPicker` is a new thin wrapper passing `formatDayKey` and `minDay={todayKey}`.

`minDay` disables and dims past days, so a future-only date is enforced by the control itself rather than by validation after the fact. Both wrappers keep the existing portal, `dropdown-in` animation, `card-shadow-sm`, Escape-to-close and outside-click behaviour unchanged.

### Repeat row — the existing switch, extended

The switch stays where it is and keeps its `role="switch"` semantics. Its label becomes interval-aware: `Repeats every day` at step 1, `Repeats every 3 days` above that, `Only on 15 Oct` when off for a future date.

When the switch is on, an interval stepper reveals beneath it:

- `−` / `+` round controls flanking a tabular-numeral value, clamped `1…30`.
- A live cadence preview beneath: `Next: 7 Oct · 10 Oct · 13 Oct`.

The preview is the point of the row. Fixed-anchor cadence is invisible until you show the user the actual dates it produces; this makes the rule legible before committing, in muted meta text so it costs nothing against the accent budget.

## Upcoming section

New `src/components/dashboard/UpcomingTasks.tsx`, rendered in `TaskList` between today's priority groups and `<TaskHistory mode="yesterday" />`.

It deliberately reuses the exact card, header, count-chip, chevron and `accordion-content` / `accordion-inner` markup of the existing priority groups, so it reads as a member of the same family rather than a bolted-on widget.

- **Empty → renders `null`.** Today stays untouched.
- **Collapsed:** quiet row — muted icon, `Upcoming`, count chip, `next Thu 15 Oct` in meta, chevron. No lime: this is not an action.
- **Expanded:** grouped by day. Headers use the Label style (uppercase, `+0.08em` tracking) over a hairline-soft divider. `Tomorrow` for the next day, `formatDayKey` beyond that. Nearest day first, no horizon — a task three weeks out is still reachable, because an unreachable scheduled task is worse than a long list, and the section is collapsed by default anyway.
- **Rows:** a dedicated `UpcomingTaskRow`, not `TaskRow`. No completion checkbox (the future cannot be done early) and no focus/play button (there is nothing to work on yet). Icon well, title, area meta, and a `Repeat` badge carrying the interval when the task repeats. Click opens `CreateTaskModal` for edit or delete.

A repeating task whose first occurrence is in the future sits in Upcoming until its start date, then moves into today's list and rolls forward from there. A repeating task whose current occurrence is today is in today's list, not Upcoming.

Accent budget across the section: zero lime at rest. Lime appears only on a selected chip or a selected calendar day.

## Accessibility

- Date chips and the interval stepper are real `<button>`s in the tab order; the calendar grid matches the existing `WeekPicker` pattern with per-day `aria-label`s carrying the full date.
- The switch keeps `role="switch"` + `aria-checked`; its `aria-label` states the actual interval, not the word "repeat".
- The Upcoming header is a `<button>` with `aria-expanded` / `aria-controls`, matching the priority accordions.
- Every control collapses under `prefers-reduced-motion` via the existing `.accordion-content` mechanism.

## Testing

The repo has **no test runner and no `typecheck` script**. The recurrence math is pure, deterministic, and silently corrupts history if it drifts, so this design adds:

- `vitest` as a devDependency and a `test` script.
- A `typecheck` script running `tsc --noEmit`.
- Unit tests over `src/lib/tasks.ts` covering: the two worked examples above, a one-time task being archived, the 30-occurrence cap landing back on the anchor grid, `isTaskOnDay` boundaries, and `repeatStep` coercion.

Fallback: if the dependency install fails, verification falls back to `tsc --noEmit`, `eslint`, `next build`, and a scripted manual matrix, and this limitation is reported rather than hidden.

## Manual verification matrix

1. Create a one-time task dated 3 days out → absent from today, present under Upcoming, appears on its date.
2. Create a repeating task starting in 2 days, every 3 days → first appearance on day 2, then +3.
3. Repeat every 1 day → matches pre-existing `repeat: true` behaviour exactly.
4. Edit a repeating task's interval → next occurrence reflects the new step.
5. Turn repeat off → no further occurrences spawn.
6. Close the app for 5 days on an every-2-days task → reopen → missed days appear in history as missed, streak breaks, next occurrence is on the grid.
7. A one-time task whose date passes while the app is shut → appears in history as missed, never on today.
8. Reload after setting Timer on → `hasTimer` persists (the migration fix).
9. Reload mid-`in_progress` → the ring persists (the migration fix).
10. Keyboard-only: create a dated repeating task, reach every control, submit with Enter.
11. 360px width: composer chips wrap without overflow; Upcoming rows truncate.
12. `prefers-reduced-motion`: accordions collapse instantly, no hidden data.

## Out of scope

- Weekly/monthly scheduling and interval units of weeks or months.
- An end condition ("repeat until", "repeat N times").
- Editing a series retroactively ("change all future occurrences").
- Early completion of a future task.
- Replacing the native `<input type="date">` in `TaskHistory`'s missed-task sheet, though it is now the only remaining unthemed date control and is the obvious follow-up.
- Deleting `src/components/dashboard/TaskDetailModal.tsx`, which is unreferenced dead code carrying a second copy of the repeat switch. It is migrated to the new model rather than deleted, because deleting it is not this change's call.