"use client";

import React from "react";
import { Flame } from "lucide-react";
import { ProgressRing } from "@/components/ui/ProgressRing";
import { useDailyDashboard } from "./useDailyDashboard";

export function ProgressCard() {
  const { today, week, month, streak, streakLabel } = useDailyDashboard();

  const rings = [
    { label: "Daily", value: today, accent: "var(--accent)" },
    { label: "Weekly", value: week, accent: "var(--sky)" },
    { label: "Monthly", value: month, accent: "var(--violet)" },
  ];

  return (
    <section className="motion-stagger rounded-[22px] border border-border bg-surface p-5 sm:p-6">
      <h2 className="text-center text-[22px] font-bold leading-[30px] tracking-tight text-primary">
        Today&rsquo;s Progress
      </h2>

      <div className="motion-stagger mt-6 flex flex-wrap items-start justify-center gap-5 lg:gap-8">
        {rings.map((r) => (
          <div key={r.label} className="flex w-[96px] flex-col items-center">
            <ProgressRing
              value={r.value.pct}
              size={92}
              stroke={11}
              accent={r.accent}
              label={r.label}
              sublabel={`${r.value.done} / ${r.value.total} done`}
              valueClassName="text-[22px]"
            />
          </div>
        ))}
      </div>

      <div className="mt-5 flex justify-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-border-soft bg-surface-elevated px-4 py-2">
          <Flame size={15} className={streak > 0 ? "text-accent" : "text-muted"} />
          <p className="text-[13px] text-secondary">
            <span className="font-semibold tabular-nums text-primary">{streakLabel}</span> streak
          </p>
        </div>
      </div>

      <p className="mt-4 text-center text-[12.5px] leading-snug text-muted">
        Check tasks off as you finish them — daily, weekly and monthly plans live{" "}
        <span className="font-semibold text-accent">here</span> and in Goals.
      </p>
    </section>
  );
}