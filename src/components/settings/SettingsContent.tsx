"use client";

import React, { useRef, useState } from "react";
import { Database, SlidersHorizontal, Trash2, Sparkles, FlaskConical, Camera } from "lucide-react";
import { useApp } from "@/store/app-store";
import { useToast } from "@/store/toast-store";
import { Field, Input } from "@/components/ui/Form";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Avatar } from "@/components/ui/Avatar";
import { compressImageToDataUrl } from "@/lib/avatar";

const DEV = process.env.NODE_ENV !== "production";

export function SettingsContent() {
  const { settings, updateSettings, sessions, tasks, resetData, loadSampleData } = useApp();
  const { toast } = useToast();
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState(settings.userName);
  const [confirmClear, setConfirmClear] = useState(false);
  const [confirmSample, setConfirmSample] = useState(false);
  const isDemo = sessions.some((s) => s.id.startsWith("seed")) || tasks.some((t) => t.id.startsWith("sample"));

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
    toast("Demo data cleared — starting fresh", "info");
  };

  const doLoadSample = () => {
    loadSampleData();
    setConfirmSample(false);
    toast("Sample history loaded", "info");
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
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="flex items-center gap-1.5 text-[14px] font-medium text-primary">
                  <Sparkles size={14} className="text-accent" />
                  {isDemo ? "Demo data active" : "Demo data cleared"}
                </p>
                <p className="mt-0.5 text-[12px] leading-relaxed text-muted">
                  {tasks.length} tasks · {sessions.length} sessions recorded locally.
                </p>
              </div>
            </div>
          </div>
          {DEV && (
            <div className="rounded-[16px] border border-dashed border-border bg-surface-elevated/50 px-4 py-3.5">
              <p className="flex items-center gap-1.5 text-[14px] font-medium text-primary">
                <FlaskConical size={14} className="text-accent" />
                Developer testing
              </p>
              <p className="mt-0.5 text-[12px] leading-relaxed text-muted">
                Inject a synthetic 3-month history to preview the Analytics tab. Hidden in production builds.
              </p>
              <div className="mt-3">
                <Button variant="secondary" onClick={() => setConfirmSample(true)}>
                  <FlaskConical size={16} /> Load sample data
                </Button>
              </div>
            </div>
          )}
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="danger" onClick={() => setConfirmClear(true)}>
              <Trash2 size={16} /> Clear demo data
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

      <Modal open={confirmSample} onClose={() => setConfirmSample(false)} title="Load sample history?">
        <div className="space-y-4">
          <p className="text-[14px] leading-relaxed text-secondary">
            This replaces the current tasks and sessions with a synthetic 3-month
            history so you can preview the Analytics tab. Only available in this
            local dev build. No undo — reload from fresh if you want the starter
            data back.
          </p>
          <div className="flex gap-2">
            <Button variant="primary" className="flex-1" onClick={doLoadSample}>
              Load sample data
            </Button>
            <Button variant="secondary" className="flex-1" onClick={() => setConfirmSample(false)}>
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