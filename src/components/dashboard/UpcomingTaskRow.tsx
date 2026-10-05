"use client";

import React from "react";
import { CalendarClock, Repeat } from "lucide-react";
import type { Task } from "@/types";
import { TaskIcon } from "@/components/ui/TaskIcon";
import { parseDayKey } from "@/lib/time";
import { relativeDayLabel } from "@/lib/tasks";

function relativeLabel(day: string, today: string): string {
  return (
    relativeDayLabel(today, day) ||
    parseDayKey(day).toLocaleDateString("en-US", { day: "numeric", month: "short" })
  );
}

/** A task scheduled for a future day. Deliberately has no checkbox and no focus
 *  play button — you cannot do those things tomorrow. Clicking opens the editor,
 *  which is how a future task gets rescheduled or deleted. */
export function UpcomingTaskRow({
  task,
  today,
  onEdit,
}: {
  task: Task;
  today: string;
  onEdit: () => void;
}) {
  const repeatEvery = task.repeatEvery ?? 0;

  return (
    <button
      type="button"
      onClick={onEdit}
      className="pressable accordion-content flex w-full items-center gap-3 rounded-[12px] border border-border bg-surface px-3 py-2.5 text-left transition-colors duration-150 hover:border-accent/40"
    >
      <TaskIcon name={task.icon} size={16} />

      <span className="min-w-0 flex-1">
        <span className="block truncate text-[14px] text-primary">{task.title}</span>
        <span className="mt-0.5 flex items-center gap-1.5 text-[12px] leading-[16px] text-muted">
          <CalendarClock size={11} aria-hidden className="shrink-0" />
          <span className="truncate">{relativeLabel(task.day!, today)}</span>
          <span aria-hidden>·</span>
          <span className="shrink-0">{task.areaName}</span>
        </span>
      </span>

      {repeatEvery > 0 && (
        <span
          className="flex shrink-0 items-center gap-1 rounded-full bg-accent/10 px-1.5 py-px text-[10px] text-accent"
          title={repeatEvery === 1 ? "Repeats daily" : `Repeats every ${repeatEvery} days`}
        >
          <Repeat size={10} strokeWidth={2.4} aria-hidden />
          {repeatEvery > 1 && <span className="tabular-nums">{repeatEvery}</span>}
          <span className="sr-only">
            {repeatEvery === 1 ? "Repeats daily" : `Repeats every ${repeatEvery} days`}
          </span>
        </span>
      )}
    </button>
  );
}