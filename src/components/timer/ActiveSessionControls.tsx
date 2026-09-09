"use client";

import React, { useEffect } from "react";
import { Pause, Play, Square, CheckCircle2, Timer } from "lucide-react";
import { useTimer, computeActiveMs, useNow } from "@/store/timer-store";
import { useApp } from "@/store/app-store";
import { formatClockCompact } from "@/lib/utils";

export interface ActiveSessionControlsProps {
  finishActive: () => void;
}

export function ActiveSessionControls({ finishActive }: ActiveSessionControlsProps) {
  const { active, pause, resume, arriveAtTarget, continueWorking } = useTimer();
  const { tasks } = useApp();
  const now = useNow(active !== null);

  const task = active ? tasks.find((t) => t.id === active.taskId) : undefined;

  // When a focus-target countdown hits zero, flip to the target-reached state.
  useEffect(() => {
    if (!active || active.mode !== "focus_target" || active.targetReached) return;
    if (!active.targetMinutes) return;
    if (computeActiveMs(active, Date.now()) >= active.targetMinutes * 60000) {
      arriveAtTarget();
    }
  }, [active, arriveAtTarget, now]);

  if (!active) return null;

  const elapsed = computeActiveMs(active, now);
  const targetReached = active.targetReached;
  const isTarget = active.mode === "focus_target" && !targetReached;
  const remaining = isTarget ? Math.max(0, (active.targetMinutes ?? 0) * 60000 - elapsed) : 0;
  const total = (active.targetMinutes ?? 0) * 60000;
  const frac = total > 0 ? elapsed / total : 0;
  const paused = active.status === "paused";

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[76px] z-30 flex justify-center px-4 lg:bottom-6">
      <div className="pointer-events-auto w-full max-w-xl rounded-[20px] border border-border bg-surface/95 p-3 shadow-2xl backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] bg-surface-soft text-accent">
            <Timer size={20} strokeWidth={1.9} />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                {!paused && (
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent/60" />
                )}
                <span
                  className={`relative inline-flex h-2 w-2 rounded-full ${
                    paused ? "bg-medium" : "bg-accent"
                  }`}
                />
              </span>
              <p className="text-[12px] font-medium uppercase tracking-wide text-secondary">
                {paused ? "Paused" : active.mode === "focus_target" && !targetReached ? "Focus target" : "Working"}
              </p>
            </div>
            <p className="truncate text-[15px] font-medium text-primary">
              {task?.title ?? "Current task"}
            </p>
            {targetReached && (
              <p className="text-[11px] text-accent">Target reached — keep going or finish</p>
            )}
          </div>

          <div className="shrink-0 text-right">
            <p className="font-mono text-[20px] font-semibold tabular-nums tracking-tight text-primary">
              {isTarget ? formatClockCompact(remaining) : formatClockCompact(elapsed)}
            </p>
            {isTarget && (
              <p className="mt-0.5 text-[10px] text-muted">remaining</p>
            )}
          </div>
        </div>

        {isTarget && (
          <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-ring-track">
            <div
              className="h-full rounded-full bg-accent transition-[width] duration-300 ease-out"
              style={{ width: `${Math.min(100, frac * 100)}%` }}
            />
          </div>
        )}

        <div className="mt-3 flex items-center gap-2">
          {targetReached ? (
            <>
              <button
                onClick={finishActive}
                className="pressable flex h-9 flex-1 items-center justify-center rounded-xl bg-accent text-[13px] font-semibold text-[#061B14] hover:bg-accent-soft"
              >
                <CheckCircle2 size={16} className="mr-1.5" /> Finish Session
              </button>
              <button
                onClick={continueWorking}
                className="pressable flex h-9 flex-1 items-center justify-center rounded-xl border border-border bg-surface-elevated text-[13px] font-medium text-primary hover:bg-surface-soft"
              >
                <Timer size={16} className="mr-1.5" /> Continue Working
              </button>
            </>
          ) : (
            <>
              <button
                onClick={paused ? resume : pause}
                className="pressable flex h-9 flex-1 items-center justify-center rounded-xl border border-border bg-surface-elevated text-[13px] font-medium text-primary hover:bg-surface-soft"
              >
                {paused ? <Play size={16} className="mr-1.5" /> : <Pause size={16} className="mr-1.5" />}
                {paused ? "Resume" : "Pause"}
              </button>
              <button
                onClick={finishActive}
                className="pressable flex h-9 flex-1 items-center justify-center rounded-xl bg-accent text-[13px] font-semibold text-[#061B14] hover:bg-accent-soft"
              >
                <Square size={15} className="mr-1.5" /> Finish
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}