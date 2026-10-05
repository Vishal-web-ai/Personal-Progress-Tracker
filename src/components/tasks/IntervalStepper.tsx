"use client";

import React from "react";
import { Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { addDaysKey, parseDayKey } from "@/lib/time";

export const MAX_REPEAT_DAYS = 30;

/** Interval control for a repeating daily task. Shows the actual next dates so
 *  a fixed-anchor cadence ("from the 7th, every 3 days") is never a guess.
 *  Announced as a slider so arrow keys adjust it without a custom key handler. */
export function IntervalStepper({
  value,
  onChange,
  startDay,
}: {
  /** Interval in days, 1…30. */
  value: number;
  onChange: (next: number) => void;
  /** "YYYY-MM-DD" the cadence is anchored to. */
  startDay: string;
}) {
  const clamp = (n: number) => Math.min(MAX_REPEAT_DAYS, Math.max(1, n));
  const nextDates = [addDaysKey(startDay, value), addDaysKey(startDay, value * 2), addDaysKey(startDay, value * 3)];

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onChange(clamp(value - 1))}
          disabled={value <= 1}
          aria-label="Decrease repeat interval"
          className="pressable flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] border border-border bg-surface-elevated text-secondary transition-colors hover:text-primary disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Minus size={16} aria-hidden />
        </button>

        <output
          className="flex h-9 flex-1 items-center justify-center rounded-[10px] border border-border bg-surface-elevated text-[14px] font-semibold tabular-nums text-primary"
        >
          Every {value} {value === 1 ? "day" : "days"}
        </output>

        <button
          type="button"
          onClick={() => onChange(clamp(value + 1))}
          disabled={value >= MAX_REPEAT_DAYS}
          aria-label="Increase repeat interval"
          className="pressable flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] border border-border bg-surface-elevated text-secondary transition-colors hover:text-primary disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Plus size={16} aria-hidden />
        </button>
      </div>

      <input
        type="range"
        min={1}
        max={MAX_REPEAT_DAYS}
        step={1}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label="Repeat interval in days"
        aria-valuetext={`Every ${value} ${value === 1 ? "day" : "days"}`}
        className={cn("h-1.5 w-full cursor-pointer appearance-none rounded-full bg-surface-soft accent-[var(--accent)]")}
      />

      <div className="flex flex-wrap gap-1.5">
        {[7, 14, 30].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            aria-pressed={value === n}
            className={cn(
              "pill pressable text-[12px] font-medium transition-colors",
              value === n
                ? "border-accent/60 bg-accent/15 text-accent"
                : "border-border bg-surface-elevated text-secondary hover:text-primary"
            )}
          >
            {n}d
          </button>
        ))}
      </div>

      <p className="text-[12px] text-muted">
        Next:{" "}
        {nextDates.map((d, i) => (
          <React.Fragment key={d}>
            {i > 0 && ", "}
            <span className="text-secondary">
              {parseDayKey(d).toLocaleDateString("en-US", { day: "numeric", month: "short" })}
            </span>
          </React.Fragment>
        ))}
      </p>
    </div>
  );
}