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
  customLabels?: string[];
}

const PAD = { top: 24, bottom: 28, left: 36, right: 16 };
const DOT_R = 4;
const DOT_ACTIVE_R = 6;

function metricValue(p: PeriodPoint, metric: TrendMetric): number {
  if (metric === "pct") return p.pct ?? 0;
  return p.completed;
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
 */
export function CompletionTrendChart({
  points,
  metric,
  animateKey,
  height = 240,
  baseDelay = 0,
  className,
  customLabels,
}: CompletionTrendChartProps) {
  const { ref, width } = useContainerWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const [pinned, setPinned] = useState<number | null>(null);

  const data = useMemo(() => [...points].reverse(), [points]);
  const values = data.map((p) => metricValue(p, metric));
  const maxVal = Math.max(1, ...values);
  const minVal = Math.min(0, ...values);

  const innerW = Math.max(0, width - PAD.left - PAD.right);
  const innerH = height - PAD.top - PAD.bottom;
  const xFor = useCallback(
    (i: number) => (data.length <= 1 ? PAD.left : PAD.left + (i / (data.length - 1)) * innerW),
    [data.length, innerW]
  );
  const yFor = useCallback(
    (v: number) => PAD.top + innerH - ((v - minVal) / (maxVal - minVal || 1)) * innerH,
    [innerH, minVal, maxVal]
  );

  const coords: [number, number][] = useMemo(
    () => data.map((p, i) => [xFor(i), yFor(metricValue(p, metric))]),
    [data, metric, xFor, yFor]
  );

  // Extend line to chart edges by prepending/appending edge points
  const extendedCoords = useMemo(() => {
    if (coords.length < 2) return coords;
    const leftEdge: [number, number] = [PAD.left, coords[0][1]];
    const rightEdge: [number, number] = [width - PAD.right, coords[coords.length - 1][1]];
    return [leftEdge, ...coords, rightEdge];
  }, [coords, width]);

  const linePath = useMemo(() => smoothLine(extendedCoords), [extendedCoords]);

  const areaPath =
    extendedCoords.length === 0
      ? ""
      : `${linePath} L${extendedCoords[extendedCoords.length - 1][0]},${PAD.top + innerH} L${extendedCoords[0][0]},${PAD.top + innerH} Z`;

  const tooltipIndex = pinned ?? hover;
  const active = tooltipIndex !== null ? data[tooltipIndex] : null;

  return (
    <div ref={ref} className={cn("w-full min-w-0", className)}>
      {width === 0 || data.length === 0 ? (
        <div style={{ height }} />
      ) : (
        <svg width={width} height={height} role="img" aria-label="Productivity trend line chart">
          {[0, 0.5, 1].map((f) => {
            const y = PAD.top + innerH * (1 - f);
            return (
              <line
                key={f}
                x1={PAD.left}
                x2={width - PAD.right}
                y1={y}
                y2={y}
                stroke="var(--border-soft)"
                strokeWidth={1}
              />
            );
          })}
          <text x={4} y={PAD.top + 4} fontSize={10} fill="var(--text-muted)">
            {formatAxisValue(maxVal, metric)}
          </text>
          <text x={4} y={PAD.top + innerH} fontSize={10} fill="var(--text-muted)">
            {formatAxisValue(minVal, metric)}
          </text>

          <path d={areaPath} fill="var(--accent)" opacity={0.08} />
          {data.length > 1 && (
            <path
              key={`${animateKey}-line`}
              d={linePath}
              fill="none"
              stroke="var(--accent)"
              strokeWidth={2.5}
              strokeLinecap="round"
              className="chart-draw"
              style={{
                animationDelay: `${baseDelay}ms`,
              }}
            />
          )}

          {data.map((p, i) => {
            const labelText = customLabels?.[i] ?? p.label;
            const showAll = data.length <= 7;
            const interval = showAll ? 1 : Math.max(2, Math.floor(data.length / 5));
            const show = i % interval === 0 || i === data.length - 1;
            return show ? (
              <text
                key={i}
                x={xFor(i)}
                y={height - 8}
                textAnchor="middle"
                fontSize={11}
                fill="var(--text-muted)"
              >
                {labelText}
              </text>
            ) : null;
          })}

          {data.map((p, i) => (
            <rect
              key={`h-${i}`}
              x={xFor(i) - innerW / (data.length - 1) / 2}
              y={PAD.top}
              width={innerW / (data.length - 1)}
              height={innerH}
              fill="transparent"
              className="cursor-pointer"
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
              onClick={() => setPinned((v) => (v === i ? null : i))}
            />
          ))}

          {data.map((p, i) => {
            const isActive = tooltipIndex === i;
            return (
              <circle
                key={`dot-${i}`}
                cx={xFor(i)}
                cy={yFor(metricValue(p, metric))}
                r={isActive ? DOT_ACTIVE_R : DOT_R}
                fill={isActive ? "var(--accent)" : "var(--surface)"}
                stroke="var(--accent)"
                strokeWidth={isActive ? 2.5 : 1.5}
              />
            );
          })}

          {tooltipIndex !== null && active && (
            <g pointerEvents="none">
              <line x1={xFor(tooltipIndex)} x2={xFor(tooltipIndex)} y1={PAD.top} y2={PAD.top + innerH} stroke="var(--border)" strokeWidth={1} strokeDasharray="3 3" />
              {(() => {
                const w = 140;
                const bx = Math.min(width - w - 4, Math.max(4, xFor(tooltipIndex) - w / 2));
                const by = Math.max(2, yFor(metricValue(active, metric)) - 52);
                return (
                  <g>
                    <rect x={bx} y={by} width={w} height={40} rx={10} fill="var(--surface-elevated)" stroke="var(--border)" />
                    <circle cx={bx + 14} cy={by + 14} r={4} fill="var(--accent)" />
                    <text x={bx + 24} y={by + 18} fontSize={11} fontWeight={600} fill="var(--text-primary)">
                      {active.title}
                    </text>
                    <text x={bx + w / 2} y={by + 34} textAnchor="middle" fontSize={11} fill="var(--accent)">
                      {formatMetric(active, metric)}
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
