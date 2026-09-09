"use client";

import React, { useState } from "react";
import { AREAS } from "@/data/initial";
import type { Priority, TaskBucket } from "@/types";
import { useApp } from "@/store/app-store";
import { useToast } from "@/store/toast-store";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select, Textarea } from "@/components/ui/Form";
import { TaskIcon } from "@/components/ui/TaskIcon";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

const PRIORITIES: { value: Priority; label: string; dot: string }[] = [
  { value: "high", label: "High", dot: "var(--priority-high)" },
  { value: "medium", label: "Medium", dot: "var(--priority-medium)" },
  { value: "low", label: "Low", dot: "var(--priority-low)" },
];

const BUCKETS: { value: TaskBucket; label: string }[] = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
];

const ICON_CHOICES = ["cloud", "dumbbell", "message", "utensils", "laptop", "book", "brain", "pen", "code", "grad", "mic", "music"];

export function CreateTaskModal({
  open,
  onClose,
  defaultAreaId,
  defaultBucket = "daily",
}: {
  open: boolean;
  onClose: () => void;
  defaultAreaId?: string;
  defaultBucket?: TaskBucket;
}) {
  const { addTask } = useApp();
  const { toast } = useToast();

  const [title, setTitle] = useState("");
  const [areaId, setAreaId] = useState(defaultAreaId ?? AREAS[0].id);
  const [priority, setPriority] = useState<Priority>("medium");
  const [bucket, setBucket] = useState<TaskBucket>(defaultBucket);
  const [icon, setIcon] = useState("cloud");
  const [description, setDescription] = useState("");

  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setTitle("");
      setAreaId(defaultAreaId ?? AREAS[0].id);
      setPriority("medium");
      setBucket(defaultBucket);
      setDescription("");
    }
  }

  const area = AREAS.find((a) => a.id === areaId) ?? AREAS[0];

  const submit = () => {
    if (!title.trim()) return;
    addTask({
      title: title.trim(),
      description: description.trim() || undefined,
      areaId: area.id,
      areaName: area.name,
      priority,
      bucket,
      icon,
    });
    toast(`Task created · ${title.trim()}`);
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="Create task">
      <div className="space-y-4">
        <Field label="Task title">
          <Input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            placeholder="What needs to be done?"
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Area">
            <Select value={areaId} onChange={(e) => setAreaId(e.target.value)} options={AREAS.map((a) => ({ value: a.id, label: a.name }))} />
          </Field>
          <Field label="Schedule">
            <Select
              value={bucket}
              onChange={(e) => setBucket(e.target.value as TaskBucket)}
              options={BUCKETS.map((b) => ({ value: b.value, label: b.label }))}
            />
          </Field>
        </div>

        <Field label="Priority">
          <div className="flex gap-2">
            {PRIORITIES.map((p) => (
              <button
                key={p.value}
                onClick={() => setPriority(p.value)}
                className={cn(
                  "pressable flex flex-1 items-center justify-center gap-2 rounded-xl border py-2.5 text-[13px] font-medium transition-colors",
                  priority === p.value
                    ? "border-accent/50 bg-accent/10 text-primary"
                    : "border-border bg-surface-elevated text-secondary hover:bg-surface-soft"
                )}
              >
                <span className="h-2 w-2 rounded-full" style={{ background: p.dot }} />
                {p.label}
              </button>
            ))}
          </div>
        </Field>

        <Field label="Icon">
          <div className="grid grid-cols-6 gap-2">
            {ICON_CHOICES.map((ic) => (
              <button
                key={ic}
                onClick={() => setIcon(ic)}
                aria-label={`Icon ${ic}`}
                className={cn(
                  "pressable flex h-10 items-center justify-center rounded-[12px] border transition-colors",
                  icon === ic
                    ? "border-accent/60 bg-accent/10 text-accent"
                    : "border-border bg-surface-elevated text-secondary hover:bg-surface-soft"
                )}
              >
                <TaskIcon name={ic} size={18} />
              </button>
            ))}
          </div>
        </Field>

        <Field label="Description (optional)">
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Add context…"
          />
        </Field>

        <Button variant="primary" className="w-full" disabled={!title.trim()} onClick={submit}>
          <Check size={16} /> Create task
        </Button>
      </div>
    </Modal>
  );
}