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
import type { Task, TaskBucket, WorkSession } from "@/types";
import { INITIAL_TASKS, buildSeedSessions } from "@/data/initial";
import { buildSampleData } from "@/data/sample";
import { dayKey, dayKeyFor } from "@/lib/time";

interface AppSettings {
  userName: string;
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
  toggleTask: (id: string) => void;
  removeTask: (id: string) => void;
  setTaskStatus: (id: string, status: Task["status"]) => void;
  saveSession: (session: Omit<WorkSession, "id" | "status"> & { status?: WorkSession["status"] }) => void;
  updateSettings: (patch: Partial<AppSettings>) => void;
  reAddTask: (id: string) => void;
  resetData: () => void;
  loadSampleData: () => void;
}

const STORAGE_KEY = "pulse-state-v1";

const DEFAULT_SETTINGS: AppSettings = {
  userName: "Vishal",
};

/** Older persisted tasks used `due` ("today" | "this_week" | "later") and
 *  `estimatedMinutes`. Map them into the current bucket model. */
function migrateTask(raw: Record<string, unknown>): Task {
  const due = raw.due;
  const bucket: TaskBucket =
    due === "today" || due === undefined
      ? "daily"
      : due === "this_week"
        ? "weekly"
        : "monthly";
  return {
    id: String(raw.id ?? ""),
    title: String(raw.title ?? ""),
    description: raw.description as string | undefined,
    areaId: String(raw.areaId ?? ""),
    areaName: String(raw.areaName ?? ""),
    priority: raw.priority === "high" || raw.priority === "medium" ? raw.priority : "medium",
    status: raw.status === "done" ? "done" : "todo",
    bucket,
    icon: String(raw.icon ?? "cloud"),
    goalId: raw.goalId as string | undefined,
    day: typeof raw.day === "string" ? raw.day : dayKeyFor(),
    archived: Boolean(raw.archived),
    completedAt: raw.completedAt as number | undefined,
    createdAt: (raw.createdAt as number) ?? Date.now(),
  };
}

/** Archive daily tasks whose calendar day is behind today. */
function rolloverTasks(tasks: Task[], today: string = dayKey(new Date())): Task[] {
  return tasks.map((t) =>
    t.bucket === "daily" && t.day && t.day < today && !t.archived
      ? { ...t, archived: true }
      : t
  );
}

const AppContext = createContext<AppContextValue | null>(null);

function loadState(): AppState {
  if (typeof window === "undefined") {
    return { tasks: INITIAL_TASKS, sessions: [], settings: DEFAULT_SETTINGS };
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as AppState;
      return {
        tasks: (parsed.tasks ?? []).map((t) => migrateTask(t as unknown as Record<string, unknown>)),
        sessions: parsed.sessions ?? [],
        settings: { ...DEFAULT_SETTINGS, ...(parsed.settings ?? {}) },
      };
    }
  } catch {
    // ignore corrupt state
  }
  return { tasks: INITIAL_TASKS, sessions: buildSeedSessions(), settings: DEFAULT_SETTINGS };
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AppState>(() => {
    const loaded = loadState();
    return { ...loaded, tasks: rolloverTasks(loaded.tasks) };
  });
  const hydrated = useRef(false);

  useEffect(() => {
    if (!hydrated.current) {
      hydrated.current = true;
      return;
    }
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // storage full/blocked
    }
  }, [state]);

  useEffect(() => {
    let timer: number;
    const arm = () => {
      const now = new Date();
      const next = new Date(now);
      next.setHours(24, 0, 0, 0);
      timer = window.setTimeout(() => {
        setState((s) => ({ ...s, tasks: rolloverTasks(s.tasks) }));
        arm();
      }, next.getTime() - now.getTime() + 50);
    };
    arm();
    return () => window.clearTimeout(timer);
  }, []);

  const addTask: AppContextValue["addTask"] = useCallback((task) => {
    setState((s) => ({
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
    }));
  }, []);

  const toggleTask: AppContextValue["toggleTask"] = useCallback((id) => {
    setState((s) => ({
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
    }));
  }, []);

  const setTaskStatus: AppContextValue["setTaskStatus"] = useCallback((id, status) => {
    setState((s) => ({
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
    }));
  }, []);

  const removeTask: AppContextValue["removeTask"] = useCallback((id) => {
    setState((s) => ({
      ...s,
      tasks: s.tasks.filter((t) => t.id !== id),
      sessions: s.sessions.filter((se) => se.taskId !== id),
    }));
  }, []);

  const saveSession: AppContextValue["saveSession"] = useCallback((session) => {
    setState((s) => {
      const record: WorkSession = {
        ...session,
        id: `s-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        status: "saved",
      };
      return { ...s, sessions: [...s.sessions, record] };
    });
  }, []);

  const reAddTask: AppContextValue["reAddTask"] = useCallback((id) => {
    setState((s) => {
      const src = s.tasks.find((t) => t.id === id);
      if (!src || src.bucket !== "daily") return s;
      return {
        ...s,
        tasks: [
          {
            ...src,
            id: `t-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            status: "todo",
            completedAt: undefined,
            day: dayKey(new Date()),
            archived: false,
            createdAt: Date.now(),
          },
          ...s.tasks,
        ],
      };
    });
  }, []);

  const updateSettings: AppContextValue["updateSettings"] = useCallback((patch) => {
    setState((s) => ({ ...s, settings: { ...s.settings, ...patch } }));
  }, []);

  const resetData: AppContextValue["resetData"] = useCallback(() => {
    // Wipe tasks & sessions; keep preferences. Fresh starter tasks remain.
    setState((s) => ({
      ...s,
      tasks: INITIAL_TASKS,
      sessions: [],
    }));
  }, []);

  const loadSampleData: AppContextValue["loadSampleData"] = useCallback(() => {
    // Dev/test-only: inject rich synthetic history for exercising analytics.
    setState((s) => ({ ...s, ...buildSampleData() }));
  }, []);

  const value = useMemo(
    () => ({
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
    }),
    [state, addTask, toggleTask, removeTask, setTaskStatus, saveSession, updateSettings, reAddTask, resetData, loadSampleData]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
