"use client";

import React from "react";
import { CheckCircle2, ListChecks, Flame, CalendarDays } from "lucide-react";
import { ProgressRing } from "@/components/ui/ProgressRing";
import { cn } from "@/lib/utils";
import { useDailyDashboard } from "./useDailyDashboard";

export function ProgressCard() {
  const { today, week, month, streak, streakLabel } = useDailyDashboard();

  return (
    <section className="motion-stagger rounded-[22px] border border-border bg-surface p-5 sm:p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-[22px] font-bold leading-[30px] tracking-tight text-primary">
          Today&rsquo;s Progress
        </h2>
      </div>

      <div className="mt-5 grid gap-6 lg:grid-cols-[auto_1fr] lg:gap-10">
        <div className="flex flex-col items-center gap-4">
          <ProgressRing value={today.pct} size={176} stroke={18} label="Daily Progress" />
        </div>

        <div className="flex flex-col justify-center gap-3">
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            <Metric icon={<CheckCircle2 size={18} />} label="Daily tasks" value={`${today.done} / ${today.total}`} accent={today.done > 0} />
            <Metric icon={<ListChecks size={18} />} label="Weekly tasks" value={`${week.done} / ${week.total}`} accent={week.done > 0} />
            <Metric icon={<CalendarDays size={18} />} label="Monthly tasks" value={`${month.done} / ${month.total}`} accent={month.done > 0} />
            <Metric icon={<Flame size={18} />} label="Current streak" value={streakLabel} accent={streak > 0} />
          </div>

          <div className="mt-1 flex items-center gap-3 rounded-[18px] bg-surface-soft px-4 py-3.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent text-[#061B14]">
              <CheckCircle2 size={18} strokeWidth={2.4} />
            </div>
            <p className="text-[13px] leading-snug text-secondary">
              Check tasks off as you finish them — daily, weekly and monthly plans live{" "}
              <span className="font-semibold text-accent">here</span> and in Goals.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function Metric({
  icon,
  label,
  value,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="flex items-center gap-3 rounded-[18px] border border-border-soft bg-surface-elevated px-4 py-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[13px] bg-surface-soft text-secondary">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="truncate text-[12px] text-muted">{label}</p>
        <p
          className={cn(
            "text-[17px] font-semibold leading-6 tracking-tight tabular-nums",
            accent ? "text-accent" : "text-primary"
          )}
        >
          {value}
        </p>
      </div>
    </div>
  );
}