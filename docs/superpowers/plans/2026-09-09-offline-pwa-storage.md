# Offline-First Storage + PWA Installability — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace `localStorage` persistence with an IndexedDB-backed async layer in Pulse, and ship an installable, offline-capable PWA (manifest + icons + service worker) as static export.

**Architecture:** `app-store.tsx` stays the in-memory source of truth; it hydrates once from a new `lib/db.ts` module (IndexedDB), writes are debounced 300ms with a flush on tab-hide, and a one-time migration imports the old `pulse-state-v1` localStorage copy into IDB. The PWA shell (`@serwist/next` webpack plugin) precaches the static build and registers a service worker; `next.config.ts` switches to `output: "export"`.

**Tech Stack:** Next.js 16.3.4 (webpack build path), React 19.2, TypeScript, `idb`, `@serwist/next` 9.5.x + `serwist`, `pngjs` (dev, icon generation script).

**Spec:** `docs/superpowers/specs/2026-09-09-offline-pwa-storage-design.md`

## Global Constraints

- Next.js 16.3.4 in this repo; **do not** upgrade Next. All tasks keep `npm run lint` and `npm run build` green.
- No test runner exists in this repo. Verification per task = `npm run lint` + `npm run build` + the manual steps listed. **Do not** introduce a test framework.
- Brand palette (must be used in manifest, metadata, icons): background `#061B14`, surface `#0B241C`, accent `#B8FF4A`, text primary `#F4F7F5`.
- Static export required: `output: "export"` in `next.config.ts`.
- The persistence layer is the future sync seam: only `src/lib/db.ts` may speak to IndexedDB; the rest of the app talks to `PersistedSnapshot`.
- Existing rollover/migration logic in `app-store.tsx` (`migrateTask`, `rolloverTasks`) must be preserved unchanged.
- Out of scope (pre-existing, unchanged by this plan): notes and timer data still persist via their own mechanisms.
- Commit style: conventional commits (`feat:`, `chore:`, `docs:`). Commit steps stage only the listed files.

---

### Task 0: Baseline checkpoint commit

Current work — daily-task rollover, history UI, homepage chart removal — is uncommitted on top of the single initial commit. Commit it first so later task commits stay clean, and silence two stray server log files that are not source.

**Files:**
- Modify: `.gitignore`
- Commit: all tracked + untracked source

- [ ] **Step 1: Ignore stray logs**

Append to `.gitignore`:

```gitignore
# local dev server logs
/server.log
/mprogress-server.log
```

- [ ] **Step 2: Commit the checkpoint**

```bash
git add -A
git commit -m "chore: checkpoint accumulated feature work before PWA rework"
```

Expected: commit succeeds; `git status` is clean.

---

### Task 1: Add dependencies

**Files:**
- Modify: `package.json`, `package-lock.json` (via npm)

- [ ] **Step 1: Install runtime + PWA deps**

```bash
npm install idb @serwist/next
npm install -D serwist pngjs @types/pngjs
```

- [ ] **Step 2: Verify versions**

```bash
npm ls idb @serwist/next serwist pngjs @types/pngjs
```

Expected: `idb` and `@serwist/next` under `dependencies`; `serwist`, `pngjs`, `@types/pngjs` under `devDependencies`; `@serwist/next` at `9.5.x` (not v10 preview), `idb` at latest 8.x.

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add idb and serwist deps for offline PWA layer"
```

---

### Task 2: IndexedDB persistence module (`src/lib/db.ts`)

**Files:**
- Create: `src/lib/db.ts`

**Interfaces:**
- Produces (consumed by Task 3 and by the future sync seam):
  ```ts
  export interface PersistedSnapshot {
    tasks: Task[];
    sessions: WorkSession[];
    settings: { userName: string };
  }
  export function readSnapshot(): Promise<PersistedSnapshot | null>
  export function writeSnapshot(snapshot: PersistedSnapshot): Promise<void>
  ```

- [ ] **Step 1: Write the module**

Create `src/lib/db.ts`:

```ts
"use client";

import { openDB, type IDBPDatabase } from "idb";
import type { Task, WorkSession } from "@/types";

export interface PersistedSnapshot {
  tasks: Task[];
  sessions: WorkSession[];
  settings: { userName: string };
}

interface KvRecord<T> {
  key: string;
  value: T;
}

const DB_NAME = "pulse";
const DB_VERSION = 1;
const STORE = "kv";
const KEYS = {
  tasks: "tasks",
  sessions: "sessions",
  settings: "settings",
  meta: "meta",
} as const;

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDB(): Promise<IDBPDatabase> {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE)) {
          db.createObjectStore(STORE, { keyPath: "key" });
        }
      },
    });
  }
  return dbPromise;
}

export async function readSnapshot(): Promise<PersistedSnapshot | null> {
  const db = await getDB();
  const tx = db.transaction(STORE, "readonly");
  const [tasks, sessions, settings] = await Promise.all([
    tx.store.get(KEYS.tasks),
    tx.store.get(KEYS.sessions),
    tx.store.get(KEYS.settings),
  ]);
  await tx.done;
  if (!tasks && !sessions && !settings) return null;
  return {
    tasks: (tasks as KvRecord<Task[]> | undefined)?.value ?? [],
    sessions: (sessions as KvRecord<WorkSession[]> | undefined)?.value ?? [],
    settings: (settings as KvRecord<{ userName: string }> | undefined)?.value ?? { userName: "Vishal" },
  };
}

export async function writeSnapshot(snapshot: PersistedSnapshot): Promise<void> {
  const db = await getDB();
  const tx = db.transaction(STORE, "readwrite");
  tx.store.put({ key: KEYS.tasks, value: snapshot.tasks });
  tx.store.put({ key: KEYS.sessions, value: snapshot.sessions });
  tx.store.put({ key: KEYS.settings, value: snapshot.settings });
  tx.store.put({ key: KEYS.meta, value: { savedAt: Date.now() } });
  await tx.done;
}
```

- [ ] **Step 2: Verify lint + build**

```bash
npm run lint
npm run build
```

Expected: both pass. (The module isn't wired in yet — it is imported and exercised by Task 3.)

- [ ] **Step 3: Commit**

```bash
git add src/lib/db.ts
git commit -m "feat: add IndexedDB persistence seam (lib/db)"
```

---

### Task 3: Rework `app-store.tsx` — async hydration, migration, debounced persistence, loading gate

**Files:**
- Modify: `src/store/app-store.tsx`

**Interfaces:**
- Consumes: `readSnapshot`, `writeSnapshot`, `PersistedSnapshot` from `src/lib/db.ts` (Task 2).
- Produces: `AppProvider` renders children only after hydration; `useApp()` API signatures are unchanged (all existing consumers keep compiling).

- [ ] **Step 1: Replace the import block**

In `src/store/app-store.tsx`, change the top import to add the db module:

```tsx
import { dayKey, dayKeyFor } from "@/lib/time";
import { readSnapshot, writeSnapshot } from "@/lib/db";
```

Keep every other import as-is.

- [ ] **Step 2: Replace `loadState` with decode + seed + legacy helpers**

Delete the current `loadState` function and replace it with:

```tsx
function decodeState(raw: string): AppState {
  const parsed = JSON.parse(raw) as AppState;
  return {
    tasks: (parsed.tasks ?? []).map((t) => migrateTask(t as unknown as Record<string, unknown>)),
    sessions: parsed.sessions ?? [],
    settings: { ...DEFAULT_SETTINGS, ...(parsed.settings ?? {}) },
  };
}

function defaultSeed(): AppState {
  return { tasks: INITIAL_TASKS, sessions: buildSeedSessions(), settings: DEFAULT_SETTINGS };
}

function readLegacyLocalState(): AppState | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return decodeState(raw);
  } catch {
    return null;
  }
}
```

(`STORAGE_KEY` stays `"pulse-state-v1"` — it is now only read once for migration.)

- [ ] **Step 3: Replace the provider head** (state + hydration + persistence effects)

Replace the block starting at `export function AppProvider` through the end of the localStorage timer effect:

```tsx
export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AppState | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      let loaded: AppState | null = null;
      try {
        const db = await readSnapshot();
        if (db) {
          loaded = {
            tasks: db.tasks.map((t) => migrateTask(t as unknown as Record<string, unknown>)),
            sessions: db.sessions ?? [],
            settings: { ...DEFAULT_SETTINGS, ...(db.settings ?? {}) },
          };
        }
      } catch {
        // fall through to legacy migration / seed
      }
      if (!loaded && !cancelled) {
        try {
          const legacy = readLegacyLocalState();
          if (legacy) {
            await writeSnapshot({
              tasks: legacy.tasks,
              sessions: legacy.sessions,
              settings: legacy.settings,
            });
            window.localStorage.removeItem(STORAGE_KEY);
            loaded = legacy;
          }
        } catch {
          // ignore; seed below
        }
      }
      if (!cancelled) {
        setState(loaded ? { ...loaded, tasks: rolloverTasks(loaded.tasks) } : defaultSeed());
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const persistTimer = useRef<number | null>(null);

  useEffect(() => {
    if (!state) return;
    if (persistTimer.current !== null) window.clearTimeout(persistTimer.current);
    persistTimer.current = window.setTimeout(() => {
      persistTimer.current = null;
      void writeSnapshot({ tasks: state.tasks, sessions: state.sessions, settings: state.settings });
    }, 300);
    return () => {
      if (persistTimer.current !== null) window.clearTimeout(persistTimer.current);
    };
  }, [state]);

  useEffect(() => {
    if (!state) return;
    const flush = () => {
      if (persistTimer.current !== null) {
        window.clearTimeout(persistTimer.current);
        persistTimer.current = null;
      }
      void writeSnapshot({ tasks: state.tasks, sessions: state.sessions, settings: state.settings });
    };
    const onVisibility = () => {
      if (document.visibilityState === "hidden") flush();
    };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", flush);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", flush);
    };
  }, [state]);

  useEffect(() => {
    let timer: number;
    const arm = () => {
      const now = new Date();
      const next = new Date(now);
      next.setHours(24, 0, 0, 0);
      timer = window.setTimeout(() => {
        setState((s) => (s ? { ...s, tasks: rolloverTasks(s.tasks) } : s));
        arm();
      }, next.getTime() - now.getTime() + 50);
    };
    arm();
    return () => window.clearTimeout(timer);
  }, []);

  const value = useMemo(() => {
    if (!state) return null;
    return {
      tasks: state.tasks,
      sessions: state.sessions,
      settings: state.settings,
      addTask,
      toggleTask,
      removeTask,
      setTaskStatus,
      saveSession,
      updateSettings,
      reAddTask,
      resetData,
      loadSampleData,
    };
  }, [state, addTask, toggleTask, removeTask, setTaskStatus, saveSession, updateSettings, reAddTask, resetData, loadSampleData]);

  if (!state || !value) {
    return (
      <div className="flex min-h-[100dvh] w-full items-center justify-center bg-background">
        <div className="text-[12px] font-semibold uppercase tracking-[0.08em] text-muted">Pulse</div>
      </div>
    );
  }

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
```

Rules this block must obey (from the repo's lint config): all `useX` hooks run unconditionally before the early `return` — the loading gate uses a `null`-safe `useMemo` result, never an early hook. No `setState` inside an effect body outside a thenable.

- [ ] **Step 4: Verify lint + build**

```bash
npm run lint
npm run build
```

Expected: both pass (static export still works; the SSR-prerendered shell renders the loading gate).

- [ ] **Step 5: Verify runtime persistence manually**

With `npm run dev`, in your browser:
1. Add a daily task; wait >300ms.
2. Open DevTools → Application → IndexedDB → `pulse` → `kv`. Expect records for `tasks`, `sessions`, `settings`, `meta`.
3. Reload the page — the task is still present (hydrated from IDB).
4. Check `localStorage` in DevTools — `pulse-state-v1` should be gone (migrated on first hydrate) and should not reappear.

- [ ] **Step 6: Commit**

```bash
git add src/store/app-store.tsx
git commit -m "feat: hydrate from IndexedDB with debounced persistence and one-time localstorage migration"
```

---

### Task 4: Serwist PWA shell — next config, tsconfig, gitignore

**Files:**
- Modify: `next.config.ts`, `tsconfig.json`, `.gitignore`

- [ ] **Step 1: Wrap `next.config.ts`**

Replace the whole file:

```ts
import type { NextConfig } from "next";
import withSerwistInit from "@serwist/next";

const withSerwist = withSerwistInit({
  swSrc: "src/app/sw.ts",
  swDest: "public/sw.js",
  disable: process.env.NODE_ENV === "development",
});

const nextConfig: NextConfig = {
  output: "export",
  turbopack: false,
};

export default withSerwist(nextConfig);
```

If TypeScript rejects `turbopack: false` in the `NextConfig` type, cast the object `as NextConfig` after the spread and note it in commit. `turbopack: false` forces the webpack build path Serwist 9 needs; verify in Step 3.

- [ ] **Step 2: Update `tsconfig.json` and `.gitignore`**

In `tsconfig.json` `compilerOptions`, add `"webworker"` to `lib` and `"@serwist/next/typings"` to a new `types` array; add `public/sw.js` to `exclude`:

```jsonc
"lib": ["dom", "dom.iterable", "esnext", "webworker"],
"types": ["@serwist/next/typings"],
```

```jsonc
"exclude": ["node_modules", "public/sw.js"]
```

Append to `.gitignore`:

```gitignore
# Serwist
public/sw*
public/swe-worker*
```

- [ ] **Step 3: Verify the build switches to webpack and stays green**

```bash
npm run lint
npm run build
```

BEFORE this task the build logged `Next.js 16.3.4 (Turbopack)`. Expected now: the same header WITHOUT `(Turbopack)` (webpack), static export into `out/`, and a generated `public/sw.js` + `public/swe-worker.js` exist. If the header still says Turbopack, stop and check the Next 16 opt-out docs before continuing.

- [ ] **Step 4: Commit**

```bash
git add next.config.ts tsconfig.json .gitignore public/sw.js public/swe-worker.js
git commit -m "chore: configure serwist pwa shell with static export build"
```

(Inspect `git status` first — if `out/` or `.next/` artifacts snuck in, they are gitignored already.)

---

### Task 5: Service worker source + PWA head metadata

**Files:**
- Create: `src/app/sw.ts`
- Modify: `src/app/layout.tsx`

**Interfaces:**
- Consumes: `self.__SW_MANIFEST` injection point provided by `@serwist/next` (Task 4 config).

- [ ] **Step 1: Write the worker**

Create `src/app/sw.ts`:

```ts
import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { Serwist } from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: defaultCache,
});

serwist.addEventListeners();
```

- [ ] **Step 2: Update `layout.tsx` metadata + viewport**

Replace the `metadata` export in `src/app/layout.tsx`:

```tsx
import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });

const APP_NAME = "Pulse";

export const metadata: Metadata = {
  applicationName: APP_NAME,
  title: "Pulse — Personal Productivity OS",
  description: "A premium personal productivity operating system: dashboard, tasks, focus timer, goals and analytics.",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: APP_NAME,
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: "#061B14",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-scroll-behavior="smooth" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-background text-primary">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
```

(Keep `RootLayout`'s body markup identical to today's — only metadata/viewport are new.)

- [ ] **Step 3: Verify**

```bash
npm run lint
npm run build
```

Expected: pass; `public/sw.js` regenerates with the precache manifest. `@serwist/next` injects its own SW registration script by default (`register` option) — after `npm run start` (prod build) or a static serve, DevTools → Application → Service Workers should show an active `sw.js` for the origin. If no service worker appears with the served build, add a manual registration effect in `Providers`:

```tsx
useEffect(() => {
  if ("serviceWorker" in navigator) {
    void navigator.serviceWorker.register("/sw.js");
  }
}, []);
```

- [ ] **Step 4: Commit**

```bash
git add src/app/sw.ts src/app/layout.tsx public/sw.js public/swe-worker.js
git commit -m "feat: add serwist service worker and pwa head metadata"
```

---

### Task 6: Web app manifest + generated icons

**Files:**
- Create: `public/manifest.json`, `scripts/generate-icons.mjs`, `public/icons/icon-192.png`, `public/icons/icon-512.png`, `public/icons/maskable-512.png`, `public/icons/apple-touch-icon.png`

Icon style: rounded square in surface `#0B241C`, a ring and dot in accent `#B8FF4A`, thin anti-aliased edges — matches the app's dark forest-green identity.

- [ ] **Step 1: Write the manifest**

Create `public/manifest.json` (served at `/manifest.json`; `publicFileTrailingSlash`/static export copies it verbatim):

```json
{
  "name": "Pulse — Personal Productivity OS",
  "short_name": "Pulse",
  "description": "A premium personal productivity operating system: dashboard, tasks, focus timer, goals and analytics.",
  "start_url": "/",
  "display": "standalone",
  "orientation": "portrait",
  "background_color": "#061B14",
  "theme_color": "#061B14",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png" },
    { "src": "/icons/maskable-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ]
}
```

- [ ] **Step 2: Write the icon generator**

Create `scripts/generate-icons.mjs`:

```js
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PNG } from "pngjs";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const outDir = path.join(root, "public", "icons");
fs.mkdirSync(outDir, { recursive: true });

const BG = [11, 36, 28];
const ACCENT = [184, 255, 74];

const clamp = (v) => Math.min(1, Math.max(0, v));
const smoothstep = (t) => {
  const x = clamp(t);
  return x * x * (3 - 2 * x);
};

function render(size, { opaque = false, padding = 0 } = {}) {
  const png = new PNG({ width: size, height: size });
  const cx = size / 2;
  const cy = size / 2;
  const half = size / 2;
  const radius = size * 0.225;
  const inset = padding * size;
  const glyphMax = (size - inset * 2) / 2;
  const ringR = glyphMax * 0.52;
  const ringHalfW = Math.max(1, size * 0.022);
  const dotR = glyphMax * 0.16;

  const roundedRectDist = (px, py) => {
    const qx = Math.abs(px - cx) - (half - radius);
    const qy = Math.abs(py - cy) - (half - radius);
    return Math.min(Math.max(qx, qy), 0) + Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) - radius;
  };

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const px = x + 0.5;
      const py = y + 0.5;
      const d = Math.hypot(px - cx, py - cy);
      const cover = opaque ? 1 : 1 - smoothstep(roundedRectDist(px, py) + 0.5);

      let [r, g, b] = BG;
      let a = 0;
      if (cover > 0) {
        const ringEdge = 0.5 - Math.abs(d - ringR) / ringHalfW;
        const ringCover = smoothstep(ringEdge + 0.5);
        const dotCover = 1 - smoothstep(d - dotR + 0.5);
        if (ringCover > dotCover) {
          [r, g, b, a] = [...ACCENT, Math.round(255 * cover * ringCover)];
        } else if (dotCover > 0) {
          [r, g, b, a] = [...ACCENT, Math.round(255 * cover * dotCover)];
        } else {
          a = Math.round(255 * cover);
        }
      }
      const idx = (size * y + x) << 2;
      png.data[idx] = r;
      png.data[idx + 1] = g;
      png.data[idx + 2] = b;
      png.data[idx + 3] = a;
    }
  }
  return PNG.sync.write(png);
}

const files = {
  "icon-192.png": render(192),
  "icon-512.png": render(512),
  "maskable-512.png": render(512, { padding: 0.08 }),
  "apple-touch-icon.png": render(180, { opaque: true }),
};

for (const [name, buf] of Object.entries(files)) {
  fs.writeFileSync(path.join(outDir, name), buf);
}
```

- [ ] **Step 3: Run it and inspect**

```bash
node scripts/generate-icons.mjs
```

Then open `public/icons/icon-512.png` — expect a dark rounded square with an accent ring + dot, clean 1px edges. Regenerate freely; the script is deterministic.

- [ ] **Step 4: Verify build + preview**

```bash
npm run build
npm start
```

Open the prod build locally: `/manifest.json` returns the manifest; DevTools → Application → Manifest shows name "Pulse", standalone display, the three icons (one maskable), valid colors; the SW from Task 5 remains active.

- [ ] **Step 5: Commit**

```bash
git add public/manifest.json public/icons scripts/generate-icons.mjs
git commit -m "feat: add pwa manifest and generated icons"
```

---

### Task 7: End-to-end verification + deployment notes

**Files:** none (verification only, plus this doc's notes)

- [ ] **Step 1: Static build + artifact inventory**

```bash
npm run lint
npm run build
```

Expected: green. Confirm in `out/`: `index.html`, `manifest.json`, `sw.js`, per-route `*.html`, hashed JS/CSS chunks, and `icons/` are all present. Confirm `public/sw.js` and `public/swe-worker.js` regenerated.

- [ ] **Step 2: Offline check**

Serve `out/` statically (e.g. `npx serve out`), load once online in Chrome, then toggle DevTools → Network → Offline and reload: the app shell + route shells render from cache; tasks/sessions data loads from IndexedDB.

- [ ] **Step 3: Migration + persistence checklist (repeat of Task 3 Steps 5)**

1. Fresh profile: open app → seeds appear → data lands in IDB `pulse`/`kv`, no `pulse-state-v1` in localStorage afterward.
2. Seed a value, reload, confirm it survives; edit while offline, hide the tab, reopen, confirm persistence.

- [ ] **Step 4: Install-to-home-screen on mobile**

From the deployed static URL, use Chrome Android "Install app" and iOS Safari "Add to Home Screen": both install Pulse, launch standalone with the icon, and work offline after first load.

- [ ] **Step 5: Commit this plan's docs**

```bash
git add docs/superpowers
git commit -m "docs: offline pwa storage spec and implementation plan"
```

### Deployment

Static export in `out/` uploads as-is to Cloudflare Pages (build command `npm run build`, output directory `out`) or any static host. No server routes exist, so no special functions config is needed.