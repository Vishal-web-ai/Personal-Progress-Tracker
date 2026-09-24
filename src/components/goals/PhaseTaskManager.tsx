"use client";

import React, { useState, useEffect } from "react";
import { Plus, Trash2, Flag, Clock, Target, MoreHorizontal, Check, X, GripVertical, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Field, Input, Textarea, Select } from "@/components/ui/Form";
import { DateField } from "@/components/ui/DateField";
import { useApp } from "@/store/app-store";
import { useToast } from "@/store/toast-store";
import { PhaseTask, PhaseTaskStatus } from "@/types";
import { startOfDay } from "@/lib/time";

const TODAY_TS = startOfDay(new Date());

const PRIORITIES = [
  { value: "high", label: "High", dot: "var(--priority-high)" },
  { value: "medium", label: "Medium", dot: "var(--priority-medium)" },
  { value: "low", label: "Low", dot: "var(--priority-low)" },
] as const;

interface PhaseTaskManagerProps {
  phaseId: string;
  goalId: string;
  goalColor: string;
  onClose: () => void;
}

export function PhaseTaskManager({ phaseId, goalId, goalColor, onClose }: PhaseTaskManagerProps) {
  const { goals, addPhaseTask, updatePhaseTask, removePhaseTask, reorderPhaseTasks, togglePhaseTask } = useApp();
  const { toast } = useToast();

  const goal = goals.find((g) => g.id === goalId);
  const phase = goal?.phases.find((p) => p.id === phaseId);
  const tasks = phase?.tasks || [];

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [estimatedMinutes, setEstimatedMinutes] = useState("");
  const [dueDate, setDueDate] = useState<number | undefined>(undefined);
  const [isMilestone, setIsMilestone] = useState(false);
  const [tags, setTags] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<any>({});

  const handleAddTask = () => {
    if (!title.trim()) return;
    const order = tasks.length;
    addPhaseTask(phaseId, goalId, {
      title: title.trim(),
      description: description.trim() || undefined,
      estimatedMinutes: estimatedMinutes ? parseInt(estimatedMinutes) : undefined,
      dueDate: dueDate ?? undefined,
      isMilestone,
      tags: tags ? tags.split(",").map((t) => t.trim()).filter(Boolean) : [],
      order,
    });
    
    setTitle("");
    setDescription("");
    setEstimatedMinutes("");
    setDueDate(undefined);
    setIsMilestone(false);
    setTags("");
    setShowAddForm(false);
    toast("Task added to phase");
  };

  const handleUpdateTask = (taskId: string) => {
    const patch: Partial<PhaseTask> = { ...editForm };
    if (patch.estimatedMinutes !== undefined) {
      patch.estimatedMinutes = parseInt(String(patch.estimatedMinutes)) as any;
    }
    updatePhaseTask(phaseId, taskId, patch);
    setEditingTaskId(null);
    setEditForm({});
    toast("Task updated");
  };

  const handleRemoveTask = (taskId: string) => {
    if (window.confirm("Delete this task?")) {
      removePhaseTask(phaseId, taskId);
      toast("Task removed");
    }
  };

  const startEdit = (task: PhaseTask) => {
    setEditingTaskId(task.id);
    setEditForm({
      title: task.title,
      description: task.description,
      estimatedMinutes: task.estimatedMinutes?.toString() || "",
      dueDate: task.dueDate ?? undefined,
      isMilestone: task.isMilestone,
      tags: task.tags?.join(", ") || "",
      status: task.status,
    });
  };

  const handleReorder = (fromIndex: number, toIndex: number) => {
    const taskIds = tasks.map((t) => t.id);
    reorderPhaseTasks(phaseId, taskIds);
  };

  const totalEstimated = tasks.reduce((sum, t) => sum + (t.estimatedMinutes || 0), 0);
  const totalActual = tasks.reduce((sum, t) => sum + (t.actualMinutes || 0), 0);
  const completedCount = tasks.filter((t) => t.status === "done").length;
  const milestoneCount = tasks.filter((t) => t.isMilestone).length;

  return (
    <Modal
      open={true}
      onClose={onClose}
      title={phase?.title || "Phase Tasks"}
      hideHeader={false}
      className="max-w-xl max-h-[90dvh]"
      footer={
        <div className="flex gap-2">
          <Button variant="secondary" className="flex-1" onClick={onClose}>
            Done
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Phase Summary */}
        <div className="rounded-[16px] border border-border bg-surface-elevated/50 p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="h-8 w-8 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${goalColor}20` }}>
              <Flag size={16} style={{ color: goalColor }} />
            </div>
            <div>
              <h4 className="font-semibold text-primary">{phase?.title}</h4>
              <p className="text-[12px] text-muted">{tasks.length} tasks · {completedCount} done</p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="rounded-xl bg-surface p-3">
              <div className="text-[18px] font-bold tabular-nums text-primary">{completedCount}/{tasks.length}</div>
              <div className="text-[11px] text-muted">Completed</div>
            </div>
            <div className="rounded-xl bg-surface p-3">
              <div className="text-[14px] font-bold tabular-nums text-accent">
                {Math.round(totalEstimated / 60)}h {totalEstimated % 60}m
              </div>
              <div className="text-[11px] text-muted">Estimated</div>
            </div>
            <div className="rounded-xl bg-surface p-3">
              <div className="text-[14px] font-bold tabular-nums text-low">
                {Math.round(totalActual / 60)}h {totalActual % 60}m
              </div>
              <div className="text-[11px] text-muted">Actual</div>
            </div>
          </div>
          {milestoneCount > 0 && (
            <div className="mt-3 flex items-center gap-2 text-[12px] text-amber-400">
              <Flag size={14} />
              <span>{milestoneCount} milestone{milestoneCount !== 1 ? "s" : ""} in this phase</span>
            </div>
          )}
        </div>

        {/* Add Task Form */}
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className={cn(
            "pressable w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl border transition-colors",
            showAddForm
              ? "bg-accent/10 border-accent/30 text-accent"
              : "border-border bg-surface-elevated text-secondary hover:bg-surface-soft hover:text-primary"
          )}
        >
          <Plus size={16} />
          {showAddForm ? "Cancel" : "Add Task"}
        </button>

        {showAddForm && (
          <div className="space-y-3 animate-in slide-in-from-top-2 duration-200">
            <Field label="Task Title">
              <Input
                autoFocus
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="What needs to be done?"
                onKeyDown={(e) => e.key === "Enter" && handleAddTask()}
              />
            </Field>
            <Field label="Description (optional)">
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Add details..."
                rows={2}
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Est. Time (min)">
                <Input
                  type="number"
                  min="0"
                  value={estimatedMinutes}
                  onChange={(e) => setEstimatedMinutes(e.target.value)}
                  placeholder="60"
                />
              </Field>
              <Field label="Due Date (optional)">
                <DateField value={dueDate} onChange={setDueDate} min={TODAY_TS} />
              </Field>
            </div>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isMilestone}
                  onChange={(e) => setIsMilestone(e.target.checked)}
                  className="h-4 w-4 rounded border-border bg-surface-elevated text-accent focus:ring-accent"
                />
                <span className="text-[13px] text-primary">Mark as Milestone</span>
              </label>
            </div>
            <Field label="Tags (comma separated)">
              <Input
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="frontend, api, urgent"
              />
            </Field>
            <Button variant="primary" className="w-full" onClick={handleAddTask} disabled={!title.trim()}>
              <Check size={14} /> Add Task
            </Button>
          </div>
        )}

        {/* Tasks List */}
        {tasks.length === 0 && !showAddForm && (
          <div className="text-center py-10 rounded-[16px] border border-dashed border-border bg-surface-elevated/50">
            <Flag className="mx-auto mb-3 h-12 w-12 text-muted" />
            <p className="text-muted mb-4">No tasks in this phase yet</p>
            <Button variant="primary" onClick={() => setShowAddForm(true)}>
              <Plus size={14} /> Add Your First Task
            </Button>
          </div>
        )}

        {tasks.length > 0 && (
          <div className="space-y-2">
            {tasks.map((task, index) => (
              <PhaseTaskItem
                key={task.id}
                task={task}
                index={index}
                goalColor={goalColor}
                isEditing={editingTaskId === task.id}
                editForm={editForm}
                onStartEdit={startEdit}
                onUpdate={(patch: any) => setEditForm((prev: any) => ({ ...prev, ...patch }))}
                onSave={() => handleUpdateTask(task.id)}
                onCancel={() => { setEditingTaskId(null); setEditForm({}); }}
                onToggle={() => togglePhaseTask(phaseId, task.id)}
                onRemove={() => handleRemoveTask(task.id)}
                onReorder={handleReorder}
              />
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
}

interface PhaseTaskItemProps {
  task: PhaseTask;
  index: number;
  goalColor: string;
  isEditing: boolean;
  editForm: any;
  onStartEdit: (task: PhaseTask) => void;
  onUpdate: (patch: any) => void;
  onSave: () => void;
  onCancel: () => void;
  onToggle: () => void;
  onRemove: () => void;
  onReorder: (from: number, to: number) => void;
}

function PhaseTaskItem({
  task,
  index,
  goalColor,
  isEditing,
  editForm,
  onStartEdit,
  onUpdate,
  onSave,
  onCancel,
  onToggle,
  onRemove,
  onReorder,
}: PhaseTaskItemProps) {
  const [showDepPicker, setShowDepPicker] = useState(false);

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData("text/plain", task.id);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    // In a real implementation, we'd find the target task and reorder
  };

  if (isEditing) {
    return (
      <div className="rounded-[16px] border-2 border-accent/30 bg-surface p-4 animate-in slide-in-from-top-2 duration-200">
        <Field label="Title">
          <Input
            autoFocus
            value={editForm.title || ""}
            onChange={(e) => onUpdate({ title: e.target.value })}
            onKeyDown={(e) => e.key === "Enter" && onSave()}
            onBlur={onSave}
          />
        </Field>
        <Field label="Description">
          <Textarea
            value={editForm.description || ""}
            onChange={(e) => onUpdate({ description: e.target.value })}
            rows={2}
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Est. Minutes">
            <Input
              type="number"
              min="0"
              value={editForm.estimatedMinutes || ""}
              onChange={(e) => onUpdate({ estimatedMinutes: e.target.value })}
            />
          </Field>
          <Field label="Due Date">
            <DateField value={editForm.dueDate} onChange={(v) => onUpdate({ dueDate: v })} min={TODAY_TS} />
          </Field>
        </div>
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={editForm.isMilestone || false}
              onChange={(e) => onUpdate({ isMilestone: e.target.checked })}
              className="h-4 w-4 rounded border-border bg-surface-elevated text-accent focus:ring-accent"
            />
            <span className="text-[13px] text-primary">Milestone</span>
          </label>
        </div>
        <Field label="Tags">
          <Input
            value={editForm.tags || ""}
            onChange={(e) => onUpdate({ tags: e.target.value })}
            placeholder="comma separated"
          />
        </Field>
        <Field label="Status">
          <Select
            value={editForm.status || "todo"}
            onChange={(v) => onUpdate({ status: v as PhaseTaskStatus })}
            label="Status"
            options={[
              { value: "todo", label: "To Do" },
              { value: "in_progress", label: "In Progress" },
              { value: "done", label: "Done" },
            ]}
          />
        </Field>
        <div className="flex gap-2">
          <Button variant="primary" className="flex-1" onClick={onSave}>
            <Check size={14} /> Save
          </Button>
          <Button variant="secondary" className="flex-1" onClick={onCancel}>
            <X size={14} /> Cancel
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      className={cn(
        "rounded-[16px] border bg-surface p-3 transition-colors",
        "hover:bg-surface-elevated hover:border-border",
        task.status === "done" && "opacity-60"
      )}
      style={{ borderColor: `color-mix(in srgb, ${goalColor} 20%, var(--border))` }}
    >
      <div className="flex items-start gap-3">
        <button
          onClick={onToggle}
          className={cn(
            "flex-shrink-0 flex h-5 w-5 items-center justify-center rounded border-2 transition-colors mt-0.5",
            task.status === "done"
              ? `bg-${goalColor.replace("#", "")} border-${goalColor.replace("#", "")} text-[#061B14]`
              : "border-border text-muted hover:border-accent/50 hover:text-accent"
          )}
          aria-label={task.status === "done" ? "Mark incomplete" : "Mark complete"}
        >
          {task.status === "done" && <Check size={10} strokeWidth={3} />}
        </button>

        <div className="flex-1 min-w-0" onClick={() => onStartEdit(task)}>
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
            <p className="mt-0.5 text-[12px] text-muted line-clamp-1">{task.description}</p>
          )}
          <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[11px] text-muted">
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
            {task.dueDate && <span>{new Date(task.dueDate).toLocaleDateString()}</span>}
            {task.tags && task.tags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {task.tags.map((tag) => (
                  <span
                    key={tag}
                    className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-surface-elevated text-muted"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => onStartEdit(task)}
            className="pressable p-1.5 rounded-lg text-muted hover:bg-surface-elevated hover:text-primary"
            aria-label="Edit task"
          >
            <MoreHorizontal size={16} />
          </button>
          <button
            onClick={onRemove}
            className="pressable p-1.5 rounded-lg text-muted hover:bg-high/10 hover:text-high"
            aria-label="Remove task"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}

