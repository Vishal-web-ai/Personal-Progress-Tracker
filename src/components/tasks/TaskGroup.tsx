"use client";

import React, { useState } from "react";
import { Plus, ListTodo } from "lucide-react";
import { useApp } from "@/store/app-store";
import type { TaskBucket } from "@/types";
import { sortByPriority } from "@/data/initial";
import { bucketProgress } from "@/lib/metrics";
import { dayKey, formatWeekSpan, monthKey, monthLabel } from "@/lib/time";
import { TaskRow } from "@/components/dashboard/TaskRow";
import { EmptyState } from "@/components/ui/EmptyState";
import { CreateTaskModal } from "@/components/tasks/CreateTaskModal";

export function TaskGroup({
  title,
  bucket,
  subtitle,
}: {
  title: string;
  bucket: TaskBucket;
  subtitle?: string;
}) {
  const { tasks } = useApp();
  const [createOpen, setCreateOpen] = useState(false);
  const [createWeekStart, setCreateWeekStart] = useState<string | undefined>(undefined);
  const [createMonthKey, setCreateMonthKey] = useState<string | undefined>(undefined);

  const openCreate = (weekStart?: string, month?: string) => {
    setCreateWeekStart(weekStart);
    setCreateMonthKey(month);
    setCreateOpen(true);
  };

  const items = sortByPriority(
    tasks.filter((t) => t.bucket === bucket && !t.archived && (bucket !== "daily" || t.day === dayKey(new Date())))
  );
  const { done, total, pct } = bucketProgress(tasks, bucket);
  const isWeekly = bucket === "weekly";
  const isMonthly = bucket === "monthly";

  const weekGroups = isWeekly
    ? Array.from(new Set(items.flatMap((t) => (t.weekStart ? [t.weekStart] : []))))
        .sort()
        .map((weekStart) => {
          const list = items.filter((t) => t.weekStart === weekStart);
          return (
            <div key={weekStart} className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-[13px] font-semibold text-primary">{formatWeekSpan(weekStart)}</p>
                <div className="flex items-center gap-1.5">
                  <p className="text-[12px] text-secondary tabular-nums">
                    {list.filter((t) => t.status === "done").length} / {list.length}
                  </p>
                  <button
                    onClick={() => openCreate(weekStart)}
                    aria-label={`Add task to week starting ${formatWeekSpan(weekStart)}`}
                    className="pressable flex h-7 w-7 items-center justify-center rounded-lg border border-border bg-surface-elevated text-secondary transition-colors hover:bg-surface-soft hover:text-primary"
                  >
                    <Plus size={14} strokeWidth={2.5} />
                  </button>
                </div>
              </div>
              {list.map((t) => (
                <TaskRow key={t.id} task={t} compact />
              ))}
            </div>
          );
        })
    : [];

  const monthGroups = isMonthly
    ? Array.from(new Set(items.flatMap((t) => (t.monthKey ? [t.monthKey] : []))))
        .sort()
        .reverse()
        .map((mk) => {
          const list = items.filter((t) => t.monthKey === mk);
          const isCurrent = mk === monthKey(new Date());
          return (
            <div key={mk} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-baseline gap-2">
                  <p className="text-[13px] font-semibold text-primary">{monthLabel(mk)}</p>
                  {isCurrent && <p className="text-[11px] font-medium text-accent">Current</p>}
                </div>
                <div className="flex items-center gap-1.5">
                  <p className="text-[12px] text-secondary tabular-nums">
                    {list.filter((t) => t.status === "done").length} / {list.length}
                  </p>
                  <button
                    onClick={() => openCreate(undefined, mk)}
                    aria-label={`Add task to ${monthLabel(mk)}`}
                    className="pressable flex h-7 w-7 items-center justify-center rounded-lg border border-border bg-surface-elevated text-secondary transition-colors hover:bg-surface-soft hover:text-primary"
                  >
                    <Plus size={14} strokeWidth={2.5} />
                  </button>
                </div>
              </div>
              {list.map((t) => (
                <TaskRow key={t.id} task={t} compact />
              ))}
            </div>
          );
        })
    : [];

  const weekUnscheduled =
    isWeekly && items.some((t) => !t.weekStart) ? (
      <div className="space-y-2">
        <p className="text-[13px] font-semibold text-primary">Unscheduled</p>
        {items
          .filter((t) => !t.weekStart)
          .map((t) => (
            <TaskRow key={t.id} task={t} compact />
          ))}
      </div>
    ) : null;

  const monthUnscheduled =
    isMonthly && items.some((t) => !t.monthKey) ? (
      <div className="space-y-2">
        <p className="text-[13px] font-semibold text-primary">Unscheduled</p>
        {items
          .filter((t) => !t.monthKey)
          .map((t) => (
            <TaskRow key={t.id} task={t} compact />
          ))}
      </div>
    ) : null;

  return (
    <section className="rounded-[22px] border border-border bg-surface p-5 sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-[18px] font-bold tracking-tight text-primary">{title}</h2>
          <p className="mt-0.5 text-[13px] text-secondary tabular-nums">
            {done} / {total} done{subtitle ? ` · ${subtitle}` : ""}
          </p>
        </div>
        <button
          onClick={() => openCreate()}
          aria-label={`Add ${bucket} task`}
          className="pressable flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent text-[#061B14] hover:bg-accent-soft"
        >
          <Plus size={17} strokeWidth={2.5} />
        </button>
      </div>

      {total > 0 && (
        <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-ring-track">
          <div
            className="h-full rounded-full bg-accent transition-[width] duration-500 ease-out"
            style={{ width: `${pct}%` }}
          />
        </div>
      )}

      <div className="mt-4 space-y-4">
        {items.length === 0 ? (
          <EmptyState
            icon={<ListTodo size={20} />}
            title="Nothing planned"
            message={`Tap + to add a ${bucket} task.`}
          />
        ) : isWeekly ? (
          <>
            {weekGroups}
            {weekUnscheduled}
          </>
        ) : isMonthly ? (
          <>
            {monthGroups}
            {monthUnscheduled}
          </>
        ) : (
          items.map((t) => <TaskRow key={t.id} task={t} compact />)
        )}
      </div>

      <CreateTaskModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        defaultBucket={bucket}
        defaultWeekStart={createWeekStart}
        defaultMonthKey={createMonthKey}
      />
    </section>
  );
}