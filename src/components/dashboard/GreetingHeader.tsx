"use client";

import React, { useRef, useState } from "react";
import { useApp } from "@/store/app-store";
import { greetingForHour } from "@/lib/time";
import { compressImageToDataUrl } from "@/lib/avatar";
import { Avatar } from "@/components/ui/Avatar";

export function GreetingHeader({ progressSlot }: { progressSlot?: React.ReactNode }) {
  const { settings, updateSettings } = useApp();
  const [now] = useState(() => Date.now());
  const inputRef = useRef<HTMLInputElement>(null);

  const handlePick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      updateSettings({ avatarUrl: await compressImageToDataUrl(file) });
    } catch {
      /* ignore unreadable image */
    }
  };

  return (
    <header className="motion-stagger">
      <div className="flex items-center gap-3.5">
        <div className="min-w-0 flex-1">
          <p className="text-[20px] font-medium leading-[26px] text-primary">
            {greetingForHour(new Date(now).getHours())},
          </p>
          <h1 className="text-[30px] font-bold leading-[36px] tracking-tight text-accent sm:text-[32px]">
            {settings.userName}!
          </h1>
        </div>
        <button
          onClick={() => inputRef.current?.click()}
          aria-label="Change profile photo"
          title="Change photo"
          className="pressable relative shrink-0"
        >
          <Avatar src={settings.avatarUrl} name={settings.userName} size={52} />
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handlePick}
        />
      </div>

      <div className="mt-2.5 md:hidden">{progressSlot}</div>
    </header>
  );
}