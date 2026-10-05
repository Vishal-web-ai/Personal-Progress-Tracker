"use client";

import React, { useMemo, useState } from "react";
import { CalendarClock, ChevronDown } from "lucide-react";
import type { Task } from "@/types";
import { dayKey, parseDayKey } from "@/lib/time";
import { relativeDayLabel, upcomingTasks } from "@/lib/tasks";
import { UpcomingTaskRow } from "@/components/dashboard/UpcomingTaskRow";
import { cn } from "@/lib/utils";

function dayHeading(day: string, today: string): string {
  const relative = relativeDayLabel(today, day);
  const date = parseDayKey(day).toLocaleDateString("en-US", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
  return relative ? `${date} · ${relative}` : date;
}

/** Collapsed summary of everything scheduled ahead. Expands into a date-grouped
 *  list; each row opens the editor so a future task can be moved or removed. */
export function UpcomingTasks({ tasks, onEdit }: { tasks: Task[]; onEdit: (task: Task) => void }) {
  const [open, setOpen] = useState(false);
  const today = dayKey(new Date());

  const items = useMemo(() => upcomingTasks(tasks, today), [tasks, today]);

  if (items.length === 0) return null;

  const nextDay = items[0].day!;
  const grouped = items.reduce<Record<string, Task[]>>((acc, t) => {
    (acc[t.day!] ??= []).push(t);
    return acc;
  }, {});

  return (
    <div className="mt-2.5 rounded-[18px] border border-border bg-surface">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="pressable flex w-full items-center gap-2.5 px-4 py-3 text-left"
      >
        <CalendarClock size={16} className="shrink-0 text-muted" aria-hidden />
        <span className="text-[14px] font-semibold text-primary">Upcoming</span>
        <span className="rounded-full bg-surface-soft px-2 py-0.5 text-[11px] font-medium text-muted tabular-nums">
          {items.length}
        </span>
        <span className="ml-1 truncate text-[12px] text-muted">
          Next {parseDayKey(nextDay).toLocaleDateString("en-US", { day: "numeric", month: "short" })}
        </span>
        <ChevronDown
          size={16}
          aria-hidden
          className={cn("ml-auto shrink-0 text-muted transition-transform duration-200", open && "rotate-180")}
        />
      </button>

      <div className={cn("accordion-content", open && "open")}>
        <div className="accordion-inner">
          <div className="space-y-3 px-3 pb-3">
            {Object.entries(grouped).map(([day, dayTasks]) => (
              <div key={day}>
                <p className="px-1 pb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted">
                  {dayHeading(day, today)}
                </p>
                <div className="space-y-2">
                  {dayTasks.map((t) => (
                    <UpcomingTaskRow key={t.id} task={t} today={today} onEdit={() => onEdit(t)} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}