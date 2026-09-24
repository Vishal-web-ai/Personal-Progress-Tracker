"use client";

import React, { useState, useCallback } from "react";
import { Plus, Trash2, GripVertical, Flag, Target, Brain, Zap, BookOpen, Users, Award } from "lucide-react";
import { cn } from "@/lib/utils";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Field, Input, Textarea } from "@/components/ui/Form";
import { useApp } from "@/store/app-store";
import { useToast } from "@/store/toast-store";
import type { Goal } from "@/types";
import { dayKeyFor } from "@/lib/time";

const GOAL_COLORS = [
  { value: "var(--note-mint-swatch)", name: "Mint", icon: Brain },
  { value: "var(--note-teal-swatch)", name: "Teal", icon: Zap },
  { value: "var(--note-tan-swatch)", name: "Tan", icon: BookOpen },
  { value: "var(--note-sand-swatch)", name: "Sand", icon: Users },
  { value: "var(--note-violet-swatch)", name: "Violet", icon: Award },
];

type DraftPhase = { id: string; title: string; description: string; startDate?: number; endDate?: number };

export function PhaseBuilderModal({
  open,
  onClose,
  editGoal,
}: {
  open: boolean;
  onClose: () => void;
  editGoal?: Goal | null;
}) {
  const { addGoal, updateGoal, addPhase, updatePhase, removePhase, goals } = useApp();
  const { toast } = useToast();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [color, setColor] = useState(GOAL_COLORS[0].value);
  const [phases, setPhases] = useState<DraftPhase[]>([]);
  const [activePhaseId, setActivePhaseId] = useState<string | null>(null);

  // Initialize from editGoal
  React.useEffect(() => {
    if (open) {
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
          }))
        );
      } else {
        setTitle("");
        setDescription("");
        setTargetDate("");
        setColor(GOAL_COLORS[0].value);
        setPhases([]);
      }
      setActivePhaseId(null);
    }
  }, [open, editGoal]);

  const addCustomPhase = useCallback(() => {
    const newPhase = {
      id: `ph-new-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      title: "",
      description: "",
    };
    setPhases((prev) => [...prev, newPhase]);
    setActivePhaseId(newPhase.id);
  }, []);

  const updateDraftPhase = useCallback((id: string, patch: Partial<typeof phases[0]>) => {
    setPhases((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  }, []);

  const removeDraftPhase = useCallback((id: string) => {
    setPhases((prev) => prev.filter((p) => p.id !== id));
    setActivePhaseId(null);
  }, []);

  const reorderPhases = useCallback((fromIndex: number, toIndex: number) => {
    setPhases((prev) => {
      const next = [...prev];
      const [removed] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, removed);
      return next.map((p, index) => ({ ...p, order: index }));
    });
  }, []);

  const handleSubmit = useCallback(() => {
    if (!title.trim()) return;

    const goalData = {
      title: title.trim(),
      description: description.trim() || undefined,
      targetDate: targetDate ? new Date(targetDate).getTime() : undefined,
      color,
    };

    if (editGoal) {
      updateGoal(editGoal.id, { ...goalData, status: "active" });
      phases.forEach((phase, index) => {
        const existingPhase = editGoal.phases.find((p) => p.id === phase.id);
        if (existingPhase) {
          updatePhase(editGoal.id, phase.id, {
            title: phase.title.trim(),
            description: phase.description.trim() || undefined,
            order: index,
            startDate: phase.startDate,
            endDate: phase.endDate,
          });
        } else if (phase.title.trim()) {
          addPhase(editGoal.id, {
            title: phase.title.trim(),
            description: phase.description.trim() || undefined,
            order: index,
            status: "pending",
            startDate: phase.startDate,
            endDate: phase.endDate,
          });
        }
      });
      editGoal.phases.forEach((p) => {
        if (!phases.find((ph) => ph.id === p.id)) {
          removePhase(editGoal.id, p.id);
        }
      });
      toast("Goal updated");
    } else {
      const goalId = addGoal({ ...goalData, status: "active" });
      phases.forEach((phase, index) => {
        if (phase.title.trim()) {
          addPhase(goalId, {
            title: phase.title.trim(),
            description: phase.description.trim() || undefined,
            order: index,
            status: "pending",
            startDate: phase.startDate,
            endDate: phase.endDate,
          });
        }
      });
      toast(`Goal created: ${title.trim()}`);
    }
    onClose();
  }, [title, description, targetDate, color, phases, editGoal, addGoal, updateGoal, addPhase, updatePhase, removePhase, toast, onClose]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editGoal ? "Edit Goal" : "Create New Goal"}
      className="max-w-2xl max-h-[90dvh]"
      footer={
        <div className="flex gap-2 flex-wrap justify-end">
          <Button variant="secondary" className="flex-1" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" className="flex-1" disabled={!title.trim()} onClick={handleSubmit}>
            {editGoal ? "Save Changes" : "Create Goal"}
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Goal Basics */}
        <section className="space-y-4">
          <h4 className="text-[15px] font-semibold text-primary flex items-center gap-2">
            <Target size={16} className="text-accent" /> Goal Details
          </h4>
          
          <Field label="Goal Title">
            <Input
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What do you want to achieve?"
            />
          </Field>

          <Field label="Description (optional)">
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add context, motivation, or success criteria..."
              rows={3}
            />
          </Field>

          <Field label="Target Date (optional)">
            <Input
              type="date"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
              min={dayKeyFor()}
            />
          </Field>

          <Field label="Color Theme">
            <div className="flex flex-wrap gap-2">
              {GOAL_COLORS.map((c) => (
                <button
                  key={c.value}
                  onClick={() => setColor(c.value)}
                  className={cn(
                    "pressable flex items-center gap-1.5 px-3 py-2 rounded-xl border-2 transition-colors",
                    color === c.value
                      ? "border-accent bg-accent/10"
                      : "border-border bg-surface-elevated hover:border-accent/30"
                  )}
                  style={{ backgroundColor: `${c.value}15` }}
                >
                  <c.icon size={14} style={{ color: c.value }} />
                  <span className="text-[12px] font-medium" style={{ color: c.value }}>
                    {c.name}
                  </span>
                  {color === c.value && <Check size={14} className="text-accent" />}
                </button>
              ))}
            </div>
          </Field>
        </section>

        {/* Phases */}
        <section className="space-y-4 border-t border-border-soft pt-6">
          <div className="flex items-center justify-between">
            <h4 className="text-[15px] font-semibold text-primary flex items-center gap-2">
              <Flag size={16} className="text-accent" /> Phases
            </h4>
            <Button variant="primary" size="sm" onClick={addCustomPhase}>
              <Plus size={14} /> Add Phase
            </Button>
          </div>

          {phases.length === 0 && (
            <div className="text-center py-8 rounded-[16px] border border-dashed border-border bg-surface-elevated/50">
              <Flag className="mx-auto mb-3 h-10 w-10 text-muted" />
              <p className="text-muted mb-4">No phases added yet</p>
              <Button variant="primary" onClick={addCustomPhase}>
                <Plus size={14} /> Add Phase
              </Button>
            </div>
          )}

          {phases.map((phase, index) => (
            <PhaseEditorRow
              key={phase.id}
              phase={phase}
              index={index}
              allPhases={phases}
              isActive={activePhaseId === phase.id}
              initiallyEditing={phase.id.startsWith("ph-new-")}
              onActivate={setActivePhaseId}
              onUpdate={updateDraftPhase}
              onRemove={removeDraftPhase}
              onReorder={reorderPhases}
            />
          ))}
        </section>

        {/* Summary */}
        <div className="rounded-[16px] bg-surface-elevated/50 p-4 border border-border-soft">
          <div className="flex items-center gap-2 text-[13px] text-muted mb-2">
            <span className="font-medium text-primary">Summary:</span>
            <span>{phases.length} phase{phases.length !== 1 ? "s" : ""}</span>
            {targetDate && (
              <>
                <span>·</span>
                <span>Target: {new Date(targetDate).toLocaleDateString()}</span>
              </>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}

interface PhaseEditorRowProps {
  phase: DraftPhase;
  index: number;
  allPhases: DraftPhase[];
  isActive: boolean;
  initiallyEditing?: boolean;
  onActivate: (id: string | null) => void;
  onUpdate: (id: string, patch: Partial<DraftPhase>) => void;
  onRemove: (id: string) => void;
  onReorder: (from: number, to: number) => void;
}

function PhaseEditorRow({
  phase,
  index,
  allPhases,
  isActive,
  initiallyEditing = false,
  onActivate,
  onUpdate,
  onRemove,
  onReorder,
}: PhaseEditorRowProps) {
  const [isEditing, setIsEditing] = useState(initiallyEditing);
  const isNew = phase.id.startsWith("ph-new-");

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData("text/plain", phase.id);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const draggedId = e.dataTransfer.getData("text/plain");
    const fromIndex = allPhases.findIndex((p) => p.id === draggedId);
    if (fromIndex !== -1 && fromIndex !== index) {
      onReorder(fromIndex, index);
    }
  };

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      className={cn(
        "rounded-[16px] border bg-surface p-4 transition-all duration-200",
        isActive ? "border-accent/30 bg-accent/5 ring-1 ring-accent/10" : "border-border hover:border-border",
        isEditing && "ring-2 ring-accent/20"
      )}
    >
      <div className="flex items-start gap-3">
        <button
          onClick={() => onActivate(isActive ? null : phase.id)}
          className="pressable flex-shrink-0 mt-1 h-6 w-6 flex items-center justify-center rounded-lg bg-surface-elevated text-muted hover:bg-accent/10 hover:text-accent"
          aria-label="Expand to edit"
        >
          <GripVertical size={16} />
        </button>

        <div className="flex-1 min-w-0">
          {isEditing ? (
            <div
              className="space-y-3"
              onBlur={(e) => {
                const next = e.relatedTarget as Node | null;
                if (!e.currentTarget.contains(next)) {
                  setIsEditing(false);
                }
              }}
            >
              <Input
                autoFocus
                value={phase.title}
                onChange={(e) => onUpdate(phase.id, { title: e.target.value })}
                placeholder="Phase title"
                onKeyDown={(e) => e.key === "Enter" && setIsEditing(false)}
              />
              <Textarea
                value={phase.description}
                onChange={(e) => onUpdate(phase.id, { description: e.target.value })}
                placeholder="What happens in this phase?"
                rows={2}
              />
              <div className="grid grid-cols-2 gap-3">
                <Field label="Start Date">
                  <Input
                    type="date"
                    value={phase.startDate ? new Date(phase.startDate).toISOString().split("T")[0] : ""}
                    onChange={(e) =>
                      onUpdate(phase.id, { startDate: e.target.value ? new Date(e.target.value).getTime() : undefined })
                    }
                  />
                </Field>
                <Field label="End Date">
                  <Input
                    type="date"
                    value={phase.endDate ? new Date(phase.endDate).toISOString().split("T")[0] : ""}
                    onChange={(e) =>
                      onUpdate(phase.id, { endDate: e.target.value ? new Date(e.target.value).getTime() : undefined })
                    }
                  />
                </Field>
              </div>
              {isNew && (
                <div className="flex justify-end gap-2">
                  <Button variant="secondary" size="sm" onClick={() => onRemove(phase.id)}>
                    Cancel
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    disabled={!phase.title.trim()}
                    onClick={() => setIsEditing(false)}
                  >
                    Add
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div onClick={() => setIsEditing(true)} className="cursor-pointer">
              <h5 className="font-medium text-primary truncate">{phase.title || "Untitled Phase"}</h5>
              {phase.description && (
                <p className="mt-1 text-[13px] text-muted line-clamp-2">{phase.description}</p>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-1">
          {index > 0 && (
            <button
              onClick={() => onReorder(index, index - 1)}
              className="pressable p-1.5 rounded-lg text-muted hover:bg-surface-elevated hover:text-primary"
              aria-label="Move up"
            >
              <ChevronUp size={16} />
            </button>
          )}
          {index < allPhases.length - 1 && (
            <button
              onClick={() => onReorder(index, index + 1)}
              className="pressable p-1.5 rounded-lg text-muted hover:bg-surface-elevated hover:text-primary"
              aria-label="Move down"
            >
              <ChevronDown size={16} />
            </button>
          )}
          <button
            onClick={() => onRemove(phase.id)}
            className="pressable p-1.5 rounded-lg text-muted hover:bg-high/10 hover:text-high"
            aria-label="Remove phase"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}

import { ChevronUp, ChevronDown, Check } from "lucide-react";