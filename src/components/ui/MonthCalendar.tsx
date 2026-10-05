"use client";

import React, { useCallback, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { dayKey, parseDayKey } from "@/lib/time";

const WEEKDAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];
const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export function monthOf(key: string): { y: number; m: number } {
  const d = parseDayKey(key || dayKey(new Date()));
  return { y: d.getFullYear(), m: d.getMonth() };
}

/** Themed month grid, shared by WeekPicker and DayPicker. Purely presentational:
 *  the caller owns the popover chrome, portal and focus handling. `minDay`
 *  disables every earlier date so a future-only picker cannot select the past. */
export function MonthCalendar({
  value,
  onSelect,
  minDay,
  footer,
}: {
  value: string;
  onSelect: (key: string) => void;
  /** "YYYY-MM-DD". Days strictly before this are disabled. */
  minDay?: string;
  footer?: React.ReactNode;
}) {
  const todayKey = dayKey(new Date());
  const [view, setView] = useState(() => monthOf(value));

  const shiftMonth = useCallback(
    (delta: number) =>
      setView((v) => {
        const d = new Date(v.y, v.m + delta, 1);
        return { y: d.getFullYear(), m: d.getMonth() };
      }),
    []
  );

  const showToday = useCallback(() => setView(monthOf(todayKey)), [todayKey]);

  const firstOffset = (new Date(view.y, view.m, 1).getDay() + 6) % 7; // Mon = 0
  const daysInMonth = new Date(view.y, view.m + 1, 0).getDate();
  const cells: (string | null)[] = [];
  for (let i = 0; i < firstOffset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(dayKey(new Date(view.y, view.m, d)));

  const isTodayMonth =
    String(view.y) === todayKey.slice(0, 4) && view.m === Number(todayKey.slice(5, 7)) - 1;

  return (
    <div>
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => shiftMonth(-1)}
          aria-label="Previous month"
          className="pressable flex h-8 w-8 items-center justify-center rounded-lg text-secondary transition-colors hover:bg-surface-soft hover:text-primary"
        >
          <ChevronLeft size={17} />
        </button>
        <p className="text-[14px] font-semibold text-primary">
          {MONTHS[view.m]} {view.y}
        </p>
        <button
          type="button"
          onClick={() => shiftMonth(1)}
          aria-label="Next month"
          className="pressable flex h-8 w-8 items-center justify-center rounded-lg text-secondary transition-colors hover:bg-surface-soft hover:text-primary"
        >
          <ChevronRight size={17} />
        </button>
      </div>

      <div className="mt-3 grid grid-cols-7 gap-1">
        {WEEKDAYS.map((w) => (
          <div key={w} className="text-center text-[11px] font-medium text-muted">
            {w}
          </div>
        ))}
        {cells.map((k, i) => {
          if (k === null) return <div key={`e${i}`} aria-hidden />;
          const disabled = !!minDay && k < minDay;
          return (
            <button
              key={k}
              type="button"
              disabled={disabled}
              aria-label={parseDayKey(k).toLocaleDateString("en-US", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
              aria-current={k === todayKey ? "date" : undefined}
              onClick={() => onSelect(k)}
              className={cn(
                "pressable flex h-9 w-full items-center justify-center rounded-[10px] text-[13px] tabular-nums transition-colors",
                disabled && "cursor-not-allowed text-muted/40",
                !disabled && k === value && "bg-accent font-semibold text-[#061B14]",
                !disabled && k !== value && k === todayKey && "border border-accent/50 text-accent hover:bg-accent/10",
                !disabled && k !== value && k !== todayKey && "text-secondary hover:bg-surface-soft hover:text-primary"
              )}
            >
              {Number(k.slice(8, 10))}
            </button>
          );
        })}
      </div>

      {(footer || !isTodayMonth) && (
        <div className="mt-2 flex items-center justify-between border-t border-border-soft pt-2">
          {!isTodayMonth && (
            <button
              type="button"
              onClick={showToday}
              className="pressable text-[12px] font-medium text-accent transition-colors hover:text-accent-soft"
            >
              Today
            </button>
          )}
          {footer}
        </div>
      )}
    </div>
  );
}