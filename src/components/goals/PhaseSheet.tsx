"use client";

import { useState } from "react";
import { Play, Check, Trash2, Plus, ListChecks, Clock, Flag, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { Sheet } from "@/components/ui/Sheet";
import { Button } from "@/components/ui/Button";
import { Field, Input, Textarea } from "@/components/ui/Form";
import { DateField } from "@/components/ui/DateField";
import { useApp } from "@/store/app-store";
import { useToast } from "@/store/toast-store";
import type { Goal, PhaseStatus } from "@/types";
import { startOfDay } from "@/lib/time";

const TODAY_TS = startOfDay(new Date());

interface PhaseSheetProps {
  goal: Goal;
  phaseId: string;
  onClose: () => void;
  onStartPhase: () => void;
  onCompletePhase: () => void;
  onManageTasks: () => void;
}

const STATUS_META: Record<PhaseStatus, { label: string; dot: string; cls: string }> = {
  pending: { label: "Pending", dot: "var(--text-muted)", cls: "bg-surface-elevated text-secondary" },
  active: { label: "Active", dot: "var(--accent)", cls: "bg-accent/10 text-accent" },
  completed: { label: "Completed", dot: "var(--color-low)", cls: "bg-low/10 text-low" },
};

const fmtMin = (m?: number) => (m ? `${Math.round(m / 60)}h ${m % 60}m` : null);

export function PhaseSheet({ goal, phaseId, onClose, onStartPhase, onCompletePhase, onManageTasks }: PhaseSheetProps) {
  const { updatePhase, removePhase, togglePhaseTask } = useApp();
  const { toast } = useToast();

  const phase = goal.phases.find((p) => p.id === phaseId) || null;

  const [title, setTitle] = useState(() => phase?.title ?? "");
  const [description, setDescription] = useState(() => phase?.description ?? "");
  const [startDate, setStartDate] = useState<number | undefined>(phase?.startDate ?? undefined);
  const [endDate, setEndDate] = useState<number | undefined>(phase?.endDate ?? undefined);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  if (!phase) return null;

  const totalTasks = phase.tasks.length;
  const completedTasks = phase.tasks.filter((t) => t.status === "done").length;
  const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  const isBlocked = !!phase.dependsOn && phase.dependsOn.length > 0;
  const blockingPhases = goal.phases.filter((p) => p.dependsOn?.includes(phase.id));
  const meta = STATUS_META[phase.status];

  const canStart = phase.status === "pending" && !isBlocked;
  const canComplete = phase.status === "active" && progress === 100;

  const dirty =
    title !== phase.title ||
    description !== (phase.description ?? "") ||
    startDate !== phase.startDate ||
    endDate !== phase.endDate;

  const fmtDate = (d?: number) => (d ? new Date(d).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : null);
  const phaseRange = startDate && endDate ? `${fmtDate(startDate)} – ${fmtDate(endDate)}` : null;
  const est = fmtMin(phase.estimatedMinutes);
  const actual = phase.actualMinutes && phase.actualMinutes > 0 ? fmtMin(phase.actualMinutes) : null;

  const handleSave = () => {
    if (!title.trim()) return;
    updatePhase(goal.id, phase.id, {
      title: title.trim(),
      description: description.trim() || undefined,
      startDate,
      endDate,
    });
    toast("Phase updated");
  };

  const handleReopen = () => {
    updatePhase(goal.id, phase.id, { status: "pending", startedAt: undefined, completedAt: undefined });
    toast("Phase reopened");
  };

  const handleDelete = () => {
    if (!confirmingDelete) return;
    removePhase(goal.id, phase.id);
    toast("Phase deleted");
    onClose();
  };

  return (
    <Sheet
      open
      onClose={onClose}
      title={title.trim() || "Phase"}
      footer={
        <div className="flex justify-end">
          <Button variant="secondary" size="md" onClick={handleSave} disabled={!dirty || !title.trim()}>
            <Check size={16} /> Save changes
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Status + context */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: meta.dot }} aria-hidden />
          <span className={cn("rounded-full px-2.5 py-0.5 text-[12px] font-medium", meta.cls)}>{meta.label}</span>
          <span className="text-[12px] text-muted">in {goal.title}</span>
          {isBlocked && (
            <span className="flex items-center gap-1 rounded-full bg-amber-400/10 px-2.5 py-0.5 text-[12px] font-medium text-amber-400">
              <Flag size={11} /> waiting on {phase.dependsOn?.length} phase{phase.dependsOn && phase.dependsOn.length > 1 ? "s" : ""}
            </span>
          )}
        </div>

        {/* Edit fields */}
        <div className="space-y-4">
          <Field label="Phase title">
            <Input autoFocus value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Phase name" />
          </Field>
          <Field label="Description" hint="Optional — what happens in this phase.">
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Add context for this phase…" rows={2} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Start date">
              <DateField value={startDate} onChange={setStartDate} min={TODAY_TS} max={endDate} />
            </Field>
            <Field label="End date">
              <DateField value={endDate} onChange={setEndDate} min={startDate ?? TODAY_TS} />
            </Field>
          </div>
        </div>

        <p className="-mt-2 text-[12px] text-muted">
          {completedTasks}/{totalTasks} tasks · {progress}% complete
          {phaseRange && (
            <>
              <span aria-hidden> · </span>
              <span className="inline-flex items-center gap-1">{phaseRange}</span>
            </>
          )}
          {(est || actual) && (
            <>
              <span aria-hidden> · </span>
              <span className="inline-flex items-center gap-1">
                <Clock size={11} />
                {actual ? `${est ? `${est} est / ` : ""}${actual} actual` : `${est} est`}
              </span>
            </>
          )}
        </p>

        {/* Dependencies */}
        {(isBlocked || blockingPhases.length > 0) && (
          <div className="space-y-2 rounded-[14px] border border-border-soft bg-surface-elevated/40 p-4">
            <p className="text-[13px] font-semibold text-primary">Dependencies</p>
            <div className="flex flex-wrap gap-1.5">
              {phase.dependsOn?.map((depId) => {
                const dep = goal.phases.find((p) => p.id === depId);
                return dep ? (
                  <span
                    key={depId}
                    className={cn(
                      "rounded-full px-2 py-0.5 text-[12px] font-medium",
                      dep.status === "completed" ? "bg-low/10 text-low" : "bg-amber-400/10 text-amber-400"
                    )}
                  >
                    {dep.title} {dep.status === "completed" ? "✓" : "⏳"}
                  </span>
                ) : null;
              })}
              {blockingPhases.map((p) => (
                <span key={p.id} className="rounded-full bg-accent/10 px-2 py-0.5 text-[12px] font-medium text-accent">
                  Unlocks: {p.title}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Status actions */}
        <div className="flex flex-wrap gap-2">
          {canStart && (
            <Button size="sm" onClick={onStartPhase}>
              <Play size={13} /> Start phase
            </Button>
          )}
          {phase.status === "active" && (
            <Button size="sm" onClick={onCompletePhase} disabled={!canComplete} title={canComplete ? "" : "Finish all tasks to complete this phase"}>
              <Check size={13} /> {canComplete ? "Complete phase" : "Mark complete"}
            </Button>
          )}
          {phase.status === "completed" && (
            <Button size="sm" variant="secondary" onClick={handleReopen}>
              <RotateCcw size={13} /> Reopen
            </Button>
          )}
          {phase.status === "active" && !canComplete && (
            <span className="flex items-center rounded-full bg-surface-elevated px-2.5 py-1 text-[12px] text-muted">
              {totalTasks - completedTasks} task{totalTasks - completedTasks === 1 ? "" : "s"} left
            </span>
          )}
        </div>

        {/* Tasks */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <p className="text-[13px] font-semibold text-primary">
              Tasks <span className="ml-1 text-muted tabular-nums">({completedTasks}/{totalTasks})</span>
            </p>
            <button
              onClick={onManageTasks}
              className="pressable inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-[12px] font-medium text-accent hover:bg-accent/10"
            >
              <ListChecks size={13} /> Manage
            </button>
          </div>

          {totalTasks > 0 ? (
            <ul>
              {phase.tasks.map((task) => (
                <li key={task.id} className="flex items-center border-t border-border-soft py-2.5 first:border-t-0">
                  <button
                    type="button"
                    aria-label={task.status === "done" ? "Mark incomplete" : "Mark done"}
                    onClick={() => togglePhaseTask(phase.id, task.id)}
                    className={cn(
                      "pressable flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[6px] border-2 transition-colors",
                      task.status === "done" ? "border-accent bg-accent" : "border-border hover:border-accent/60"
                    )}
                  >
                    {task.status === "done" && <Check size={11} strokeWidth={3} className="text-[#061B14]" />}
                  </button>
                  <span className={cn("ml-2.5 min-w-0 flex-1 truncate text-[14px]", task.status === "done" ? "text-muted line-through" : "text-primary")}>
                    {task.title}
                    {task.isMilestone && <Flag className="ml-1.5 inline h-3.5 w-3.5 shrink-0 text-amber-400" />}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <div className="rounded-[12px] border border-dashed border-border px-4 py-6 text-center">
              <p className="mb-3 text-[13px] text-muted">No tasks in this phase yet</p>
              <Button size="sm" variant="secondary" onClick={onManageTasks}>
                <Plus size={13} /> Add tasks
              </Button>
            </div>
          )}
        </div>

        {/* Danger zone */}
        <div className="border-t border-border-soft pt-4">
          {confirmingDelete ? (
            <div className="rounded-[14px] border border-high/30 bg-high/5 p-4">
              <p className="mb-3 text-[13px] text-primary">
                Delete <span className="font-semibold">“{phase.title || "this phase"}”</span> and its {totalTasks} task
                {totalTasks === 1 ? "" : "s"}? This cannot be undone.
              </p>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setConfirmingDelete(false)}>
                  Cancel
                </Button>
                <Button variant="destructive" className="flex-1" onClick={handleDelete}>
                  <Trash2 size={14} /> Delete
                </Button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setConfirmingDelete(true)}
              className="pressable inline-flex items-center gap-2 rounded-lg px-3 py-2 text-[13px] font-medium text-high transition-colors hover:bg-high/10"
            >
              <Trash2 size={14} /> Delete phase
            </button>
          )}
        </div>
      </div>
    </Sheet>
  );
}