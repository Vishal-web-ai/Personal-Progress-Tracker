"use client";

import React, { useCallback, useState } from "react";
import {
  Plus,
  Trash2,
  Flag,
  Check,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Brain,
  Zap,
  BookOpen,
  Users,
  Award,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Field, Input, Textarea } from "@/components/ui/Form";
import { useApp } from "@/store/app-store";
import { useToast } from "@/store/toast-store";
import type { Goal, PhaseTaskStatus } from "@/types";
import { dayKeyFor } from "@/lib/time";

const GOAL_COLORS = [
  { value: "var(--note-mint-swatch)", name: "Mint", icon: Brain },
  { value: "var(--note-teal-swatch)", name: "Teal", icon: Zap },
  { value: "var(--note-tan-swatch)", name: "Tan", icon: BookOpen },
  { value: "var(--note-sand-swatch)", name: "Sand", icon: Users },
  { value: "var(--note-violet-swatch)", name: "Violet", icon: Award },
];

const STEPS = ["Goal", "Phases", "Tasks", "Review"] as const;

type DraftTask = {
  id: string;
  title: string;
  status: PhaseTaskStatus;
  isNew: boolean;
};

type DraftPhase = {
  id: string;
  title: string;
  description: string;
  startDate?: number;
  endDate?: number;
  tasks: DraftTask[];
};

const uid = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

const fmtShort = (v?: number) =>
  v ? new Date(v).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : null;

const fmtDateLabel = (p: DraftPhase) => {
  const start = fmtShort(p.startDate);
  const end = fmtShort(p.endDate);
  if (start && end) return `${start} – ${end}`;
  if (start) return `Starts ${start}`;
  if (end) return `Ends ${end}`;
  return null;
};

function IconButton({
  label,
  children,
  onClick,
  disabled,
  danger,
}: {
  label: string;
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "pressable flex h-7 w-7 items-center justify-center rounded-lg text-muted transition-colors",
        disabled && "opacity-30 pointer-events-none",
        danger ? "hover:bg-high/15 hover:text-high" : "hover:bg-surface-elevated hover:text-primary"
      )}
    >
      {children}
    </button>
  );
}

export function PhaseBuilderModal({
  open,
  onClose,
  editGoal,
}: {
  open: boolean;
  onClose: () => void;
  editGoal?: Goal | null;
}) {
  const { addGoal, updateGoal, addPhase, updatePhase, removePhase, addPhaseTask, updatePhaseTask, removePhaseTask } =
    useApp();
  const { toast } = useToast();

  const [step, setStep] = useState(1);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [color, setColor] = useState(GOAL_COLORS[0].value);
  const [phases, setPhases] = useState<DraftPhase[]>([]);
  const [taskDrafts, setTaskDrafts] = useState<Record<string, string>>({});

  React.useEffect(() => {
    if (!open) return;
    if (editGoal) {
      setTitle(editGoal.title);
      setDescription(editGoal.description || "");
      setTargetDate(editGoal.targetDate ? new Date(editGoal.targetDate).toISOString().split("T")[0] : "");
      setColor(editGoal.color || GOAL_COLORS[0].value);
      setPhases(
        editGoal.phases.map((p) => ({
          id: p.id,
          title: p.title,
          description: p.description || "",
          startDate: p.startDate,
          endDate: p.endDate,
          tasks: p.tasks.map((t) => ({ id: t.id, title: t.title, status: t.status, isNew: false })),
        }))
      );
    } else {
      setTitle("");
      setDescription("");
      setTargetDate("");
      setColor(GOAL_COLORS[0].value);
      setPhases([]);
    }
    setTaskDrafts({});
    setStep(1);
  }, [open, editGoal]);

  const addDraftPhase = useCallback(() => {
    setPhases((prev) => [...prev, { id: uid("ph"), title: "", description: "", tasks: [] }]);
  }, []);

  const updateDraftPhase = useCallback((id: string, patch: Partial<DraftPhase>) => {
    setPhases((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  }, []);

  const removeDraftPhase = useCallback((id: string) => {
    setPhases((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const movePhase = useCallback((index: number, dir: -1 | 1) => {
    setPhases((prev) => {
      const to = index + dir;
      if (to < 0 || to >= prev.length) return prev;
      const next = [...prev];
      const [moved] = next.splice(index, 1);
      next.splice(to, 0, moved);
      return next;
    });
  }, []);

  const addTask = useCallback(
    (phaseId: string) => {
      const text = (taskDrafts[phaseId] ?? "").trim();
      if (!text) return;
      setPhases((prev) =>
        prev.map((p) =>
          p.id === phaseId ? { ...p, tasks: [...p.tasks, { id: uid("pt"), title: text, status: "todo", isNew: true }] } : p
        )
      );
      setTaskDrafts((prev) => ({ ...prev, [phaseId]: "" }));
    },
    [taskDrafts]
  );

  const removeTask = useCallback((phaseId: string, taskId: string) => {
    setPhases((prev) => prev.map((p) => (p.id === phaseId ? { ...p, tasks: p.tasks.filter((t) => t.id !== taskId) } : p)));
  }, []);

  const toggleTask = useCallback((phaseId: string, taskId: string) => {
    setPhases((prev) =>
      prev.map((p) =>
        p.id === phaseId
          ? {
              ...p,
              tasks: p.tasks.map((t) =>
                t.id === taskId ? { ...t, status: t.status === "done" ? "todo" : "done" } : t
              ),
            }
          : p
      )
    );
  }, []);

  const canNext =
    step === 1 ? title.trim().length > 0 : step === 2 ? phases.some((p) => p.title.trim().length > 0) : true;

  const navBack = () => setStep((s) => Math.max(1, s - 1));
  const navNext = () => setStep((s) => Math.min(STEPS.length, s + 1));

  const handleSubmit = useCallback(() => {
    if (editGoal) {
      updateGoal(editGoal.id, {
        title: title.trim(),
        description: description.trim() || undefined,
        targetDate: targetDate ? new Date(targetDate).getTime() : undefined,
        color,
        status: "active",
      });
      phases.forEach((phase, index) => {
        const existing = editGoal.phases.find((p) => p.id === phase.id);
        if (existing) {
          updatePhase(editGoal.id, phase.id, {
            title: phase.title.trim(),
            description: phase.description.trim() || undefined,
            order: index,
            startDate: phase.startDate,
            endDate: phase.endDate,
          });
          const existingTasks = new Map(existing.tasks.map((t) => [t.id, t]));
          phase.tasks.forEach((t, ti) => {
            if (t.isNew) {
              addPhaseTask(phase.id, editGoal.id, { title: t.title.trim(), order: ti, isMilestone: false });
            } else {
              const orig = existingTasks.get(t.id);
              if (orig && orig.status !== t.status) {
                updatePhaseTask(phase.id, t.id, { status: t.status, completedAt: t.status === "done" ? Date.now() : undefined });
              }
            }
          });
          existing.tasks.forEach((ot) => {
            if (!phase.tasks.find((t) => t.id === ot.id)) removePhaseTask(phase.id, ot.id);
          });
        } else if (phase.title.trim()) {
          const pid = addPhase(editGoal.id, {
            title: phase.title.trim(),
            description: phase.description.trim() || undefined,
            order: index,
            status: "pending",
            startDate: phase.startDate,
            endDate: phase.endDate,
          });
          phase.tasks.forEach((t, ti) => {
            if (t.title.trim()) addPhaseTask(pid, editGoal.id, { title: t.title.trim(), order: ti, isMilestone: false });
          });
        }
      });
      editGoal.phases.forEach((p) => {
        if (!phases.find((ph) => ph.id === p.id)) removePhase(editGoal.id, p.id);
      });
      toast("Goal updated");
    } else {
      const goalId = addGoal({
        title: title.trim(),
        description: description.trim() || undefined,
        targetDate: targetDate ? new Date(targetDate).getTime() : undefined,
        color,
        status: "active",
      });
      phases.forEach((phase, index) => {
        if (phase.title.trim()) {
          const pid = addPhase(goalId, {
            title: phase.title.trim(),
            description: phase.description.trim() || undefined,
            order: index,
            status: "pending",
            startDate: phase.startDate,
            endDate: phase.endDate,
          });
          phase.tasks.forEach((t, ti) => {
            if (t.title.trim()) addPhaseTask(pid, goalId, { title: t.title.trim(), order: ti, isMilestone: false });
          });
        }
      });
      toast(`Goal created: ${title.trim()}`);
    }
    onClose();
  }, [
    title,
    description,
    targetDate,
    color,
    phases,
    editGoal,
    addGoal,
    updateGoal,
    addPhase,
    updatePhase,
    removePhase,
    addPhaseTask,
    updatePhaseTask,
    removePhaseTask,
    toast,
    onClose,
  ]);

  const stepIndicator = (
    <ol className="mb-6 -mx-1 flex items-center gap-1.5 overflow-x-auto px-1 pb-1">
      {STEPS.map((label, i) => {
        const num = i + 1;
        const done = num < step;
        const current = num === step;
        return (
          <li key={label} className="shrink-0">
            {done ? (
              <button
                type="button"
                onClick={() => setStep(num)}
                className="pressable inline-flex h-8 items-center gap-1.5 rounded-full bg-low/15 px-3 text-[12px] font-semibold text-low"
              >
                <Check size={12} strokeWidth={3} />
                <span className="hidden sm:inline">{label}</span>
              </button>
            ) : (
              <span
                className={cn(
                  "inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-[12px] font-semibold",
                  current ? "bg-accent text-[#061B14]" : "bg-surface-elevated text-muted"
                )}
              >
                <span className="tabular-nums">{num}</span>
                <span className="hidden sm:inline">{label}</span>
              </span>
            )}
          </li>
        );
      })}
    </ol>
  );

  const goalStep = (
    <section className="space-y-5">
      <div className="space-y-1">
        <h3 className="text-[17px] font-bold tracking-tight text-primary">Define the goal</h3>
        <p className="text-[13px] text-muted">Start broad — you'll break it into phases next.</p>
      </div>

      <Field label="Goal title">
        <Input
          autoFocus
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Launch my SaaS MVP"
        />
      </Field>

      <Field label="Description" hint="Optional — what success looks like.">
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Add context, motivation, or success criteria…"
          rows={3}
        />
      </Field>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <Field label="Target date" hint="Optional.">
          <Input type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} min={dayKeyFor()} />
        </Field>
        <div>
          <span className="mb-1.5 block text-[13px] font-medium text-secondary">Color theme</span>
          <div className="flex flex-wrap items-center gap-2">
            {GOAL_COLORS.map((c) => (
              <button
                key={c.value}
                type="button"
                onClick={() => setColor(c.value)}
                aria-pressed={color === c.value}
                aria-label={c.name}
                title={c.name}
                className={cn(
                  "pressable flex h-9 w-9 items-center justify-center rounded-full border-2 transition-colors",
                  color === c.value ? "border-accent ring-2 ring-accent/25" : "border-border hover:border-accent/40"
                )}
                style={{ backgroundColor: c.value }}
              >
                {color === c.value && <Check size={14} strokeWidth={3} className="text-[#061B14]" />}
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );

  const phasesStep = (
    <section className="space-y-4">
      <div className="space-y-1">
        <h3 className="text-[17px] font-bold tracking-tight text-primary">Plan the phases</h3>
        <p className="text-[13px] text-muted">Ordered steps toward the goal. Dates and details are optional.</p>
      </div>

      {phases.length === 0 && (
        <div className="rounded-[16px] border border-dashed border-border bg-surface-elevated/30 px-5 py-10 text-center">
          <Flag className="mx-auto mb-3 h-8 w-8 text-muted" />
          <p className="mb-1 text-[14px] font-semibold text-primary">No phases yet</p>
          <p className="mb-5 text-[12px] text-muted">Break the goal into clear, ordered steps.</p>
          <Button variant="primary" size="sm" onClick={addDraftPhase}>
            <Plus size={14} /> Add your first phase
          </Button>
        </div>
      )}

      {phases.map((phase, index) => (
        <div key={phase.id} className="space-y-3 rounded-[16px] border border-border bg-surface p-4">
          <div className="flex items-start gap-2">
            <span className="mt-1.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-surface-elevated text-[12px] font-semibold tabular-nums text-secondary">
              {index + 1}
            </span>
            <Input
              value={phase.title}
              onChange={(e) => updateDraftPhase(phase.id, { title: e.target.value })}
              placeholder={`Phase ${index + 1} name`}
              className="flex-1"
            />
            <div className="flex shrink-0 items-center gap-1">
              <IconButton label="Move phase up" onClick={() => movePhase(index, -1)} disabled={index === 0}>
                <ChevronUp size={15} />
              </IconButton>
              <IconButton
                label="Move phase down"
                onClick={() => movePhase(index, 1)}
                disabled={index === phases.length - 1}
              >
                <ChevronDown size={15} />
              </IconButton>
              <IconButton label="Delete phase" danger onClick={() => removeDraftPhase(phase.id)}>
                <Trash2 size={15} />
              </IconButton>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Start date">
              <Input
                type="date"
                value={phase.startDate ? new Date(phase.startDate).toISOString().split("T")[0] : ""}
                onChange={(e) =>
                  updateDraftPhase(phase.id, { startDate: e.target.value ? new Date(e.target.value).getTime() : undefined })
                }
              />
            </Field>
            <Field label="End date">
              <Input
                type="date"
                value={phase.endDate ? new Date(phase.endDate).toISOString().split("T")[0] : ""}
                onChange={(e) =>
                  updateDraftPhase(phase.id, { endDate: e.target.value ? new Date(e.target.value).getTime() : undefined })
                }
              />
            </Field>
          </div>

          <Textarea
            value={phase.description}
            onChange={(e) => updateDraftPhase(phase.id, { description: e.target.value })}
            placeholder="What happens in this phase? (optional)"
            rows={2}
          />

          <p className="text-right text-[12px] text-muted tabular-nums">
            {phase.tasks.length} task{phase.tasks.length === 1 ? "" : "s"} planned
          </p>
        </div>
      ))}

      {phases.length > 0 && (
        <button
          type="button"
          onClick={addDraftPhase}
          className="pressable flex w-full items-center justify-center gap-2 rounded-[14px] border border-dashed border-border bg-transparent px-4 py-3.5 text-[13px] font-medium text-secondary transition-colors hover:border-accent/40 hover:bg-accent/5 hover:text-primary"
        >
          <Plus size={15} /> Add another phase
        </button>
      )}
    </section>
  );

  const tasksStep = (
    <section className="space-y-4">
      <div className="space-y-1">
        <h3 className="text-[17px] font-bold tracking-tight text-primary">Add tasks</h3>
        <p className="text-[13px] text-muted">The concrete actions that make each phase happen.</p>
      </div>

      {phases.length === 0 && (
        <div className="rounded-[16px] border border-dashed border-border bg-surface-elevated/30 px-5 py-10 text-center">
          <p className="mb-5 text-[13px] text-muted">Add a phase first, then give it tasks.</p>
          <Button variant="secondary" size="md" onClick={navBack}>
            Back to phases
          </Button>
        </div>
      )}

      {phases.map((phase) => {
        const done = phase.tasks.filter((t) => t.status === "done").length;
        return (
          <div key={phase.id} className="rounded-[16px] border border-border-soft bg-surface-elevated/25 p-4">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h4 className="min-w-0 truncate text-[14px] font-semibold text-primary">
                {phase.title.trim() || "Untitled phase"}
              </h4>
              <span className="shrink-0 text-[12px] text-muted tabular-nums">
                {done}/{phase.tasks.length} done
              </span>
            </div>

            <ul className="space-y-2">
              {phase.tasks.map((task) => (
                <li key={task.id} className="flex items-center gap-2.5">
                  {task.isNew ? (
                    <span className="h-[18px] w-[18px] shrink-0 rounded-[6px] border-2 border-border" aria-hidden />
                  ) : (
                    <button
                      type="button"
                      aria-label={task.status === "done" ? "Mark incomplete" : "Mark done"}
                      onClick={() => toggleTask(phase.id, task.id)}
                      className={cn(
                        "pressable flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[6px] border-2 transition-colors",
                        task.status === "done"
                          ? "border-accent bg-accent"
                          : "border-border hover:border-accent/60"
                      )}
                    >
                      {task.status === "done" && <Check size={11} strokeWidth={3} className="text-[#061B14]" />}
                    </button>
                  )}
                  <span
                    className={cn(
                      "min-w-0 flex-1 truncate text-[14px]",
                      task.status === "done" ? "text-muted line-through" : "text-primary"
                    )}
                  >
                    {task.title}
                  </span>
                  <button
                    type="button"
                    aria-label="Remove task"
                    onClick={() => removeTask(phase.id, task.id)}
                    className="pressable flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-muted transition-colors hover:bg-high/15 hover:text-high"
                  >
                    <Trash2 size={13} />
                  </button>
                </li>
              ))}
              {phase.tasks.length === 0 && (
                <li className="rounded-[10px] border border-dashed border-border px-3 py-2.5 text-[12px] text-muted">
                  No tasks yet — add one below.
                </li>
              )}
            </ul>

            <form
              className="mt-3 flex items-center gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                addTask(phase.id);
              }}
            >
              <Input
                value={taskDrafts[phase.id] ?? ""}
                onChange={(e) => setTaskDrafts((prev) => ({ ...prev, [phase.id]: e.target.value }))}
                placeholder={`Add a task to "${phase.title.trim() || "this phase"}"…`}
                className="flex-1"
              />
              <Button type="submit" size="sm" disabled={!(taskDrafts[phase.id] ?? "").trim()}>
                <Plus size={14} /> Add
              </Button>
            </form>
          </div>
        );
      })}
    </section>
  );

  const reviewStep = (() => {
    const namedPhases = phases.filter((p) => p.title.trim().length > 0);
    const totalNamedTasks = namedPhases.reduce((n, p) => n + p.tasks.filter((t) => t.title.trim().length > 0).length, 0);
    return (
      <section className="space-y-4">
        <div className="space-y-1">
          <h3 className="text-[17px] font-bold tracking-tight text-primary">Review your plan</h3>
          <p className="text-[13px] text-muted">Everything below is saved when you confirm.</p>
        </div>

        <div className="rounded-[16px] border border-border bg-surface p-4">
          <div className="flex items-center gap-3">
            <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: color }} />
            <h4 className="min-w-0 truncate text-[15px] font-semibold text-primary">{title.trim()}</h4>
          </div>
          {description.trim() && <p className="mt-2 text-[13px] text-muted line-clamp-2">{description.trim()}</p>}
          <div className="mt-3 flex flex-wrap gap-2 text-[12px] text-muted">
            <span>
              {namedPhases.length} phase{namedPhases.length === 1 ? "" : "s"}
            </span>
            <span aria-hidden>·</span>
            <span className="tabular-nums">
              {totalNamedTasks} task{totalNamedTasks === 1 ? "" : "s"}
            </span>
            {targetDate && (
              <>
                <span aria-hidden>·</span>
                <span>Target {new Date(targetDate).toLocaleDateString()}</span>
              </>
            )}
          </div>
        </div>

        {namedPhases.length > 0 && (
          <ul className="space-y-2">
            {namedPhases.map((phase, i) => {
              const n = phase.tasks.filter((t) => t.title.trim().length > 0).length;
              const d = phase.tasks.filter((t) => t.title.trim().length > 0 && t.status === "done").length;
              const dates = fmtDateLabel(phase);
              return (
                <li
                  key={phase.id}
                  className="flex items-center gap-3 rounded-[14px] border border-border-soft bg-surface-elevated/25 px-4 py-3"
                >
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-surface-elevated text-[12px] font-semibold tabular-nums text-secondary">
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14px] font-medium text-primary">{phase.title.trim()}</p>
                    {dates && <p className="text-[12px] text-muted">{dates}</p>}
                  </div>
                  <span className="shrink-0 text-[12px] text-muted tabular-nums">
                    {d}/{n} tasks
                  </span>
                </li>
              );
            })}
          </ul>
        )}

        {namedPhases.length === 0 && (
          <p className="rounded-[12px] border border-dashed border-border px-4 py-3 text-[13px] text-muted">
            No phases yet — back up and add at least one.
          </p>
        )}
      </section>
    );
  })();

  const footer = (
    <div className="flex items-center justify-between gap-3">
      {step > 1 ? (
        <Button variant="secondary" onClick={navBack}>
          <ChevronLeft size={16} /> Back
        </Button>
      ) : (
        <span aria-hidden />
      )}
      {step < STEPS.length ? (
        <Button variant="primary" disabled={!canNext} onClick={navNext}>
          Next <ChevronRight size={16} />
        </Button>
      ) : (
        <Button variant="primary" onClick={handleSubmit}>
          {editGoal ? "Save Changes" : "Create Goal"}
        </Button>
      )}
    </div>
  );

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editGoal ? "Edit Goal" : "Create Goal"}
      className="max-w-lg"
      footer={footer}
    >
      <div>
        {stepIndicator}
        <div key={step} className="motion-page" aria-live="polite">
          {step === 1 && goalStep}
          {step === 2 && phasesStep}
          {step === 3 && tasksStep}
          {step === 4 && reviewStep}
        </div>
      </div>
    </Modal>
  );
}