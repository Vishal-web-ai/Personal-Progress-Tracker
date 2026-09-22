"use client";

import React, { useState } from "react";
import { Plus, Settings, Target } from "lucide-react";
import { cn } from "@/lib/utils";
import { useApp } from "@/store/app-store";
import { GoalCard } from "@/components/goals/GoalCard";
import { PhaseBuilderModal } from "@/components/goals/PhaseBuilderModal";
import { PhaseTaskManager } from "@/components/goals/PhaseTaskManager";
import { PhaseRetrospectiveModal } from "@/components/goals/PhaseRetrospectiveModal";
import { SmartRescheduleModal } from "@/components/goals/SmartRescheduleModal";
import { Goal, Phase, PhaseRetrospective } from "@/types";
import { Button } from "@/components/ui/Button";

export function GoalsContent() {
  const { 
    goals, 
    removeGoal, 
    getPhaseRetrospective,
    startPhase,
    completePhase,
    togglePhaseTask,
    phaseRetrospectives,
  } = useApp();
  const [showBuilder, setShowBuilder] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [taskManagerPhase, setTaskManagerPhase] = useState<{ phaseId: string; goalId: string; goalColor: string } | null>(null);
  const [retrospectivePhase, setRetrospectivePhase] = useState<{ phaseId: string; goalId: string; phaseTitle: string } | null>(null);
  const [rescheduleGoal, setRescheduleGoal] = useState<Goal | null>(null);

  const activeGoals = goals.filter((g) => g.status === "active");
  const completedGoals = goals.filter((g) => g.status === "completed");
  const archivedGoals = goals.filter((g) => g.status === "archived");

  const handleStartPhase = (goalId: string, phaseId: string) => {
    startPhase(goalId, phaseId);
  };

  const handleCompletePhase = (goalId: string, phaseId: string) => {
    completePhase(goalId, phaseId);
    
    const goal = goals.find((g) => g.id === goalId);
    const phase = goal?.phases.find((p) => p.id === phaseId);
    if (phase) {
      const existing = phaseRetrospectives.find((r) => r.phaseId === phaseId);
      if (!existing) {
        setRetrospectivePhase({ phaseId, goalId, phaseTitle: phase.title });
      }
    }
  };

  const handleAddTask = (phaseId: string) => {
    const goal = goals.find((g) => g.phases.some((p) => p.id === phaseId));
    const phase = goal?.phases.find((p) => p.id === phaseId);
    if (goal && phase) {
      setTaskManagerPhase({ phaseId, goalId: goal.id, goalColor: goal.color || "var(--accent)" });
    }
  };

  const handleTaskClick = (phaseId: string, taskId: string) => {};
  const handleToggleTask = (phaseId: string, taskId: string) => { togglePhaseTask(phaseId, taskId); };
  const handleDeleteGoal = (goalId: string) => { if (window.confirm("Delete this goal and all its phases/tasks? This cannot be undone.")) removeGoal(goalId); };

  return (
    <div className="space-y-8">
      <header className="motion-stagger space-y-1">
        <h1 className="text-[24px] font-bold tracking-tight text-primary">Goals</h1>
        <p className="text-[14px] text-secondary">Break big goals into phases. Track progress, time, and learn from each phase.</p>
        <Button variant="primary" className="mt-4" onClick={() => { setEditingGoal(null); setShowBuilder(true); }}>
          <Plus size={16} className="mr-2" /> New Goal
        </Button>
      </header>

      {activeGoals.length > 0 && (
        <section className="motion-stagger space-y-4" aria-labelledby="active-goals">
          <h2 id="active-goals" className="text-[17px] font-semibold text-primary">Active Goals</h2>
          <div className="space-y-4">
            {activeGoals.map((goal) => (
              <GoalCard
                key={goal.id}
                goal={goal}
                onClick={() => {}}
                onEdit={() => { setEditingGoal(goal); setShowBuilder(true); }}
                onDelete={() => handleDeleteGoal(goal.id)}
                onStartPhase={(phaseId) => handleStartPhase(goal.id, phaseId)}
                onCompletePhase={(phaseId) => handleCompletePhase(goal.id, phaseId)}
                onAddTask={handleAddTask}
                onTaskClick={handleTaskClick}
                onToggleTask={handleToggleTask}
              />
            ))}
          </div>
        </section>
      )}

      {completedGoals.length > 0 && (
        <section className="motion-stagger space-y-4" aria-labelledby="completed-goals">
          <h2 id="completed-goals" className="text-[17px] font-semibold text-primary">Completed Goals</h2>
          <div className="space-y-4">
            {completedGoals.map((goal) => (
              <GoalCard
                key={goal.id}
                goal={goal}
                onClick={() => {}}
                onEdit={() => { setEditingGoal(goal); setShowBuilder(true); }}
                onDelete={() => handleDeleteGoal(goal.id)}
                onStartPhase={(phaseId) => handleStartPhase(goal.id, phaseId)}
                onCompletePhase={(phaseId) => handleCompletePhase(goal.id, phaseId)}
                onAddTask={handleAddTask}
                onTaskClick={handleTaskClick}
                onToggleTask={handleToggleTask}
              />
            ))}
          </div>
        </section>
      )}

      {archivedGoals.length > 0 && (
        <section className="motion-stagger space-y-4" aria-labelledby="archived-goals">
          <h2 id="archived-goals" className="text-[17px] font-semibold text-primary">Archived Goals</h2>
          <div className="space-y-4">
            {archivedGoals.map((goal) => (
              <GoalCard
                key={goal.id}
                goal={goal}
                onClick={() => {}}
                onEdit={() => { setEditingGoal(goal); setShowBuilder(true); }}
                onDelete={() => handleDeleteGoal(goal.id)}
                onStartPhase={(phaseId) => handleStartPhase(goal.id, phaseId)}
                onCompletePhase={(phaseId) => handleCompletePhase(goal.id, phaseId)}
                onAddTask={handleAddTask}
                onTaskClick={handleTaskClick}
                onToggleTask={handleToggleTask}
              />
            ))}
          </div>
        </section>
      )}

      {goals.length === 0 && (
        <section className="motion-stagger" aria-labelledby="empty-goals">
          <div className="text-center py-16 rounded-[22px] border border-dashed border-border bg-surface-elevated/50">
            <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-surface flex items-center justify-center">
              <Target size={28} className="text-muted" />
            </div>
            <h3 id="empty-goals" className="text-[18px] font-semibold text-secondary mb-2">No goals yet</h3>
            <p className="text-muted mb-6 max-w-md mx-auto">
              Create your first goal and break it into achievable phases. Track progress, time estimates, and reflect on each phase.
            </p>
            <Button variant="primary" onClick={() => setShowBuilder(true)}>
              <Plus size={16} className="mr-2" /> Create Your First Goal
            </Button>
          </div>
        </section>
      )}

      <PhaseBuilderModal open={showBuilder} onClose={() => { setShowBuilder(false); setEditingGoal(null); }} editGoal={editingGoal || undefined} />
      {taskManagerPhase && <PhaseTaskManager phaseId={taskManagerPhase.phaseId} goalId={taskManagerPhase.goalId} goalColor={taskManagerPhase.goalColor} onClose={() => setTaskManagerPhase(null)} />}
      {retrospectivePhase && <PhaseRetrospectiveModal open={true} onClose={() => setRetrospectivePhase(null)} phaseId={retrospectivePhase.phaseId} goalId={retrospectivePhase.goalId} phaseTitle={retrospectivePhase.phaseTitle} existingRetrospective={getPhaseRetrospective(retrospectivePhase.phaseId)} />}
      {rescheduleGoal && <SmartRescheduleModal open={true} onClose={() => setRescheduleGoal(null)} goal={rescheduleGoal} />}
    </div>
  );
}