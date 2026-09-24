"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useApp } from "@/store/app-store";
import { greetingForHour } from "@/lib/time";
import { Avatar } from "@/components/ui/Avatar";

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
        <Link
          href="/profile"
          aria-label="Open profile"
          title="Profile"
          className="pressable relative shrink-0"
        >
          <Avatar src={settings.avatarUrl} name={settings.userName} size={52} />
        </Link>
      </div>

      <div className="mt-2.5 md:hidden">{progressSlot}</div>
    </header>
  );
}