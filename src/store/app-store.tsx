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
import type { Area, Goal, GoalProgressPoint, Note, Phase, PhaseRetrospective, PhaseTask, Task, TaskBucket, WorkSession } from "@/types";
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
  goals: Goal[];
  phaseRetrospectives: PhaseRetrospective[];
  settings: AppSettings;
}

interface AppContextValue {
  tasks: Task[];
  sessions: WorkSession[];
  goals: Goal[];
  phaseRetrospectives: PhaseRetrospective[];
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
  // Goals & Phases
  addGoal: (goal: Omit<Goal, "id" | "createdAt" | "progress" | "phases">) => string;
  updateGoal: (id: string, patch: Partial<Omit<Goal, "id" | "createdAt" | "progress">>) => void;
  removeGoal: (id: string) => void;
  addPhase: (goalId: string, phase: Omit<Phase, "id" | "goalId" | "tasks" | "estimatedMinutes" | "actualMinutes">) => string;
  updatePhase: (goalId: string, phaseId: string, patch: Partial<Omit<Phase, "id" | "goalId" | "tasks">>) => void;
  removePhase: (goalId: string, phaseId: string) => void;
  reorderPhases: (goalId: string, phaseIds: string[]) => void;
  addPhaseTask: (phaseId: string, goalId: string, task: Omit<PhaseTask, "id" | "phaseId" | "goalId" | "createdAt" | "status" | "actualMinutes" | "completedAt">) => void;
  updatePhaseTask: (phaseId: string, taskId: string, patch: Partial<Omit<PhaseTask, "id" | "phaseId" | "goalId" | "createdAt">>) => void;
  removePhaseTask: (phaseId: string, taskId: string) => void;
  reorderPhaseTasks: (phaseId: string, taskIds: string[]) => void;
  togglePhaseTask: (phaseId: string, taskId: string) => void;
  startPhase: (goalId: string, phaseId: string) => void;
  completePhase: (goalId: string, phaseId: string) => void;
  addPhaseRetrospective: (retrospective: Omit<PhaseRetrospective, "id" | "createdAt">) => void;
  getPhaseRetrospective: (phaseId: string) => PhaseRetrospective | undefined;
  computeGoalProgress: (goal: Goal) => number;
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
    goals: parsed.goals ?? [],
    phaseRetrospectives: parsed.phaseRetrospectives ?? [],
    settings: { ...DEFAULT_SETTINGS, ...(parsed.settings ?? {}) },
  };
}

function defaultSeed(): AppState {
  return { 
    tasks: INITIAL_TASKS, 
    sessions: buildSeedSessions(), 
    goals: [], 
    phaseRetrospectives: [],
    settings: DEFAULT_SETTINGS 
  };
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
            goals: [],
            phaseRetrospectives: [],
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
            await writeSnapshot({ 
              tasks: state.tasks, 
              sessions: state.sessions, 
              goals: state.goals,
              phaseRetrospectives: state.phaseRetrospectives,
              settings: state.settings 
            });
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
            await writeSnapshot({ 
              tasks: snapshot.tasks, 
              sessions: snapshot.sessions, 
              goals: snapshot.goals,
              phaseRetrospectives: snapshot.phaseRetrospectives,
              settings: snapshot.settings 
            });
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
                goals: fresh.goals ?? [],
                phaseRetrospectives: fresh.phaseRetrospectives ?? [],
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

  // Goals & Phases
  const computeGoalProgress = useCallback((goal: Goal): number => {
    if (goal.phases.length === 0) return 0;
    const totalTasks = goal.phases.reduce((sum, p) => sum + p.tasks.length, 0);
    if (totalTasks === 0) return 0;
    const completedTasks = goal.phases.reduce(
      (sum, p) => sum + p.tasks.filter((t) => t.status === "done").length,
      0
    );
    return Math.round((completedTasks / totalTasks) * 100);
  }, []);

  const addGoal: AppContextValue["addGoal"] = useCallback((goalData) => {
    const id = `g-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const goal: Goal = {
      ...goalData,
      id,
      createdAt: Date.now(),
      phases: [],
      progress: 0,
      status: "active",
    };
    setState((s) => {
      if (!s) return s;
      return { ...s, goals: [goal, ...s.goals] };
    });
    return id;
  }, []);

  const updateGoal: AppContextValue["updateGoal"] = useCallback((id, patch) => {
    setState((s) => {
      if (!s) return s;
      return {
        ...s,
        goals: s.goals.map((g) =>
          g.id === id ? { ...g, ...patch, progress: computeGoalProgress({ ...g, ...patch } as Goal) } : g
        ),
      };
    });
  }, [computeGoalProgress]);

  const removeGoal: AppContextValue["removeGoal"] = useCallback((id) => {
    setState((s) => {
      if (!s) return s;
      return {
        ...s,
        goals: s.goals.filter((g) => g.id !== id),
        phaseRetrospectives: s.phaseRetrospectives.filter((r) => r.goalId !== id),
      };
    });
  }, []);

  const addPhase: AppContextValue["addPhase"] = useCallback((goalId, phaseData) => {
    const id = `ph-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const goal = state?.goals.find((g) => g.id === goalId);
    const order = goal ? goal.phases.length : 0;
    const phase: Phase = {
      ...phaseData,
      id,
      goalId,
      order,
      tasks: [],
      status: "pending",
      estimatedMinutes: 0,
      actualMinutes: 0,
    };
    setState((s) => {
      if (!s) return s;
      return {
        ...s,
        goals: s.goals.map((g) =>
          g.id === goalId
            ? { ...g, phases: [...g.phases, phase], progress: computeGoalProgress({ ...g, phases: [...g.phases, phase] } as Goal) }
            : g
        ),
      };
    });
    return id;
  }, [state, computeGoalProgress]);

  const updatePhase: AppContextValue["updatePhase"] = useCallback((goalId, phaseId, patch) => {
    setState((s) => {
      if (!s) return s;
      return {
        ...s,
        goals: s.goals.map((g) =>
          g.id === goalId
            ? {
                ...g,
                phases: g.phases.map((p) =>
                  p.id === phaseId ? { ...p, ...patch } : p
                ),
              }
            : g
        ),
      };
    });
  }, []);

  const removePhase: AppContextValue["removePhase"] = useCallback((goalId, phaseId) => {
    setState((s) => {
      if (!s) return s;
      return {
        ...s,
        goals: s.goals.map((g) =>
          g.id === goalId
            ? {
                ...g,
                phases: g.phases.filter((p) => p.id !== phaseId),
              }
            : g
        ),
        phaseRetrospectives: s.phaseRetrospectives.filter((r) => r.phaseId !== phaseId),
      };
    });
  }, []);

  const reorderPhases: AppContextValue["reorderPhases"] = useCallback((goalId, phaseIds) => {
    setState((s) => {
      if (!s) return s;
      return {
        ...s,
        goals: s.goals.map((g) =>
          g.id === goalId
            ? {
                ...g,
                phases: phaseIds
                  .map((id, index) => {
                    const phase = g.phases.find((p) => p.id === id);
                    return phase ? { ...phase, order: index } : null;
                  })
                  .filter((p): p is Phase => p !== null),
              }
            : g
        ),
      };
    });
  }, []);

  const addPhaseTask: AppContextValue["addPhaseTask"] = useCallback((phaseId, goalId, taskData) => {
    const goal = state?.goals.find((g) => g.id === goalId);
    const phase = goal?.phases.find((p) => p.id === phaseId);
    const order = phase ? phase.tasks.length : 0;
    const task: PhaseTask = {
      ...taskData,
      id: `pt-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      phaseId,
      goalId,
      order,
      status: "todo",
      actualMinutes: 0,
      createdAt: Date.now(),
    };
    setState((s) => {
      if (!s) return s;
      return {
        ...s,
        goals: s.goals.map((g) =>
          g.id === goalId
            ? {
                ...g,
                phases: g.phases.map((p) =>
                  p.id === phaseId
                    ? {
                        ...p,
                        tasks: [...p.tasks, task],
                        estimatedMinutes: (p.estimatedMinutes ?? 0) + (task.estimatedMinutes ?? 0),
                      }
                    : p
                ),
                progress: computeGoalProgress({
                  ...g,
                  phases: g.phases.map((p) =>
                    p.id === phaseId ? { ...p, tasks: [...p.tasks, task] } : p
                  ),
                } as Goal),
              }
            : g
        ),
      };
    });
  }, [state, computeGoalProgress]);

  const updatePhaseTask: AppContextValue["updatePhaseTask"] = useCallback((phaseId, taskId, patch) => {
    setState((s) => {
      if (!s) return s;
      return {
        ...s,
        goals: s.goals.map((g) => ({
          ...g,
          phases: g.phases.map((p) =>
            p.id === phaseId
              ? {
                  ...p,
                  tasks: p.tasks.map((t) =>
                    t.id === taskId ? { ...t, ...patch } : t
                  ),
                }
              : p
          ),
        })),
      };
    });
  }, []);

  const removePhaseTask: AppContextValue["removePhaseTask"] = useCallback((phaseId, taskId) => {
    setState((s) => {
      if (!s) return s;
      return {
        ...s,
        goals: s.goals.map((g) => ({
          ...g,
          phases: g.phases.map((p) =>
            p.id === phaseId
              ? {
                  ...p,
                  tasks: p.tasks.filter((t) => t.id !== taskId),
                  estimatedMinutes: p.tasks
                    .filter((t) => t.id !== taskId)
                    .reduce((sum, t) => sum + (t.estimatedMinutes ?? 0), 0),
                }
              : p
          ),
        })),
      };
    });
  }, []);

  const reorderPhaseTasks: AppContextValue["reorderPhaseTasks"] = useCallback((phaseId, taskIds) => {
    setState((s) => {
      if (!s) return s;
      return {
        ...s,
        goals: s.goals.map((g) => ({
          ...g,
          phases: g.phases.map((p) =>
            p.id === phaseId
              ? {
                  ...p,
                  tasks: taskIds
                    .map((id, index) => {
                      const task = p.tasks.find((t) => t.id === id);
                      return task ? { ...task, order: index } : null;
                    })
                    .filter((t): t is PhaseTask => t !== null),
                }
              : p
          ),
        })),
      };
    });
  }, []);

  const togglePhaseTask: AppContextValue["togglePhaseTask"] = useCallback((phaseId, taskId) => {
    setState((s) => {
      if (!s) return s;
      return {
        ...s,
        goals: s.goals.map((g) => ({
          ...g,
          phases: g.phases.map((p) =>
            p.id === phaseId
              ? {
                  ...p,
                  tasks: p.tasks.map((t) =>
                    t.id === taskId
                      ? {
                          ...t,
                          status: t.status === "done" ? "todo" : "done",
                          completedAt: t.status === "done" ? undefined : Date.now(),
                        }
                      : t
                  ),
                }
              : p
          ),
        })),
      };
    });
  }, []);

  const startPhase: AppContextValue["startPhase"] = useCallback((goalId, phaseId) => {
    setState((s) => {
      if (!s) return s;
      return {
        ...s,
        goals: s.goals.map((g) =>
          g.id === goalId
            ? {
                ...g,
                phases: g.phases.map((p) =>
                  p.id === phaseId
                    ? { ...p, status: "active", startedAt: p.startedAt ?? Date.now() }
                    : p
                ),
              }
            : g
        ),
      };
    });
  }, []);

  const completePhase: AppContextValue["completePhase"] = useCallback((goalId, phaseId) => {
    setState((s) => {
      if (!s) return s;
      return {
        ...s,
        goals: s.goals.map((g) =>
          g.id === goalId
            ? {
                ...g,
                phases: g.phases.map((p) =>
                  p.id === phaseId
                    ? { ...p, status: "completed", completedAt: Date.now() }
                    : p
                ),
                progress: computeGoalProgress({
                  ...g,
                  phases: g.phases.map((p) =>
                    p.id === phaseId ? { ...p, status: "completed", completedAt: Date.now() } : p
                  ),
                } as Goal),
              }
            : g
        ),
      };
    });
  }, [computeGoalProgress]);

  const addPhaseRetrospective: AppContextValue["addPhaseRetrospective"] = useCallback((retrospective) => {
    const id = `pr-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const record: PhaseRetrospective = {
      ...retrospective,
      id,
      createdAt: Date.now(),
    };
    setState((s) => {
      if (!s) return s;
      return { ...s, phaseRetrospectives: [...s.phaseRetrospectives, record] };
    });
  }, []);

  const getPhaseRetrospective: AppContextValue["getPhaseRetrospective"] = useCallback(
    (phaseId: string) => {
      return state?.phaseRetrospectives.find((r) => r.phaseId === phaseId);
    },
    [state]
  );

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
        goals: [],
        phaseRetrospectives: [],
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
      goals: state.goals,
      phaseRetrospectives: state.phaseRetrospectives,
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
      // Goals & Phases
      addGoal,
      updateGoal,
      removeGoal,
      addPhase,
      updatePhase,
      removePhase,
      reorderPhases,
      addPhaseTask,
      updatePhaseTask,
      removePhaseTask,
      reorderPhaseTasks,
      togglePhaseTask,
      startPhase,
      completePhase,
      addPhaseRetrospective,
      getPhaseRetrospective,
      computeGoalProgress,
    };
  }, [
    state,
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
    addGoal,
    updateGoal,
    removeGoal,
    addPhase,
    updatePhase,
    removePhase,
    reorderPhases,
    addPhaseTask,
    updatePhaseTask,
    removePhaseTask,
    reorderPhaseTasks,
    togglePhaseTask,
    startPhase,
    completePhase,
    addPhaseRetrospective,
    getPhaseRetrospective,
    computeGoalProgress,
  ]);

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
