# Pulse — Development Work Log & Current Architecture

Last updated: **2026-09-08**. This file captures the full context (decisions + changes)
so work can be resumed without re-discovering anything.

## What Pulse is

A local-first, single-user personal productivity web app (Next.js 15/16, App Router,
Tailwind, dark forest-green premium-minimalist design). Everything lives in the
browser's `localStorage`; no backend. Timer/sessions are stored locally too.

Design tokens: `src/app/globals.css` + `DESIGN.md`. Product truth: `PRODUCT.md`.
Versions: this Next.js is NOT training-data Next — read `node_modules/next/dist/docs/`
before writing code (see `AGENTS.md` top block).

## Core concept now (after this session)

Manual **Daily / Weekly / Monthly** task buckets. The user adds tasks into those
three buckets and **checks them off** when done. All progress/analytics are derived
from checkmarks (`Task.completedAt` + `Task.status`), NOT from auto-computed focus
time.

The **timer is kept** as a manual time-tracking tool (Start/Pause/Finish per task,
saved `WorkSession`s, session history in task detail). It does NOT feed goal/progress
math anymore.

## Data model

`src/types/index.ts`:

- `TaskBucket = "daily" | "weekly" | "monthly"`
- `Task { id, title, description?, areaId, areaName, priority, status, bucket, icon, goalId?, completedAt?, createdAt }`
  - `estimatedMinutes` REMOVED. Old `due` ("today"|"this_week"|"later") REMOVED.
- `WorkSession`, `TimerMode`, `SessionStatus` unchanged (timer still stored).

`src/store/app-store.tsx`:

- State: `tasks: Task[]`, `sessions: WorkSession[]`, `settings: { userName }`.
- `settings.weeklyGoalMinutes` REMOVED.
- Old persisted tasks auto-migrate on load: `due` → `bucket`, `estimatedMinutes` dropped
  (`migrateTask`, storage key still `pulse-state-v1`).

Seed data `src/data/initial.ts`: 10 starter tasks split across buckets; a handful
seeded as done (t3 yesterday, t4 today, t6 → 2d ago, t7 → 5d ago, t10 → 12d ago) so
streaks + charts show life on first launch. `sortByPriority` helper lives here.

## Pages & components (current map)

- **Home `/`** — `MobileProgress` (Today's Progress ring + metrics, morphs on mobile),
  `TaskList` (daily tasks only, priority accordions), then `DailyTrend` chart
  (check-offs per day, past week).
- **Goals `/goals`** — `TaskGroup` "This Week" (weekly bucket), `WeeklyTrend` chart,
  `TaskGroup` "This Month" (monthly bucket), `MonthlyTrend` chart (cumulative this
  month vs last month's pace as the "planned" line).
- **Tasks `/tasks`** — three `TaskGroup`s: Daily / Weekly / Monthly. Header shows
  active/done counts. Filters were removed.
- **Analytics `/analytics`** — checkmark-driven stats: daily/weekly/monthly `done/total`
  + %, streak, completion-by-area bars, recent completions list. No session/focus math.
- **Settings `/settings`** — user name only; demo-data clear UI unaffected.

Shared bits:

- `src/components/tasks/TaskGroup.tsx` — titled bucket section: `done/total` +
  progress bar + add-task button + `TaskRow`s; used by Goals and Tasks pages.
- `src/components/tasks/CreateTaskModal.tsx` — Title, Area, **Schedule** (Daily/
  Weekly/Monthly), Priority, Icon, Description; accepts `defaultBucket`
  (+ `defaultAreaId`). No estimated-time field.
- `src/components/dashboard/TaskRow.tsx` — icon + title + area name only (no due
  label, no time), retains timer play button + "Now" pill + checkbox.
- `src/lib/metrics.ts` — completion-based: `bucketProgress`, `currentStreakDays`,
  `completionByArea`, `recentCompletions`.
- `src/lib/time.ts` — unchanged (`startOfDay/Week/Month`, `isSameDay`, `formatFullDate`, ...).

Timer subsystem (kept): `src/store/timer-store.tsx`, `src/components/timer/SessionFlow.tsx`,
`ActiveSessionControls.tsx` (global docked timer bar), `TaskDetailModal` session history.

## Session change log (2026-09-08)

1. Task rows: removed the "Today / This week / Later" due label and estimated
   minutes — rows show area name only.
2. Modal animation: on mobile the create-task sheet now slides up from the bottom
   edge (`translateY(100%) → 0`); on `sm+` it keeps the subtle centered rise
   (`@keyframes modal-dialog-in` in `globals.css`).
3. Tasks tab: removed the status/area filter row entirely.
4. Fixed a runtime regression (`areaFilter is not defined`) left after removing filters.
5. **Architectural restructure** (approved design): manual daily/weekly/monthly task
   buckets replacing session-based goal evaluation. See "Core concept now" above.
6. Restored graphs separated by time scale (approved): Daily on Home, Weekly +
   Monthly on Goals. All plot check-offs (`completedAt`), not focus minutes.
7. Seeded a few completed tasks so streaks + charts aren't empty at first load.

## Verification

- `npm run lint`: clean.
- `npm run build`: clean, all routes prerendered static (`/`, `/goals`, `/tasks`,
  `/analytics`, `/settings`).
- QA rasters (older, pre-restructure): `docs/qa/`.

## Design / copy notes worth keeping

- Lime accent is rationed (~10% of screen), no glow, flat surfaces, hairline borders.
- Reduced motion (`prefers-reduced-motion`) collapses all animation.
- Copies in UI should say "check off a task when it's done", not "record a session".