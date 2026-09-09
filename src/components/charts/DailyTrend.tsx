"use client";

import React, { useState } from "react";
import { CalendarCheck2 } from "lucide-react";
import { useApp } from "@/store/app-store";
import { BarChart } from "@/components/charts/BarChart";
import { startOfWeek, isSameDay } from "@/lib/time";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function DailyTrend() {
  const { tasks } = useApp();
  const [now] = useState(() => Date.now());
  const weekStart = startOfWeek(new Date(now));

  const data = DAYS.map((label, i) => {
    const start = weekStart + i * 86400000;
    const value = tasks.filter(
      (t) => t.completedAt && t.completedAt >= start && t.completedAt < start + 86400000
    ).length;
    return { label, value, highlight: isSameDay(start, now) };
  });
  const total = data.reduce((a, d) => a + d.value, 0);

  return (
    <section className="rounded-[22px] border border-border bg-surface p-5 sm:p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CalendarCheck2 size={18} className="text-muted" />
          <h2 className="text-[17px] font-bold tracking-tight text-primary">This week&rsquo;s check-offs</h2>
        </div>
        <span className="text-[13px] tabular-nums text-accent">{total} done</span>
      </div>
      <div className="mt-5">
        <BarChart data={data} height={170} />
      </div>
      <p className="mt-2 text-[12px] text-muted">Tasks ticked off each day, Mon&ndash;Sun.</p>
    </section>
  );
}