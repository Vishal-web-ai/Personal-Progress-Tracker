"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CalendarRange } from "lucide-react";
import { cn } from "@/lib/utils";
import { dayKey, parseDayKey } from "@/lib/time";
import { MonthCalendar } from "@/components/ui/MonthCalendar";

const PANEL_WIDTH = 284;

function formatSelectedDay(key: string): string {
  const d = parseDayKey(key);
  return d.toLocaleDateString("en-US", { weekday: "short", day: "numeric", month: "short" });
}

/** Single-day date picker. By default it refuses dates before today, so a task
 *  can be scheduled forward but never backfilled by hand. Pass `minDay` to relax
 *  that (used when editing history). Same portal popover pattern as WeekPicker. */
export function DayPicker({
  value,
  onChange,
  minDay,
  className,
  label = "Pick a date",
}: {
  value: string;
  onChange: (key: string) => void;
  /** "YYYY-MM-DD". Defaults to today. */
  minDay?: string;
  className?: string;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const floor = minDay ?? dayKey(new Date());

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
    setOpen(true);
  }, []);

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
        aria-label={label}
        onClick={() => (open ? close() : openPanel())}
        className={cn(
          "pressable flex w-full items-center justify-between gap-2 rounded-[12px] border bg-surface-elevated px-3.5 py-2.5 text-left text-[14px] text-primary outline-none transition-colors duration-150",
          open
            ? "border-accent/60 ring-2 ring-accent/20"
            : "border-border focus:border-accent/60 focus:ring-2 focus:ring-accent/20",
          className
        )}
      >
        <span className="truncate">{value ? formatSelectedDay(value) : label}</span>
        <CalendarRange
          size={16}
          aria-hidden
          className={cn("shrink-0", open ? "text-accent" : "text-muted")}
        />
      </button>

      {open &&
        pos &&
        createPortal(
          <div
            ref={panelRef}
            role="dialog"
            aria-label={label}
            className="dropdown-in card-shadow-sm fixed z-[60] rounded-[14px] border border-border bg-surface-elevated p-3"
            style={{ top: pos.top, left: pos.left, width: PANEL_WIDTH }}
          >
            <MonthCalendar key={value} value={value} onSelect={select} minDay={floor} />
          </div>,
          document.body
        )}
    </>
  );
}