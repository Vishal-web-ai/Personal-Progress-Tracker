"use client";

import React, { useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, Line, ReferenceLine } from "recharts";
import { cn } from "@/lib/utils";
import { Goal, Phase } from "@/types";

interface PhaseProgressChartProps {
  goal: Goal;
  className?: string;
}

export function PhaseProgressChart({ goal, className }: PhaseProgressChartProps) {
  const data = useMemo(() => {
    return goal.phases.map((phase, index) => {
      const total = phase.tasks.length;
      const done = phase.tasks.filter((t) => t.status === "done").length;
      const pct = total > 0 ? Math.round((done / total) * 100) : 0;
      return {
        name: `P${index + 1}`,
        label: phase.title.length > 12 ? phase.title.slice(0, 12) + "…" : phase.title,
        fullLabel: phase.title,
        progress: pct,
        total,
        done,
        status: phase.status,
        estimatedHours: Math.round((phase.estimatedMinutes || 0) / 60),
        actualHours: Math.round((phase.actualMinutes || 0) / 60),
        color: phase.status === "completed" ? "var(--color-low)" : 
               phase.status === "active" ? "var(--accent)" : "var(--text-muted)",
      };
    });
  }, [goal]);

  const goalColor = goal.color || "var(--accent)";

  return (
    <div className={cn("rounded-[18px] border border-border bg-surface p-5", className)}>
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full" style={{ backgroundColor: goalColor }} />
          <h3 className="text-[15px] font-semibold text-primary">Phase Progress</h3>
        </div>
        <span className="text-[12px] text-muted">{goal.phases.length} phases</span>
      </div>

      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={data} layout="vertical" margin={{ top: 10, right: 30, left: 10, bottom: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border-soft)" vertical={false} />
          <XAxis
            type="number"
            domain={[0, 100]}
            tick={{ fill: "var(--text-muted)", fontSize: 11 }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            type="category"
            dataKey="name"
            width={100}
            tick={{ fill: "var(--text-secondary)", fontSize: 12, fontWeight: 500 }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            content={({ active, payload }: { active?: boolean; payload?: any }) => {
              if (!active || !payload?.length) return null;
              const item = payload[0].payload;
              return (
                <div className="rounded-[12px] bg-surface-elevated border border-border p-3 shadow-xl">
                  <p className="font-medium text-primary">{item.fullLabel}</p>
                  <p className="mt-1 text-[13px] text-secondary">{item.done} / {item.total} tasks ({item.progress}%)</p>
                  {item.estimatedHours > 0 && (
                    <p className="mt-1 text-[12px] text-muted">Est: {item.estimatedHours}h</p>
                  )}
                  {item.actualHours > 0 && (
                    <p className="mt-1 text-[12px] text-accent">Actual: {item.actualHours}h</p>
                  )}
                  <p className="mt-1 text-[11px] text-muted capitalize">Status: {item.status}</p>
                </div>
              );
            }}
          />
          <Bar
            dataKey="progress"
            radius={[0, 8, 8, 0]}
            maxBarSize={32}
          >
            {data.map((entry, index) => (
              <Cell key={index} fill={entry.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {/* Legend */}
      <div className="mt-4 flex flex-wrap items-center gap-4 text-[12px]">
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full" style={{ backgroundColor: "var(--accent)" }} />
          <span className="text-muted">Active</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full" style={{ backgroundColor: "var(--color-low)" }} />
          <span className="text-muted">Completed</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full" style={{ backgroundColor: "var(--text-muted)" }} />
          <span className="text-muted">Pending</span>
        </div>
      </div>
    </div>
  );
}

interface PhaseVelocityChartProps {
  goal: Goal;
  className?: string;
}

export function PhaseVelocityChart({ goal, className }: PhaseVelocityChartProps) {
  const data = useMemo(() => {
    const completedPhases = goal.phases.filter((p) => p.status === "completed");
    return completedPhases.map((phase, index) => {
      const est = phase.estimatedMinutes || 0;
      const act = phase.actualMinutes || 0;
      const variance = est > 0 ? Math.round(((act - est) / est) * 100) : 0;
      return {
        phase: `P${goal.phases.findIndex((p) => p.id === phase.id) + 1}`,
        label: phase.title,
        estimated: Math.round(est / 60),
        actual: Math.round(act / 60),
        variance,
        completedAt: phase.completedAt ? new Date(phase.completedAt).toLocaleDateString() : "",
      };
    });
  }, [goal]);

  if (data.length === 0) {
    return (
      <div className={cn("rounded-[18px] border border-border bg-surface p-5", className)}>
        <div className="text-center py-8 text-muted">
          <div className="mx-auto mb-3 h-12 w-12 rounded-full bg-surface-elevated flex items-center justify-center">
            <TrendingUp className="h-6 w-6" />
          </div>
          <p className="text-[14px] font-medium text-secondary">No completed phases yet</p>
          <p className="mt-1 text-[12px]">Velocity data appears after phases complete</p>
        </div>
      </div>
    );
  }

  const goalColor = goal.color || "var(--accent)";

  return (
    <div className={cn("rounded-[18px] border border-border bg-surface p-5", className)}>
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4" style={{ color: goalColor }} />
          <h3 className="text-[15px] font-semibold text-primary">Phase Velocity</h3>
        </div>
        <span className="text-[12px] text-muted">{data.length} completed</span>
      </div>

      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={data} margin={{ top: 10, right: 30, left: 10, bottom: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border-soft)" vertical={false} />
          <XAxis
            type="number"
            tick={{ fill: "var(--text-muted)", fontSize: 11 }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            type="category"
            dataKey="phase"
            width={80}
            tick={{ fill: "var(--text-secondary)", fontSize: 12, fontWeight: 500 }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            content={({ active, payload }: { active?: boolean; payload?: any }) => {
              if (!active || !payload?.length) return null;
              const item = payload[0].payload;
              const otherPayload = payload[1]?.payload;
              return (
                <div className="rounded-[12px] bg-surface-elevated border border-border p-3 shadow-xl">
                  <p className="font-medium text-primary">{item.label}</p>
                  <p className="mt-1 text-[13px] text-secondary">Estimated: {item.estimated}h</p>
                  <p className="mt-1 text-[13px] text-accent">Actual: {item.actual}h</p>
                  <p className={cn(
                    "mt-1 text-[12px] font-medium",
                    item.variance > 0 ? "text-high" : item.variance < 0 ? "text-low" : "text-muted"
                  )}>
                    Variance: {item.variance > 0 ? "+" : ""}{item.variance}%
                  </p>
                  <p className="mt-1 text-[11px] text-muted">Completed: {item.completedAt}</p>
                </div>
              );
            }}
          />
          <Bar dataKey="estimated" name="Estimated" fill="var(--text-muted)" fillOpacity={0.4} radius={[0, 6, 6, 0]} maxBarSize={20} />
          <Bar dataKey="actual" name="Actual" fill="var(--accent)" radius={[0, 6, 6, 0]} maxBarSize={20} />
          <ReferenceLine x={0} stroke="var(--border)" strokeWidth={1} />
        </BarChart>
      </ResponsiveContainer>

      {/* Variance Summary */}
      <div className="mt-4 grid grid-cols-3 gap-3">
        <div className="rounded-xl bg-surface-elevated p-3 text-center">
          <div className="text-[18px] font-bold tabular-nums text-primary">
            {data.reduce((sum, d) => sum + d.estimated, 0)}h
          </div>
          <div className="text-[11px] text-muted">Total Estimated</div>
        </div>
        <div className="rounded-xl bg-surface-elevated p-3 text-center">
          <div className="text-[18px] font-bold tabular-nums text-accent">
            {data.reduce((sum, d) => sum + d.actual, 0)}h
          </div>
          <div className="text-[11px] text-muted">Total Actual</div>
        </div>
        <div className="rounded-xl bg-surface-elevated p-3 text-center">
          <div className={cn(
            "text-[18px] font-bold tabular-nums",
            data.reduce((sum, d) => sum + d.variance, 0) / data.length > 0 ? "text-high" : "text-low"
          )}>
            {Math.round(data.reduce((sum, d) => sum + d.variance, 0) / data.length)}%
          </div>
          <div className="text-[11px] text-muted">Avg Variance</div>
        </div>
      </div>
    </div>
  );
}

interface PhaseTimelineProps {
  goal: Goal;
  className?: string;
}

export function PhaseTimeline({ goal, className }: PhaseTimelineProps) {
  const goalColor = goal.color || "var(--accent)";

  return (
    <div className={cn("rounded-[18px] border border-border bg-surface p-5", className)}>
      <div className="mb-4 flex items-center gap-2">
        <div className="h-2 w-2 rounded-full" style={{ backgroundColor: goalColor }} />
        <h3 className="text-[15px] font-semibold text-primary">Phase Timeline</h3>
      </div>

      <div className="relative pl-4 border-l border-border-soft">
        {goal.phases.map((phase, index) => {
          const isLast = index === goal.phases.length - 1;
          const total = phase.tasks.length;
          const done = phase.tasks.filter((t) => t.status === "done").length;
          const pct = total > 0 ? Math.round((done / total) * 100) : 0;
          
          const statusColors: Record<string, string> = {
            pending: "var(--text-muted)",
            active: "var(--accent)",
            completed: "var(--color-low)",
          };

          return (
            <div key={phase.id} className="relative pb-6 last:pb-0">
              {/* Timeline dot */}
              <div
                className="absolute left-[-6px] top-0 h-3 w-3 rounded-full border-2 border-background"
                style={{
                  backgroundColor: statusColors[phase.status],
                  boxShadow: `0 0 0 2px ${statusColors[phase.status]}`,
                }}
              />
              
              {/* Connecting line */}
              {!isLast && (
                <div className="absolute left-[-4px] top-3 bottom-0 w-0.5" style={{ backgroundColor: "var(--border-soft)" }} />
              )}

              {/* Phase content */}
              <div className="ml-4">
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="text-[14px] font-medium text-primary truncate">{phase.title}</h4>
                      <span
                        className={cn(
                          "px-2 py-0.5 rounded-full text-[10px] font-medium uppercase tracking-wide",
                          phase.status === "completed" && "bg-low/10 text-low",
                          phase.status === "active" && "bg-accent/10 text-accent",
                          phase.status === "pending" && "bg-muted/10 text-muted"
                        )}
                      >
                        {phase.status}
                      </span>
                    </div>
                    {phase.description && (
                      <p className="mt-1 text-[12px] text-muted line-clamp-2">{phase.description}</p>
                    )}
                    <div className="mt-2 flex items-center gap-3 text-[11px] text-muted">
                      <span>{done}/{total} tasks ({pct}%)</span>
                      {phase.estimatedMinutes && (
                        <span className="flex items-center gap-1">
                          <Clock size={11} />
                          {Math.round(phase.estimatedMinutes / 60)}h est.
                        </span>
                      )}
                      {phase.actualMinutes && phase.actualMinutes > 0 && (
                        <span className="flex items-center gap-1 text-accent">
                          <TrendingUp size={11} />
                          {Math.round(phase.actualMinutes / 60)}h actual
                        </span>
                      )}
                      {phase.targetDate && (
                        <span className="flex items-center gap-1">
                          <Calendar size={11} />
                          Target: {new Date(phase.targetDate).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {goal.phases.length === 0 && (
        <div className="text-center py-8 text-muted">
          <p className="text-[14px]">No phases in this goal yet</p>
        </div>
      )}
    </div>
  );
}

import { TrendingUp, Clock, Calendar } from "lucide-react";