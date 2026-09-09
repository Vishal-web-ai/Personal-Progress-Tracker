# Offline-First Storage + PWA Installability

Date: 2026-09-09 · Status: Approved design

## Context

Pulse is a fully client-side Next.js 16 app (dashboard, tasks, focus timer, goals, notes, analytics). All state lives in `app-store.tsx` and persists to `localStorage` (`pulse-state-v1`) on every change. The user wants to use the app as a PWA on mobile, offline-capable and installable, and does not want to rely on localStorage.

Decisions already made with the user:

- **Local now, sync later.** Data must exist primarily on the phone via offline-first IndexedDB, but the persistence layer must be a clean seam so cloud sync can be added later without touching the UI.
- **Storage engine: `idb`** (tiny, battle-tested IndexedDB wrapper).
- **PWA packaging: `@serwist/next`** (9.5.x stable; peer range covers Next 16; requires the webpack build path since Turbopack support is only in Serwist v10 preview).
- **Hosting: static.** App ships as pure static files on Cloudflare Pages / Vercel.
- Approval granted for the design below.

## Goals

- Replace all `localStorage` persistence with IndexedDB.
- Preserve existing data losslessly via a one-time migration.
- Make the app installable (manifest + icons) and fully offline-capable (precached static shell).
- Keep the UI codebase untouched: the async layer is invisible to components.

## Non-Goals

- Cloud sync, accounts, or multi-device merge (deferred; the seam is prepared).
- Background sync / push notifications.
- Per-record CRUD stores.

## Architecture

```
Components (unchanged) → app-store (in-memory source of truth, React state)
                                             │  hydrate on mount
                                             │  debounced writes + flush on hide
                                             ▼
                                       lib/db.ts  ← future sync attaches here
                                             │
                                             ▼
                                 IndexedDB "pulse" (idb)
```

### `lib/db.ts`

- DB `pulse`, version 1, single object store `kv` (key-path `key`).
- Keys: `tasks` | `sessions` | `settings` | `meta`.
  - Separating the three entities (rather than one blob) gives sync/merge the granularity it needs later at negligible cost today: every write is one `readwrite` transaction with three `put`s.
  - `meta` holds `{ savedAt: number }` — a monotonic last-write timestamp a future sync can key off.
- Public API (all async, all typed):
  - `readSnapshot(): Promise<PersistedSnapshot | null>` — reads the three keys, returns `null` if nothing stored.
  - `writeSnapshot(snapshot: PersistedSnapshot): Promise<void>` — one transaction, three puts + savedAt bump.
- Module is the only file allowed to import `idb`; everything else talks to the snapshot shape.

### `app-store.tsx` changes

- **State starts `null`.** `<AppProvider>` begins with `AppState | null`.
- **Hydration** (mount effect, runs once):
  1. If IndexedDB has data → load + migrate tasks/settings via existing `migrateTask` logic → `setState`.
  2. Else if `localStorage["pulse-state-v1"]` exists → read it, parse through the existing migration logic, `writeSnapshot()` into IDB, `localStorage.removeItem(...)`, set state. (One-time migration.)
  3. Else → seed defaults (`INITIAL_TASKS`, `buildSeedSessions`) as today.
- **Loading gate:** while `state === null` render a minimal brand-styled splash (backdrop color, no layout flash — matches the app's dark theme). No suspense, no SSR complexity.
- **Write:** `useEffect` on `state` → 300ms debounced `writeSnapshot`. Also flush immediately on `visibilitychange` (hidden) and `pagehide`, clearing the pending timer, so the last edit survives tab kill / app switch.
- All state updaters (`addTask`, `reAddTask`, `saveSession`, `resetData`, `loadSampleData`, ...) are unchanged — they keep computing new state objects; persistence is the same single effect.

### `PersistedSnapshot`

```ts
interface PersistedSnapshot {
  tasks: Task[];
  sessions: WorkSession[];
  settings: AppSettings;
}
```

Rehydrated tasks run through the existing `migrateTask` mapping (id, title, bucket, day, archived, ...), so future shape changes keep working the same way they do today.

## PWA packaging

### `@serwist/next` (version 9.5.x)

- `next.config.ts` wraps the config: `withSerwist({ swSrc: "src/app/sw.ts", swDest: "public/sw.js", disable: process.env.NODE_ENV !== "production" })`.
- Webpack build path required: `turbopack: false` (Serwist 9 webpack plugin; Turbopack only in v10 preview). Verify during implementation that the dev script still runs webpack consistently.
- `output: "export"` — pure static export (app is client-only) so deployment is a static file upload (Cloudflare Pages / Vercel). Verify `next/font` (Inter) self-hosts cleanly under export.

### Worker (`src/app/sw.ts`)

- Uses `@serwist/next/worker` with `defaultCache` (app-router defaults: precache static assets, network-first navigation requests, stale-while-revalidate for chunks). Registered on `self.__SW_MANIFEST`.

### Registration + head meta (`layout.tsx`)

- Small client effect component registers `/sw.js` on load + on load of standalone/updated; skipping if `process.env.NODE_ENV === "development"` is handled by Serwist's `disable` but registration effect stays no-op in dev to avoid noise.
- Head meta: `theme-color` (palette `--color-background`), `apple-mobile-web-app-capable`, `apple-mobile-web-app-status-bar-style: black-translucent`, `format-detection`.

### Manifest (`src/app/manifest.ts`)

- `name` "Pulse", `short_name` "Pulse", `start_url` "/", `display: standalone`, `background_color` + `theme_color` from the dark palette (e.g. `#0B100D`), `icons` referencing the generated set.

### Icons

- One-off script `scripts/generate-icons.ts` (run manually, `pngjs` dev dep) renders a simple geometric mark — rounded square in background color + ring/dot glyph in accent green — onto RGBA buffers and writes:
  - `public/icons/icon-192.png`, `icon-512.png`
  - `public/icons/maskable-512.png` (safe-zone padding)
  - `public/icons/apple-touch-icon.png` (180)
- Output committed; script kept for regeneration.

## Verification

No test suite exists. Verify with:

1. `npm run lint`
2. `npm run build` (static export succeeds; `public/sw.js` emitted)
3. Manual, after deploy: add task → reload page → still present; Delete/reload; DevTools → Application → check IDB `pulse` rows, registered SW; offline mode reload still renders the shell; iOS Safari "Add to Home Screen" installs and loads.
4. Migration check: existing `pulse-state-v1` in localStorage imports exactly once, then localStorage key removed.

## Known limitation

iOS evicts website data (including IndexedDB) under storage pressure. Mitigations: user installs as PWA and opens regularly; nothing more is available on iOS WebKit without native packaging.