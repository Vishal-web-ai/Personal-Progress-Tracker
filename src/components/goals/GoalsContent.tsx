"use client";

import React from "react";
import { TaskGroup } from "@/components/tasks/TaskGroup";
import { WeeklyTrend } from "@/components/charts/WeeklyTrend";
import { MonthlyTrend } from "@/components/charts/MonthlyTrend";

export function GoalsContent() {
  return (
    <div className="space-y-6">
      <header className="motion-stagger">
        <h1 className="text-[24px] font-bold tracking-tight text-primary">Goals</h1>
        <p className="mt-1 text-[14px] text-secondary">
          Your weekly and monthly plans. Check a task off when it&rsquo;s actually done.
        </p>
      </header>

      <TaskGroup title="This Week" bucket="weekly" />

      <WeeklyTrend />

      <TaskGroup title="This Month" bucket="monthly" />

      <MonthlyTrend />
    </div>
  );
}