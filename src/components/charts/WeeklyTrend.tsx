"use client";

import React from "react";
import { History } from "lucide-react";
import { useApp } from "@/store/app-store";
import { BarChart } from "@/components/charts/BarChart";
import { startOfWeek } from "@/lib/time";

const WEEKS = 8;

export function WeeklyTrend() {
  const { tasks } = useApp();
  const nowWeekStart = startOfWeek(new Date());

  const data = [];
  for (let w = WEEKS - 1; w >= 0; w--) {
    const start = nowWeekStart - w * 7 * 86400000;
    const value = tasks.filter(
      (t) => t.completedAt && t.completedAt >= start && t.completedAt < start + 7 * 86400000
    ).length;
    data.push({
      label: new Date(start).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      value,
      highlight: w === 0,
    });
  }
  const total = data.reduce((a, d) => a + d.value, 0);

  return (
    <section className="rounded-[22px] border border-border bg-surface p-5 sm:p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <History size={18} className="text-muted" />
          <h2 className="text-[17px] font-bold tracking-tight text-primary">Check-offs per week</h2>
        </div>
        <span className="text-[13px] tabular-nums text-accent">{total} in last {WEEKS} weeks</span>
      </div>
      <div className="mt-5">
        <BarChart data={data} height={170} />
      </div>
      <p className="mt-2 text-[12px] text-muted">Total tasks completed per week, {WEEKS} weeks back.</p>
    </section>
  );
}