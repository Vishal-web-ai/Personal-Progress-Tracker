"use client";

import React, { useRef, useState } from "react";
import { Camera, Settings, Bell } from "lucide-react";
import { cn } from "@/lib/utils";
import { useApp } from "@/store/app-store";
import { useToast } from "@/store/toast-store";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Field, Input, Textarea } from "@/components/ui/Form";
import { Modal } from "@/components/ui/Modal";
import { compressImageToDataUrl } from "@/lib/avatar";
import { useRouter } from "next/navigation";

export default function ProfilePage() {
  const router = useRouter();
  const { settings, updateSettings, sessions, tasks, resetData } = useApp();
  const { toast } = useToast();
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState(settings.userName);
  const [bio, setBio] = useState("");
  const [confirmClear, setConfirmClear] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

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
    toast("Profile saved");
  };

  const doReset = () => {
    resetData();
    setConfirmClear(false);
    toast("All data cleared — starting fresh", "info");
  };

  const handleSignOut = () => {
    // For local-first app, sign out just clears session
    toast("Signed out");
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <header className="motion-stagger">
        <h1 className="text-[24px] font-bold tracking-tight text-primary">Profile</h1>
        <p className="mt-1 text-[14px] text-secondary">Manage your account and preferences</p>
      </header>

      {/* Profile Card */}
      <section className="motion-stagger rounded-[22px] border border-border bg-surface p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
          <div className="flex-shrink-0 relative">
            <Avatar src={settings.avatarUrl} name={settings.userName} size={96} />
            <button
              onClick={() => avatarInputRef.current?.click()}
              className="absolute bottom-0 right-0 pressable flex h-10 w-10 items-center justify-center rounded-full bg-accent text-[#061B14] shadow-lg"
              aria-label="Change photo"
            >
              <Camera size={18} />
            </button>
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarPick}
            />
          </div>
          <div className="flex-1 text-center sm:text-left space-y-4">
            <Field label="Display Name">
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                autoFocus
              />
            </Field>
            <Field label="Bio (optional)">
              <Textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Tell us about yourself..."
                rows={3}
              />
            </Field>
            <div className="flex items-center justify-center sm:justify-start gap-3">
              <Button variant="primary" onClick={savePreferences}>
                Save Profile
              </Button>
              <Button variant="secondary" onClick={() => setShowSettings(true)}>
                <Settings size={16} className="mr-2" />
                Settings
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Quick Stats */}
      <section className="motion-stagger grid gap-3 grid-cols-3">
        <div className="rounded-[18px] border border-border bg-surface p-4 text-center">
          <div className="text-[24px] font-bold tabular-nums text-primary">{tasks.length}</div>
          <div className="text-[11px] text-muted">Total Tasks</div>
        </div>
        <div className="rounded-[18px] border border-border bg-surface p-4 text-center">
          <div className="text-[24px] font-bold tabular-nums text-accent">{sessions.length}</div>
          <div className="text-[11px] text-muted">Focus Sessions</div>
        </div>
        <div className="rounded-[18px] border border-border bg-surface p-4 text-center">
          <div className="text-[24px] font-bold tabular-nums text-low">
            {tasks.filter((t) => t.status === "done").length}
          </div>
          <div className="text-[11px] text-muted">Completed</div>
        </div>
      </section>

      {/* Preferences */}
      <section className="motion-stagger rounded-[22px] border border-border bg-surface p-5 sm:p-6">
        <h2 className="mb-4 flex items-center gap-2 text-[17px] font-bold tracking-tight text-primary">
          <Settings size={18} className="text-muted" /> Preferences
        </h2>
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4 rounded-[16px] border border-border-soft bg-surface-elevated px-4 py-3.5">
            <div className="flex items-start gap-3">
              <Bell size={18} className="mt-0.5 shrink-0 text-accent" />
              <div>
                <p className="text-[14px] font-medium text-primary">Completion Sound</p>
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
        </div>
      </section>

      {/* Data Management */}
      <section className="motion-stagger rounded-[22px] border border-border bg-surface p-5 sm:p-6">
        <h2 className="mb-4 flex items-center gap-2 text-[17px] font-bold tracking-tight text-primary">
          <Settings size={18} className="text-muted" /> Data
        </h2>
        <div className="space-y-4">
          <div className="rounded-[16px] border border-border-soft bg-surface-elevated px-4 py-3.5">
            <p className="text-[12px] leading-relaxed text-muted">
              {tasks.length} tasks · {sessions.length} sessions recorded locally.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="danger" onClick={() => setConfirmClear(true)}>
              <Settings size={16} /> Clear all data
            </Button>
            <span className="text-[12px] text-muted">
              Removes all tasks and sessions. Not recoverable.
            </span>
          </div>
        </div>
      </section>

      <footer className="motion-stagger pb-2 text-center">
        <p className="text-[12px] text-muted">
          Pulse · Personal Productivity OS — data stays on this device
        </p>
      </footer>

      {/* Settings Modal */}
      <Modal open={showSettings} onClose={() => setShowSettings(false)} title="Settings" className="max-w-md">
        <div className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-4 rounded-[16px] border border-border-soft bg-surface-elevated px-4 py-3.5">
              <div className="flex items-start gap-3">
                <Settings size={18} className="mt-0.5 shrink-0 text-accent" />
                <div>
                  <p className="text-[14px] font-medium text-primary">Completion Sound</p>
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
          </div>

          <div className="border-t border-border-soft pt-4 space-y-4">
            <p className="text-[14px] font-medium text-primary">Danger Zone</p>
            <div className="rounded-[16px] border border-border-soft bg-surface-elevated px-4 py-3.5">
              <p className="text-[12px] leading-relaxed text-muted">
                {tasks.length} tasks · {sessions.length} sessions recorded locally.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button variant="danger" onClick={() => setConfirmClear(true)}>
                <Settings size={16} /> Clear all data
              </Button>
              <span className="text-[12px] text-muted">
                Removes all tasks and sessions. Not recoverable.
              </span>
            </div>
          </div>
        </div>
      </Modal>

      {/* Confirm Clear Modal */}
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
    </div>
  );
}