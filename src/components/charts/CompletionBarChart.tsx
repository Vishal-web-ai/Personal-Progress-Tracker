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

const SLOT = 58;
const PAD = { top: 16, bottom: 32, left: 52, right: 16 };
const BAR_W = 28;
const BAR_RADIUS = 6;

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
    </div>
  );
}

/**
 * Animated bar chart showing completion rate (%) per period.
 * Single bar per period showing completion rate. Bars grow from height 0 with a light stagger.
 * Fixed 0-100% scale with proper axis spacing.
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
  // Fixed 0-100% scale for completion rate chart
  const maxRate = 100;

  const contentWidth = data.length * SLOT + PAD.left + PAD.right;
  const chartW = Math.max(contentWidth, width);
  const innerH = height - PAD.top - PAD.bottom;
  const xFor = (i: number) => PAD.left + SLOT * i + SLOT / 2 - BAR_W / 2;
  // yFor maps 0% to bottom (baseline), 100% to top
  const yFor = (rate: number) => PAD.top + innerH - (rate / maxRate) * innerH;
  const baselineY = PAD.top + innerH;

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
          <svg width={chartW} height={height} role="img" aria-label="Task completion rate bar chart" className="block">
            {/* Y-axis gridlines and labels */}
            {[0, 0.25, 0.5, 0.75, 1].map((f) => {
              const y = PAD.top + innerH * (1 - f);
              const isBaseline = f === 0;
              return (
                <g key={f}>
                  <line
                    x1={PAD.left}
                    x2={chartW - PAD.right}
                    y1={y}
                    y2={y}
                    stroke="var(--border-soft)"
                    strokeWidth={isBaseline ? 1.5 : 1}
                    strokeDasharray={isBaseline ? "none" : "2 4"}
                  />
                  <text
                    x={PAD.left - 10}
                    y={y + (f === 1 ? 4 : f === 0 ? 0 : 0)}
                    fontSize={10}
                    fill="var(--text-muted)"
                    textAnchor="end"
                    dominantBaseline={f === 1 ? "hanging" : f === 0 ? "alphabetic" : "middle"}
                  >
                    {f === 1 ? "100%" : f === 0.75 ? "75%" : f === 0.5 ? "50%" : f === 0.25 ? "25%" : "0%"}
                  </text>
                </g>
              );
            })}

            {/* Bars */}
            {(() => {
              let labelCursor = -Infinity;
              return data.map((d, i) => {
                const rate = d.pct ?? 0;
                const x = xFor(i);
                const isCurrent = i === data.length - 1;
                const isActive = tooltipIndex === i;
                const hasData = d.planned > 0;

                const labelW = d.label.length * 5.5;
                const labelX = x + BAR_W / 2;
                const showLabel = isCurrent || labelX - labelW / 2 >= labelCursor;
                if (showLabel) labelCursor = labelX + labelW / 2;

                const barHeight = Math.max(0, baselineY - yFor(rate));

                return (
                  <g
                    key={d.key}
                    className="cursor-pointer"
                    onMouseEnter={() => setHover(i)}
                    onMouseLeave={() => setHover(null)}
                    onClick={() => setPinned((p) => (p === i ? null : i))}
                  >
                    {/* Hit area for hover */}
                    <rect x={PAD.left + SLOT * i} y={PAD.top} width={SLOT} height={innerH} fill="transparent" />
                    
                    {/* Baseline (0% line) */}
                    <line
                      x1={PAD.left + SLOT * i}
                      x2={PAD.left + SLOT * (i + 1)}
                      y1={baselineY}
                      y2={baselineY}
                      stroke="var(--border)"
                      strokeWidth={1.5}
                    />

                    {hasData && (
                      <rect
                        key={`${animateKey}-${d.key}-rate`}
                        x={x}
                        y={yFor(rate)}
                        width={BAR_W}
                        height={barHeight}
                        rx={BAR_RADIUS}
                        ry={BAR_RADIUS}
                        fill={isCurrent ? "var(--accent)" : "var(--accent-dark)"}
                        opacity={isActive ? 1 : 0.92}
                        className="chart-grow"
                        style={{
                          animationDelay: `${baseDelay + i * 35}ms`,
                          transformOrigin: `${x + BAR_W / 2}px ${baselineY}px`,
                        }}
                      />
                    )}

                    {/* X-axis label */}
                    <text
                      x={x + BAR_W / 2}
                      y={height - 4}
                      textAnchor="middle"
                      fontSize={10}
                      fill="var(--text-muted)"
                      className="select-none"
                    >
                      {showLabel ? d.label : ""}
                    </text>
                  </g>
                );
              });
            })()}

            {/* Tooltip */}
            {tooltipIndex !== null && active && (
              <g pointerEvents="none">
                <line
                  x1={xFor(tooltipIndex) + BAR_W / 2}
                  x2={xFor(tooltipIndex) + BAR_W / 2}
                  y1={PAD.top}
                  y2={baselineY}
                  stroke="var(--border)"
                  strokeWidth={1}
                  strokeDasharray="3 3"
                />
                {(() => {
                  const w = 140;
                  const bx = Math.min(chartW - w - 8, Math.max(8, xFor(tooltipIndex) + BAR_W / 2 - w / 2));
                  const by = Math.max(8, yFor(active.pct ?? 0) - 56);
                  return (
                    <g>
                      <rect x={bx} y={by} width={w} height={44} rx={8} fill="var(--surface-elevated)" stroke="var(--border)" />
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
