"use client";

import React from "react";
import { Repeat } from "lucide-react";
import type { Task } from "@/types";
import { TaskIcon } from "@/components/ui/TaskIcon";

/** A task scheduled for a future day. Deliberately has no checkbox and no focus
 *  play button — you cannot do those things tomorrow. Clicking opens the editor,
 *  which is how a future task gets rescheduled or deleted.
 *
 *  The date lives on the group heading, so the row carries only the area — no
 *  need to repeat "Tomorrow" twice within a few lines of itself. */
export function UpcomingTaskRow({
  task,
  onEdit,
}: {
  task: Task;
  onEdit: () => void;
}) {
  const repeatEvery = task.repeatEvery ?? 0;

  return (
    <button
      type="button"
      onClick={onEdit}
      className="pressable flex w-full items-center gap-3 rounded-[12px] border border-border bg-surface px-3 py-2.5 text-left transition-colors duration-150 hover:border-accent/40"
    >
      <span className="shrink-0 text-secondary">
        <TaskIcon name={task.icon} size={16} />
      </span>

      <span className="min-w-0 flex-1">
        <span className="block truncate text-[14px] text-primary">{task.title}</span>
        <span className="mt-0.5 block truncate text-[12px] leading-[16px] text-muted">
          {task.areaName}
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