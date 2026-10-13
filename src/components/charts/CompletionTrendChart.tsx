"use client";

import React, { useCallback, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { useContainerWidth } from "@/lib/useContainerWidth";
import type { PeriodPoint } from "@/lib/analytics";

export type TrendMetric = "pct" | "completed";

interface CompletionTrendChartProps {
  points: PeriodPoint[];
  metric: TrendMetric;
  animateKey: string;
  height?: number;
  baseDelay?: number;
  className?: string;
}

const PAD = { top: 24, bottom: 28, left: 52, right: 16 };
const DOT_R = 4;
const DOT_ACTIVE_R = 6;

function metricValue(p: PeriodPoint, metric: TrendMetric): number {
  if (metric === "pct") return p.pct ?? 0;
  return p.completed;
}

/** True when the point holds a value the metric can actually plot. */
function isPlottable(p: PeriodPoint, metric: TrendMetric): boolean {
  if (!p.hasData) return false;
  return metric === "pct" ? p.pct != null : true;
}

function formatMetric(point: PeriodPoint, metric: TrendMetric): string {
  if (metric === "pct") return point.pct == null ? "—" : `${point.pct}%`;
  const total = point.planned;
  const done = point.completed;
  if (total === 0) return "No tasks";
  return `${done}/${total} tasks`;
}

function formatAxisValue(value: number, metric: TrendMetric): string {
  if (metric === "pct") return `${Math.round(value)}%`;
  return `${Math.round(value)}`;
}

/**
 * Generate a smooth SVG path through points using Catmull-Rom → Cubic Bezier conversion.
 * Tension 0.5 = standard Catmull-Rom (clamped at endpoints).
 */
function smoothLine(points: [number, number][], tension = 0.5): string {
  if (points.length < 2) return "";
  if (points.length === 2) return `M${points[0][0]},${points[0][1]} L${points[1][0]},${points[1][1]}`;

  const d: string[] = [`M${points[0][0]},${points[0][1]}`];

  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(points.length - 1, i + 2)];

    const cp1x = p1[0] + (p2[0] - p0[0]) / (6 / tension);
    const cp1y = p1[1] + (p2[1] - p0[1]) / (6 / tension);
    const cp2x = p2[0] - (p3[0] - p1[0]) / (6 / tension);
    const cp2y = p2[1] - (p3[1] - p1[1]) / (6 / tension);

    d.push(`C${cp1x},${cp1y} ${cp2x},${cp2y} ${p2[0]},${p2[1]}`);
  }

  return d.join(" ");
}

/**
 * Progressive line chart for the productivity trend. The line draws left-to-right
 * (stroke-dash animation) each time `animateKey` changes, with an area fill.
 * Shows all 7 days Mon-Sun with a continuous line, markers at each data point.
 */
export function CompletionTrendChart({
  points,
  metric,
  animateKey,
  height = 240,
  baseDelay = 0,
  className,
}: CompletionTrendChartProps) {
  const { ref, width } = useContainerWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const [pinned, setPinned] = useState<number | null>(null);

  const data = useMemo(() => points, [points]);
  
  // For line chart: show all 7 days, use actual values (0 for no-data days)
  // This creates a continuous Mon-Sun line instead of fragmented segments
  const isPct = metric === "pct";
  const maxVal = isPct ? 100 : Math.max(1, ...data.map((p) => metricValue(p, metric)));
  const minVal = isPct ? 0 : Math.min(0, ...data.map((p) => metricValue(p, metric)));

  const innerW = Math.max(0, width - PAD.left - PAD.right);
  const innerH = height - PAD.top - PAD.bottom;
  const stepW = data.length > 1 ? innerW / (data.length - 1) : innerW;
  
  const xFor = useCallback(
    (i: number) => (data.length <= 1 ? PAD.left : PAD.left + (i / (data.length - 1)) * innerW),
    [data.length, innerW]
  );
  const yFor = useCallback(
    (v: number) => PAD.top + innerH - ((v - minVal) / (maxVal - minVal || 1)) * innerH,
    [innerH, minVal, maxVal]
  );

  // Build smooth line through ALL 7 days (using actual values, 0 for no-data)
  const allPoints = useMemo(
    () => data.map((p, i) => [xFor(i), yFor(metricValue(p, metric))] as [number, number]),
    [data, metric, xFor, yFor]
  );
  
  const linePath = smoothLine(allPoints);
  
  // Area path: line + bottom edge + back to start
  const areaPath = linePath
    ? `${linePath} L${allPoints[allPoints.length - 1][0]},${PAD.top + innerH} L${allPoints[0][0]},${PAD.top + innerH} Z`
    : "";

  const tooltipIndex = pinned ?? hover;
  const isActive = (i: number) => tooltipIndex === i;
  const active = tooltipIndex !== null ? data[tooltipIndex] : null;

  return (
    <div ref={ref} className={cn("w-full min-w-0", className)}>
      {width === 0 || data.length === 0 ? (
        <div style={{ height }} />
      ) : (
        <svg width={width} height={height} role="img" aria-label="Productivity trend line chart">
          {/* Y-axis gridlines and labels */}
          {(isPct ? [0, 0.25, 0.5, 0.75, 1] : [0, 0.5, 1]).map((f) => {
            const y = PAD.top + innerH * (1 - f);
            const isBaseline = f === 0;
            return (
              <g key={f}>
                <line
                  x1={PAD.left}
                  x2={width - PAD.right}
                  y1={y}
                  y2={y}
                  stroke="var(--border-soft)"
                  strokeWidth={isBaseline ? 1.5 : 1}
                  strokeDasharray={isBaseline ? "none" : "2 4"}
                />
                <text
                  x={PAD.left - 8}
                  y={y + (f === 1 ? 4 : f === 0 ? 0 : 0)}
                  fontSize={10}
                  fill="var(--text-muted)"
                  textAnchor="end"
                  dominantBaseline={f === 1 ? "hanging" : f === 0 ? "alphabetic" : "middle"}
                >
                  {isPct
                    ? f === 1
                      ? "100%"
                      : f === 0.75
                      ? "75%"
                      : f === 0.5
                      ? "50%"
                      : f === 0.25
                      ? "25%"
                      : "0%"
                    : formatAxisValue(f === 1 ? minVal : f === 0 ? maxVal : (maxVal + minVal) / 2, metric)}
                </text>
              </g>
            );
          })}

          {/* Vertical gridlines for each day */}
          {data.map((_, i) => (
            <line
              key={`vgrid-${i}`}
              x1={xFor(i)}
              x2={xFor(i)}
              y1={PAD.top}
              y2={PAD.top + innerH}
              stroke="var(--border-soft)"
              strokeWidth={1}
              strokeDasharray="2 4"
              opacity={0.5}
            />
          ))}

          {/* Area fill */}
          {areaPath && (
            <path
              key={`area-${animateKey}`}
              d={areaPath}
              fill="var(--accent)"
              opacity={0.08}
            />
          )}

          {/* Line */}
          {linePath && (
            <path
              key={`${animateKey}-line`}
              d={linePath}
              fill="none"
              stroke="var(--accent)"
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="chart-draw"
              style={{
                animationDelay: `${baseDelay}ms`,
              }}
            />
          )}

          {/* X-axis labels (Mon-Sun) */}
          {data.map((p, i) => (
            <text
              key={`label-${i}`}
              x={xFor(i)}
              y={height - 4}
              textAnchor="middle"
              fontSize={10}
              fill="var(--text-muted)"
            >
              {p.label}
            </text>
          ))}

          {/* Hit areas for hover/tooltip */}
          {data.map((_, i) => (
            <rect
              key={`h-${i}`}
              x={xFor(i) - stepW / 2}
              y={PAD.top}
              width={stepW}
              height={innerH}
              fill="transparent"
              className="cursor-pointer"
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
              onClick={() => setPinned((v) => (v === i ? null : i))}
            />
          ))}

          {/* Data point markers */}
          {data.map((p, i) =>
            isPlottable(p, metric) ? (
              <circle
                key={`dot-${i}`}
                cx={xFor(i)}
                cy={yFor(metricValue(p, metric))}
                r={isActive(i) ? DOT_ACTIVE_R : DOT_R}
                fill={isActive(i) ? "var(--accent)" : "var(--surface)"}
                stroke="var(--accent)"
                strokeWidth={isActive(i) ? 2.5 : 1.5}
              />
            ) : (
              // Show hollow marker for days with no data
              <circle
                key={`dot-empty-${i}`}
                cx={xFor(i)}
                cy={yFor(0)}
                r={DOT_R}
                fill="var(--surface)"
                stroke="var(--border-soft)"
                strokeWidth={1.5}
                strokeDasharray="3 3"
                opacity={0.5}
              />
            )
          )}

          {/* Tooltip */}
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
                const w = 180;
                const bx = Math.min(width - w - 4, Math.max(4, xFor(tooltipIndex) - w / 2));
                const by = Math.max(2, yFor(metricValue(active, metric)) - 64);
                const pct = active.pct == null ? "—" : `${active.pct}%`;
                const tasksText = `Tasks: ${active.completed}/${active.planned}`;
                return (
                  <g>
                    <rect x={bx} y={by} width={w} height={56} rx={10} fill="var(--surface-elevated)" stroke="var(--border)" />
                    <text x={bx + 12} y={by + 16} fontSize={11} fontWeight={600} fill="var(--text-primary)">
                      {active.title}
                    </text>
                    <text x={bx + 12} y={by + 32} fontSize={11} fill="var(--text-secondary)">
                      {tasksText}
                    </text>
                    <text x={bx + 12} y={by + 48} fontSize={11} fill="var(--accent)" fontWeight={600}>
                      Completion Rate: {pct}
                    </text>
                  </g>
                );
              })()}
            </g>
          )}
        </svg>
      )}
    </div>
  );
}
