"use client";

import React from "react";
import { createPortal } from "react-dom";
import { CalendarRange } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatWeekSpan } from "@/lib/time";
import { MonthCalendar } from "@/components/ui/MonthCalendar";
import { useAnchoredPopover } from "@/components/ui/useAnchoredPopover";

const PANEL_WIDTH = 284;

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
  const { open, triggerRef, panelRef, close, toggle, panelStyle } =
    useAnchoredPopover<HTMLButtonElement, HTMLDivElement>();

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
        onClick={toggle}
        className={cn(
          "pressable flex w-full items-center justify-between gap-2 rounded-[12px] border bg-surface-elevated px-3.5 py-2.5 text-left text-[14px] text-primary outline-none transition-colors duration-150",
          open
            ? "border-accent/60 ring-2 ring-accent/20"
            : "border-border focus:border-accent/60 focus:ring-2 focus:ring-accent/20",
          className
        )}
      >
        <span className="truncate">{formatWeekSpan(value)}</span>
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
            aria-label="Pick a week"
            className="dropdown-in card-shadow-sm fixed z-[60] rounded-[14px] border border-border bg-surface-elevated p-3"
            style={{ width: PANEL_WIDTH, ...panelStyle }}
          >
            <MonthCalendar value={value} onSelect={select} />
          </div>,
          document.body
        )}
    </>
  );
}