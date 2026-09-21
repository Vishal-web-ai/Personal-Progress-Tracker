"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { Area, Task, TaskBucket, WorkSession } from "@/types";
import { AREAS, INITIAL_TASKS, buildSeedSessions } from "@/data/initial";
import { buildSampleData } from "@/data/sample";
import { dayKey, dayKeyFor, monthKey, weekRange } from "@/lib/time";
import { readSavedAt, readSnapshot, writeSnapshot } from "@/lib/db";

interface AppSettings {
  userName: string;
  avatarUrl?: string;
  areas: Area[];
  celebrationSound: boolean;
}

interface AppState {
  tasks: Task[];
  sessions: WorkSession[];
  settings: AppSettings;
}

interface AppContextValue {
  tasks: Task[];
  sessions: WorkSession[];
  settings: AppSettings;
  addTask: (task: Omit<Task, "id" | "createdAt" | "status">) => void;
  addArea: (name: string) => Area | null;
  removeArea: (id: string) => void;
  toggleTask: (id: string) => void;
  removeTask: (id: string) => void;
  setTaskStatus: (id: string, status: Task["status"]) => void;
  setTaskRepeat: (id: string, repeat: boolean) => void;
  saveSession: (session: Omit<WorkSession, "id" | "status"> & { status?: WorkSession["status"] }) => void;
  updateSettings: (patch: Partial<AppSettings>) => void;
  reAddTask: (id: string, day?: string) => void;
  updateTask: (id: string, patch: Partial<Omit<Task, "id" | "createdAt">>) => void;
  resetData: () => void;
  loadSampleData: () => void;
}

const STORAGE_KEY = "pulse-state-v1";

const DEFAULT_SETTINGS: AppSettings = {
  userName: "Vishal",
  avatarUrl: undefined,
  areas: [],
  celebrationSound: true,
};

/** Default icons handed to new custom areas, cycled so siblings stay distinct. */
const CUSTOM_AREA_ICONS = ["brain", "wrench", "target", "music", "trending", "container", "mic", "grad"];

/** Older persisted tasks used `due` ("today" | "this_week" | "later") and
 *  `estimatedMinutes`. Map them into the current bucket model, preserving the
 *  explicit `bucket` newer records carry. */
function migrateTask(raw: Record<string, unknown>): Task {
  const due = raw.due;
  const rawBucket = raw.bucket;
  // New records store `bucket` directly; older data mapped `due` → bucket.
  let bucket: TaskBucket =
    rawBucket === "daily" || rawBucket === "weekly" || rawBucket === "monthly"
      ? rawBucket
      : due === "today" || due === undefined
        ? "daily"
        : due === "this_week"
          ? "weekly"
          : "monthly";

  const weekStart =
    typeof raw.weekStart === "string"
      ? raw.weekStart
      : typeof raw.week === "number" && raw.week >= 1 && raw.week <= 5
        ? dayKey(weekRange(Math.round(raw.week), new Date()).start)
        : undefined;

  // Heal records that were prematurely re-bucketed to daily while still
  // carrying their weekly/monthly scope markers.
  if (bucket === "daily" && typeof raw.monthKey === "string") bucket = "monthly";
  else if (bucket === "daily" && weekStart) bucket = "weekly";

  return {
    id: String(raw.id ?? ""),
    title: String(raw.title ?? ""),
    description: raw.description as string | undefined,
    areaId: String(raw.areaId ?? ""),
    areaName: String(raw.areaName ?? ""),
    priority:
      raw.priority === "high" || raw.priority === "medium" || raw.priority === "low"
        ? raw.priority
        : "medium",
    status: raw.status === "done" ? "done" : "todo",
    bucket,
    icon: String(raw.icon ?? "cloud"),
    goalId: raw.goalId as string | undefined,
    day: typeof raw.day === "string" ? raw.day : dayKeyFor(),
    weekStart,
    // Monthly tasks without an explicit month default to the current month so
    // legacy data keeps a home.
    monthKey:
      typeof raw.monthKey === "string"
        ? raw.monthKey
        : bucket === "monthly"
          ? monthKey(new Date())
          : undefined,
    archived: Boolean(raw.archived),
    completedAt: raw.completedAt as number | undefined,
    repeat: Boolean(raw.repeat),
    createdAt: (raw.createdAt as number) ?? Date.now(),
  };
}

/** Archive daily tasks whose calendar day is behind today, rollout incomplete
 *  monthly tasks forward to the current month. Repeating daily tasks keep their
 *  completed/missed record (so history + streak survive) and also spawn a fresh
 *  copy for today — the habit always reappears on its own. */
function rolloverTasks(tasks: Task[], today: string = dayKey(new Date())): Task[] {
  const thisMonth = monthKey(new Date());
  return tasks.flatMap((t) => {
    if (t.bucket === "daily" && t.day && t.day < today && !t.archived) {
      const archived = { ...t, archived: true };
      if (!t.repeat) return [archived];
      return [
        archived,
        {
          id: `t-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          title: t.title,
          description: t.description,
          areaId: t.areaId,
          areaName: t.areaName,
          priority: t.priority,
          bucket: "daily",
          icon: t.icon,
          goalId: t.goalId,
          status: "todo",
          day: today,
          archived: false,
          hasTimer: t.hasTimer,
          repeat: true,
          createdAt: Date.now(),
        },
      ];
    }
    if (t.bucket === "monthly" && t.monthKey && t.monthKey < thisMonth && !t.archived && t.status !== "done") {
      return [{ ...t, monthKey: thisMonth }];
    }
    return [t];
  });
}

const AppContext = createContext<AppContextValue | null>(null);

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

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AppState | null>(null);

  useEffect(() => {
    let cancelled = false;
    
    // 1. Immediately hydrate from localStorage (synchronous, fast)
    const legacy = readLegacyLocalState();
    if (legacy) {
      setState({ ...legacy, tasks: rolloverTasks(legacy.tasks) });
    } else {
      // Fallback to seed data immediately so UI renders
      setState(defaultSeed());
    }

    // 2. Then load IndexedDB in background (async)
    void (async () => {
      try {
        const db = await readSnapshot();
        if (db && !cancelled) {
          setState({ 
            ...db, 
            tasks: rolloverTasks(db.tasks.map((t) => migrateTask(t as unknown as Record<string, unknown>))),
            sessions: db.sessions ?? [],
            settings: { ...DEFAULT_SETTINGS, ...(db.settings ?? {}) },
          });
        }
      } catch {
        // Ignore - keep current state (from localStorage or seed)
      }
      
      // 3. If legacy data existed, migrate it to IndexedDB
      if (legacy && !cancelled) {
        try {
          await writeSnapshot({
            tasks: legacy.tasks,
            sessions: legacy.sessions,
            settings: legacy.settings,
          });
          window.localStorage.removeItem(STORAGE_KEY);
        } catch {
          // Ignore migration errors
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const stateRef = useRef(state);
  const persistTimer = useRef<number | null>(null);
  // Last time this tab produced/held its current state. A dormant tab that
  // loaded before another tab saved newer data keeps an OLD timestamp, so its
  // visibility/pagehide flush is skipped instead of clobbering fresh work.
  const mutationAtRef = useRef(0);

  useEffect(() => {
    stateRef.current = state;
  });

  useEffect(() => {
    if (!state) return;
    mutationAtRef.current = Date.now();
    if (persistTimer.current !== null) window.clearTimeout(persistTimer.current);
    persistTimer.current = window.setTimeout(() => {
      persistTimer.current = null;
      void (async () => {
        try {
          const savedAt = await readSavedAt();
          if (mutationAtRef.current >= savedAt) {
            await writeSnapshot({ tasks: state.tasks, sessions: state.sessions, settings: state.settings });
          }
        } catch {
          // DB unavailable — retried on the next state change or pagehide flush.
        }
      })();
    }, 300);
    return () => {
      if (persistTimer.current !== null) window.clearTimeout(persistTimer.current);
    };
  }, [state]);

  useEffect(() => {
    const persist = (snapshot: AppState) => {
      void (async () => {
        try {
          const savedAt = await readSavedAt();
          // Don't let an older tab's in-memory copy overwrite a newer snapshot
          // that another tab already persisted.
          if (mutationAtRef.current >= savedAt) {
            await writeSnapshot({ tasks: snapshot.tasks, sessions: snapshot.sessions, settings: snapshot.settings });
          }
        } catch {
          // DB unavailable at tab-hide; the debounced persist covers the rest.
        }
      })();
    };
    const flush = () => {
      if (persistTimer.current !== null) {
        window.clearTimeout(persistTimer.current);
        persistTimer.current = null;
      }
      const s = stateRef.current;
      if (!s) return;
      persist(s);
    };
    const refreshFromDb = () => {
      void (async () => {
        const savedAt = await readSavedAt();
        // Another tab saved something newer than anything this tab has — adopt
        // it so a returned-to tab keeps showing the real (not stale) streak.
        if (savedAt > mutationAtRef.current) {
          try {
            const fresh = await readSnapshot();
            if (fresh) {
              setState({
                tasks: rolloverTasks(fresh.tasks.map((t) => migrateTask(t as unknown as Record<string, unknown>))),
                sessions: fresh.sessions ?? [],
                settings: { ...DEFAULT_SETTINGS, ...(fresh.settings ?? {}) },
              });
            }
          } catch {
            // ignore — keep current in-memory state
          }
        }
      })();
    };
    const onVisibility = () => {
      if (document.visibilityState === "hidden") flush();
      else refreshFromDb();
    };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", flush);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", flush);
    };
  }, []);

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

  const addTask: AppContextValue["addTask"] = useCallback((task) => {
    setState((s) => {
      if (!s) return s;
      return {
        ...s,
        tasks: [
          {
            ...task,
            id: `t-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            status: "todo",
            day: task.bucket === "daily" ? dayKey(new Date()) : undefined,
            archived: false,
            createdAt: Date.now(),
          },
          ...s.tasks,
        ],
      };
    });
  }, []);

  const toggleTask: AppContextValue["toggleTask"] = useCallback((id) => {
    setState((s) => {
      if (!s) return s;
      return {
        ...s,
        tasks: s.tasks.map((t) =>
          t.id === id
            ? {
                ...t,
                status: t.status === "done" ? "todo" : "done",
                completedAt: t.status === "done" ? undefined : Date.now(),
              }
            : t
        ),
      };
    });
  }, []);

  const addArea: AppContextValue["addArea"] = useCallback(
    (name) => {
      const trimmed = name.trim();
      if (!trimmed) return null;
      const existing = (state?.settings.areas ?? []).length;
      const taken = [...AREAS, ...(state?.settings.areas ?? [])].map((a) => a.name.toLowerCase());
      if (taken.includes(trimmed.toLowerCase())) return null;
      const area: Area = {
        id: `custom-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
        name: trimmed,
        icon: CUSTOM_AREA_ICONS[existing % CUSTOM_AREA_ICONS.length],
      };
      setState((s) =>
        s ? { ...s, settings: { ...s.settings, areas: [...s.settings.areas, area] } } : s
      );
      return area;
    },
    [state]
  );

  const removeArea: AppContextValue["removeArea"] = useCallback((id) => {
    setState((s) =>
      s ? { ...s, settings: { ...s.settings, areas: s.settings.areas.filter((a) => a.id !== id) } } : s
    );
  }, []);

  const setTaskStatus: AppContextValue["setTaskStatus"] = useCallback((id, status) => {
    setState((s) => {
      if (!s) return s;
      return {
        ...s,
        tasks: s.tasks.map((t) =>
          t.id === id
            ? {
                ...t,
                status,
                completedAt: status === "done" ? Date.now() : t.completedAt,
              }
            : t
        ),
      };
    });
  }, []);

  const setTaskRepeat: AppContextValue["setTaskRepeat"] = useCallback((id, repeat) => {
    setState((s) => {
      if (!s) return s;
      return {
        ...s,
        tasks: s.tasks.map((t) => (t.id === id ? { ...t, repeat } : t)),
      };
    });
  }, []);

  const removeTask: AppContextValue["removeTask"] = useCallback((id) => {
    setState((s) => {
      if (!s) return s;
      return {
        ...s,
        tasks: s.tasks.filter((t) => t.id !== id),
        sessions: s.sessions.filter((se) => se.taskId !== id),
      };
    });
  }, []);

  const saveSession: AppContextValue["saveSession"] = useCallback((session) => {
    setState((s) => {
      if (!s) return s;
      const record: WorkSession = {
        ...session,
        id: `s-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        status: "saved",
      };
      return { ...s, sessions: [...s.sessions, record] };
    });
  }, []);

  const reAddTask: AppContextValue["reAddTask"] = useCallback((id, day = dayKey(new Date())) => {
    setState((s) => {
      if (!s) return s;
      const src = s.tasks.find((t) => t.id === id);
      if (!src || src.bucket !== "daily") return s;
      // Archive the source record (keeping its completedAt + day so the streak
      // and history survive) and hand today a fresh copy, like rollover does
      // for repeating tasks. Previously this mutated in place and destroyed
      // the earlier day's completion evidence.
      return {
        ...s,
        tasks: [
          {
            id: `t-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            title: src.title,
            description: src.description,
            areaId: src.areaId,
            areaName: src.areaName,
            priority: src.priority,
            bucket: "daily",
            icon: src.icon,
            goalId: src.goalId,
            status: "todo",
            day,
            archived: false,
            hasTimer: src.hasTimer,
            repeat: src.repeat,
            createdAt: Date.now(),
          },
          ...s.tasks.map((t) => (t.id === id ? { ...t, archived: true } : t)),
        ],
      };
    });
  }, []);

  const updateTask: AppContextValue["updateTask"] = useCallback((id, patch) => {
    setState((s) => {
      if (!s) return s;
      return {
        ...s,
        tasks: s.tasks.map((t) => (t.id === id ? { ...t, ...patch } : t)),
      };
    });
  }, []);

  const updateSettings: AppContextValue["updateSettings"] = useCallback((patch) => {
    setState((s) => {
      if (!s) return s;
      return { ...s, settings: { ...s.settings, ...patch } };
    });
  }, []);

  const resetData: AppContextValue["resetData"] = useCallback(() => {
    // Wipe all tasks & sessions; keep preferences.
    setState((s) => {
      if (!s) return s;
      return {
        ...s,
        tasks: [],
        sessions: [],
      };
    });
  }, []);

  const loadSampleData: AppContextValue["loadSampleData"] = useCallback(() => {
    // Dev/test-only: inject rich synthetic history for exercising analytics.
    setState((s) => {
      if (!s) return s;
      return { ...s, ...buildSampleData() };
    });
  }, []);

  const value = useMemo(() => {
    if (!state) return null;
    return {
      tasks: state.tasks,
      sessions: state.sessions,
      settings: state.settings,
      addTask,
      addArea,
      removeArea,
      toggleTask,
      removeTask,
      setTaskStatus,
      setTaskRepeat,
      saveSession,
      updateSettings,
      reAddTask,
      updateTask,
      resetData,
      loadSampleData,
    };
  }, [state, addTask, addArea, removeArea, toggleTask, removeTask, setTaskStatus, setTaskRepeat, saveSession, updateSettings, reAddTask, updateTask, resetData, loadSampleData]);

  if (!state || !value) {
    return (
      <div className="flex min-h-[100dvh] w-full items-center justify-center bg-background">
        <div className="text-[12px] font-semibold uppercase tracking-[0.08em] text-muted">Pulse</div>
      </div>
    );
  }

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
