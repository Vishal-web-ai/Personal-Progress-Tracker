"use client";

import React, { useMemo, useState } from "react";
import { AREAS } from "@/data/initial";
import type { Area, Priority, TaskBucket } from "@/types";
import { useApp } from "@/store/app-store";
import { useToast } from "@/store/toast-store";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select, Textarea } from "@/components/ui/Form";
import { TaskIcon } from "@/components/ui/TaskIcon";
import { cn } from "@/lib/utils";
import { Check, Plus } from "lucide-react";

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

const ICON_CHOICES = ["cloud", "dumbbell", "message", "utensils", "laptop", "book", "brain", "pen", "code", "grad", "speak", "target"];

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
  const { addTask, addArea, removeArea, settings } = useApp();
  const { toast } = useToast();

  const [title, setTitle] = useState("");
  const [areaId, setAreaId] = useState(defaultAreaId ?? AREAS[0].id);
  const [priority, setPriority] = useState<Priority>("medium");
  const [bucket, setBucket] = useState<TaskBucket>(defaultBucket);
  const [icon, setIcon] = useState("cloud");
  const [description, setDescription] = useState("");
  const [isAddingArea, setIsAddingArea] = useState(false);
  const [newAreaName, setNewAreaName] = useState("");
  const [areaError, setAreaError] = useState<string | null>(null);

  const allAreas = useMemo(() => {
    const seen = new Set<string>();
    const out: Area[] = [];
    for (const a of [...AREAS, ...settings.areas]) {
      if (!seen.has(a.id)) {
        seen.add(a.id);
        out.push(a);
      }
    }
    return out;
  }, [settings.areas]);

  const customAreaIds = useMemo(() => new Set(settings.areas.map((a) => a.id)), [settings.areas]);

  const removeAreaById = (removed: Area) => {
    removeArea(removed.id);
    if (areaId === removed.id) setAreaId(allAreas.find((a) => a.id !== removed.id)?.id ?? "");
    toast(`Removed “${removed.name}”`, "info");
  };

  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setTitle("");
      setAreaId(defaultAreaId ?? allAreas[0]?.id ?? AREAS[0].id);
      setPriority("medium");
      setBucket(defaultBucket);
      setDescription("");
      setIsAddingArea(false);
      setNewAreaName("");
      setAreaError(null);
    }
  }

  const area = allAreas.find((a) => a.id === areaId) ?? allAreas[0] ?? AREAS[0];

  const createArea = (close: () => void) => {
    const created = addArea(newAreaName);
    if (!created) {
      setAreaError("An area with this name already exists");
      return;
    }
    setAreaId(created.id);
    setIsAddingArea(false);
    setNewAreaName("");
    setAreaError(null);
    close();
  };

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
    <Modal
      open={open}
      onClose={onClose}
      title="Create task"
      footer={
        <div className="flex gap-2">
          <Button variant="secondary" className="flex-1" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" className="flex-1" disabled={!title.trim()} onClick={submit}>
            <Check size={16} /> Create task
          </Button>
        </div>
      }
    >
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
            <Select
              value={areaId}
              onChange={setAreaId}
              label="Area"
              options={allAreas.map((a) => ({
                value: a.id,
                label: a.name,
                onRemove: customAreaIds.has(a.id) ? () => removeAreaById(a) : undefined,
              }))}
              footer={({ close }) => (
                <div>
                  {!isAddingArea ? (
                    <button
                      type="button"
                      onClick={() => {
                        setNewAreaName("");
                        setAreaError(null);
                        setIsAddingArea(true);
                      }}
                      className="pressable flex w-full items-center gap-2 rounded-[10px] px-2.5 py-2 text-left text-[13.5px] font-medium text-accent transition-colors hover:bg-surface-soft"
                    >
                      <span className="flex h-[20px] w-4 shrink-0 items-center justify-center">
                        <Plus size={15} strokeWidth={2.4} aria-hidden />
                      </span>
                      Add my own area
                    </button>
                  ) : (
                    <div className="rounded-[10px] bg-surface p-1.5">
                      <input
                        autoFocus
                        value={newAreaName}
                        onChange={(e) => {
                          setNewAreaName(e.target.value);
                          setAreaError(null);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") createArea(close);
                          else if (e.key === "Escape") setIsAddingArea(false);
                        }}
                        placeholder="New area name"
                        aria-label="New area name"
                        className="w-full rounded-[8px] border border-border bg-surface-elevated px-2.5 py-1.5 text-[13px] text-primary outline-none placeholder:text-muted focus:border-accent/60"
                      />
                      <div className="mt-1.5">
                        <span className={cn("block min-w-0 text-[11.5px] leading-tight", areaError ? "text-high" : "text-muted")}>
                          {areaError ?? "The new area is saved and appears across the app."}
                        </span>
                        <div className="mt-1.5 flex justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => setIsAddingArea(false)}
                            className="pressable rounded-lg px-2.5 py-1 text-[12px] text-secondary transition-colors hover:bg-surface-soft hover:text-primary"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            disabled={!newAreaName.trim()}
                            onClick={() => createArea(close)}
                            className="pressable rounded-lg bg-accent px-2.5 py-1 text-[12px] font-semibold text-[#061B14] transition-opacity disabled:opacity-45"
                          >
                            Add
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            />
          </Field>
          <Field label="Schedule">
            <Select
              value={bucket}
              onChange={(v) => setBucket(v as TaskBucket)}
              label="Schedule"
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
      </div>
    </Modal>
  );
}