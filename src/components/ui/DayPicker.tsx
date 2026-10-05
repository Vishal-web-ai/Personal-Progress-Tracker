"use client";

import React from "react";
import { createPortal } from "react-dom";
import { CalendarRange } from "lucide-react";
import { cn } from "@/lib/utils";
import { dayKey, parseDayKey } from "@/lib/time";
import { MonthCalendar } from "@/components/ui/MonthCalendar";
import { useAnchoredPopover } from "@/components/ui/useAnchoredPopover";

const PANEL_WIDTH = 284;

function formatSelectedDay(key: string): string {
  const d = parseDayKey(key);
  return d.toLocaleDateString("en-US", { weekday: "short", day: "numeric", month: "short" });
}

/** Single-day date picker. By default it refuses dates before today, so a task
 *  can be scheduled forward but never backfilled by hand. Pass `minDay` to relax
 *  that (used when editing history). */
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
  const { open, triggerRef, panelRef, close, toggle, panelStyle } =
    useAnchoredPopover<HTMLButtonElement, HTMLDivElement>();

  const floor = minDay ?? dayKey(new Date());

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
        onClick={toggle}
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
        createPortal(
          <div
            ref={panelRef}
            role="dialog"
            aria-label={label}
            className="dropdown-in card-shadow-sm fixed z-[60] rounded-[14px] border border-border bg-surface-elevated p-3"
            style={{ width: PANEL_WIDTH, ...panelStyle }}
          >
            <MonthCalendar key={value} value={value} onSelect={select} minDay={floor} />
          </div>,
          document.body
        )}
    </>
  );
}