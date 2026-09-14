"use client";

import React, { useState } from "react";
import { Plus, ListTodo } from "lucide-react";
import { useApp } from "@/store/app-store";
import type { TaskBucket } from "@/types";
import { sortByPriority } from "@/data/initial";
import { bucketProgress } from "@/lib/metrics";
import { dayKey } from "@/lib/time";
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

  const items = sortByPriority(
    tasks.filter((t) => t.bucket === bucket && !t.archived && (bucket !== "daily" || t.day === dayKey(new Date())))
  );
  const { done, total, pct } = bucketProgress(tasks, bucket);

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
          onClick={() => setCreateOpen(true)}
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

      <div className="mt-4 space-y-2">
        {items.length === 0 ? (
          <EmptyState
            icon={<ListTodo size={20} />}
            title="Nothing planned"
            message={`Tap + to add a ${bucket} task.`}
          />
        ) : (
          items.map((t) => <TaskRow key={t.id} task={t} compact />)
        )}
      </div>

      <CreateTaskModal open={createOpen} onClose={() => setCreateOpen(false)} defaultBucket={bucket} />
    </section>
  );
}