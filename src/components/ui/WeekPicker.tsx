"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CalendarRange, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { dayKey, formatWeekSpan } from "@/lib/time";

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
const PANEL_WIDTH = 284;

function parseKey(key: string): { y: number; m: number } {
  const m = Number(key.slice(5, 7)) - 1;
  return { y: Number(key.slice(0, 4)), m: Number.isFinite(m) ? m : 0 };
}

/** Themed month calendar. The whole trigger is tappable and the popover is a
 *  portal (same pattern as the app's custom Select). */
export function WeekPicker({
  value,
  onChange,
  className,
}: {
  value: string;
  onChange: (key: string) => void;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<{ y: number; m: number }>(() =>
    parseKey(value || dayKey(new Date()))
  );
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);

  const close = useCallback(() => {
    setOpen(false);
    setPos(null);
  }, []);

  const openPanel = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const left = Math.max(8, Math.min(r.left, window.innerWidth - PANEL_WIDTH - 8));
    setPos({ top: r.bottom + 6, left });
    setView(parseKey(value || dayKey(new Date())));
    setOpen(true);
  }, [value]);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: MouseEvent | TouchEvent) => {
      const t = e.target as Node;
      if (panelRef.current?.contains(t) || triggerRef.current?.contains(t)) return;
      close();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("touchstart", onPointer);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("touchstart", onPointer);
      window.removeEventListener("keydown", onKey);
    };
  }, [open, close]);

  const todayKey = dayKey(new Date());
  const firstOffset = (new Date(view.y, view.m, 1).getDay() + 6) % 7; // Mon = 0
  const daysInMonth = new Date(view.y, view.m + 1, 0).getDate();
  const cells: (string | null)[] = [];
  for (let i = 0; i < firstOffset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(dayKey(new Date(view.y, view.m, d)));

  const shiftMonth = (delta: number) =>
    setView((v) => {
      const d = new Date(v.y, v.m + delta, 1);
      return { y: d.getFullYear(), m: d.getMonth() };
    });

  const isTodayMonth =
    String(view.y) === todayKey.slice(0, 4) && view.m === Number(todayKey.slice(5, 7)) - 1;

  const select = (key: string) => {
    onChange(key);
    close();
  };

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => (open ? close() : openPanel())}
        className={cn(
          "pressable flex w-full items-center justify-between gap-2 rounded-[12px] border bg-surface-elevated px-3.5 py-2.5 text-left text-[14px] text-primary outline-none transition-colors duration-150",
          open ? "border-accent/60 ring-2 ring-accent/20" : "border-border focus:border-accent/60 focus:ring-2 focus:ring-accent/20",
          className
        )}
      >
        <span className="truncate">{formatWeekSpan(value)}</span>
        <CalendarRange size={16} aria-hidden className={cn("shrink-0", open ? "text-accent" : "text-muted")} />
      </button>

      {open &&
        pos &&
        createPortal(
          <div
            ref={panelRef}
            role="dialog"
            aria-label="Pick a week"
            className="dropdown-in card-shadow-sm fixed z-[60] rounded-[14px] border border-border bg-surface-elevated p-3"
            style={{ top: pos.top, left: pos.left, width: PANEL_WIDTH }}
          >
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
              {cells.map((k, i) =>
                k === null ? (
                  <div key={`e${i}`} aria-hidden />
                ) : (
                  <button
                    key={k}
                    type="button"
                    aria-label={new Date(Number(k.slice(0, 4)), Number(k.slice(5, 7)) - 1, Number(k.slice(8, 10))).toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
                    onClick={() => select(k)}
                    className={cn(
                      "pressable flex h-9 w-full items-center justify-center rounded-[10px] text-[13px] tabular-nums transition-colors",
                      k === value
                        ? "bg-accent font-semibold text-[#061B14]"
                        : k === todayKey
                          ? "border border-accent/50 text-accent hover:bg-accent/10"
                          : "text-secondary hover:bg-surface-soft hover:text-primary"
                    )}
                  >
                    {Number(k.slice(8, 10))}
                  </button>
                )
              )}
            </div>

            {!isTodayMonth && (
              <div className="mt-2 flex justify-end border-t border-border-soft pt-2">
                <button
                  type="button"
                  onClick={() => {
                    const t = parseKey(todayKey);
                    setView(t);
                  }}
                  className="pressable text-[12px] font-medium text-accent transition-colors hover:text-accent-soft"
                >
                  Today
                </button>
              </div>
            )}
          </div>,
          document.body
        )}
    </>
  );
}