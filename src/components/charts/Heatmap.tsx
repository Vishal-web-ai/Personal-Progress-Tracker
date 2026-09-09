"use client";

import React from "react";
import { DAYS_SHORT } from "@/lib/time";
import { cn } from "@/lib/utils";
import { formatDuration } from "@/lib/utils";

interface HeatmapProps {
  year: number;
  month: number; // 0-indexed
  minutesByDay: Map<number, number>; // key: timestamp of day start
  className?: string;
}

function cellFor(min: number): string {
  if (min <= 0) return "bg-surface-elevated";
  if (min < 30 * 60000) return "bg-accent-dark/50";
  if (min < 90 * 60000) return "bg-accent-dark";
  if (min < 180 * 60000) return "bg-accent-soft/70";
  return "bg-accent";
}

export function Heatmap({ year, month, minutesByDay, className }: HeatmapProps) {
  const first = new Date(year, month, 1);
  const startOffset = (first.getDay() + 6) % 7; // Monday first
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(new Date(year, month, d).getTime());
  }
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <div className={cn("overflow-x-auto", className)}>
      <div className="min-w-[300px]">
        <div className="grid grid-cols-7 gap-1.5">
          {DAYS_SHORT.map((d) => (
            <div key={d} className="text-center text-[10px] font-medium uppercase tracking-wide text-muted">
              {d}
            </div>
          ))}
          {cells.map((ts, i) =>
            ts === null ? (
              <div key={`e-${i}`} />
            ) : (
              <div
                key={ts}
                title={`${new Date(ts).getDate()} · ${formatDuration((minutesByDay.get(ts) ?? 0) / 60000)}`}
                className={cn(
                  "flex aspect-square items-center justify-center rounded-md text-[9px] tabular-nums transition-colors duration-150",
                  minutesByDay.get(ts) ? cellFor(minutesByDay.get(ts) ?? 0) + " text-[#061B14/70]" : ""
                )}
              >
                {minutesByDay.get(ts) ? new Date(ts).getDate() : "·"}
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}