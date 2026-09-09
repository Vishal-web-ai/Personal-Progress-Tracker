"use client";

import React from "react";
import { RotateCcw } from "lucide-react";
import type { Task } from "@/types";
import { useApp } from "@/store/app-store";
import { TaskIcon } from "@/components/ui/TaskIcon";
import { cn } from "@/lib/utils";
import { dayKey, addDaysKey, formatDayKey } from "@/lib/time";

function ArchivedTaskRow({ task }: { task: Task }) {
  const { reAddTask } = useApp();
  const done = task.status === "done";

  return (
    <div className="group flex items-center gap-3.5 rounded-[14px] bg-surface-elevated px-4 py-2.5">
      <div
        className={cn(
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-surface-soft",
          done ? "text-muted/70" : "text-secondary"
        )}
      >
        <TaskIcon name={task.icon} size={18} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "truncate text-[15px] leading-[21px]",
              done ? "text-muted line-through" : "font-medium text-primary"
            )}
          >
            {task.title}
          </span>
          {!done && (
            <span className="shrink-0 rounded-full bg-surface-soft px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted">
              Missed
            </span>
          )}
        </div>
        <div className="mt-0.5 truncate text-[12px] leading-[18px] text-muted">{task.areaName}</div>
      </div>
      <button
        onClick={() => reAddTask(task.id)}
        aria-label={`Re-add ${task.title} for today`}
        title="Re-add for today"
        className="pressable flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border bg-surface-soft text-primary transition-colors duration-150 hover:bg-accent/15 hover:text-accent md:opacity-0 md:group-hover:opacity-100"
      >
        <RotateCcw size={15} strokeWidth={2.2} />
      </button>
    </div>
  );
}

export function TaskHistory({ mode }: { mode: "yesterday" | "all" }) {
  const { tasks } = useApp();
  const today = dayKey(new Date());

  const archived = tasks.filter((t) => t.bucket === "daily" && t.archived);
  const scoped = mode === "yesterday" ? archived.filter((t) => t.day === addDaysKey(today, -1)) : archived;

  if (scoped.length === 0) return null;

  const byDay = new Map<string, Task[]>();
  scoped.forEach((t) => {
    const key = t.day ?? "";
    if (!byDay.has(key)) byDay.set(key, []);
    byDay.get(key)!.push(t);
  });
  const days = [...byDay.entries()].sort((a, b) => (a[0] < b[0] ? 1 : -1));

  const sectionClass =
    "text-[11px] font-semibold uppercase tracking-[0.08em] text-muted";

  if (mode === "yesterday") {
    const doneCount = scoped.filter((t) => t.status === "done").length;
    return (
      <div className="mt-6">
        <div className="mb-2.5 flex items-baseline justify-between gap-3">
          <span className={sectionClass}>Previous day</span>
          <span className="text-[12px] text-muted tabular-nums">
            {doneCount} done · {scoped.length} total
          </span>
        </div>
        <div className="rounded-[18px] border border-border bg-surface p-2">
          <div className="space-y-2">
            {scoped.map((t) => (
              <ArchivedTaskRow key={t.id} task={t} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-6">
      <div className="mb-2.5 flex items-baseline justify-between gap-3">
        <span className={sectionClass}>Previous days</span>
        <span className="text-[12px] text-muted tabular-nums">{scoped.length} archived</span>
      </div>
      <div className="space-y-4">
        {days.map(([key, items]) => {
          const doneCount = items.filter((t) => t.status === "done").length;
          return (
            <div key={key} className="rounded-[18px] border border-border bg-surface p-2">
              <div className="flex items-baseline justify-between gap-3 px-2 pb-1.5 pt-2">
                <span className="text-[13px] font-semibold text-primary">{formatDayKey(key)}</span>
                <span className="text-[12px] text-muted tabular-nums">
                  {doneCount} done · {items.length} total
                </span>
              </div>
              <div className="space-y-2">
                {items.map((t) => (
                  <ArchivedTaskRow key={t.id} task={t} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}