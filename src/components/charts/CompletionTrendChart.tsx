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

const PAD = { top: 24, bottom: 28, left: 52, right: 16 };
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
 * Index runs of consecutive data-bearing points. Empty days (rest days, days
 * before you started, days still ahead in the current week) are *not* drawn —
 * connecting straight through them would invent values, and plotting them as 0%
 * made the line dive to the floor every time you took a day off, which read as
 * "my history reset".
 */
function splitIntoSegments(points: PeriodPoint[]): number[][] {
  const segments: number[][] = [];
  let run: number[] = [];
  points.forEach((p, i) => {
    if (p.hasData) {
      run.push(i);
    } else if (run.length > 0) {
      segments.push(run);
      run = [];
    }
  });
  if (run.length > 0) segments.push(run);
  return segments;
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

  const data = useMemo(() => points, [points]);
  // Empty days are excluded from the scale too, so a gap doesn't drag the
  // axis down to 0. If literally nothing has data we still need a sane range.
  const plotData = useMemo(() => data.filter((p) => p.hasData), [data]);
  const values = useMemo(() => plotData.map((p) => metricValue(p, metric)), [plotData, metric]);

  // Fixed 0-100% scale for completion rate, auto-scale for other metrics
  const isPct = metric === "pct";
  const maxVal = isPct ? 100 : Math.max(1, ...values);
  const minVal = isPct ? 0 : Math.min(0, ...values);

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

  // X positions stay pinned to the full timeline so a gap keeps its true width;
  // only the drawn segments skip the empty days.
  const segments = useMemo(
    () =>
      splitIntoSegments(data).map((run) =>
        run.map((i) => [xFor(i), yFor(metricValue(data[i], metric))] as [number, number])
      ),
    [data, metric, xFor, yFor]
  );

  // When every point has data (a full week) keep the original look: the line
  // reaches both chart edges. As soon as a gap exists, points stay on their true
  // x positions so the gap is an honest hole rather than a flat line drawn
  // through days that never happened.
  const drawnSegments = useMemo(() => {
    if (data.length < 2 || segments.length !== 1) return segments;
    const seg = segments[0];
    const left: [number, number] = [PAD.left, seg[0][1]];
    const right: [number, number] = [width - PAD.right, seg[seg.length - 1][1]];
    return [[left, ...seg, right]];
  }, [segments, data.length, width]);

  const areaPaths = useMemo(
    () =>
      drawnSegments
        .filter((seg) => seg.length > 1)
        .map(
          (seg) =>
            `${smoothLine(seg)} L${seg[seg.length - 1][0]},${PAD.top + innerH} L${seg[0][0]},${PAD.top + innerH} Z`
        ),
    [drawnSegments, innerH]
  );

  const linePaths = useMemo(
    () => drawnSegments.filter((seg) => seg.length > 1).map((seg) => smoothLine(seg)),
    [drawnSegments]
  );

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

          {areaPaths.map((d, i) => (
            <path key={`area-${animateKey}-${i}`} d={d} fill="var(--accent)" opacity={0.08} />
          ))}
          {linePaths.map((d, i) => (
            <path
              key={`${animateKey}-line-${i}`}
              d={d}
              fill="none"
              stroke="var(--accent)"
              strokeWidth={2.5}
              strokeLinecap="round"
              className="chart-draw"
              style={{
                animationDelay: `${baseDelay}ms`,
              }}
            />
          ))}

          {data.map((p, i) => {
            const labelText = customLabels?.[i] ?? p.label;
            const showAll = data.length <= 7;
            const interval = showAll ? 1 : Math.max(2, Math.floor(data.length / 5));
            const show = i % interval === 0 || i === data.length - 1;
            return show ? (
              <text
                key={i}
                x={xFor(i)}
                y={height - 4}
                textAnchor="middle"
                fontSize={10}
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

          {data.map((p, i) =>
            p.hasData ? (
              <circle
                key={`dot-${i}`}
                cx={xFor(i)}
                cy={yFor(metricValue(p, metric))}
                r={isActive(i) ? DOT_ACTIVE_R : DOT_R}
                fill={isActive(i) ? "var(--accent)" : "var(--surface)"}
                stroke="var(--accent)"
                strokeWidth={isActive(i) ? 2.5 : 1.5}
              />
            ) : null
          )}

          {tooltipIndex !== null && active && (
            <g pointerEvents="none">
              <line x1={xFor(tooltipIndex)} x2={xFor(tooltipIndex)} y1={PAD.top} y2={PAD.top + innerH} stroke="var(--border)" strokeWidth={1} strokeDasharray="3 3" />
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
