"use client";

import React, { useEffect, useRef, useState } from "react";
import { ChevronUp } from "lucide-react";
import { GreetingHeader } from "@/components/dashboard/GreetingHeader";
import { ProgressCard } from "@/components/dashboard/ProgressCard";
import { ProgressRing } from "@/components/ui/ProgressRing";
import { useDailyDashboard } from "@/components/dashboard/useDailyDashboard";
import { cn } from "@/lib/utils";

/**
 * Mobile-only "Today's Progress".
 *
 * Desktop (>= md / 768px): renders the existing full ProgressCard untouched.
 * Mobile (< 768px): shows a wide collapsed container — ring on the left plus a
 * row of three compact stats (Daily, Weekly and Monthly done).
 *
 * On tap the small container fades/shrinks out while the full Today's Progress
 * card grows from the same spot; collapsing is the reverse. Same data, same
 * ProgressCard, one progress calculation.
 */
export function MobileProgress({ children }: { children?: React.ReactNode }) {
  const data = useDailyDashboard();
  const [open, setOpen] = useState(false);
  // True while the small container is hidden (during/after opening).
  const [smallHidden, setSmallHidden] = useState(false);
  const bodyRef = useRef<HTMLDivElement>(null);
  const collapseBtnRef = useRef<HTMLButtonElement>(null);

  // Physical morph: grow/shrink downward from the collapsed container's position.
  const measureOrigin = () => {
    const body = bodyRef.current;
    const seat = document.querySelector<HTMLElement>("[data-mprogress-seat]");
    if (!body || !seat) return;
    const b = body.getBoundingClientRect();
    const s = seat.getBoundingClientRect();
    const originX = s.left + s.width - b.left;
    const originY = s.top + s.height - b.top;
    body.style.transformOrigin = `${originX}px ${originY}px`;
  };

  const expand = () => {
    setOpen(true);
    setSmallHidden(true);
    measureOrigin();
  };

  const collapse = () => {
    setOpen(false);
  };

  // Focus the collapse control when the card appears.
  useEffect(() => {
    if (open) collapseBtnRef.current?.focus();
  }, [open]);

  // Once the big card has fully folded away, bring the small container back.
  const onPanelTransitionEnd = (e: React.TransitionEvent<HTMLDivElement>) => {
    if (e.propertyName === "grid-template-rows" && !open) {
      setSmallHidden(false);
    }
  };

  return (
    <>
      <GreetingHeader
        progressSlot={
          <div
            data-mprogress-seat
            className={cn(
              "grid grid-cols-[minmax(0,1fr)] overflow-hidden transition-[grid-template-rows]",
              smallHidden ? "grid-rows-[0fr]" : "grid-rows-[1fr]"
            )}
            style={{
              transitionDuration: "260ms",
              transitionTimingFunction: "cubic-bezier(0.22, 1, 0.36, 1)",
            }}
          >
            <div
              className="min-h-0"
              style={{
                transitionProperty: "opacity, transform",
                transitionDuration: "220ms",
                transitionTimingFunction: "cubic-bezier(0.22, 1, 0.36, 1)",
                opacity: smallHidden ? 0 : 1,
                transform: smallHidden ? "scale(0.97)" : "scale(1)",
              }}
            >
              <button
                type="button"
                onClick={expand}
                aria-label={`Today's progress: ${data.today.pct} percent. Tap to expand.`}
                className="pressable flex w-full items-center gap-3.5 rounded-[20px] border border-border bg-surface p-3 text-left hover:border-accent-dark/60 hover:bg-surface-soft"
              >
                <ProgressRing
                  value={data.today.pct}
                  size={76}
                  stroke={8}
                  valueClassName="text-[19px]"
                  className="shrink-0"
                />
                <span className="flex min-w-0 flex-1 items-stretch gap-2">
                  <Stat value={`${data.today.done} / ${data.today.total}`} label="Daily done" className="flex-1" />
                  <span className="w-px shrink-0 self-stretch bg-border-soft" />
                  <Stat value={`${data.week.done} / ${data.week.total}`} label="Weekly done" className="flex-1" />
                  <span className="w-px shrink-0 self-stretch bg-border-soft" />
                  <Stat value={`${data.month.done} / ${data.month.total}`} label="Monthly done" className="flex-1" />
                </span>
              </button>
            </div>
          </div>
        }
      />

      {/* Desktop keeps the full card exactly as before. */}
      <div className="hidden md:block">
        <ProgressCard />
      </div>

      {/* Mobile expanded card, growing down from the collapsed container. */}
      <div
        aria-hidden={!open}
        data-mprogress-panel
        onTransitionEnd={onPanelTransitionEnd}
        className={cn(
          "grid grid-cols-[minmax(0,1fr)] overflow-hidden transition-[grid-template-rows] md:hidden",
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        )}
        style={{ transitionDuration: open ? "440ms" : "320ms", transitionTimingFunction: "cubic-bezier(0.22, 1, 0.36, 1)" }}
      >
        <div className="min-h-0 overflow-hidden">
          <div
            ref={bodyRef}
            className={cn("relative", open && "mprogress-grow")}
            style={{
              transitionProperty: "opacity, transform",
              transitionDuration: open ? "420ms" : "320ms",
              transitionTimingFunction: "cubic-bezier(0.22, 1, 0.36, 1)",
              opacity: open ? 1 : 0,
              transform: open ? "scale(1)" : "scale(0)",
            }}
          >
            <ProgressCard />
            <button
              ref={collapseBtnRef}
              type="button"
              onClick={collapse}
              aria-label="Collapse today's progress"
              title="Collapse"
              className="pressable absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full border border-border bg-surface-elevated text-secondary hover:bg-surface-soft hover:text-primary md:hidden"
            >
              <ChevronUp size={16} />
            </button>
          </div>
        </div>
      </div>

      {children}
    </>
  );
}

function Stat({
  value,
  label,
  className,
}: {
  value: string;
  label: string;
  className?: string;
}) {
  return (
    <span className={cn("flex min-w-0 flex-col items-center justify-center px-1", className)}>
      <span className="truncate text-[13px] font-semibold leading-5 tracking-tight text-primary tabular-nums">
        {value}
      </span>
      <span className="truncate text-[11px] leading-4 text-muted">{label}</span>
    </span>
  );
}
