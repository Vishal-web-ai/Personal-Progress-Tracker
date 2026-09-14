"use client";

import React, { useState } from "react";
import { CalendarClock, Check, ChevronRight, RotateCcw, Trash2 } from "lucide-react";
import type { Task } from "@/types";
import { useApp } from "@/store/app-store";
import { useToast } from "@/store/toast-store";
import { TaskIcon } from "@/components/ui/TaskIcon";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Field, Input } from "@/components/ui/Form";
import { cn } from "@/lib/utils";
import { dayKey, addDaysKey, formatDayKey, formatFullDate } from "@/lib/time";

type SheetView = "actions" | "date";

function MissedTaskSheet({
  task,
  initialView = "actions",
  onClose,
}: {
  task: Task;
  initialView?: SheetView;
  onClose: () => void;
}) {
  const { reAddTask, removeTask } = useApp();
  const { toast } = useToast();
  const today = dayKey(new Date());
  const [view, setView] = useState<SheetView>(initialView);
  const [date, setDate] = useState(today);
  const done = task.status === "done";

  const reAddToday = () => {
    reAddTask(task.id);
    toast(`Re-added · ${task.title}`);
    onClose();
  };

  const schedule = () => {
    if (!date || date < today) return;
    reAddTask(task.id, date);
    toast(`Re-added · ${task.title} · ${formatFullDate(new Date(`${date}T00:00:00`).getTime())}`);
    onClose();
  };

  const deleteTask = () => {
    removeTask(task.id);
    toast(`Deleted · ${task.title}`, "warn");
    onClose();
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={task.title}
      footer={
        view === "date" ? (
          <div className="flex gap-2">
            <Button variant="secondary" className="flex-1" onClick={() => setView("actions")}>
              Back
            </Button>
            <Button variant="primary" className="flex-1" disabled={!date || date < today} onClick={schedule}>
              <Check size={16} /> Re-add
            </Button>
          </div>
        ) : undefined
      }
    >
      {view === "date" ? (
        <div className="space-y-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-surface-soft text-secondary">
              <TaskIcon name={task.icon} size={16} />
            </div>
            <div className="min-w-0">
              <p className="truncate text-[14px] font-medium text-primary">{task.title}</p>
              <p className="truncate text-[12px] text-muted">{task.areaName}</p>
            </div>
          </div>
          <Field label="Schedule for" hint="The task will appear in your list on this day.">
            <Input
              type="date"
              className="[color-scheme:dark]"
              min={today}
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </Field>
        </div>
      ) : (
        <div className="space-y-2.5">
          <div className="flex items-center justify-between gap-3 px-0.5 pb-0.5">
            <span className="truncate text-[13px] text-secondary">{task.areaName}</span>
            {!done && (
              <span className="shrink-0 rounded-full bg-high/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-high">
                Missed
              </span>
            )}
          </div>
          <Button variant="primary" className="w-full justify-start" onClick={reAddToday}>
            <RotateCcw size={16} strokeWidth={2.2} /> Re-add for today
          </Button>
          <Button variant="secondary" className="w-full justify-start" onClick={() => setView("date")}>
            <CalendarClock size={16} strokeWidth={2.2} /> Re-add on another day
          </Button>
          <Button variant="danger" className="w-full justify-start" onClick={deleteTask}>
            <Trash2 size={16} /> Delete task
          </Button>
        </div>
      )}
    </Modal>
  );
}

function ArchivedTaskRow({ task }: { task: Task }) {
  const { reAddTask, removeTask } = useApp();
  const { toast } = useToast();
  const [sheet, setSheet] = useState<SheetView | null>(null);

  const actionClass =
    "pressable flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border bg-surface-soft transition-colors duration-150";

  return (
    <>
      <div className="group flex items-center gap-3.5 rounded-[14px] bg-surface-elevated px-4 py-2.5">
        <button
          type="button"
          onClick={() => setSheet("actions")}
          aria-label={`Open actions for ${task.title}`}
          className="flex min-w-0 flex-1 items-center gap-3.5 text-left"
        >
          <div
            className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-surface-soft",
              task.status === "done" ? "text-muted/70" : "text-secondary"
            )}
          >
            <TaskIcon name={task.icon} size={18} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "truncate text-[15px] leading-[21px]",
                  task.status === "done" ? "text-muted line-through" : "font-medium text-primary"
                )}
              >
                {task.title}
              </span>
              {task.status !== "done" && (
                <span className="shrink-0 rounded-full bg-high/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-high">
                  Missed
                </span>
              )}
            </div>
            <div className="mt-0.5 truncate text-[12px] leading-[18px] text-muted">{task.areaName}</div>
          </div>
          <ChevronRight size={16} aria-hidden className="shrink-0 text-muted md:hidden" />
        </button>
        <div className="hidden shrink-0 items-center gap-1.5 md:flex md:opacity-0 md:group-hover:opacity-100">
          <button
            onClick={() => {
              reAddTask(task.id);
              toast(`Re-added · ${task.title}`);
            }}
            aria-label={`Re-add ${task.title} for today`}
            title="Re-add for today"
            className={cn(actionClass, "text-primary hover:bg-accent/15 hover:text-accent")}
          >
            <RotateCcw size={15} strokeWidth={2.2} />
          </button>
          <button
            onClick={() => setSheet("date")}
            aria-label={`Re-add ${task.title} on another day`}
            title="Re-add on another day"
            className={cn(actionClass, "text-primary hover:bg-accent/15 hover:text-accent")}
          >
            <CalendarClock size={15} strokeWidth={2.2} />
          </button>
          <button
            onClick={() => {
              removeTask(task.id);
              toast(`Deleted · ${task.title}`, "warn");
            }}
            aria-label={`Delete ${task.title}`}
            title="Delete task"
            className={cn(actionClass, "text-muted hover:bg-high/10 hover:text-high")}
          >
            <Trash2 size={15} strokeWidth={2.2} />
          </button>
        </div>
      </div>
      {sheet && <MissedTaskSheet task={task} initialView={sheet} onClose={() => setSheet(null)} />}
    </>
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