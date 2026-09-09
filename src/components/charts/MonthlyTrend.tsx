"use client";

import React from "react";
import { TrendingUp } from "lucide-react";
import { useApp } from "@/store/app-store";
import { TrendChart } from "@/components/charts/TrendChart";
import { startOfMonth } from "@/lib/time";

export function MonthlyTrend() {
  const { tasks } = useApp();

  const now = new Date();
  const monthStart = startOfMonth(now);
  const daysIn = now.getDate();
  const lastMonthDays = new Date(now.getFullYear(), now.getMonth(), 0).getDate();
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).getTime();

  // "Planned" = last month's actual pace, projected linearly into this month.
  const lastTotal = tasks.filter(
    (t) => t.completedAt && t.completedAt >= lastMonthStart && t.completedAt < monthStart
  ).length;

  const points = [];
  let acc = 0;
  for (let d = 1; d <= daysIn; d++) {
    const start = monthStart + (d - 1) * 86400000;
    acc += tasks.filter(
      (t) => t.completedAt && t.completedAt >= start && t.completedAt < start + 86400000
    ).length;
    points.push({
      label: String(d),
      value: acc,
      planned: lastMonthDays > 0 ? Math.round((lastTotal * d) / lastMonthDays) : 0,
    });
  }

  return (
    <section className="rounded-[22px] border border-border bg-surface p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <TrendingUp size={18} className="text-muted" />
          <h2 className="text-[17px] font-bold tracking-tight text-primary">This month&rsquo;s pace</h2>
        </div>
        <span className="text-[13px] text-muted">
          {now.toLocaleDateString("en-US", { month: "long" })} · cumulative check-offs
        </span>
      </div>
      <div className="mt-5">
        <TrendChart points={points} height={200} valueFormat={(n) => `${n}`} />
      </div>
      <div className="mt-3 flex items-center gap-4 text-[12px] text-muted">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-[3px] w-4 rounded-full bg-accent" /> You
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-[3px] w-4 rounded-full border-t border-dashed border-text-muted" />
          {lastTotal > 0
            ? `Last month (${lastTotal} done) pace`
            : "No completions last month to compare"}
        </span>
      </div>
    </section>
  );
}