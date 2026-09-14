"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { addMonthsKey, monthKey, monthLabel } from "@/lib/time";

const PANEL_WIDTH = 248;

/** Themed month picker. The whole trigger is tappable; the popover navigates
 *  one month at a time (range-style) and tapping the month label confirms. */
export function MonthPicker({
  value,
  onChange,
  className,
}: {
  value: string;
  onChange: (key: string) => void;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<string>(value || monthKey(new Date()));
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
    setView(value || monthKey(new Date()));
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

  const thisMonth = monthKey(new Date());
  const isThisMonth = thisMonth === view;

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
        <span className="truncate">{monthLabel(value)}</span>
        <CalendarDays size={16} aria-hidden className={cn("shrink-0", open ? "text-accent" : "text-muted")} />
      </button>

      {open &&
        pos &&
        createPortal(
          <div
            ref={panelRef}
            role="dialog"
            aria-label="Pick a month"
            className="dropdown-in card-shadow-sm fixed z-[60] rounded-[14px] border border-border bg-surface-elevated p-3"
            style={{ top: pos.top, left: pos.left, width: PANEL_WIDTH }}
          >
            <div className="grid grid-cols-[1fr_auto_1fr] items-center">
              <button
                type="button"
                onClick={() => setView((v) => addMonthsKey(v, -1))}
                aria-label="Previous month"
                className="pressable flex h-8 w-8 items-center justify-center rounded-lg text-secondary transition-colors hover:bg-surface-soft hover:text-primary"
              >
                <ChevronLeft size={17} />
              </button>
              <button
                type="button"
                onClick={() => select(view)}
                aria-label={`Select ${monthLabel(view)}`}
                className="pressable rounded-lg px-3 py-1.5 text-[14px] font-semibold text-primary transition-colors hover:bg-surface-soft"
              >
                {monthLabel(view)}
              </button>
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setView((v) => addMonthsKey(v, 1))}
                  aria-label="Next month"
                  className="pressable flex h-8 w-8 items-center justify-center rounded-lg text-secondary transition-colors hover:bg-surface-soft hover:text-primary"
                >
                  <ChevronRight size={17} />
                </button>
              </div>
            </div>

            {!isThisMonth && (
              <div className="mt-2 flex justify-end border-t border-border-soft pt-2">
                <button
                  type="button"
                  onClick={() => setView(thisMonth)}
                  className="pressable text-[12px] font-medium text-accent transition-colors hover:text-accent-soft"
                >
                  This month
                </button>
              </div>
            )}
          </div>,
          document.body
        )}
    </>
  );
}