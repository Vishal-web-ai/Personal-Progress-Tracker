"use client";

import React, { useState } from "react";
import { ChevronDown, ListTodo, Plus } from "lucide-react";
import { useApp } from "@/store/app-store";
import type { Priority, Task } from "@/types";
import { PRIORITY_META } from "@/data/initial";
import { TaskRow } from "@/components/dashboard/TaskRow";
import { TaskHistory } from "@/components/dashboard/TaskHistory";
import { EmptyState } from "@/components/ui/EmptyState";
import { CreateTaskModal } from "@/components/tasks/CreateTaskModal";
import { formatFullDate } from "@/lib/time";
import { cn } from "@/lib/utils";

const ORDER: Priority[] = ["high", "medium", "low"];

export function TaskList({ compact }: { compact?: boolean }) {
  const { tasks } = useApp();
  const [collapsed, setCollapsed] = useState<Set<Priority>>(new Set());
  const [createOpen, setCreateOpen] = useState(false);
  const [now] = useState(() => Date.now());

  const sorted = [...tasks]
    .filter((t) => t.bucket === "daily" && !t.archived)
    .sort((a, b) => {
      const order = { high: 0, medium: 1, low: 2 } as const;
      if (order[a.priority] !== order[b.priority]) return order[a.priority] - order[b.priority];
      return a.createdAt - b.createdAt;
    });

  const groups = ORDER.map((p) => ({
    priority: p,
    items: sorted.filter((t) => t.priority === p),
  }));
  const visibleGroups = groups.filter((g) => g.items.length > 0);

  const toggle = (p: Priority) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(p)) next.delete(p);
      else next.add(p);
      return next;
    });
  };

  return (
    <section>
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h2 className="text-[22px] font-bold leading-[30px] tracking-tight text-primary">
            Task List
          </h2>
          <button
            onClick={() => setCreateOpen(true)}
            aria-label="Add task"
            className="pressable flex h-8 w-8 items-center justify-center rounded-full bg-accent text-[#061B14] hover:bg-accent-soft"
          >
            <Plus size={16} strokeWidth={2.5} />
          </button>
        </div>
        <span className="text-[14px] font-semibold tracking-tight text-secondary tabular-nums">
          {formatFullDate(now)}
        </span>
      </div>

      {sorted.length === 0 ? (
        <EmptyState icon={<ListTodo size={22} />} title="No tasks yet" message="Tap + to create your first task." />
      ) : (
        <div className="space-y-2.5">
          {visibleGroups.map(({ priority, items }) => {
            if (items.length === 0) return null;
            const meta = PRIORITY_META[priority];
            const isCollapsed = collapsed.has(priority);
            return (
              <div key={priority} className="rounded-[18px] border border-border bg-surface">
                <button
                  onClick={() => toggle(priority)}
                  aria-expanded={!isCollapsed}
                  className="pressable flex w-full items-center gap-2.5 px-4 py-3 text-left"
                >
                  <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: meta.dot }} />
                  <span className="text-[14px] font-semibold text-primary">{meta.label}</span>
                  <span className="rounded-full bg-surface-soft px-2 py-0.5 text-[11px] font-medium text-muted">
                    {items.length}
                  </span>
                  <ChevronDown
                    size={16}
                    className={cn("ml-auto text-muted transition-transform duration-200", isCollapsed && "-rotate-90")}
                  />
                </button>
                <div className={cn("accordion-content", !isCollapsed && "open")}>
                  <div className="accordion-inner">
                    <div className="space-y-2 px-3 pb-3">
                      {items.map((t: Task) => (
                        <TaskRow key={t.id} task={t} compact={compact} />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <TaskHistory mode="yesterday" />

      <CreateTaskModal open={createOpen} onClose={() => setCreateOpen(false)} defaultBucket="daily" />
    </section>
  );
}