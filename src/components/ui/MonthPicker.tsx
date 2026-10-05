"use client";

import React, { useCallback, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { addMonthsKey, monthKey, monthLabel } from "@/lib/time";
import { useAnchoredPopover } from "@/components/ui/useAnchoredPopover";

const PANEL_WIDTH = 220;

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
  const { open, triggerRef, panelRef, close, openPanel: show, panelStyle } =
    useAnchoredPopover<HTMLButtonElement, HTMLDivElement>();
  const [view, setView] = useState<string>(value || monthKey(new Date()));

  const openPanel = useCallback(() => {
    setView(value || monthKey(new Date()));
    show();
  }, [show, value]);

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
          "pressable flex items-center justify-center rounded-[12px] border bg-surface-elevated px-2.5 py-2 text-center text-[13px] text-primary outline-none transition-colors duration-150 min-w-[100px]",
          open
            ? "border-accent/60 ring-2 ring-accent/20"
            : "border-border focus:border-accent/60 focus:ring-2 focus:ring-accent/20",
          className
        )}
      >
        <span className="truncate">{monthLabel(value)}</span>
      </button>

      {open &&
        createPortal(
          <div
            ref={panelRef}
            role="dialog"
            aria-label="Pick a month"
            className="dropdown-in card-shadow-sm fixed z-[60] rounded-[14px] border border-border bg-surface-elevated p-3"
            style={{ width: PANEL_WIDTH, ...panelStyle }}
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
              <div className="mt-2 flex justify-center border-t border-border-soft pt-2">
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