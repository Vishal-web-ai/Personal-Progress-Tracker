"use client";

import React, { useCallback, useMemo, useRef, useState } from "react";
import {
  CheckCircle2,
  Percent,
  Timer,
  BarChart3,
  TrendingUp,
  ChartNoAxesColumnIncreasing,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useApp } from "@/store/app-store";
import { EmptyState } from "@/components/ui/EmptyState";
import { cn } from "@/lib/utils";
import { formatDuration } from "@/lib/utils";
import {
  buildPeriodSet,
  buildWeekDays,
  percentDelta,
  countDelta,
  focusDelta,
  type AnalyticsPeriod,
} from "@/lib/analytics";
import { CompletionBarChart } from "@/components/charts/CompletionBarChart";
import {
  CompletionTrendChart,
  type TrendMetric,
} from "@/components/charts/CompletionTrendChart";

const PERIODS: { id: AnalyticsPeriod; label: string }[] = [
  { id: "weekly", label: "Weekly" },
  { id: "monthly", label: "Monthly" },
];

const TREND_METRICS: { id: TrendMetric; label: string }[] = [
  { id: "completed", label: "Completed" },
  { id: "focusMinutes", label: "Focus time" },
];

const WEEK_PILLS = [
  { offset: 0, label: "This week" },
  { offset: -1, label: "Last week" },
  { offset: -2, label: "2 weeks ago" },
  { offset: -3, label: "3 weeks ago" },
];

const MAX_WEEK_OFFSET = -11;

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

export function AnalyticsContent() {
  const { tasks, sessions } = useApp();
  const [period, setPeriod] = useState<AnalyticsPeriod>("weekly");
  const [trendMetric, setTrendMetric] = useState<TrendMetric>("completed");
  const [transitionKey, setTransitionKey] = useState(0);
  const [weekOffset, setWeekOffset] = useState(0);

  const set = useMemo(
    () => buildPeriodSet(period, tasks, sessions),
    [period, tasks, sessions]
  );

  const weekData = useMemo(
    () => buildWeekDays(weekOffset, tasks, sessions),
    [weekOffset, tasks, sessions]
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

  const changeMetric = (m: TrendMetric) => {
    setTrendMetric(m);
    setTransitionKey((k) => k + 1);
  };

  const changeWeek = (offset: number) => {
    const clamped = Math.max(MAX_WEEK_OFFSET, Math.min(0, offset));
    setWeekOffset(clamped);
    setTransitionKey((k) => k + 1);
  };

  const completedDelta = countDelta(set.current, set.previous);
  const rateDelta = percentDelta(set.current, set.previous);
  const focusDeltaResult = focusDelta(set.current, set.previous);

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
      if (dx > 0) {
        // swipe right → previous week (higher offset, toward 0)
        changeWeek(weekOffset + 1);
      } else {
        // swipe left → next week (lower offset, toward past)
        changeWeek(weekOffset - 1);
      }
    },
    [weekOffset]
  );

  const isWeekly = period === "weekly";
  const weekPillItems = isWeekly
    ? WEEK_PILLS.filter((p) => p.offset >= MAX_WEEK_OFFSET)
    : [];

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
          <section className="motion-stagger grid gap-3 sm:grid-cols-3">
            <KpiCard
              icon={<CheckCircle2 size={17} />}
              label="Tasks Completed"
              subtitle={`${titleWord} statistics`}
              value={String(set.current?.completed ?? 0)}
              badge={<DeltaBadge delta={completedDelta} previousWord={periodWord} suffix="tasks" />}
              delay={0}
            />
            <KpiCard
              icon={<Percent size={17} />}
              label="Completion Rate"
              subtitle={`${titleWord} statistics`}
              value={`${set.current?.pct == null ? "—" : `${set.current.pct}%`}`}
              badge={<DeltaBadge delta={rateDelta} previousWord={periodWord} suffix="pp" />}
              delay={1}
            />
            <KpiCard
              icon={<Timer size={17} />}
              label="Focus Time"
              subtitle={`${titleWord} statistics`}
              value={formatDuration(set.current?.focusMinutes ?? 0)}
              badge={<DeltaBadge delta={focusDeltaResult} previousWord={periodWord} suffix="focus" equalLabel="No focus time" />}
              delay={2}
            />
          </section>

          {/* Completion bar chart */}
          <section className="rounded-[22px] border border-border bg-surface p-5 sm:p-6">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <ChartNoAxesColumnIncreasing size={18} className="text-muted" />
                <h2 className="text-[17px] font-bold tracking-tight text-primary">
                  Task Completion
                </h2>
              </div>
              <span className="text-[12px] text-muted">
                {mainTitle} · {set.current?.completed ?? 0}/{set.current?.planned ?? 0} done
              </span>
            </div>
            <CompletionBarChart
              points={set.points}
              animateKey={`${period}-${transitionKey}`}
              baseDelay={280}
            />
            <div className="mt-3 flex items-center justify-end gap-4 text-[12px] text-muted">
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-[10px] w-[10px] rounded-[3px]" style={{ background: "var(--ring-track)" }} />
                Planned
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-[10px] w-[10px] rounded-[3px] bg-accent-dark" />
                Completed
              </span>
            </div>
          </section>

          {/* Trend chart */}
          <section className="rounded-[22px] border border-border bg-surface p-5 sm:p-6">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <TrendingUp size={18} className="text-muted" />
                <h2 className="text-[17px] font-bold tracking-tight text-primary">
                  Productivity Trend
                </h2>
              </div>
              <div
                className="inline-flex rounded-full border border-border bg-surface-elevated p-0.5"
                role="tablist"
                aria-label="Trend metric"
              >
                {TREND_METRICS.map((m) => {
                  const active = trendMetric === m.id;
                  return (
                    <button
                      key={m.id}
                      role="tab"
                      aria-selected={active}
                      onClick={() => changeMetric(m.id)}
                      className={cn(
                        "seg-control rounded-full px-3 py-1 text-[12px] font-medium",
                        active ? "bg-surface-soft text-primary" : "text-muted hover:text-secondary"
                      )}
                    >
                      {m.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Week navigation — only when weekly */}
            {isWeekly && (
              <div className="mb-4 flex items-center gap-2">
                <button
                  onClick={() => changeWeek(weekOffset + 1)}
                  disabled={weekOffset >= 0}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border bg-surface-elevated text-secondary transition-colors disabled:opacity-30"
                  aria-label="Previous week"
                >
                  <ChevronLeft size={16} />
                </button>
                <div className="flex flex-1 gap-1.5 overflow-x-auto scrollbar-none">
                  {weekPillItems.map((p) => (
                    <button
                      key={p.offset}
                      onClick={() => changeWeek(p.offset)}
                      className={cn(
                        "shrink-0 rounded-full px-3 py-1 text-[12px] font-medium transition-colors",
                        weekOffset === p.offset
                          ? "bg-accent text-[#061b14]"
                          : "border border-border bg-surface-elevated text-muted"
                      )}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => changeWeek(weekOffset - 1)}
                  disabled={weekOffset <= MAX_WEEK_OFFSET}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border bg-surface-elevated text-secondary transition-colors disabled:opacity-30"
                  aria-label="Next week"
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
                <>
                  <p className="mb-2 text-[12px] text-muted">{weekData.title}</p>
                  <CompletionTrendChart
                    points={weekData.points}
                    metric={trendMetric}
                    animateKey={`week-${weekOffset}-${trendMetric}-${transitionKey}`}
                    baseDelay={750}
                    customLabels={weekData.points.map((p) => p.label)}
                  />
                </>
              ) : (
                <CompletionTrendChart
                  points={set.points}
                  metric={trendMetric}
                  animateKey={`${period}-${trendMetric}-${transitionKey}`}
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
        className="kpi-in mt-1.5 text-[28px] font-bold tabular-nums tracking-tight text-primary"
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
