"use client";

import React from "react";
import { Play, Trash2, NotebookPen } from "lucide-react";
import { useApp } from "@/store/app-store";
import { useSessionFlow } from "@/components/timer/SessionFlow";
import { useToast } from "@/store/toast-store";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { StarRating } from "@/components/ui/StarRating";
import { EmptyState } from "@/components/ui/EmptyState";
import { TaskIcon } from "@/components/ui/TaskIcon";
import { formatDuration } from "@/lib/utils";
import { isToday, isSameDay } from "@/lib/time";

export function TaskDetailModal({
  open,
  onClose,
  taskId,
  label,
  color,
}: {
  open: boolean;
  onClose: () => void;
  taskId: string;
  label: string;
  color: string;
}) {
  const { tasks, sessions, toggleTask, removeTask } = useApp();
  const { beginSession } = useSessionFlow();
  const { toast } = useToast();

  const task = tasks.find((t) => t.id === taskId);
  if (!task) return null;

  const taskSessions = sessions
    .filter((s) => s.taskId === task.id && s.endedAt)
    .sort((a, b) => b.endedAt! - a.endedAt!);

  const actualMs = taskSessions.reduce((a, s) => a + s.activeDuration, 0);
  const todayStr = "Today";

  return (
    <Modal open={open} onClose={onClose} title={task.title}>
      <div className="space-y-5">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-[14px] bg-surface-soft text-secondary">
            <TaskIcon name={task.icon} size={20} />
          </div>
          <div className="min-w-0">
            <p className="text-[13px] text-secondary truncate">{task.areaName}</p>
            <p className="text-[13px] text-secondary">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full" style={{ background: color }} />
                {label}
              </span>
            </p>
          </div>
        </div>

        <div className="rounded-[16px] border border-border-soft bg-surface-elevated px-4 py-3">
          <p className="text-[12px] text-muted">Total focus time</p>
          <p className="mt-0.5 text-[16px] font-semibold tabular-nums text-primary">
            {actualMs > 0 ? formatDuration(actualMs / 60000) : "—"}
          </p>
        </div>

        <Button variant="primary" className="w-full" onClick={() => beginSession(task.id, task.title)}>
          <Play size={16} className="translate-x-px" /> Start Timer
        </Button>

        <div className="flex gap-2">
          <Button
            variant="secondary"
            className="flex-1"
            disabled={task.status === "in_progress"}
            onClick={() => {
              toggleTask(task.id);
              toast(task.status === "done" ? `${task.title} reopened` : `${task.title} completed`);
              onClose();
            }}
          >
            {task.status === "done" ? "Mark incomplete" : "Mark complete"}
          </Button>
          <Button
            variant="danger"
            size="icon"
            aria-label="Delete task"
            onClick={() => {
              removeTask(task.id);
              toast(`Deleted · ${task.title}`, "warn");
              onClose();
            }}
          >
            <Trash2 size={16} />
          </Button>
        </div>

        <div>
          <p className="mb-2 text-[13px] font-medium text-secondary">Session history</p>
          {taskSessions.length === 0 ? (
            <EmptyState icon={<NotebookPen size={20} />} title="No sessions yet" message="Start the timer to record real work." />
          ) : (
            <div className="space-y-2">
              {taskSessions.slice(0, 8).map((s, i) => {
                const prev = taskSessions[i + 1];
                const dayLabel = isToday(s.startedAt)
                  ? todayStr
                  : prev && isSameDay(s.startedAt, prev.startedAt)
                    ? "Same day"
                    : new Date(s.startedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" });
                return (
                  <div key={s.id} className="flex items-center justify-between rounded-[14px] border border-border-soft bg-surface-elevated px-4 py-2.5">
                    <div>
                      <p className="text-[14px] font-medium tabular-nums text-primary">
                        {formatDuration(s.activeDuration / 60000)}
                      </p>
                      <p className="text-[11px] text-muted">{dayLabel}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {s.focusRating ? (
                        <StarRating value={s.focusRating} size={13} />
                      ) : (
                        <span className="text-[11px] text-muted">unrated</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}