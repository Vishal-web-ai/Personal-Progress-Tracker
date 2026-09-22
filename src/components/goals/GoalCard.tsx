"use client";

import React from "react";
import { ChevronRight, Flag, Clock, TrendingUp, MoreHorizontal, Play, Pause, Check, Plus, Calendar, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { ProgressRing } from "@/components/ui/ProgressRing";
import { Goal, Phase, PhaseStatus, PhaseTask } from "@/types";

interface PhaseProgressBarProps {
  phase: Phase;
  goalColor: string;
  onClick: () => void;
  isActive: boolean;
}

export function PhaseProgressBar({ phase, goalColor, onClick, isActive }: PhaseProgressBarProps) {
  const totalTasks = phase.tasks.length;
  const completedTasks = phase.tasks.filter((t) => t.status === "done").length;
  const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  
  const isBlocked = phase.dependsOn && phase.dependsOn.length > 0;
  const hasMilestones = phase.tasks.some((t) => t.isMilestone);
  const milestoneCount = phase.tasks.filter((t) => t.isMilestone).length;

  const statusColors: Record<PhaseStatus, string> = {
    pending: "var(--text-muted)",
    active: "var(--accent)",
    completed: "var(--color-low)",
  };

  return (
    <button
      onClick={onClick}
      className={cn(
        "relative w-full group flex flex-col items-start gap-3 p-5 rounded-[18px] border transition-all duration-200",
        "hover:bg-surface-elevated hover:border-border",
        isActive && "bg-surface-elevated border-accent/30 ring-1 ring-accent/20",
        phase.status === "completed" && "opacity-70"
      )}
      style={{ borderColor: `color-mix(in srgb, ${goalColor} 30%, var(--border))` }}
    >
      <div className="flex w-full items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div 
            className="flex-shrink-0 h-3 w-3 rounded-full mt-0.5"
            style={{ backgroundColor: statusColors[phase.status] }}
          />
          <div className="min-w-0">
            <h4 className="text-[15px] font-semibold text-primary truncate">{phase.title}</h4>
            <div className="flex items-center gap-2 mt-1 text-[12px] text-muted">
              <span className="tabular-nums">{completedTasks}/{totalTasks} tasks</span>
              {phase.estimatedMinutes && (
                <>
                  <span>·</span>
                  <span className="flex items-center gap-1">
                    <Clock size={12} />
                    {Math.round(phase.estimatedMinutes / 60)}h {phase.estimatedMinutes % 60}m est.
                  </span>
                </>
              )}
              {phase.actualMinutes && phase.actualMinutes > 0 && (
                <>
                  <span>·</span>
                  <span className="flex items-center gap-1 text-accent">
                    <TrendingUp size={12} />
                    {Math.round(phase.actualMinutes / 60)}h {phase.actualMinutes % 60}m actual
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {isBlocked && (
            <Flag className="h-4 w-4 text-amber-400" />
          )}
          {hasMilestones && (
            <span className="flex items-center gap-1 text-[11px] font-medium text-amber-400 px-2 py-0.5 rounded-full bg-amber-400/10">
              <Flag size={10} />
              {milestoneCount}
            </span>
          )}
          <ChevronRight className="h-4 w-4 text-muted group-hover:text-accent transition-colors" />
        </div>
      </div>
      
      <div className="w-full mt-1">
        <div className="flex items-center justify-between text-[11px] text-muted mb-1.5">
          <span>{progress}% complete</span>
          {phase.status === "pending" && !isBlocked && (
            <span className="text-accent text-[11px] font-medium">Click to expand</span>
          )}
        </div>
        <div className="h-2 rounded-full bg-surface-elevated overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500 ease-out"
            style={{
              width: `${progress}%`,
              backgroundColor: goalColor,
            }}
          />
        </div>
      </div>

      {phase.status === "active" && (
        <div className="w-full mt-2 flex items-center justify-center gap-2">
          <button className="pressable flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-accent/10 text-accent text-[12px] font-medium hover:bg-accent/20">
            <Pause size={12} />
            Active
          </button>
        </div>
      )}

      {phase.status === "pending" && !isBlocked && (
        <div className="w-full mt-2">
          <button className="pressable w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-accent text-[#061B14] text-[13px] font-semibold hover:bg-accent-soft">
            <Play size={14} />
            Start Phase
          </button>
        </div>
      )}

      {phase.status === "completed" && (
        <div className="w-full mt-2 text-center text-[12px] text-low">
          ✓ Phase completed
        </div>
      )}
    </button>
  );
}

interface ExpandablePhaseProps {
  phase: Phase;
  goal: Goal;
  goalColor: string;
  isExpanded: boolean;
  onToggle: () => void;
  onStartPhase: () => void;
  onCompletePhase: () => void;
  onAddTask: () => void;
  onTaskClick: (taskId: string) => void;
  onToggleTask: (taskId: string) => void;
}

export function ExpandablePhase({
  phase,
  goal,
  goalColor,
  isExpanded,
  onToggle,
  onStartPhase,
  onCompletePhase,
  onAddTask,
  onTaskClick,
  onToggleTask,
}: ExpandablePhaseProps) {
  const totalTasks = phase.tasks.length;
  const completedTasks = phase.tasks.filter((t) => t.status === "done").length;
  const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  
  const isBlocked = phase.dependsOn && phase.dependsOn.length > 0;
  const blockingPhases = goal.phases.filter((p) => p.dependsOn?.includes(phase.id));
  
  const statusColors: Record<PhaseStatus, string> = {
    pending: "var(--text-muted)",
    active: "var(--accent)",
    completed: "var(--color-low)",
  };

  const canStart = phase.status === "pending" && !isBlocked;
  const canComplete = phase.status === "active" && progress === 100;

  return (
    <div className="rounded-[18px] border border-border bg-surface overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between gap-4 p-5"
        style={{ borderColor: `color-mix(in srgb, ${goalColor} 30%, var(--border))` }}
      >
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div 
            className="flex-shrink-0 h-3 w-3 rounded-full mt-0.5"
            style={{ backgroundColor: statusColors[phase.status] }}
          />
          <div className="min-w-0">
            <h4 className="text-[15px] font-semibold text-primary truncate">{phase.title}</h4>
            <div className="flex items-center gap-2 mt-1 text-[12px] text-muted">
              <span className="tabular-nums">{completedTasks}/{totalTasks} tasks</span>
              {phase.estimatedMinutes && (
                <>
                  <span>·</span>
                  <span className="flex items-center gap-1">
                    <Clock size={12} />
                    {Math.round(phase.estimatedMinutes / 60)}h {phase.estimatedMinutes % 60}m
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
       
        <div className="flex items-center gap-3 flex-shrink-0">
          <div className="hidden sm:flex items-center gap-2 text-[12px] tabular-nums text-muted min-w-[60px] text-right">
            {progress}%
          </div>
          <ChevronRight
            className={cn(
              "h-5 w-5 text-muted transition-transform duration-200 flex-shrink-0",
              isExpanded && "rotate-90"
            )}
          />
        </div>
      </button>

      <div className="accordion-content">
        <div className="accordion-inner p-5 pt-0 space-y-4">
          {/* Phase Actions */}
          <div className="flex flex-wrap gap-2">
            {canStart && (
              <button
                onClick={onStartPhase}
                className="pressable flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-accent text-[#061B14] text-[12px] font-medium hover:bg-accent-soft"
              >
                <Play size={12} /> Start Phase
              </button>
            )}
            {phase.status === "active" && !canComplete && (
              <button
                onClick={onCompletePhase}
                className="pressable flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-accent/10 text-accent text-[12px] font-medium hover:bg-accent/20"
              >
                <Check size={12} /> Mark Complete
              </button>
            )}
            {phase.status === "active" && canComplete && (
              <button
                onClick={onCompletePhase}
                className="pressable flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-accent text-[#061B14] text-[12px] font-medium hover:bg-accent-soft"
              >
                <Check size={12} /> Complete Phase
              </button>
            )}
            {phase.status === "completed" && (
              <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-low/10 text-low text-[12px] font-medium">
                <Check size={12} className="text-low" /> Completed
              </span>
            )}
            {isBlocked && (
              <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-400/10 text-amber-400 text-[12px] font-medium">
                <Flag size={12} /> Waiting on {phase.dependsOn?.length} phase{phase.dependsOn && phase.dependsOn.length > 1 ? "s" : ""}
              </span>
            )}
            <button
              onClick={onAddTask}
              className="pressable flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border bg-surface-elevated text-secondary hover:bg-surface-soft hover:text-primary"
            >
              <Plus size={12} /> Add Task
            </button>
          </div>

          {/* Dependencies Info */}
          {(isBlocked || blockingPhases.length > 0) && (
            <div className="rounded-[12px] bg-surface-elevated/50 p-4 border border-border-soft">
              <div className="flex items-center gap-2 text-[12px] text-muted mb-3">
                <Flag size={14} className="text-amber-400" />
                <span className="font-medium text-primary">Phase Dependencies</span>
              </div>
              {isBlocked && (
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {phase.dependsOn?.map((depId) => {
                    const depPhase = goal.phases.find((p) => p.id === depId);
                    return depPhase ? (
                      <span
                        key={depId}
                        className={cn(
                          "px-2 py-0.5 rounded-full text-[11px] font-medium",
                          depPhase.status === "completed"
                            ? "bg-low/10 text-low"
                            : "bg-amber-400/10 text-amber-400"
                        )}
                      >
                        {depPhase.title} {depPhase.status === "completed" ? "✓" : "⏳"}
                      </span>
                    ) : null;
                  })}
                </div>
              )}
              {blockingPhases.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  <span className="text-[11px] text-muted">Unlocks: </span>
                  {blockingPhases.map((p) => (
                    <span
                      key={p.id}
                      className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-accent/10 text-accent"
                    >
                      {p.title}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Time Variance */}
          {phase.estimatedMinutes && phase.actualMinutes && phase.actualMinutes > 0 && (
            <div className="rounded-[12px] bg-surface-elevated/50 p-4 border border-border-soft">
              <div className="flex items-center justify-between text-[12px]">
                <span className="text-muted">Time Variance</span>
                <span
                  className={cn(
                    "font-medium tabular-nums",
                    phase.actualMinutes > phase.estimatedMinutes ? "text-high" : "text-low"
                  )}
                >
                  {phase.actualMinutes > phase.estimatedMinutes ? "+" : ""}
                  {Math.round(((phase.actualMinutes - phase.estimatedMinutes) / phase.estimatedMinutes) * 100)}%
                </span>
              </div>
              <div className="mt-2 flex items-center gap-2 text-[11px]">
                <span className="flex items-center gap-1 text-muted">
                  <Clock size={11} /> Est: {Math.round(phase.estimatedMinutes / 60)}h {phase.estimatedMinutes % 60}m
                </span>
                <span className="flex items-center gap-1 text-accent">
                  <TrendingUp size={11} /> Actual: {Math.round(phase.actualMinutes / 60)}h {phase.actualMinutes % 60}m
                </span>
              </div>
            </div>
          )}

          {/* Tasks List */}
          {phase.tasks.length > 0 && (
            <div className="space-y-2">
              {phase.tasks.map((task) => (
                <PhaseTaskRow
                  key={task.id}
                  task={task}
                  goalColor={goalColor}
                  onClick={() => onTaskClick(task.id)}
                  onToggle={() => onToggleTask(task.id)}
                />
              ))}
            </div>
          )}

          {phase.tasks.length === 0 && (
            <div className="text-center py-8 text-muted">
              <p className="text-[13px] mb-3">No tasks in this phase yet</p>
              <button
                onClick={onAddTask}
                className="pressable inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-accent text-[12px] font-medium hover:bg-accent/10"
              >
                <Plus size={12} /> Add your first task
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface PhaseTaskRowProps {
  task: PhaseTask;
  goalColor: string;
  onClick: () => void;
  onToggle: () => void;
}

function PhaseTaskRow({ task, goalColor, onClick, onToggle }: PhaseTaskRowProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 p-4 rounded-[12px] border transition-colors",
        "hover:bg-surface-elevated hover:border-border",
        task.status === "done" && "opacity-60"
      )}
      style={{ borderColor: `color-mix(in srgb, ${goalColor} 20%, var(--border))` }}
    >
      <button
        onClick={(e) => { e.stopPropagation(); onToggle(); }}
        className={cn(
          "flex-shrink-0 flex h-5 w-5 items-center justify-center rounded border-2 transition-colors",
          task.status === "done"
            ? `bg-${goalColor.replace("#", "")} border-${goalColor.replace("#", "")} text-[#061B14]`
            : "border-border text-muted hover:border-accent/50 hover:text-accent"
        )}
        aria-label={task.status === "done" ? "Mark incomplete" : "Mark complete"}
      >
        {task.status === "done" && <Check size={10} strokeWidth={3} />}
      </button>
      
      <div className="flex-1 min-w-0 text-left">
        <div className="flex items-center gap-2">
          <h5 className={cn(
            "text-[14px] font-medium truncate",
            task.status === "done" ? "text-muted line-through" : "text-primary"
          )}>
            {task.title}
          </h5>
          {task.isMilestone && (
            <Flag className="h-3.5 w-3.5 text-amber-400 flex-shrink-0" />
          )}
        </div>
        {task.description && (
          <p className="mt-1 text-[12px] text-muted line-clamp-1">{task.description}</p>
        )}
      </div>
      
      <div className="flex items-center gap-2 text-[11px] text-muted flex-shrink-0">
        {task.estimatedMinutes && (
          <span className="flex items-center gap-1">
            <Clock size={11} />
            {Math.round(task.estimatedMinutes / 60)}h {task.estimatedMinutes % 60}m
          </span>
        )}
        {task.actualMinutes && task.actualMinutes > 0 && (
          <span className="flex items-center gap-1 text-accent">
            <TrendingUp size={11} />
            {Math.round(task.actualMinutes / 60)}h {task.actualMinutes % 60}m
          </span>
        )}
        {task.dueDate && (
          <span className="flex items-center gap-1">
            <Calendar size={11} />
            {new Date(task.dueDate).toLocaleDateString()}
          </span>
        )}
      </div>
    </button>
  );
}


interface GoalCardProps {
  goal: Goal;
  onClick: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onStartPhase: (phaseId: string) => void;
  onCompletePhase: (phaseId: string) => void;
  onAddTask: (phaseId: string) => void;
  onTaskClick: (phaseId: string, taskId: string) => void;
  onToggleTask: (phaseId: string, taskId: string) => void;
}

const GOAL_COLORS = [
  "var(--note-mint-swatch)",
  "var(--note-teal-swatch)",
  "var(--note-tan-swatch)",
  "var(--note-sand-swatch)",
  "var(--note-violet-swatch)",
];

export function GoalCard({
  goal,
  onClick,
  onEdit,
  onDelete,
  onStartPhase,
  onCompletePhase,
  onAddTask,
  onTaskClick,
  onToggleTask,
}: GoalCardProps) {
  const [expandedPhases, setExpandedPhases] = React.useState<Set<string>>(new Set());
  const goalColor = goal.color || GOAL_COLORS[0];

  const totalTasks = goal.phases.reduce((sum, p) => sum + p.tasks.length, 0);
  const completedTasks = goal.phases.reduce((sum, p) => sum + p.tasks.filter((t) => t.status === "done").length, 0);
  const activePhase = goal.phases.find((p) => p.status === "active");
  const nextPhase = goal.phases.find((p) => p.status === "pending" && (!p.dependsOn || p.dependsOn.length === 0 || p.dependsOn.every((d) => goal.phases.find((dp) => dp.id === d)?.status === "completed")));

  const togglePhase = (phaseId: string) => {
    setExpandedPhases((prev) => {
      const next = new Set(prev);
      if (next.has(phaseId)) next.delete(phaseId);
      else next.add(phaseId);
      return next;
    });
  };

  return (
    <article className="rounded-[22px] border border-border bg-surface overflow-hidden">
      <div className="p-6 sm:p-6">
        <div className="flex items-start justify-between gap-4 mb-6">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div
              className="flex-shrink-0 h-10 w-10 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: `${goalColor}20` }}
            >
              <div className="h-5 w-5 rounded-full" style={{ backgroundColor: goalColor }} />
            </div>
            <div className="min-w-0">
              <h3 className="text-[18px] font-bold tracking-tight text-primary truncate">{goal.title}</h3>
              {goal.description && (
                <p className="mt-0.5 text-[13px] text-muted line-clamp-1">{goal.description}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
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

        {/* Meta row */}
        <div className="flex flex-wrap items-center gap-2 mb-6 text-[12px] text-muted">
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface-elevated">
            <span className="font-medium text-primary">{goal.progress}%</span> complete
          </span>
          {goal.targetDate && (
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface-elevated">
              <Calendar size={12} />
              Target: {new Date(goal.targetDate).toLocaleDateString()}
            </span>
          )}
          {activePhase && (
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-accent/10 text-accent">
              <Play size={12} /> Active: {activePhase.title}
            </span>
          )}
          {nextPhase && !activePhase && (
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface-elevated text-secondary">
              Next: {nextPhase.title}
            </span>
          )}
          {totalTasks > 0 && (
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface-elevated">
              {completedTasks}/{totalTasks} tasks
            </span>
          )}
        </div>

        {/* Phases as horizontal progress bars (collapsed view) */}
        {goal.phases.length > 0 && (
          <div className="space-y-3 mb-6">
            {goal.phases.map((phase) => (
              <PhaseProgressBar
                key={phase.id}
                phase={phase}
                goalColor={goalColor}
                onClick={() => togglePhase(phase.id)}
                isActive={expandedPhases.has(phase.id)}
              />
            ))}
          </div>
        )}

        {/* Expanded phases */}
        {goal.phases.map((phase) => 
          expandedPhases.has(phase.id) && (
            <ExpandablePhase
              key={phase.id}
              phase={phase}
              goal={goal}
              goalColor={goalColor}
              isExpanded={true}
              onToggle={() => togglePhase(phase.id)}
              onStartPhase={() => onStartPhase(phase.id)}
              onCompletePhase={() => onCompletePhase(phase.id)}
              onAddTask={() => onAddTask(phase.id)}
              onTaskClick={(taskId) => onTaskClick(phase.id, taskId)}
              onToggleTask={(taskId) => onToggleTask(phase.id, taskId)}
            />
          )
        )}

        {goal.phases.length === 0 && (
          <div className="text-center py-10 text-muted border-t border-border-soft mt-6">
            <p className="text-[14px] mb-3">No phases yet</p>
            <button
              onClick={onEdit}
              className="pressable inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-accent text-[#061B14] text-[13px] font-semibold hover:bg-accent-soft"
            >
              <Plus size={14} /> Add Phases
            </button>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 mt-6 pt-4 border-t border-border-soft">
          <button
            onClick={(e) => { e.stopPropagation(); onEdit(); }}
            className="pressable p-2 rounded-xl text-muted hover:bg-surface-elevated hover:text-primary"
            aria-label="Edit goal"
          >
            <MoreHorizontal size={18} />
          </button>
        </div>
      </div>
    </article>
  );
}