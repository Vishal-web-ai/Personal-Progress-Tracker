"use client";

import { ChevronRight, Flag, Clock, TrendingUp, MoreHorizontal, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { ProgressRing } from "@/components/ui/ProgressRing";
import { Goal, Phase, PhaseStatus } from "@/types";

function formatPhaseDates(phase: Phase): string | null {
  const fmt = (v?: number) => (v ? new Date(v).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : null);
  const start = fmt(phase.startDate);
  const end = fmt(phase.endDate);
  if (start && end) return `${start} – ${end}`;
  if (start) return `Starts ${start}`;
  if (end) return `Ends ${end}`;
  return null;
}

const STATUS_DOTS: Record<PhaseStatus, string> = {
  pending: "var(--text-muted)",
  active: "var(--accent)",
  completed: "var(--color-low)",
};

interface PhaseCardProps {
  phase: Phase;
  goalColor: string;
  onOpen: () => void;
}

export function PhaseCard({ phase, goalColor, onOpen }: PhaseCardProps) {
  const totalTasks = phase.tasks.length;
  const completedTasks = phase.tasks.filter((t) => t.status === "done").length;
  const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  const phaseDates = formatPhaseDates(phase);

  const isBlocked = phase.dependsOn && phase.dependsOn.length > 0;
  const milestoneCount = phase.tasks.filter((t) => t.isMilestone).length;

  return (
    <button
      onClick={onOpen}
      aria-label={`Open ${phase.title}`}
      className={cn(
        "group flex w-full flex-col items-start gap-3 rounded-[18px] border p-5 text-left transition-all duration-200",
        "hover:bg-surface-elevated hover:border-border",
        phase.status === "completed" && "opacity-70"
      )}
      style={{ borderColor: `color-mix(in srgb, ${goalColor} 30%, var(--border))` }}
    >
      <div className="flex w-full items-start justify-between gap-3">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <div
            className="mt-0.5 h-3 w-3 flex-shrink-0 rounded-full"
            style={{ backgroundColor: STATUS_DOTS[phase.status] }}
            aria-hidden
          />
          <div className="min-w-0">
            <h4 className="truncate text-[15px] font-semibold text-primary">{phase.title}</h4>
            <div className="mt-1 flex items-center gap-2 text-[12px] text-muted">
              <span className="tabular-nums">
                {completedTasks}/{totalTasks} tasks
              </span>
              {phaseDates && (
                <>
                  <span aria-hidden>·</span>
                  <span>{phaseDates}</span>
                </>
              )}
              {phase.estimatedMinutes && (
                <>
                  <span aria-hidden>·</span>
                  <span className="flex items-center gap-1">
                    <Clock size={12} />
                    {Math.round(phase.estimatedMinutes / 60)}h {phase.estimatedMinutes % 60}m est.
                  </span>
                </>
              )}
              {phase.actualMinutes && phase.actualMinutes > 0 && (
                <>
                  <span aria-hidden>·</span>
                  <span className="flex items-center gap-1 text-accent">
                    <TrendingUp size={12} />
                    {Math.round(phase.actualMinutes / 60)}h {phase.actualMinutes % 60}m actual
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
        <div className="flex flex-shrink-0 items-center gap-2">
          {isBlocked && <Flag className="h-4 w-4 text-amber-400" />}
          {milestoneCount > 0 && (
            <span className="flex items-center gap-1 rounded-full bg-amber-400/10 px-2 py-0.5 text-[11px] font-medium text-amber-400">
              <Flag size={10} />
              {milestoneCount}
            </span>
          )}
          <ChevronRight className="h-4 w-4 text-muted transition-colors group-hover:text-accent" />
        </div>
      </div>

      <div className="mt-1 w-full">
        <div className="mb-1.5 flex items-center justify-between text-[11px] text-muted">
          <span className="tabular-nums">{progress}% complete</span>
          <span className="text-accent">Tap to edit</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-surface-elevated">
          <div
            className="h-full rounded-full transition-all duration-500 ease-out"
            style={{ width: `${progress}%`, backgroundColor: goalColor }}
          />
        </div>
      </div>
    </button>
  );
}

interface GoalCardProps {
  goal: Goal;
  onEdit: () => void;
  onPhaseOpen: (phaseId: string) => void;
}

const GOAL_COLORS = [
  "var(--note-mint-swatch)",
  "var(--note-teal-swatch)",
  "var(--note-tan-swatch)",
  "var(--note-sand-swatch)",
  "var(--note-violet-swatch)",
];

export function GoalCard({ goal, onEdit, onPhaseOpen }: GoalCardProps) {
  const goalColor = goal.color || GOAL_COLORS[0];

  const totalTasks = goal.phases.reduce((sum, p) => sum + p.tasks.length, 0);
  const completedTasks = goal.phases.reduce((sum, p) => sum + p.tasks.filter((t) => t.status === "done").length, 0);
  const activePhase = goal.phases.find((p) => p.status === "active");
  const nextPhase = goal.phases.find(
    (p) =>
      p.status === "pending" &&
      (!p.dependsOn ||
        p.dependsOn.length === 0 ||
        p.dependsOn.every((d) => goal.phases.find((dp) => dp.id === d)?.status === "completed"))
  );

  return (
    <article className="overflow-hidden rounded-[22px] border border-border bg-surface">
      <div className="p-6">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <div
              className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl"
              style={{ backgroundColor: `${goalColor}20` }}
            >
              <div className="h-5 w-5 rounded-full" style={{ backgroundColor: goalColor }} />
            </div>
            <div className="min-w-0">
              <h3 className="truncate text-[18px] font-bold tracking-tight text-primary">{goal.title}</h3>
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

        <div className="mb-6 flex flex-wrap items-center gap-2 text-[12px] text-muted">
          <span className="flex items-center gap-1.5 rounded-full bg-surface-elevated px-2.5 py-1">
            <span className="font-medium text-primary">{goal.progress}%</span> complete
          </span>
          {goal.targetDate && (
            <span className="rounded-full bg-surface-elevated px-2.5 py-1">
              Target: {new Date(goal.targetDate).toLocaleDateString()}
            </span>
          )}
          {activePhase && (
            <span className="flex items-center gap-1.5 rounded-full bg-accent/10 px-2.5 py-1 text-accent">
              Active: {activePhase.title}
            </span>
          )}
          {nextPhase && !activePhase && (
            <span className="flex items-center gap-1.5 rounded-full bg-surface-elevated px-2.5 py-1 text-secondary">
              Next: {nextPhase.title}
            </span>
          )}
          {totalTasks > 0 && (
            <span className="flex items-center gap-1.5 rounded-full bg-surface-elevated px-2.5 py-1">
              {completedTasks}/{totalTasks} tasks
            </span>
          )}
        </div>

        {goal.phases.length > 0 && (
          <div className="mb-6 space-y-3">
            {goal.phases.map((phase) => (
              <PhaseCard key={phase.id} phase={phase} goalColor={goalColor} onOpen={() => onPhaseOpen(phase.id)} />
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

        <div className="mt-6 flex items-center justify-end gap-2 border-t border-border-soft pt-4">
          <button
            onClick={onEdit}
            className="pressable rounded-xl p-2 text-muted hover:bg-surface-elevated hover:text-primary"
            aria-label="Edit goal"
          >
            <MoreHorizontal size={18} />
          </button>
        </div>
      </div>
    </article>
  );
}