"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { useApp } from "@/store/app-store";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { ProgressRing } from "@/components/ui/ProgressRing";
import { ConfettiRain } from "@/components/celebration/CelebrationConfetti";
import { playCelebration } from "@/lib/sounds";

type PhaseStats = {
  phaseId: string;
  goalTitle: string;
  phaseTitle: string;
  total: number;
  done: number;
};

const MARKER_PREFIX = "pulse-phase-celebrated-";

function markerKey(phaseId: string) {
  return `${MARKER_PREFIX}${phaseId}`;
}

function hasCelebrated(phaseId: string) {
  try {
    return window.localStorage.getItem(markerKey(phaseId)) === "1";
  } catch {
    return false;
  }
}

function markCelebrated(phaseId: string) {
  try {
    window.localStorage.setItem(markerKey(phaseId), "1");
  } catch {
    // storage unavailable — still celebrate, just not deduped across reloads
  }
}

/**
 * Watches every phase across all goals and celebrates the moment its last task
 * is checked. Fires once per phase (localStorage marker) and only on the
 * transition — never on mount when the phase is already complete.
 */
export function PhaseCelebration() {
  const { goals, settings } = useApp();
  const [open, setOpen] = useState(false);
  const [raining, setRaining] = useState(false);
  const [seed, setSeed] = useState(1);
  const [stats, setStats] = useState<PhaseStats | null>(null);
  const prevDone = useRef<Map<string, boolean> | null>(null);
  const rainTimer = useRef<number | null>(null);

  const celebrate = useCallback(
    (next: PhaseStats) => {
      setStats(next);
      setRaining(true);
      if (rainTimer.current !== null) window.clearTimeout(rainTimer.current);
      rainTimer.current = window.setTimeout(() => setRaining(false), 5200);
      setSeed(Date.now());
      if (settings.celebrationSound) playCelebration();
      setOpen(true);
    },
    [settings.celebrationSound]
  );

  useEffect(() => {
    const map = new Map<string, boolean>();
    for (const goal of goals) {
      for (const phase of goal.phases) {
        const total = phase.tasks.length;
        if (total === 0) continue;
        const done = phase.tasks.filter((t) => t.status === "done").length;
        map.set(phase.id, done === total);
      }
    }

    if (prevDone.current === null) {
      prevDone.current = map;
      return;
    }

    const snapshot = prevDone.current;
    prevDone.current = map;

    let finished: PhaseStats | null = null;
    for (const [phaseId, allDone] of map) {
      if (!allDone || snapshot.get(phaseId)) continue;
      if (hasCelebrated(phaseId)) continue;
      const goal = goals.find((g) => g.phases.some((p) => p.id === phaseId));
      const phase = goal?.phases.find((p) => p.id === phaseId);
      if (!goal || !phase) continue;
      finished = {
        phaseId,
        goalTitle: goal.title,
        phaseTitle: phase.title,
        total: phase.tasks.length,
        done: phase.tasks.filter((t) => t.status === "done").length,
      };
      break;
    }
    if (!finished) return;

    // Dedupe synchronously so a re-run of this effect can't double-fire; the UI
    // celebration itself is deferred so it isn't scheduled mid-effect.
    markCelebrated(finished.phaseId);
    const pending = finished;
    window.setTimeout(() => celebrate(pending), 0);
  }, [goals, celebrate]);

  useEffect(
    () => () => {
      if (rainTimer.current !== null) window.clearTimeout(rainTimer.current);
    },
    []
  );

  if (!stats) return null;

  return (
    <>
      <ConfettiRain active={raining} seed={seed} />
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        hideHeader
        className="sm:max-w-sm"
      >
        <div className="relative px-2 pb-1 pt-4 text-center">
          <button
            onClick={() => setOpen(false)}
            aria-label="Close celebration"
            className="pressable absolute right-0 top-0 flex h-9 w-9 items-center justify-center rounded-full text-muted hover:bg-surface-elevated hover:text-primary"
          >
            <X size={18} />
          </button>

          <div className="flex justify-center">
            <ProgressRing
              value={100}
              size={148}
              stroke={14}
              valueClassName="text-[36px]"
            />
          </div>

          <h2 className="mt-5 text-[24px] font-bold tracking-tight text-primary">
            Phase complete!
          </h2>
          <p className="mt-1 text-[14px] leading-relaxed text-secondary">
            {stats.phaseTitle} is done — every task in{" "}
            {stats.goalTitle} is checked off.
          </p>

          <div className="mt-6 grid grid-cols-2 gap-2">
            <div className="rounded-[16px] border border-border-soft bg-surface-elevated px-2 py-3">
              <p className="text-[18px] font-bold tabular-nums text-primary">
                {stats.done}/{stats.total}
              </p>
              <p className="mt-0.5 text-[11px] uppercase tracking-wide text-muted">
                Tasks
              </p>
            </div>
            <div className="rounded-[16px] border border-border-soft bg-surface-elevated px-2 py-3">
              <p className="text-[18px] font-bold tabular-nums text-accent">100%</p>
              <p className="mt-0.5 text-[11px] uppercase tracking-wide text-muted">
                Complete
              </p>
            </div>
          </div>

          <Button
            size="lg"
            className="mt-6 w-full"
            onClick={() => setOpen(false)}
          >
            Keep going
          </Button>
        </div>
      </Modal>
    </>
  );
}
