"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { dayKey, isToday, MONTHS, WEEKDAYS_SHORT } from "@/lib/time";

const PANEL_WIDTH = 264;
const PANEL_HEIGHT_EST = 340;

function fmtDDMMYYYY(ts: number): string {
  const d = new Date(ts);
  return [
    String(d.getDate()).padStart(2, "0"),
    String(d.getMonth() + 1).padStart(2, "0"),
    d.getFullYear(),
  ].join("-");
}

interface DateFieldProps {
  value?: number;
  onChange?: (ts?: number) => void;
  placeholder?: string;
  min?: number;
  max?: number;
  className?: string;
  disabled?: boolean;
}

/** Themed date picker. The whole field is tappable; the calendar popover follows
 *  the app's palette (dark surface, lime accent). Renders as dd-mm-yyyy. */
export function DateField({
  value,
  onChange,
  placeholder = "dd-mm-yyyy",
  min,
  max,
  className,
  disabled,
}: DateFieldProps) {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<Date>(() => {
    const base = value ? new Date(value) : new Date();
    return new Date(base.getFullYear(), base.getMonth(), 1);
  });
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
    let top = r.bottom + 6;
    if (top + PANEL_HEIGHT_EST > window.innerHeight) top = Math.max(8, r.top - PANEL_HEIGHT_EST - 6);
    setPos({ top, left });
    const base = value ? new Date(value) : new Date();
    setView(new Date(base.getFullYear(), base.getMonth(), 1));
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

  const year = view.getFullYear();
  const month = view.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const offset = (new Date(year, month, 1).getDay() + 6) % 7;

  const cells: (number | null)[] = [
    ...Array<number | null>(offset).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const minKey = min ? dayKey(new Date(min)) : null;
  const maxKey = max ? dayKey(new Date(max)) : null;
  const valueKey = value !== undefined ? dayKey(new Date(value)) : null;

  const select = (day: number) => {
    onChange?.(new Date(year, month, day).getTime());
    close();
  };

  const thisMonthView = month === new Date().getMonth() && year === new Date().getFullYear();

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => (open ? close() : openPanel())}
        className={cn(
          "pressable flex h-10 w-full items-center justify-between gap-2 rounded-[12px] border bg-surface px-3 text-left text-[13px] outline-none transition-colors duration-150",
          open ? "border-accent/60 ring-2 ring-accent/20" : "border-border focus:border-accent/60 focus:ring-2 focus:ring-accent/20",
          disabled && "opacity-50 pointer-events-none",
          className
        )}
      >
        <span className={cn("truncate tabular-nums", value === undefined ? "text-muted" : "text-primary")}>
          {value !== undefined ? fmtDDMMYYYY(value) : placeholder}
        </span>
        <ChevronDown
          size={15}
          className={cn("shrink-0 text-muted transition-transform duration-150", open && "rotate-180")}
        />
      </button>

      {open &&
        pos &&
        createPortal(
          <div
            ref={panelRef}
            role="dialog"
            aria-label="Pick a date"
            className="dropdown-in card-shadow-sm fixed z-[60] rounded-[14px] border border-border bg-surface-elevated p-2.5"
            style={{ top: pos.top, left: pos.left, width: PANEL_WIDTH }}
          >
            <div className="grid grid-cols-[1fr_auto_1fr] items-center px-1">
              <button
                type="button"
                onClick={() => setView(new Date(year, month - 1, 1))}
                aria-label="Previous month"
                className="pressable flex h-8 w-8 items-center justify-center rounded-lg text-secondary transition-colors hover:bg-surface-soft hover:text-primary"
              >
                <ChevronLeft size={17} />
              </button>
              <span className="text-[13px] font-semibold text-primary tabular-nums">
                {MONTHS[month].slice(0, 3)} {year}
              </span>
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setView(new Date(year, month + 1, 1))}
                  aria-label="Next month"
                  className="pressable flex h-8 w-8 items-center justify-center rounded-lg text-secondary transition-colors hover:bg-surface-soft hover:text-primary"
                >
                  <ChevronRight size={17} />
                </button>
              </div>
            </div>

            <div className="mt-1 grid grid-cols-7">
              {WEEKDAYS_SHORT.map((w) => (
                <span key={w} className="flex h-6 items-center justify-center text-[10px] font-medium uppercase tracking-wide text-muted">
                  {w}
                </span>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-y-0.5">
              {cells.map((day, i) => {
                if (day === null) return <span key={`e-${i}`} className="h-9 w-9" aria-hidden />;
                const cell = new Date(year, month, day);
                const key = dayKey(cell);
                const isSel = key === valueKey;
                const isDis = (minKey !== null && key < minKey) || (maxKey !== null && key > maxKey);
                const isTdy = isToday(cell.getTime());
                return (
                  <button
                    key={key}
                    type="button"
                    disabled={isDis}
                    onClick={() => select(day)}
                    aria-pressed={isSel}
                    className={cn(
                      "pressable flex h-9 w-9 items-center justify-center rounded-full text-[13px] tabular-nums transition-colors",
                      isSel
                        ? "bg-accent font-semibold text-[#061B14]"
                        : cn(
                            "text-primary hover:bg-surface-soft",
                            isTdy && "ring-1 ring-inset ring-accent/60",
                            isDis && "opacity-30 pointer-events-none"
                          )
                    )}
                  >
                    {day}
                  </button>
                );
              })}
            </div>

            <div className="mt-1.5 flex items-center justify-between border-t border-border-soft pt-2 px-1">
              {!thisMonthView ? (
                <button
                  type="button"
                  onClick={() => {
                    const n = new Date();
                    setView(new Date(n.getFullYear(), n.getMonth(), 1));
                  }}
                  className="pressable rounded-lg px-2 py-1 text-[12px] font-medium text-accent transition-colors hover:bg-accent/10"
                >
                  Today
                </button>
              ) : (
                <span aria-hidden />
              )}
              {value !== undefined && (
                <button
                  type="button"
                  onClick={() => {
                    onChange?.(undefined);
                    close();
                  }}
                  className="pressable ml-auto rounded-lg px-2 py-1 text-[12px] font-medium text-muted transition-colors hover:bg-surface-soft hover:text-primary"
                >
                  Clear
                </button>
              )}
            </div>
          </div>,
          document.body
        )}
    </>
  );
}