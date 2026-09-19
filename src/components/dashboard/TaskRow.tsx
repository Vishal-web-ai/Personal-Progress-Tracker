import React from "react";
import { Play, Repeat, Pencil } from "lucide-react";
import type { Task } from "@/types";
import { useApp } from "@/store/app-store";
import { useSessionFlow } from "@/components/timer/SessionFlow";
import { Checkbox } from "@/components/ui/Checkbox";
import { TaskIcon } from "@/components/ui/TaskIcon";
import { ParticleBurst } from "@/components/ui/ParticleBurst";
import { cn } from "@/lib/utils";
import { PRIORITY_META } from "@/data/initial";
import { CreateTaskModal } from "@/components/tasks/CreateTaskModal";
import { useTimer } from "@/store/timer-store";

export function TaskRow({
  task,
  compact,
}: {
  task: Task;
  compact?: boolean;
}) {
  const { toggleTask } = useApp();
  const { beginSession } = useSessionFlow();
  const { active } = useTimer();
  const [editOpen, setEditOpen] = React.useState(false);

  const done = task.status === "done";
  const inProgress = task.status === "in_progress";
  const isActiveTask = active?.taskId === task.id;

  const priority = PRIORITY_META[task.priority];

  const [burstCount, setBurstCount] = React.useState(0);
  const prevDoneRef = React.useRef(done);

  React.useEffect(() => {
    if (done && !prevDoneRef.current) {
      setBurstCount((c) => c + 1);
    }
    prevDoneRef.current = done;
  }, [done]);

  return (
    <>
      <div
        className={cn(
          "group relative flex items-center gap-3.5 rounded-[14px] bg-surface-elevated px-4 transition-colors duration-150",
          compact ? "py-2" : "py-3",
          !done && "hover:bg-surface-soft/80",
          task.status === "in_progress" && "ring-1 ring-inset ring-accent/30"
        )}
      >
        {burstCount > 0 && <ParticleBurst key={burstCount} seed={burstCount} />}
        <button
          onClick={() => setEditOpen(true)}
          className="flex min-w-0 flex-1 items-center gap-3.5 text-left"
          aria-label={`Edit ${task.title}`}
        >
          <div
            className={cn(
              "flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] bg-surface-soft",
              inProgress ? "text-accent" : "text-secondary",
              done && "text-muted/70"
            )}
          >
            <TaskIcon name={task.icon} size={20} />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "truncate text-[16px] leading-[22px] transition-colors duration-150",
                  done ? "text-muted line-through" : "font-medium text-primary"
                )}
              >
                {task.title}
              </span>
              {isActiveTask && (
                <span className="flex shrink-0 items-center gap-1 rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-accent">
                  <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                  Now
                </span>
              )}
            </div>
            <div className="mt-0.5 flex items-center gap-1.5 text-[13px] leading-[18px] text-secondary">
              <span className="truncate">{task.areaName}</span>
              {task.repeat && !done && (
                <span
                  className="flex shrink-0 items-center gap-1 rounded-full bg-accent/10 px-1.5 py-px text-[10px] text-accent"
                  title="Repeats daily"
                >
                  <Repeat size={10} strokeWidth={2.4} />
                </span>
              )}
            </div>
          </div>
        </button>

        {!done && !isActiveTask && task.hasTimer !== false && (
          <button
            onClick={() => beginSession(task.id, task.title)}
            aria-label={`Start focus on ${task.title}`}
            title="Start focus"
            className="pressable flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border bg-surface-soft text-primary opacity-100 transition-opacity duration-150 hover:bg-accent/15 hover:text-accent md:opacity-0 md:group-hover:opacity-100"
          >
            <Play size={15} strokeWidth={2.2} className="translate-x-px" />
          </button>
        )}

        <Checkbox
          checked={done}
          onChange={() => toggleTask(task.id)}
          label={done ? `Mark ${task.title} as incomplete` : `Complete ${task.title}`}
          className="ml-0.5"
        />
      </div>

      <CreateTaskModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        editTask={task}
      />
    </>
  );
}