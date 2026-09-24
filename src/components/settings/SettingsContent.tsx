"use client";

import React, { useRef, useState } from "react";
import { Database, SlidersHorizontal, Trash2, Camera, Volume2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useApp } from "@/store/app-store";
import { useToast } from "@/store/toast-store";
import { Field, Input } from "@/components/ui/Form";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Avatar } from "@/components/ui/Avatar";
import { compressImageToDataUrl } from "@/lib/avatar";

export function SettingsContent() {
  const { settings, updateSettings, sessions, tasks, resetData } = useApp();
  const { toast } = useToast();
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState(settings.userName);
  const [confirmClear, setConfirmClear] = useState(false);

  const handleAvatarPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      updateSettings({ avatarUrl: await compressImageToDataUrl(file) });
      toast("Photo updated");
    } catch {
      toast("Could not read that image", "warn");
    }
  };

  const savePreferences = () => {
    updateSettings({
      userName: name.trim() || "Vishal",
    });
    toast("Settings saved");
  };

  const doReset = () => {
    resetData();
    setConfirmClear(false);
    toast("All data cleared — starting fresh", "info");
  };

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <header className="motion-stagger">
        <h1 className="text-[24px] font-bold tracking-tight text-primary">Settings</h1>
        <p className="mt-1 text-[14px] text-secondary">Local-first: everything lives in this browser.</p>
      </header>

      <section className="motion-stagger rounded-[22px] border border-border bg-surface p-5 sm:p-6">
        <h2 className="mb-4 flex items-center gap-2 text-[17px] font-bold tracking-tight text-primary">
          <SlidersHorizontal size={18} className="text-muted" /> Preferences
        </h2>
        <div className="space-y-4">
          <Field label="Profile photo">
            <div className="flex flex-wrap items-center gap-4">
              <Avatar src={settings.avatarUrl} name={settings.userName} size={60} />
              <div className="flex flex-wrap gap-2">
                <Button variant="secondary" onClick={() => avatarInputRef.current?.click()}>
                  <Camera size={16} /> Change photo
                </Button>
                {settings.avatarUrl && (
                  <Button variant="danger" onClick={() => updateSettings({ avatarUrl: undefined })}>
                    <Trash2 size={16} /> Remove
                  </Button>
                )}
              </div>
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarPick}
              />
            </div>
          </Field>
          <Field label="Your name">
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Vishal" />
          </Field>
          <div className="flex items-center justify-between gap-4 rounded-[16px] border border-border-soft bg-surface-elevated px-4 py-3.5">
            <div className="flex items-start gap-3">
              <Volume2 size={18} className="mt-0.5 shrink-0 text-accent" />
              <div>
                <p className="text-[14px] font-medium text-primary">Completion sound</p>
                <p className="mt-0.5 text-[12px] leading-relaxed text-muted">
                  Plays a short fanfare when all of today&apos;s tasks are done.
                </p>
              </div>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={settings.celebrationSound}
              aria-label="Toggle completion sound"
              onClick={() => updateSettings({ celebrationSound: !settings.celebrationSound })}
              className={cn(
                "pressable relative h-7 w-12 shrink-0 rounded-full border transition-colors duration-150",
                settings.celebrationSound
                  ? "border-accent/60 bg-accent/15"
                  : "border-border bg-surface-soft"
              )}
            >
              <span
                className={cn(
                  "absolute left-0.5 top-0.5 h-[22px] w-[22px] rounded-full transition-transform duration-150",
                  settings.celebrationSound ? "translate-x-5 bg-accent" : "bg-muted"
                )}
              />
            </button>
          </div>
          <Button variant="primary" onClick={savePreferences}>
            Save preferences
          </Button>
        </div>
      </section>

      <section className="motion-stagger rounded-[22px] border border-border bg-surface p-5 sm:p-6">
        <h2 className="mb-4 flex items-center gap-2 text-[17px] font-bold tracking-tight text-primary">
          <Database size={18} className="text-muted" /> Data
        </h2>
        <div className="space-y-4">
          <div className="rounded-[16px] border border-border-soft bg-surface-elevated px-4 py-3.5">
            <p className="text-[12px] leading-relaxed text-muted">
              {tasks.length} tasks · {sessions.length} sessions recorded locally.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="danger" onClick={() => setConfirmClear(true)}>
              <Trash2 size={16} /> Clear all data
            </Button>
            <span className="text-[12px] text-muted">
              Removes all tasks and sessions. Not recoverable.
            </span>
          </div>
        </div>
      </section>

      <Modal open={confirmClear} onClose={() => setConfirmClear(false)} title="Clear all data?">
        <div className="space-y-4">
          <p className="text-[14px] leading-relaxed text-secondary">
            This removes every recorded session and task, from today and history.
            Your preferences stay. There is no undo.
          </p>
          <div className="flex gap-2">
            <Button variant="danger" className="flex-1" onClick={doReset}>
              Clear everything
            </Button>
            <Button variant="secondary" className="flex-1" onClick={() => setConfirmClear(false)}>
              Cancel
            </Button>
          </div>
        </div>
      </Modal>

      <footer className="motion-stagger pb-2 text-center">
        <p className="text-[12px] text-muted">
          Pulse · Personal Productivity OS — data stays on this device
        </p>
      </footer>
    </div>
  );
}