"use client";

import { useState } from "react";
import {
  Flag,
  Clock,
  TrendingUp,
  Plus,
  Pencil,
  Check,
  RotateCcw,
  Trash2,
} from "lucide-react";
import { cn, toMinutes } from "@/lib/utils";
import { ProgressRing } from "@/components/ui/ProgressRing";
import { TaskIcon } from "@/components/ui/TaskIcon";
import { Button } from "@/components/ui/Button";
import { Field, Input, Textarea } from "@/components/ui/Form";
import { DateField } from "@/components/ui/DateField";
import { useApp } from "@/store/app-store";
import { useToast } from "@/store/toast-store";
import { Goal, Phase } from "@/types";
import { plural, startOfDay } from "@/lib/time";

function formatPhaseDates(phase: Phase): string | null {
  const fmt = (v?: number) => (v ? new Date(v).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : null);
  const start = fmt(phase.startDate);
  const end = fmt(phase.endDate);
  if (start && end) return `${start} – ${end}`;
  if (start) return `Starts ${start}`;
  if (end) return `Ends ${end}`;
  return null;
}

interface PhaseCardProps {
  phase: Phase;
  goal: Goal;
  goalColor: string;
  index?: number;
  onCompletePhase: () => void;
}

export function PhaseCard({
  phase,
  goal,
  goalColor,
  index,
  onCompletePhase,
}: PhaseCardProps) {
  const { togglePhaseTask, updatePhase, removePhase, addPhaseTask } = useApp();
  const { toast } = useToast();
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [newTask, setNewTask] = useState("");
  const [draft, setDraft] = useState({ title: "", description: "", startDate: undefined as number | undefined, endDate: undefined as number | undefined });

  const totalTasks = phase.tasks.length;
  const completedTasks = phase.tasks.filter((t) => t.status === "done").length;
  const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  const phaseDates = formatPhaseDates(phase);
  const estMinutes = toMinutes(phase.estimatedMinutes);
  const actMinutes = toMinutes(phase.actualMinutes);

  const isBlocked = phase.dependsOn && phase.dependsOn.length > 0;
  const milestoneCount = phase.tasks.filter((t) => t.isMilestone).length;
  const defaultColor = index !== undefined ? GOAL_COLORS[index % GOAL_COLORS.length] : goalColor;
  const phaseColor = phase.color || defaultColor;
  const tintedText = `color-mix(in srgb, ${phaseColor} 78%, white)`;
  const dimmedText = `color-mix(in srgb, ${phaseColor} 50%, var(--text-secondary))`;
  const barFill = phaseColor;

  const panelId = `phase-panel-${phase.id}`;
  const canComplete = phase.status === "active" && progress === 100;

  const startEdit = () => {
    setDraft({
      title: phase.title,
      description: phase.description || "",
      startDate: phase.startDate,
      endDate: phase.endDate,
    });
    setEditing(true);
    setExpanded(true);
  };

  const saveEdit = () => {
    if (!draft.title.trim()) return;
    updatePhase(goal.id, phase.id, {
      title: draft.title.trim(),
      description: draft.description.trim() || undefined,
      startDate: draft.startDate,
      endDate: draft.endDate,
    });
    setEditing(false);
    toast("Phase updated");
  };

  const handleAddTask = () => {
    const title = newTask.trim();
    if (!title) return;
    addPhaseTask(phase.id, goal.id, {
      title,
      order: phase.tasks.length,
      isMilestone: false,
    });
    setNewTask("");
    toast("Task added");
  };

  const handleDelete = () => {    if (!confirmingDelete) return;
    removePhase(goal.id, phase.id);
    setConfirmingDelete(false);
    setExpanded(false);
    toast("Phase deleted");
  };

  return (
    <div
      className={cn(
        "w-full overflow-hidden rounded-[18px] border transition-colors duration-200",
        phase.status === "completed" && "opacity-70"
      )}
      style={{
        backgroundColor: "var(--surface-elevated)",
        borderColor: "var(--border)",
      }}
    >
      {/* Header row: the disclosure toggle and the edit affordance are siblings,
          not nested, so each is a real button with its own accessible name. */}
      <div className="flex items-start justify-between gap-3 p-5 pb-4">
        <button
          type="button"
          onClick={() => {
            // Disclosing the card always lands on the task list; the edit form is
            // only reachable via the pencil affordance.
            if (!expanded || editing) {
              setEditing(false);
              setExpanded(true);
            } else {
              setExpanded(false);
            }
          }}
          aria-expanded={expanded}
          aria-controls={panelId}
          className="group flex min-w-0 flex-1 items-start gap-3 rounded-[10px] text-left outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
        >
          <span
            className="mt-0.5 h-3 w-3 flex-shrink-0 rounded-full"
            style={{ backgroundColor: tintedText }}
            aria-hidden
          />
          <span className="min-w-0">
            <span
              className="block truncate text-[15px] font-semibold transition-opacity group-hover:opacity-75"
              style={{ color: tintedText }}
            >
              {phase.title}
            </span>
            <span className="mt-1 flex items-center gap-2 text-[12px]" style={{ color: dimmedText }}>
              <span className="tabular-nums">
                {completedTasks}/{totalTasks} tasks
              </span>
              {phaseDates && (
                <>
                  <span aria-hidden>·</span>
                  <span>{phaseDates}</span>
                </>
              )}
              {estMinutes > 0 && (
                <>
                  <span aria-hidden>·</span>
                  <span className="flex items-center gap-1">
                    <Clock size={12} />
                    {Math.round(estMinutes / 60)}h {estMinutes % 60}m est.
                  </span>
                </>
              )}
              {actMinutes > 0 && (
                <>
                  <span aria-hidden>·</span>
                  <span className="flex items-center gap-1">
                    <TrendingUp size={12} />
                    {Math.round(actMinutes / 60)}h {actMinutes % 60}m actual
                  </span>
                </>
              )}
            </span>
          </span>
        </button>

        <div className="flex flex-shrink-0 items-center gap-1.5">
          {isBlocked && <Flag className="h-4 w-4 text-amber-400" aria-label="Blocked by a dependency" />}
          {milestoneCount > 0 && (
            <span className="flex items-center gap-1 rounded-full bg-amber-400/10 px-2 py-0.5 text-[11px] font-medium text-amber-400">
              <Flag size={10} />
              {milestoneCount}
            </span>
          )}
          <button
            type="button"
            onClick={startEdit}
            aria-label={`Edit ${phase.title}`}
            title="Edit phase"
            className="pressable flex h-8 w-8 items-center justify-center rounded-[10px] text-secondary outline-none transition-colors hover:bg-surface-soft hover:text-primary focus-visible:ring-2 focus-visible:ring-accent/50"
          >
            <Pencil size={15} />
          </button>
        </div>
      </div>

      <div className="px-5 pb-4">
        <div className="mb-1.5 flex items-center justify-between text-[11px]" style={{ color: dimmedText }}>
          <span className="tabular-nums">{progress}% complete</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-surface border border-border">
          <div
            className="h-full rounded-full transition-all duration-500 ease-out"
            style={{ width: `${progress}%`, backgroundColor: barFill }}
          />
        </div>
      </div>

      <div id={panelId} className={cn("accordion-content", expanded && "open")}>
        <div className="accordion-inner" inert={!expanded}>
          <div className="border-t border-border-soft panel-body">
            {editing ? (
            <div className="panel-stagger space-y-3 p-5">
              <Field label="Phase name">
                <Input
                  value={draft.title}
                  onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
                  placeholder="Phase name"
                />
              </Field>
              <Field label="Notes">
                <Textarea
                  value={draft.description}
                  onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
                  placeholder="What does this phase cover?"
                />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Start">
                  <DateField
                    value={draft.startDate}
                    onChange={(ts) => setDraft((d) => ({ ...d, startDate: ts }))}
                  />
                </Field>
                <Field label="End">
                  <DateField
                    value={draft.endDate}
                    onChange={(ts) => setDraft((d) => ({ ...d, endDate: ts }))}
                  />
                </Field>
              </div>
              <div className="border-t border-border-soft pt-3">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-[13px] font-semibold text-primary">Tasks</span>
                  <span className="tabular-nums text-[12px] text-secondary">
                    {completedTasks}/{totalTasks}
                  </span>
                </div>

                {phase.tasks.length > 0 && (
                  <ul className="mb-2 space-y-0.5">
                    {phase.tasks.map((t) => (
                      <li
                        key={t.id}
                        className="flex items-center gap-2 rounded-[10px] px-2 py-1.5 text-[13px]"
                      >
                        <span
                          className={cn(
                            "min-w-0 flex-1 truncate",
                            t.status === "done" ? "text-secondary line-through" : "text-primary"
                          )}
                        >
                          {t.title}
                        </span>
                        {t.isMilestone && <Flag size={12} className="flex-shrink-0 text-amber-400" />}
                      </li>
                    ))}
                  </ul>
                )}

                <div className="flex items-center gap-2">
                  <Input
                    value={newTask}
                    onChange={(e) => setNewTask(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddTask();
                      }
                    }}
                    placeholder="Add a task"
                    aria-label="New task title"
                  />
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={handleAddTask}
                    disabled={!newTask.trim()}
                  >
                    <Plus size={13} /> Add
                  </Button>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setEditing(false);
                    setDraft({ title: "", description: "", startDate: undefined, endDate: undefined });
                  }}
                >
                  Cancel
                </Button>
                <Button size="sm" onClick={saveEdit} disabled={!draft.title.trim()}>
                  Save phase
                </Button>
              </div>
            </div>
          ) : (
            <div className="panel-stagger p-5">
              {totalTasks === 0 ? (
                <p className="py-3 text-center text-[13px] text-secondary">
                  No tasks yet. Add them to start tracking this phase.
                </p>
              ) : (
                <ul className="space-y-0.5">
                  {phase.tasks.map((task) => {
                    const done = task.status === "done";
                    const taskEst = toMinutes(task.estimatedMinutes);
                    return (
                      <li key={task.id}>
                        <div className="flex items-center gap-3 rounded-[10px] px-2 py-2 transition-colors hover:bg-surface-soft/60">
                          <button
                            type="button"
                            onClick={() => togglePhaseTask(phase.id, task.id)}
                            aria-label={done ? `Mark "${task.title}" incomplete` : `Mark "${task.title}" complete`}
                            aria-pressed={done}
                            className={cn(
                              "flex h-5 w-5 flex-shrink-0 items-center justify-center rounded border-2 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-accent/50",
                              done
                                ? "border-accent bg-accent text-[#061B14]"
                                : "border-border bg-surface-elevated/60 hover:bg-surface-soft"
                            )}
                          >
                            {done && <Check size={11} strokeWidth={3} />}
                          </button>
                          <span
                            className={cn(
                              "min-w-0 flex-1 truncate text-[13px]",
                              done ? "text-secondary line-through" : "text-primary"
                            )}
                          >
                            {task.title}
                          </span>
                          {task.isMilestone && (
                            <Flag size={12} className="flex-shrink-0 text-amber-400" aria-label="Milestone" />
                          )}
                          {taskEst > 0 && (
                            <span className="flex-shrink-0 tabular-nums text-[11px] text-secondary">
                              {Math.round(taskEst / 60)}h {taskEst % 60}m
                            </span>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}

              <div className="mt-5 flex flex-wrap items-center justify-between gap-x-3 gap-y-2 border-t border-border-soft pt-4">
                <div className="flex items-center gap-2">
                  {phase.status === "active" && (
                    <Button
                      size="sm"
                      onClick={onCompletePhase}
                      disabled={!canComplete}
                      title={canComplete ? "" : "Finish all tasks to complete this phase"}
                    >
                      <Check size={13} /> {canComplete ? "Complete phase" : "Mark complete"}
                    </Button>
                  )}
                  {phase.status === "completed" && (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => {
                        updatePhase(goal.id, phase.id, {
                          status: "pending",
                          startedAt: undefined,
                          completedAt: undefined,
                        });
                        toast("Phase reopened");
                      }}
                    >
                      <RotateCcw size={13} /> Reopen
                    </Button>
                  )}
                </div>

                {confirmingDelete ? (
                  <div className="flex items-center gap-2">
                    <span className="text-[13px] text-secondary">Delete this phase?</span>
                    <Button variant="secondary" size="sm" onClick={() => setConfirmingDelete(false)}>
                      Cancel
                    </Button>
                    <Button variant="danger" size="sm" onClick={handleDelete}>
                      <Trash2 size={13} /> Delete
                    </Button>
                  </div>
                ) : (
                   <button
                    type="button"
                    onClick={() => setConfirmingDelete(true)}
                    className="pressable inline-flex h-8 items-center justify-center gap-1.5 rounded-xl px-3 text-[13px] font-medium text-muted transition-colors hover:bg-high/10 hover:text-high"
                  >
                    <Trash2 size={13} /> Delete
                  </button>
                )}
              </div>
            </div>
          )}
          </div>
        </div>
      </div>
    </div>
  );
}

interface GoalCardProps {
  goal: Goal;
  onEdit: () => void;
  onCompletePhase: (phaseId: string) => void;
}

const GOAL_COLORS = [
  "var(--note-mint-swatch)",
  "var(--note-teal-swatch)",
  "var(--note-tan-swatch)",
  "var(--note-sand-swatch)",
  "var(--note-violet-swatch)",
];

export function GoalCard({ goal, onEdit, onCompletePhase }: GoalCardProps) {
  const goalColor = goal.color || GOAL_COLORS[0];

  const activePhase = goal.phases.find((p) => p.status === "active");
  const hasChips = Boolean(goal.targetDate || activePhase);

  return (
    <article className="overflow-hidden rounded-[22px] border border-border bg-surface">
      <div className="p-6">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <div
              className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl"
              style={{
                backgroundColor: "var(--surface-soft)",
                color: "var(--text-primary)",
              }}
            >
              <TaskIcon name={goal.icon ?? "target"} size={19} />
            </div>
            <div className="min-w-0">
              <h3 className="truncate">
                <button
                  type="button"
                  onClick={onEdit}
                  title="Edit goal"
                  className="block max-w-full truncate text-left text-[22px] font-bold tracking-tight text-primary transition-opacity hover:opacity-75 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
                >
                  {goal.title}
                </button>
              </h3>
              {goal.description && (
                <p className="mt-0.5 line-clamp-1 text-[13px] text-muted">{goal.description}</p>
              )}
            </div>
          </div>
          <div className="flex flex-shrink-0 items-center gap-2">
            <ProgressRing
              value={goal.progress}
              size={56}
              stroke={6}
              showValue
              valueClassName="text-[16px]"
              accent={goalColor}
              trackOpacity={0.3}
            />
          </div>
        </div>

        {hasChips && (
          <div className="mb-6 flex flex-wrap items-center gap-3 text-[12px] text-muted">
            {goal.targetDate && (() => {
              const days = Math.round((startOfDay(new Date(goal.targetDate)) - startOfDay(new Date())) / 86400000);
              const label = days === 0 ? "Due today" : days < 0 ? `${plural(Math.abs(days), "day")} overdue` : `${plural(days, "day")} left`;
              return (
                <span className={cn("rounded-full bg-surface-elevated px-2.5 py-1", days < 0 ? "text-high" : "text-primary")}>
                  {label}
                </span>
              );
            })()}
            {activePhase && (
              <span className="flex items-center gap-1.5 rounded-full bg-accent/10 px-2.5 py-1 text-accent">
                Active: {activePhase.title}
              </span>
            )}
          </div>
        )}

        {goal.phases.length > 0 && (
          <div className="mb-6 space-y-3">
            {goal.phases.map((phase, index) => (
              <PhaseCard
                key={phase.id}
                phase={phase}
                goal={goal}
                goalColor={goalColor}
                index={index}
                onCompletePhase={() => onCompletePhase(phase.id)}
              />
            ))}
          </div>
        )}

        {goal.phases.length === 0 && (
          <div className="mt-6 border-t border-border-soft py-10 text-center text-muted">
            <p className="mb-3 text-[14px]">No phases yet</p>
            <button
              onClick={onEdit}
              className="pressable inline-flex items-center gap-1.5 rounded-xl bg-accent px-4 py-2 text-[13px] font-semibold text-[#061B14] hover:bg-accent-soft"
            >
              <Plus size={14} /> Add Phases
            </button>
          </div>
        )}
      </div>
    </article>
  );
}