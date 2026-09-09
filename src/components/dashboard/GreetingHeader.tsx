"use client";

import React, { useState } from "react";
import { useApp } from "@/store/app-store";
import { greetingForHour } from "@/lib/time";

export function GreetingHeader({ progressSlot }: { progressSlot?: React.ReactNode }) {
  const { settings } = useApp();
  const [now] = useState(() => Date.now());

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
        <div className="relative h-[52px] w-[52px] shrink-0 rounded-full border-2 border-accent/80">
          <div className="flex h-full w-full items-center justify-center rounded-full bg-surface-elevated text-[19px] font-bold text-accent">
            {settings.userName.charAt(0).toUpperCase()}
          </div>
        </div>
      </div>

      <div className="mt-2.5 md:hidden">{progressSlot}</div>
    </header>
  );
}