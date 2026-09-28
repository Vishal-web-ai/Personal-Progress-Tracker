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
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Field, Input, Textarea } from "@/components/ui/Form";
import { DateField } from "@/components/ui/DateField";
import { TaskIcon, ICON_OPTIONS } from "@/components/ui/TaskIcon";
import { useApp } from "@/store/app-store";
import { useToast } from "@/store/toast-store";
import type { Goal, PhaseTaskStatus } from "@/types";
import { startOfDay } from "@/lib/time";

const TODAY_TS = startOfDay(new Date());

const GOAL_COLORS = [
  { value: "var(--note-mint-swatch)", name: "Mint", icon: Brain },
  { value: "var(--note-teal-swatch)", name: "Teal", icon: Zap },
  { value: "var(--note-tan-swatch)", name: "Tan", icon: BookOpen },
  { value: "var(--note-sand-swatch)", name: "Sand", icon: Users },
  { value: "var(--note-violet-swatch)", name: "Violet", icon: Award },
];

const STEPS = ["Goal", "Phases", "Review"] as const;

const DEFAULT_GOAL_ICON = "target";

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
  color?: string;
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
  const [targetDate, setTargetDate] = useState<number | undefined>(undefined);
  const [color, setColor] = useState(GOAL_COLORS[0].value);
  const [icon, setIcon] = useState(DEFAULT_GOAL_ICON);
  const [phases, setPhases] = useState<DraftPhase[]>([]);
  const [taskDrafts, setTaskDrafts] = useState<Record<string, string>>({});

  React.useEffect(() => {
    if (!open) return;
    if (editGoal) {
      setTitle(editGoal.title);
      setDescription(editGoal.description || "");
      setTargetDate(editGoal.targetDate ?? undefined);
      setColor(editGoal.color || GOAL_COLORS[0].value);
      setIcon(editGoal.icon || DEFAULT_GOAL_ICON);
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
      setTargetDate(undefined);
      setColor(GOAL_COLORS[0].value);
      setIcon(DEFAULT_GOAL_ICON);
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

  const addDraftTask = useCallback(
    (phaseId: string) => {
      const title = (taskDrafts[phaseId] ?? "").trim();
      if (!title) return;
      setPhases((prev) =>
        prev.map((p) =>
          p.id === phaseId
            ? { ...p, tasks: [...p.tasks, { id: uid("pt"), title, status: "todo", isNew: true }] }
            : p
        )
      );
      setTaskDrafts((prev) => ({ ...prev, [phaseId]: "" }));
    },
    [taskDrafts]
  );

  const removeDraftTask = useCallback((phaseId: string, taskId: string) => {
    setPhases((prev) =>
      prev.map((p) => (p.id === phaseId ? { ...p, tasks: p.tasks.filter((t) => t.id !== taskId) } : p))
    );
  }, []);

  const toggleDraftTask = useCallback((phaseId: string, taskId: string) => {
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
        targetDate: targetDate ?? undefined,
        color,
        icon,
        status: "active",
      });
      phases.forEach((phase, index) => {
        const existing = editGoal.phases.find((p) => p.id === phase.id);
        if (existing) {
          updatePhase(editGoal.id, phase.id, {
            title: phase.title.trim(),
            description: phase.description.trim() || undefined,
            order: index,
            color: phase.color,
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
            color: phase.color,
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
        targetDate: targetDate ?? undefined,
        color,
        icon,
        status: "active",
      });
      phases.forEach((phase, index) => {
        if (phase.title.trim()) {
          const pid = addPhase(goalId, {
            title: phase.title.trim(),
            description: phase.description.trim() || undefined,
            order: index,
            status: "pending",
            color: phase.color,
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
      </div>

      <Field label="Goal title">
        <Input
          autoFocus
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Launch my SaaS MVP"
        />
      </Field>

      <Field label="Description">
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Add context, motivation, or success criteria…"
          rows={3}
        />
      </Field>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <Field label="Target date">
          <DateField value={targetDate} onChange={setTargetDate} min={TODAY_TS} />
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
        <div>
          <span className="mb-1.5 block text-[13px] font-medium text-secondary">Icon</span>
          <div className="grid grid-cols-6 gap-2 sm:grid-cols-9">
            {ICON_OPTIONS.map((o) => {
              const selected = icon === o.value;
              return (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => setIcon(o.value)}
                  aria-pressed={selected}
                  aria-label={o.label}
                  title={o.label}
                  className={cn(
                    "pressable flex h-10 items-center justify-center rounded-[12px] border transition-colors",
                    selected
                      ? "border-accent/60 bg-accent/10 text-accent"
                      : "border-border bg-surface-elevated text-secondary hover:border-accent/40 hover:bg-surface-soft"
                  )}
                >
                  <TaskIcon name={o.value} size={18} />
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );

  const phasesStep = (
    <section className="space-y-4">
      <div className="space-y-1">
        <h3 className="text-[17px] font-bold tracking-tight text-primary">Plan the phases</h3>
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
              <DateField
                value={phase.startDate}
                onChange={(v) => updateDraftPhase(phase.id, { startDate: v })}
                min={TODAY_TS}
                max={phase.endDate}
              />
            </Field>
            <Field label="End date">
              <DateField
                value={phase.endDate}
                onChange={(v) => updateDraftPhase(phase.id, { endDate: v })}
                min={phase.startDate ?? TODAY_TS}
              />
            </Field>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[12px] text-secondary">Color</span>
            <div className="flex flex-wrap items-center gap-2">
              {GOAL_COLORS.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => updateDraftPhase(phase.id, { color: phase.color === c.value ? undefined : c.value })}
                  aria-label={c.name}
                  aria-pressed={phase.color === c.value}
                  title={c.name}
                  className={cn(
                    "pressable flex h-6 w-6 items-center justify-center rounded-full border-2 transition-colors",
                    phase.color === c.value ? "border-accent ring-2 ring-accent/25" : "border-border hover:border-accent/40"
                  )}
                  style={{ backgroundColor: c.value }}
                >
                  {phase.color === c.value && <Check size={11} strokeWidth={3} className="text-[#061B14]" />}
                </button>
              ))}
            </div>
            {phase.color && (
              <button
                type="button"
                onClick={() => updateDraftPhase(phase.id, { color: undefined })}
                className="pressable ml-auto text-[12px] text-muted transition-colors hover:text-primary"
              >
                Reset
              </button>
            )}
          </div>

          <Textarea
            value={phase.description}
            onChange={(e) => updateDraftPhase(phase.id, { description: e.target.value })}
            placeholder="What happens in this phase? (optional)"
            rows={2}
          />

          <div className="space-y-2 border-t border-border-soft pt-3">
            <div className="flex items-center justify-between">
              <span className="text-[12px] font-semibold text-secondary">Tasks</span>
              <span className="text-[12px] tabular-nums text-muted">
                {phase.tasks.length} planned
              </span>
            </div>

            {phase.tasks.length > 0 && (
              <ul className="space-y-0.5">
                {phase.tasks.map((t) => (
                  <li key={t.id} className="flex items-center gap-2 rounded-[10px] py-1 pl-1 pr-0.5">
                    <button
                      type="button"
                      onClick={() => toggleDraftTask(phase.id, t.id)}
                      aria-label={t.status === "done" ? `Mark "${t.title}" not planned` : `Mark "${t.title}" done`}
                      aria-pressed={t.status === "done"}
                      className={cn(
                        "flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50",
                        t.status === "done" ? "border-accent bg-accent text-[#061B14]" : "border-border"
                      )}
                    >
                      {t.status === "done" && <Check size={11} strokeWidth={3} />}
                    </button>
                    <span
                      className={cn(
                        "min-w-0 flex-1 truncate text-[13px]",
                        t.status === "done" ? "text-muted line-through" : "text-primary"
                      )}
                    >
                      {t.title}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeDraftTask(phase.id, t.id)}
                      aria-label={`Remove ${t.title}`}
                      className="pressable flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-muted transition-colors hover:bg-high/10 hover:text-high focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
                    >
                      <X size={14} />
                    </button>
                  </li>
                ))}
              </ul>
            )}

            <div className="flex items-center gap-2">
              <Input
                value={taskDrafts[phase.id] ?? ""}
                onChange={(e) =>
                  setTaskDrafts((prev) => ({ ...prev, [phase.id]: e.target.value }))
                }
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addDraftTask(phase.id);
                  }
                }}
                placeholder="Add a task"
                aria-label={`New task for ${phase.title || `phase ${index + 1}`}`}
              />
              <Button
                variant="secondary"
                size="sm"
                onClick={() => addDraftTask(phase.id)}
                disabled={!(taskDrafts[phase.id] ?? "").trim()}
              >
                <Plus size={14} /> Add
              </Button>
            </div>
          </div>
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

  const reviewStep = (() => {
    const namedPhases = phases.filter((p) => p.title.trim().length > 0);
    const totalNamedTasks = namedPhases.reduce((n, p) => n + p.tasks.filter((t) => t.title.trim().length > 0).length, 0);
    return (
      <section className="space-y-4">
        <div className="space-y-1">
          <h3 className="text-[17px] font-bold tracking-tight text-primary">Review your plan</h3>
        </div>

        <div className="rounded-[16px] border border-border bg-surface p-4">
          <div className="flex items-center gap-3">
            <span
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px]"
              style={{
                backgroundColor: `color-mix(in srgb, ${color} 16%, var(--surface))`,
                color,
              }}
            >
              <TaskIcon name={icon} size={16} />
            </span>
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
              const namedTasks = phase.tasks.filter((t) => t.title.trim().length > 0);
              const n = namedTasks.length;
              const d = namedTasks.filter((t) => t.status === "done").length;
              const dates = fmtDateLabel(phase);
              return (
                <li
                  key={phase.id}
                  className="rounded-[14px] border border-border-soft bg-surface-elevated/25 px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-surface-elevated text-[12px] font-semibold tabular-nums text-secondary">
                      {i + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[14px] font-medium text-primary">{phase.title.trim()}</p>
                      {dates && <p className="text-[12px] text-muted">{dates}</p>}
                    </div>
                    {n > 0 && (
                      <span className="shrink-0 text-[12px] text-muted tabular-nums">
                        {d}/{n} tasks
                      </span>
                    )}
                  </div>

                  {n > 0 && (
                    <ul className="mt-2 space-y-0.5 border-t border-border-soft pl-9 pt-2">
                      {namedTasks.map((t) => (
                        <li key={t.id} className="flex items-center gap-2 text-[12px]">
                          {t.status === "done" ? (
                            <Check size={12} className="flex-shrink-0 text-accent" />
                          ) : (
                            <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-border" aria-hidden />
                          )}
                          <span
                            className={cn(
                              "min-w-0 flex-1 truncate",
                              t.status === "done" ? "text-muted line-through" : "text-secondary"
                            )}
                          >
                            {t.title}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
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
          {step === 3 && reviewStep}
        </div>
      </div>
    </Modal>
  );
}
