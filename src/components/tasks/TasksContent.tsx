"use client";

import React from "react";
import { useApp } from "@/store/app-store";
import { TaskGroup } from "@/components/tasks/TaskGroup";
import { TaskHistory } from "@/components/dashboard/TaskHistory";

export function TasksContent() {
  const { tasks } = useApp();
  const active = tasks.filter((t) => t.status !== "done" && !t.archived).length;
  const done = tasks.filter((t) => t.status === "done" && !t.archived).length;

  return (
    <div className="space-y-6">
      <header className="motion-stagger">
        <h1 className="text-[24px] font-bold tracking-tight text-primary">Tasks</h1>
        <p className="mt-1 text-[14px] text-secondary">
          {active} active · {done} done
        </p>
      </header>

      <TaskGroup title="Daily tasks" bucket="daily" />

      <TaskGroup title="Weekly tasks" bucket="weekly" />

      <TaskGroup title="Monthly tasks" bucket="monthly" />

      <TaskHistory mode="all" />
    </div>
  );
}