"use client";

import React, { useState } from "react";
import { Plus, Target } from "lucide-react";
import { cn } from "@/lib/utils";
import { useApp } from "@/store/app-store";
import { GoalCard } from "@/components/goals/GoalCard";
import { PhaseBuilderModal } from "@/components/goals/PhaseBuilderModal";
import { PhaseRetrospectiveModal } from "@/components/goals/PhaseRetrospectiveModal";
import { SmartRescheduleModal } from "@/components/goals/SmartRescheduleModal";
import { PhaseCelebration } from "@/components/celebration/PhaseCelebration";
import { Goal } from "@/types";
import { Button } from "@/components/ui/Button";

export function GoalsContent() {
  const { 
    goals, 
    removeGoal, 
    getPhaseRetrospective,
    completePhase,
    phaseRetrospectives,
  } = useApp();
  const [showBuilder, setShowBuilder] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [retrospectivePhase, setRetrospectivePhase] = useState<{ phaseId: string; goalId: string; phaseTitle: string } | null>(null);
  const [rescheduleGoal, setRescheduleGoal] = useState<Goal | null>(null);

  const orderedGoals = [...goals].sort((a, b) => a.createdAt - b.createdAt);

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

  const handleDeleteGoal = (goalId: string) => { if (window.confirm("Delete this goal and all its phases/tasks? This cannot be undone.")) removeGoal(goalId); };

  return (
    <div className="space-y-8">
      <header className="motion-stagger flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-[24px] font-bold tracking-tight text-primary">Goals</h1>
        <Button variant="primary" onClick={() => { setEditingGoal(null); setShowBuilder(true); }}>
          <Plus size={16} className="mr-2" /> New Goal
        </Button>
      </header>

      {orderedGoals.length > 0 && (
        <section className="motion-stagger space-y-4" aria-label="Goals">
          {orderedGoals.map((goal) => (
            <GoalCard
              key={goal.id}
              goal={goal}
              onEdit={() => { setEditingGoal(goal); setShowBuilder(true); }}
              onCompletePhase={(phaseId) => handleCompletePhase(goal.id, phaseId)}
            />
          ))}
        </section>
      )}

      {orderedGoals.length === 0 && (
        <section className="motion-stagger" aria-labelledby="empty-goals">
          <div className="text-center py-16 rounded-[22px] border border-border bg-surface">
            <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-surface-soft flex items-center justify-center">
              <Target size={28} className="text-muted" />
            </div>
            <h3 id="empty-goals" className="text-[18px] font-semibold text-primary mb-2">No goals yet</h3>
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
      {retrospectivePhase && <PhaseRetrospectiveModal open={true} onClose={() => setRetrospectivePhase(null)} phaseId={retrospectivePhase.phaseId} goalId={retrospectivePhase.goalId} phaseTitle={retrospectivePhase.phaseTitle} existingRetrospective={getPhaseRetrospective(retrospectivePhase.phaseId)} />}
      {rescheduleGoal && <SmartRescheduleModal open={true} onClose={() => setRescheduleGoal(null)} goal={rescheduleGoal} />}
      <PhaseCelebration />
    </div>
  );
}