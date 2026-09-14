"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { X } from "lucide-react";
import { useApp } from "@/store/app-store";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { ProgressRing } from "@/components/ui/ProgressRing";
import { ConfettiRain } from "@/components/celebration/CelebrationConfetti";
import { currentStreakDays } from "@/lib/metrics";
import { playCelebration } from "@/lib/sounds";
import { dayKey, isSameDay, plural } from "@/lib/time";

/**
 * Watches today's daily tasks and celebrates the moment the last one is
 * checked. Fires once per day (localStorage marker, so unchecking and
 * re-checking later doesn't relive the party) and only on the transition —
 * never on page load when the list is already complete.
 */
export function DayCelebration() {
  const { tasks, sessions, settings } = useApp();
  const [open, setOpen] = useState(false);
  const [raining, setRaining] = useState(false);
  const [seed, setSeed] = useState(1);
  const prevAllDone = useRef<boolean | null>(null);
  const rainTimer = useRef<number | null>(null);

  const nowTs = new Date();
  const today = dayKey(nowTs);
  const dailyToday = tasks.filter(
    (t) => t.bucket === "daily" && !t.archived && t.day === today
  );
  const total = dailyToday.length;
  const done = dailyToday.filter((t) => t.status === "done").length;
  const allDone = total > 0 && done === total;

  const focusMin = Math.round(
    sessions
      .filter((s) => isSameDay(s.startedAt, nowTs.getTime()))
      .reduce((a, s) => a + (s.activeDuration ?? 0), 0) / 60000
  );

  const streak = useMemo(() => currentStreakDays(tasks), [tasks]);

  const celebrate = useCallback(() => {
    const key = `pulse-celebrated-${dayKey(new Date())}`;
    try {
      if (window.localStorage.getItem(key)) return;
      window.localStorage.setItem(key, "1");
    } catch {
      // ignore storage unavailable — still celebrate
    }
    setRaining(true);
    if (rainTimer.current !== null) window.clearTimeout(rainTimer.current);
    rainTimer.current = window.setTimeout(() => setRaining(false), 5200);
    setSeed(Date.now());
    if (settings.celebrationSound) playCelebration();
    setOpen(true);
  }, [settings.celebrationSound]);

  useEffect(() => {
    if (prevAllDone.current === null) {
      prevAllDone.current = allDone;
      return;
    }
    const was = prevAllDone.current;
    prevAllDone.current = allDone;
    if (!was && allDone) celebrate();
  }, [allDone, celebrate]);

  useEffect(() => () => {
    if (rainTimer.current !== null) window.clearTimeout(rainTimer.current);
  }, []);

  return (
    <>
      <ConfettiRain active={raining} seed={seed} />
      <Modal open={open} onClose={() => setOpen(false)} hideHeader className="sm:max-w-sm">
        <div className="relative px-2 pb-1 pt-4 text-center">
          <button
            onClick={() => setOpen(false)}
            aria-label="Close celebration"
            className="pressable absolute right-0 top-0 flex h-9 w-9 items-center justify-center rounded-full text-muted hover:bg-surface-elevated hover:text-primary"
          >
            <X size={18} />
          </button>

          <div className="flex justify-center">
            <ProgressRing value={100} size={148} stroke={14} valueClassName="text-[36px]" />
          </div>

          <h2 className="mt-5 text-[24px] font-bold tracking-tight text-primary">
            All done, {settings.userName}!
          </h2>
          <p className="mt-1 text-[14px] leading-relaxed text-secondary">
            {done} of {total} task{total === 1 ? "" : "s"} checked off. Today&apos;s list is clear.
          </p>

          <div className="mt-6 grid grid-cols-3 gap-2">
            <div className="rounded-[16px] border border-border-soft bg-surface-elevated px-2 py-3">
              <p className="text-[18px] font-bold text-primary">{done}/{total}</p>
              <p className="mt-0.5 text-[11px] uppercase tracking-wide text-muted">Tasks</p>
            </div>
            <div className="rounded-[16px] border border-border-soft bg-surface-elevated px-2 py-3">
              <p className="text-[18px] font-bold text-primary">{focusMin} min</p>
              <p className="mt-0.5 text-[11px] uppercase tracking-wide text-muted">Focus</p>
            </div>
            <div className="rounded-[16px] border border-border-soft bg-surface-elevated px-2 py-3">
              <p className="text-[18px] font-bold text-primary">{plural(streak, "day")}</p>
              <p className="mt-0.5 text-[11px] uppercase tracking-wide text-muted">Streak</p>
            </div>
          </div>

          <Button size="lg" className="mt-6 w-full" onClick={() => setOpen(false)}>
            Awesome
          </Button>
        </div>
      </Modal>
    </>
  );
}