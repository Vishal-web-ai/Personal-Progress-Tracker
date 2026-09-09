"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { useContainerWidth } from "@/lib/useContainerWidth";
import type { PeriodPoint } from "@/lib/analytics";

interface CompletionBarChartProps {
  points: PeriodPoint[];
  animateKey: string;
  height?: number;
  baseDelay?: number;
  className?: string;
}

const MIN_BAR = 30;
const SLOT = 58;
const PAD = { top: 18, bottom: 26, left: 8, right: 8 };

function formatMinutes(min: number): string {
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  if (h === 0) return `${m}m`;
  return `${h}h${m > 0 ? ` ${m}m` : ""}`;
}

function TooltipCard({ point }: { point: PeriodPoint }) {
  return (
    <div className="rounded-[12px] border border-border bg-surface-elevated px-3 py-2 text-[12px]">
      <p className="font-semibold text-primary">{point.title}</p>
      <p className="mt-1 text-secondary">
        {point.completed} completed · {point.planned} planned
      </p>
      <p className="text-accent tabular-nums">
        {point.pct == null ? "No tasks planned" : `${point.pct}% completion`}
      </p>
      <p className="mt-0.5 text-muted">{formatMinutes(point.focusMinutes)} focus</p>
    </div>
  );
}

/**
 * Animated bar chart showing planned vs completed tasks per period.
 * Each slot has a muted track (planned) and a bright fill (completed) on top —
 * the unfilled gap instantly shows incomplete work. Every period is labeled
 * along the x-axis. Bars grow from height 0 with a light stagger.
 */
export function CompletionBarChart({
  points,
  animateKey,
  height = 220,
  baseDelay = 0,
  className,
}: CompletionBarChartProps) {
  const { ref, width } = useContainerWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const [pinned, setPinned] = useState<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const data = useMemo(() => [...points].reverse(), [points]);
  const max = Math.max(1, ...data.map((d) => d.planned));

  const contentWidth = data.length * SLOT + PAD.left + PAD.right;
  const chartW = Math.max(contentWidth, width);
  const innerH = height - PAD.top - PAD.bottom;
  const xFor = (i: number) => PAD.left + SLOT * i + SLOT / 2 - MIN_BAR / 2;
  const yFor = (v: number) => PAD.top + innerH - (v / max) * innerH;

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollLeft = el.scrollWidth;
  }, [animateKey, data.length, width]);

  const tooltipIndex = pinned ?? hover;
  const active = tooltipIndex !== null ? data[tooltipIndex] : null;

  return (
    <div ref={ref} className={cn("w-full min-w-0", className)}>
      {width === 0 ? (
        <div style={{ height }} />
      ) : (
        <div ref={scrollRef} className="overflow-x-auto [scrollbar-width:thin]">
          <svg width={chartW} height={height} role="img" aria-label="Task completion bar chart" className="block">
            {[0, 0.5, 1].map((f) => {
              const y = PAD.top + innerH * (1 - f);
              return (
                <line
                  key={f}
                  x1={PAD.left}
                  x2={chartW - PAD.right}
                  y1={y}
                  y2={y}
                  stroke="var(--border-soft)"
                  strokeWidth={1}
                />
              );
            })}
            <text x={PAD.left} y={PAD.top + 4} fontSize={10} fill="var(--text-muted)">
              {max}
            </text>
            <text x={PAD.left} y={PAD.top + innerH} fontSize={10} fill="var(--text-muted)">
              0
            </text>

            {(() => {
              let labelCursor = -Infinity;
              return data.map((d, i) => {
                const plannedH = (d.planned / max) * innerH;
                const completedH = (d.completed / max) * innerH;
                const x = xFor(i);
                const isCurrent = i === data.length - 1;
                const isActive = tooltipIndex === i;
                const hasData = d.planned > 0;

                const labelW = d.label.length * 5.1;
                const labelX = x + MIN_BAR / 2;
                const showLabel = isCurrent || labelX - labelW / 2 >= labelCursor;
                if (showLabel) labelCursor = labelX + labelW / 2;

                return (
                  <g
                    key={d.key}
                    className="cursor-pointer"
                    onMouseEnter={() => setHover(i)}
                    onMouseLeave={() => setHover(null)}
                    onClick={() => setPinned((p) => (p === i ? null : i))}
                  >
                    <rect x={PAD.left + SLOT * i} y={PAD.top} width={SLOT} height={innerH} fill="transparent" />
                    {hasData && (
                      <rect
                        key={`${animateKey}-${d.key}-track`}
                        x={x}
                        y={yFor(d.planned)}
                        width={MIN_BAR}
                        height={plannedH}
                        rx={Math.min(7, MIN_BAR / 2)}
                        fill="var(--ring-track)"
                        opacity={isActive ? 1 : 0.7}
                        className="chart-grow"
                        style={{
                          animationDelay: `${baseDelay + i * 35}ms`,
                          transformOrigin: `${x + MIN_BAR / 2}px ${PAD.top + innerH}px`,
                        }}
                      />
                    )}
                    {hasData && d.completed > 0 && (
                      <rect
                        key={`${animateKey}-${d.key}-fill`}
                        x={x}
                        y={yFor(d.completed)}
                        width={MIN_BAR}
                        height={completedH}
                        rx={Math.min(7, MIN_BAR / 2)}
                        fill={isCurrent ? "var(--accent)" : "var(--accent-dark)"}
                        opacity={isActive ? 1 : 0.92}
                        className="chart-grow"
                        style={{
                          animationDelay: `${baseDelay + i * 35}ms`,
                          transformOrigin: `${x + MIN_BAR / 2}px ${PAD.top + innerH}px`,
                        }}
                      />
                    )}
                    <text
                      x={x + MIN_BAR / 2}
                      y={height - 8}
                      textAnchor="middle"
                      fontSize={8.5}
                      fill="var(--text-muted)"
                      className="select-none"
                    >
                      {showLabel ? d.label : ""}
                    </text>
                  </g>
                );
              });
            })()}

            {tooltipIndex !== null && active && (
              <g pointerEvents="none">
                <line
                  x1={xFor(tooltipIndex)}
                  x2={xFor(tooltipIndex)}
                  y1={PAD.top}
                  y2={PAD.top + innerH}
                  stroke="var(--border)"
                  strokeWidth={1}
                  strokeDasharray="3 3"
                />
                {(() => {
                  const w = 132;
                  const bx = Math.min(chartW - w - 4, Math.max(4, xFor(tooltipIndex) - w / 2));
                  const by = Math.max(2, yFor(active.planned) - 46);
                  return (
                    <g>
                      <rect x={bx} y={by} width={w} height={38} rx={10} fill="var(--surface-elevated)" stroke="var(--border)" />
                      <text x={bx + w / 2} y={by + 14} textAnchor="middle" fontSize={10} fontWeight={600} fill="var(--text-primary)">
                        {active.title}
                      </text>
                      <text x={bx + w / 2} y={by + 28} textAnchor="middle" fontSize={10} fill="var(--text-muted)">
                        {active.completed} of {active.planned}
                        {active.pct == null ? "" : ` · ${active.pct}%`}
                      </text>
                    </g>
                  );
                })()}
              </g>
            )}
          </svg>
        </div>
      )}

      {active && (
        <div className="mt-2 sm:hidden">
          <TooltipCard point={active} />
        </div>
      )}
    </div>
  );
}
