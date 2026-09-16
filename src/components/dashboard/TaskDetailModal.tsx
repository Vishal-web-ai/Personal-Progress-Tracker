"use client";

import React from "react";
import { Play, Repeat, Trash2 } from "lucide-react";
import { useApp } from "@/store/app-store";
import { useSessionFlow } from "@/components/timer/SessionFlow";
import { useToast } from "@/store/toast-store";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { TaskIcon } from "@/components/ui/TaskIcon";
import { cn } from "@/lib/utils";

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
  const { tasks, toggleTask, setTaskRepeat, removeTask } = useApp();
  const { beginSession } = useSessionFlow();
  const { toast } = useToast();

  const task = tasks.find((t) => t.id === taskId);
  if (!task) return null;

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

        {task.hasTimer !== false && (
          <Button variant="primary" className="w-full" onClick={() => beginSession(task.id, task.title)}>
            <Play size={16} className="translate-x-px" /> Start Timer
          </Button>
        )}

        {task.bucket === "daily" && (
          <button
            type="button"
            role="switch"
            aria-checked={Boolean(task.repeat)}
            aria-label="Repeat this task every day"
            onClick={() => setTaskRepeat(task.id, !task.repeat)}
            className="pressable flex w-full items-center justify-between rounded-[12px] border border-border bg-surface-elevated px-3.5 py-2.5"
          >
            <span className="flex items-center gap-2 text-[14px] text-primary">
              <Repeat size={15} className={task.repeat ? "text-accent" : "text-muted"} />
              {task.repeat ? "Repeats every day" : "Repeat every day"}
            </span>
            <span
              className={cn(
                "relative h-7 w-12 shrink-0 rounded-full border transition-colors duration-150",
                task.repeat
                  ? "border-accent/60 bg-accent/15"
                  : "border-border bg-surface-soft"
              )}
            >
              <span
                className={cn(
                  "absolute left-0.5 top-0.5 h-[22px] w-[22px] rounded-full transition-transform duration-150",
                  task.repeat ? "translate-x-5 bg-accent" : "bg-muted"
                )}
              />
            </span>
          </button>
        )}

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


      </div>
    </Modal>
  );
}