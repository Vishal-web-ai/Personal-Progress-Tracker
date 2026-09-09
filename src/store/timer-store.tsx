"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { TimerMode, WorkSession } from "@/types";
import { useApp } from "@/store/app-store";
import { uid } from "@/lib/utils";

export type ActiveStatus = "running" | "paused";

export interface ActiveSession {
  id: string;
  taskId: string;
  mode: TimerMode;
  startedAt: number;
  targetMinutes?: number;
  pausedAt?: number;
  pausedDuration: number;
  status: ActiveStatus;
  targetReached?: boolean;
  overflowAt?: number; // timestamp when countdown hit zero and user continued
}

export interface PendingSession {
  taskId: string;
  mode: TimerMode;
  startedAt: number;
  endedAt: number;
  targetMinutes?: number;
  activeDuration: number;
  pausedDuration: number;
}

export function computeActiveMs(active: ActiveSession | null, now: number): number {
  if (!active) return 0;
  const pausedSegment = active.pausedAt ? now - active.pausedAt : 0;
  const total = now - active.startedAt - active.pausedDuration - pausedSegment;
  return Math.max(0, total);
}

const STORAGE_KEY = "pulse-active-timer-v1";

interface TimerContextValue {
  active: ActiveSession | null;
  start: (opts: {
    taskId: string;
    mode: TimerMode;
    targetMinutes?: number;
    force?: boolean;
  }) => void;
  pause: () => void;
  resume: () => void;
  stop: () => PendingSession | null;
  arriveAtTarget: () => void;
  continueWorking: () => void;
  discard: () => void;
}

const TimerContext = createContext<TimerContextValue | null>(null);

function loadActive(): ActiveSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as ActiveSession;
      // A leftover "running" session must reflect reality: time moved on
      // regardless of whether a tick happened. Keep as-is; display computes
      // from timestamps so it stays correct.
      return parsed;
    }
  } catch {
    // ignore
  }
  return null;
}

export function TimerProvider({ children }: { children: React.ReactNode }) {
  const { setTaskStatus } = useApp();
  const [active, setActive] = useState<ActiveSession | null>(() => loadActive());

  // Persist active session whenever it changes.
  useEffect(() => {
    try {
      if (active) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(active));
      else window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // storage unavailable
    }
  }, [active]);

  const start: TimerContextValue["start"] = useCallback(
    ({ taskId, mode, targetMinutes, force }) => {
      if (active && !force) return; // conflict handled by UI (switch dialog)
      setTaskStatus(taskId, "in_progress");
      setActive({
        id: uid("s"),
        taskId,
        mode,
        startedAt: Date.now(),
        targetMinutes,
        pausedDuration: 0,
        status: "running",
      });
    },
    [active, setTaskStatus]
  );

  const pause = useCallback(() => {
    setActive((prev) => {
      if (!prev || prev.status === "paused") return prev;
      return { ...prev, pausedAt: Date.now(), status: "paused" };
    });
  }, []);

  const resume = useCallback(() => {
    setActive((prev) => {
      if (!prev || prev.status === "running") return prev;
      const pausedDur = Date.now() - (prev.pausedAt ?? Date.now());
      return {
        ...prev,
        pausedDuration: prev.pausedDuration + pausedDur,
        pausedAt: undefined,
        status: "running",
      };
    });
  }, []);

  const arriveAtTarget = useCallback(() => {
    setActive((prev) => {
      if (!prev || prev.targetReached) return prev;
      return { ...prev, targetReached: true };
    });
  }, []);

  const continueWorking = useCallback(() => {
    setActive((prev) => {
      if (!prev) return prev;
      return { ...prev, overflowAt: prev.overflowAt ?? Date.now(), mode: "stopwatch" };
    });
  }, []);

  const stop = useCallback((): PendingSession | null => {
    if (!active) return null;
    const now = Date.now();
    const pausedSegment = active.pausedAt ? now - active.pausedAt : 0;
    const activeDuration = Math.max(
      0,
      now - active.startedAt - active.pausedDuration - pausedSegment
    );
    const pending: PendingSession = {
      taskId: active.taskId,
      mode: active.mode,
      startedAt: active.startedAt,
      endedAt: now,
      targetMinutes: active.targetMinutes,
      activeDuration,
      pausedDuration: active.pausedDuration + pausedSegment,
    };
    setActive(null);
    return pending;
  }, [active]);

  const discard = useCallback(() => {
    setActive(null);
  }, []);

  const value = useMemo<TimerContextValue>(
    () => ({ active, start, pause, resume, stop, arriveAtTarget, continueWorking, discard }),
    [active, start, pause, resume, stop, arriveAtTarget, continueWorking, discard]
  );

  return <TimerContext.Provider value={value}>{children}</TimerContext.Provider>;
}

export function useTimer(): TimerContextValue {
  const ctx = useContext(TimerContext);
  if (!ctx) throw new Error("useTimer must be used within TimerProvider");
  return ctx;
}

/**
 * A localized "now" hook: re-renders ONLY the consuming display component
 * once per second while a session runs. The dashboard and other surfaces
 * never receive this tick, so they stay stable while a timer runs.
 */
export function useNow(active: boolean): number {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!active) return;
    const tick = () => setNow(Date.now());
    tick();
    const id = window.setInterval(tick, 1000);
    const onVisible = () => {
      if (document.visibilityState === "visible") tick();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [active]);

  return now;
}

export function sessionForSave(p: PendingSession, focusRating: number, notes: string): Omit<WorkSession, "id" | "status"> {
  return {
    taskId: p.taskId,
    mode: p.mode,
    startedAt: p.startedAt,
    endedAt: p.endedAt,
    targetMinutes: p.targetMinutes,
    activeDuration: p.activeDuration,
    pausedDuration: p.pausedDuration,
    focusRating: focusRating || undefined,
    notes: notes.trim() || undefined,
  };
}