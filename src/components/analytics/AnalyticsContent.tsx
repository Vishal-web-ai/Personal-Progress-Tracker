"use client";

import React, { useCallback, useMemo, useRef, useState } from "react";
import {
  Percent,
  BarChart3,
  TrendingUp,
  ChartNoAxesColumnIncreasing,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useApp } from "@/store/app-store";
import { EmptyState } from "@/components/ui/EmptyState";
import { cn } from "@/lib/utils";
import {
  buildPeriodSet,
  buildWeekDays,
  percentDelta,
  type AnalyticsPeriod,
  type PeriodPoint,
} from "@/lib/analytics";
import { CompletionBarChart } from "@/components/charts/CompletionBarChart";
import { CompletionTrendChart } from "@/components/charts/CompletionTrendChart";
import {
  startOfDay,
  startOfWeek,
  startOfMonth,
  WEEKDAYS_SHORT,
  MONTHS,
  monthKey,
  monthLabel,
} from "@/lib/time";
import type { Task, WorkSession } from "@/types";
import { MonthPicker } from "@/components/ui/MonthPicker";
const DAY = 86400000;

const PERIODS: { id: AnalyticsPeriod; label: string }[] = [
  { id: "weekly", label: "Weekly" },
  { id: "monthly", label: "Monthly" },
];

const MAX_WEEK_OFFSET = -11;
const MAX_MONTH_OFFSET = -24; // ~2 years back

function pastPeriodWord(period: AnalyticsPeriod): string {
  switch (period) {
    case "daily":
      return "yesterday";
    case "weekly":
      return "last week";
    case "monthly":
      return "last month";
  }
}

function currentWord(period: AnalyticsPeriod): string {
  switch (period) {
    case "daily":
      return "Today";
    case "weekly":
      return "This week";
    case "monthly":
      return "This month";
  }
}

/** Renders "↑ 20% vs yesterday" with a neutral/positive arrow direction. */
function DeltaBadge({
  delta,
  previousWord,
  suffix,
  equalLabel,
}: {
  delta: { diff: number; pct: number | null };
  previousWord: string;
  suffix: string;
  equalLabel?: string;
}) {
  const up = delta.diff >= 0;
  const hasPct = delta.pct !== null;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-[12px] tabular-nums",
        delta.diff === 0 ? "text-secondary" : up ? "text-low" : "text-high"
      )}
    >
      {delta.diff === 0 ? (
        <span>{equalLabel ?? `Same as ${previousWord}`}</span>
      ) : (
        <>
          <span className="text-[inherit]">{up ? "↑" : "↓"}</span>
          <span>
            {hasPct ? `${Math.abs(delta.pct!)}%` : Math.abs(delta.diff)} {suffix} vs {previousWord}
          </span>
        </>
      )}
</span>
   );
}
 
function buildWeekBlocks(startTimestamp: number, numWeeks: number, tasks: Task[], sessions: WorkSession[]) {
   const DAY = 86400000;
   const plannedMap = new Map<number, number>();
   const completedMap = new Map<number, number>();
   const focusMap = new Map<number, number>();
 
   for (const t of tasks) {
        if (t.createdAt) {
          const dayStart = startOfDay(new Date(t.createdAt));
          plannedMap.set(dayStart, (plannedMap.get(dayStart) ?? 0) + 1);
        }
        if (t.completedAt) {
          const dayStart = startOfDay(new Date(t.completedAt));
          completedMap.set(dayStart, (completedMap.get(dayStart) ?? 0) + 1);
        }
      }

      for (const s of sessions) {
        if (s.status !== "saved") continue;
        const anchor = s.endedAt ?? s.startedAt;
        if (!anchor) continue;
        const mins = (s.activeDuration ?? 0) / 60000;
        if (mins <= 0) continue;
        const dayStart = startOfDay(new Date(anchor));
        focusMap.set(dayStart, (focusMap.get(dayStart) ?? 0) + mins);
      }
 
   const points: PeriodPoint[] = [];
   for (let weekIndex = 0; weekIndex < numWeeks; weekIndex++) {
     const weekStart = startTimestamp + weekIndex * 7 * DAY;
     let planned = 0;
     let completed = 0;
     let focus = 0;
     for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
       const dayStart = weekStart + dayOffset * DAY;
       planned += plannedMap.get(dayStart) ?? 0;
       completed += completedMap.get(dayStart) ?? 0;
       focus += focusMap.get(dayStart) ?? 0;
     }
     const pct = planned === 0 ? null : Math.round((completed / planned) * 100);
     const startDate = new Date(weekStart);
     const endDate = new Date(weekStart + 6 * DAY); // last day of week
     const label = `Week ${weekIndex + 1}`;
     const title = `${startDate.getDate()} ${MONTHS[startDate.getMonth()].slice(0, 3)} – ${endDate.getDate()} ${MONTHS[endDate.getMonth()].slice(0, 3)}, ${startDate.getFullYear()}`;
     points.push({
       key: String(weekStart),
       start: weekStart,
       label,
       title,
       planned,
       completed,
       focusMinutes: focus,
       pct,
     });
   }
 
   // Also compute a title for the whole block (optional)
   const start = new Date(startTimestamp);
   const end = new Date(startTimestamp + numWeeks * 7 * DAY - 1); // last ms
   const blockTitle = `${start.getDate()} ${MONTHS[start.getMonth()].slice(0, 3)} – ${end.getDate()} ${MONTHS[end.getMonth()].slice(0, 3)}, ${start.getFullYear()}`;
   return { points, title: blockTitle };
 }

export function AnalyticsContent() {
  const { tasks, sessions } = useApp();
  const [period, setPeriod] = useState<AnalyticsPeriod>("weekly");
  const [transitionKey, setTransitionKey] = useState(0);
  const [weekOffset, setWeekOffset] = useState(0);
  const [monthOffset, setMonthOffset] = useState(0);
  const [selectedMonthStart, setSelectedMonthStart] = useState(startOfMonth(new Date()));

    // Filter tasks by bucket
  const weeklyTasks = useMemo(() => tasks.filter((t) => t.bucket === "weekly"), [tasks]);
  const dailyTasks = useMemo(() => tasks.filter((t) => t.bucket === "daily"), [tasks]);
  const monthlyTasks = useMemo(() => tasks.filter((t) => t.bucket === "monthly"), [tasks]);

  // For monthly period, build weekly breakdown of selected month for trend chart
const monthData = useMemo(() => {
    if (period !== "monthly") return null;
    const baseMonthStart = startOfMonth(new Date(selectedMonthStart));
    const offsetMonthStart = baseMonthStart + monthOffset * 28 * DAY; // roughly 4 weeks per month
    // Align to month start
    const monthStart = startOfMonth(new Date(offsetMonthStart));
    const weekBlocks = buildWeekBlocks(monthStart, 5, dailyTasks, sessions);
    return weekBlocks;
  }, [period, dailyTasks, sessions, selectedMonthStart, monthOffset]);

  const set = useMemo(
    () => buildPeriodSet(period, period === "monthly" ? monthlyTasks : weeklyTasks, sessions),
    [period, weeklyTasks, monthlyTasks, sessions]
  );

  const weekData = useMemo(
    () => buildWeekDays(weekOffset, dailyTasks, sessions),
    [weekOffset, dailyTasks, sessions]
  );

  const hasAnyData = useMemo(
    () => tasks.some((t) => t.status === "done" || t.createdAt) && tasks.length > 0,
    [tasks]
  );

  const changePeriod = (next: AnalyticsPeriod) => {
    if (next === period) return;
    setPeriod(next);
    setTransitionKey((k) => k + 1);
  };

  const changeWeek = (offset: number) => {
    const clamped = Math.max(MAX_WEEK_OFFSET, Math.min(0, offset));
    setWeekOffset(clamped);
    setTransitionKey((k) => k + 1);
  };

  const changeMonth = (offset: number) => {
    setMonthOffset(offset);
    setTransitionKey((k) => k + 1);
  };

  const rateDelta = percentDelta(set.current, set.previous);

  const periodWord = pastPeriodWord(period);
  const titleWord = currentWord(period);
  const mainTitle =
    set.current?.title ??
    (period === "daily" ? "Today" : period === "weekly" ? "This week" : "This month");

  // Swipe gesture
  const touchStartX = useRef<number | null>(null);
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  }, []);
  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (touchStartX.current === null) return;
      const dx = e.changedTouches[0].clientX - touchStartX.current;
      touchStartX.current = null;
      if (Math.abs(dx) < 40) return; // threshold
      if (period === "weekly") {
        if (dx > 0) {
          // swipe right → next week (newer, toward 0)
          changeWeek(weekOffset - 1);
        } else {
          // swipe left → previous week (older, toward past)
          changeWeek(weekOffset + 1);
        }
      } else if (period === "monthly") {
        if (dx > 0) {
          // swipe right → next month (newer)
          changeMonth(monthOffset - 1);
        } else {
          // swipe left → previous month (older)
          changeMonth(monthOffset + 1);
        }
      }
    },
    [period, weekOffset, monthOffset]
  );

  const isWeekly = period === "weekly";

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4 motion-stagger">
        <div>
          <h1 className="text-[24px] font-bold tracking-tight text-primary">Analytics</h1>
          <p className="mt-1 text-[14px] text-secondary">
            How your productivity is trending across every day, week and month.
          </p>
        </div>

        {/* Segmented control */}
        <div
          className="inline-flex rounded-full border border-border bg-surface-elevated p-1"
          role="tablist"
          aria-label="Analytics period"
        >
          {PERIODS.map((p) => {
            const active = period === p.id;
            return (
              <button
                key={p.id}
                role="tab"
                aria-selected={active}
                onClick={() => changePeriod(p.id)}
                className={cn(
                  "seg-control rounded-full px-4 py-1.5 text-[13px] font-semibold",
                  active
                    ? "bg-accent text-[#061b14]"
                    : "text-secondary hover:text-primary"
                )}
              >
                {p.label}
              </button>
            );
          })}
        </div>
      </header>

      {!hasAnyData ? (
        <EmptyState
          icon={<BarChart3 size={22} />}
          title="No productivity data yet"
          message="Complete a few tasks to start building your productivity history."
        />
      ) : (
        <div key={`period-${period}-${transitionKey}`} className="space-y-6">
{/* KPI cards */}
       <section className="motion-stagger grid gap-3 grid-cols-2">
         <KpiCard
              icon={<Percent size={17} />}
              label="Completion Rate"
              subtitle={`${titleWord} statistics`}
              value={`${set.current?.pct == null ? "—" : `${set.current.pct}%`}`}
              badge={<DeltaBadge delta={rateDelta} previousWord={periodWord} suffix="pp" />}
              delay={0}
            />
            <KpiCard
              icon={<BarChart3 size={17} />}
              label="Tasks Completed"
              subtitle={`${titleWord} statistics`}
              value={String(set.current?.completed ?? 0)}
              badge={<DeltaBadge delta={rateDelta} previousWord={periodWord} suffix="pp" />}
              delay={1}
            />
          </section>

          {/* Completion bar chart */}
<section className="rounded-[22px] border border-border bg-surface p-5 sm:p-6">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <ChartNoAxesColumnIncreasing size={18} className="text-muted" />
                  <h2 className="text-[17px] font-bold tracking-tight text-primary">
                    {period === "monthly" ? "Monthly Progress Report" : period === "weekly" ? "Weekly Progress Report" : "Task Completion"}
                  </h2>
                </div>
                {period === "daily" && (
                  <span className="text-[12px] text-muted">
                    {mainTitle} · Completion rate
                  </span>
                )}
              </div>
              <CompletionBarChart
                points={set.points}
                animateKey={`${period}-${transitionKey}`}
                baseDelay={280}
              />
              <div className="mt-3 flex items-center justify-end gap-4 text-[12px] text-muted">
                <span className="flex items-center gap-1.5">
                  <span className="inline-block h-[10px] w-[10px] rounded-[3px] bg-accent-dark" />
                  Completion Rate
                </span>
              </div>
            </section>

          {/* Trend chart */}
          <section className="rounded-[22px] border border-border bg-surface p-5 sm:p-6">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex items-center gap-2">
                <TrendingUp size={18} className="text-muted" />
                <h2 className="text-[17px] font-bold tracking-tight text-primary">
                  {period === "monthly"
                    ? "Weekly Productivity Trend"
                    : period === "weekly"
                    ? "Daily Productivity Trend"
                    : "Productivity Trend"}
                </h2>
              </div>
            </div>

            {/* Week navigation — only when weekly */}
            {isWeekly && (
              <div className="mb-4 flex items-center justify-center gap-2">
                <button
                  onClick={() => changeWeek(weekOffset - 1)}
                  disabled={weekOffset <= MAX_WEEK_OFFSET}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border bg-surface-elevated text-secondary transition-colors disabled:opacity-30"
                  aria-label="Previous week"
                >
                  <ChevronLeft size={16} />
                </button>
                <span className="text-[13px] font-medium text-primary whitespace-nowrap">
                  {weekData.title}
                </span>
                <button
                  onClick={() => changeWeek(weekOffset + 1)}
                  disabled={weekOffset >= 0}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border bg-surface-elevated text-secondary transition-colors disabled:opacity-30"
                  aria-label="Next week"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            )}

            {/* Month navigation — only when monthly */}
            {period === "monthly" && monthData && (
              <div className="mb-4 flex items-center justify-center gap-2">
                <button
                  onClick={() => changeMonth(monthOffset - 1)}
                  disabled={monthOffset <= MAX_MONTH_OFFSET}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border bg-surface-elevated text-secondary transition-colors disabled:opacity-30"
                  aria-label="Previous month"
                >
                  <ChevronLeft size={16} />
                </button>
                <span className="text-[13px] font-medium text-primary whitespace-nowrap">
                  {monthData.title}
                </span>
                <button
                  onClick={() => changeMonth(monthOffset + 1)}
                  disabled={monthOffset >= 0}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border bg-surface-elevated text-secondary transition-colors disabled:opacity-30"
                  aria-label="Next month"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            )}

            {/* Swipeable chart container */}
            <div
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
              className="touch-pan-y"
            >
              {isWeekly ? (
                <CompletionTrendChart
                    points={weekData.points}
                    metric="pct"
                    animateKey={`week-${weekOffset}-pct-${transitionKey}`}
                    baseDelay={750}
                    customLabels={weekData.points.map((p) => p.label)}
                  />
              ) : period === "monthly" && monthData ? (
                              <CompletionTrendChart
                                                 points={monthData.points}
                                                 metric="pct"
                                                 animateKey={`month-weekly-${transitionKey}`}
                                                 baseDelay={750}
                                                 customLabels={monthData.points.map((p) => p.label)}
                                               />
                            ) : (
                <CompletionTrendChart
                  points={[...set.points].reverse()}
                  metric="pct"
                  animateKey={`${period}-pct-${transitionKey}`}
                  baseDelay={750}
                />
              )}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

function KpiCard({
  icon,
  label,
  subtitle,
  value,
  badge,
  delay,
}: {
  icon: React.ReactNode;
  label: string;
  subtitle: string;
  value: string;
  badge: React.ReactNode;
  delay: number;
}) {
  return (
    <div
      className="rounded-[18px] border border-border bg-surface p-4"
      style={{ animationDelay: `${delay * 60}ms` }}
    >
      <div className="flex items-center gap-2 text-muted">
        {icon}
        <span className="text-[12px]">{label}</span>
      </div>
<p
         key={value}
         className="kpi-in mt-1.5 text-[28px] font-bold tabular-nums tracking-tight text-primary text-center"
       >
         {value}
       </p>
      <div className="mt-1">
        <p className="text-[12px] text-muted">{subtitle}</p>
        <div className="mt-1">{badge}</div>
      </div>
    </div>
  );
}
