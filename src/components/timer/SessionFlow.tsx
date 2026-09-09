"use client";

import React, { createContext, useCallback, useContext, useMemo, useState } from "react";
import { Timer, StopCircle, ListTodo, ArrowRight } from "lucide-react";
import type { PendingSession } from "@/store/timer-store";
import { useTimer, sessionForSave } from "@/store/timer-store";
import { useApp } from "@/store/app-store";
import { useToast } from "@/store/toast-store";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { StarRating } from "@/components/ui/StarRating";
import { Field, Textarea, Input } from "@/components/ui/Form";
import { formatDuration } from "@/lib/utils";
import { ActiveSessionControls } from "./ActiveSessionControls";
import type { TimerMode } from "@/types";

interface ConflictRequest {
  taskId: string;
  taskTitle: string;
  mode: TimerMode;
  targetMinutes?: number;
}

interface SessionFlowValue {
  beginSession: (taskId: string, taskTitle: string, onlyStopwatch?: boolean) => void;
}

const SessionFlowContext = createContext<SessionFlowValue | null>(null);

export function useSessionFlow(): SessionFlowValue {
  const ctx = useContext(SessionFlowContext);
  if (!ctx) throw new Error("useSessionFlow must be used within SessionFlowProvider");
  return ctx;
}

const TARGET_PRESETS = [15, 25, 30, 45, 60, 90];

export function SessionFlowProvider({ children }: { children: React.ReactNode }) {
  const { active, start, stop } = useTimer();
  const { saveSession, tasks } = useApp();
  const { toast } = useToast();

  const [modeOpen, setModeOpen] = useState<{ taskId: string; taskTitle: string } | null>(null);
  const [conflict, setConflict] = useState<ConflictRequest | null>(null);
  const [pending, setPending] = useState<PendingSession | null>(null);
  const [rating, setRating] = useState(0);
  const [notes, setNotes] = useState("");
  const [customTarget, setCustomTarget] = useState("");

  const commitSession = useCallback(
    (p: PendingSession) => {
      saveSession(sessionForSave(p, rating, notes));
      const task = tasks.find((t) => t.id === p.taskId);
      toast(
        `Session saved — ${formatDuration(p.activeDuration / 60000)} added to ${
          task?.areaName ?? "your focus"
        }`
      );
    },
    [rating, notes, saveSession, tasks, toast]
  );

  const finishActive = useCallback(() => {
    const p = stop();
    if (p) {
      setRating(0);
      setNotes("");
      setPending(p);
    }
  }, [stop]);

  const beginSession = useCallback<SessionFlowValue["beginSession"]>(
    (taskId, taskTitle, onlyStopwatch) => {
      if (onlyStopwatch) {
        const mode: TimerMode = "stopwatch";
        if (active) {
          setConflict({ taskId, taskTitle, mode });
        } else {
          start({ taskId, mode });
          toast(`Started session on “${taskTitle}”`, "info");
        }
        return;
      }
      setModeOpen({ taskId, taskTitle });
    },
    [active, start, toast]
  );

  const dispatchStart = useCallback(
    (taskId: string, taskTitle: string, mode: TimerMode, targetMinutes?: number) => {
      setModeOpen(null);
      setCustomTarget("");
      if (active) {
        setConflict({ taskId, taskTitle, mode, targetMinutes });
      } else {
        start({ taskId, mode, targetMinutes });
        toast(
          mode === "focus_target"
            ? `Focus session — ${targetMinutes} min on “${taskTitle}”`
            : `Started session on “${taskTitle}”`,
          "info"
        );
      }
    },
    [active, start, toast]
  );

  const handleSwitch = useCallback(() => {
    if (!conflict) return;
    const p = stop();
    if (p) {
      saveSession(sessionForSave(p, 0, ""));
    }
    start({
      taskId: conflict.taskId,
      mode: conflict.mode,
      targetMinutes: conflict.targetMinutes,
      force: true,
    });
    setConflict(null);
    toast(`Switched to “${conflict.taskTitle}”`, "info");
  }, [conflict, stop, start, saveSession, toast]);

  const value = useMemo(() => ({ beginSession }), [beginSession]);

  return (
    <SessionFlowContext.Provider value={value}>
      {children}

      {/* Start — mode picker */}
      <Modal open={Boolean(modeOpen)} onClose={() => setModeOpen(null)} title="Start focus session">
        {modeOpen && (
          <div className="space-y-5">
            <div className="flex items-center gap-3 rounded-[16px] border border-border-soft bg-surface-elevated px-4 py-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-[12px] bg-surface-soft text-secondary">
                <ListTodo size={18} />
              </div>
              <div className="min-w-0">
                <p className="truncate text-[15px] font-medium text-primary">{modeOpen.taskTitle}</p>
                <p className="text-[12px] text-muted">Choose a timer mode</p>
              </div>
            </div>

            <button
              onClick={() => dispatchStart(modeOpen.taskId, modeOpen.taskTitle, "stopwatch")}
              className="pressable flex w-full items-center justify-between rounded-[16px] border border-border bg-surface-elevated px-4 py-3.5 text-left hover:bg-surface-soft"
            >
              <span className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-accent/15 text-accent">
                  <Timer size={18} />
                </span>
                <span>
                  <span className="block text-[15px] font-medium text-primary">Stopwatch</span>
                  <span className="block text-[12px] text-muted">Work freely, no target</span>
                </span>
              </span>
              <ArrowRight size={16} className="text-muted" />
            </button>

            <div>
              <p className="mb-2 text-[13px] font-medium text-secondary">Focus target</p>
              <div className="grid grid-cols-3 gap-2">
                {TARGET_PRESETS.map((m) => (
                  <button
                    key={m}
                    onClick={() => dispatchStart(modeOpen.taskId, modeOpen.taskTitle, "focus_target", m)}
                    className="pressable rounded-xl border border-border bg-surface-elevated py-2.5 text-[14px] font-medium text-primary hover:bg-surface-soft"
                  >
                    {m} min
                  </button>
                ))}
              </div>
              <div className="mt-3 flex items-center gap-2">
                <Input
                  type="number"
                  min={1}
                  max={480}
                  value={customTarget}
                  onChange={(e) => setCustomTarget(e.target.value)}
                  placeholder="Custom (min)"
                  aria-label="Custom focus target in minutes"
                />
                <Button
                  variant="secondary"
                  size="md"
                  disabled={!Number(customTarget) || Number(customTarget) <= 0}
                  onClick={() =>
                    dispatchStart(
                      modeOpen.taskId,
                      modeOpen.taskTitle,
                      "focus_target",
                      Math.round(Number(customTarget))
                    )
                  }
                >
                  Start
                </Button>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Conflict: another task is already running */}
      <Modal open={Boolean(conflict)} onClose={() => setConflict(null)} title="You're currently working">
        {conflict && active && (
          <div className="space-y-4">
            <div className="rounded-[16px] border border-border-soft bg-surface-elevated px-4 py-3">
              <p className="truncate text-[15px] font-medium text-primary">
                {tasks.find((t) => t.id === active.taskId)?.title ?? "Current task"}
              </p>
              <p className="text-[12px] text-muted">
                Running {active.mode === "focus_target" ? "focus session" : "stopwatch"}
              </p>
            </div>
            <p className="text-[13px] text-secondary">Start another task instead?</p>
            <div className="flex flex-col gap-2">
              <Button variant="primary" onClick={handleSwitch}>
                <ArrowRight size={16} /> Switch Task
              </Button>
              <Button variant="secondary" onClick={() => setConflict(null)}>
                <StopCircle size={16} /> Keep Current
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Session complete — rating + notes, save commits to analytics */}
      <Modal
        open={Boolean(pending)}
        onClose={() => setPending(null)}
        title="Session complete"
      >
        {pending && (
          <div className="space-y-5">
            <div className="rounded-[16px] border border-border-soft bg-surface-elevated px-4 py-3">
              <p className="truncate text-[15px] font-medium text-primary">
                {tasks.find((t) => t.id === pending.taskId)?.title ?? "Task"}
              </p>
              <p className="text-[12px] text-muted">{formatDuration(pending.activeDuration / 60000)} focused</p>
            </div>

            <div>
              <p className="mb-2 text-[13px] font-medium text-secondary">How focused were you?</p>
              <StarRating value={rating} onChange={setRating} />
            </div>

            <Field label="What did you accomplish? (optional)">
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notes…" />
            </Field>

            <Button
              variant="primary"
              className="w-full"
              onClick={() => {
                commitSession(pending);
                setPending(null);
              }}
            >
              Save Session
            </Button>
          </div>
        )}
      </Modal>

      <ActiveSessionControls finishActive={finishActive} />
    </SessionFlowContext.Provider>
  );
}