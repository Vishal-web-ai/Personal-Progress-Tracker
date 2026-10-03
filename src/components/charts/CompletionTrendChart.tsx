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
  // A day can carry data (focus time logged) with nothing planned, so pct is
  // null. Coercing that to 0 drew a real-looking 0% dip for a day the user
  // actually worked; it stays a gap instead.
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
 * Index runs of consecutive data-bearing points. Empty days (rest days, days
 * before you started, days still ahead in the current week) are *not* drawn —
 * connecting straight through them would invent values, and plotting them as 0%
 * made the line dive to the floor every time you took a day off, which read as
 * "my history reset".
 */
function splitIntoSegments(points: PeriodPoint[], metric: TrendMetric): number[][] {
  const segments: number[][] = [];
  let run: number[] = [];
  points.forEach((p, i) => {
    if (isPlottable(p, metric)) {
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
 * A single data point still has to read as a line, not a stray dot. Draw it as a
 * stem rising from the 0% baseline to the point's value, so one active day looks
 * like a lollipop rather than a horizontal line sitting at that day's rate —
 * which read as if the entire week had been spent at 50%.
 */
function soloSegment(pt: [number, number], baselineY: number): [number, number][] {
  return [[pt[0], baselineY], pt];
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
}: CompletionTrendChartProps) {
  const { ref, width } = useContainerWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const [pinned, setPinned] = useState<number | null>(null);

  const data = useMemo(() => points, [points]);
  // Empty days are excluded from the scale too, so a gap doesn't drag the
  // axis down to 0. If literally nothing has data we still need a sane range.
  const plotData = useMemo(() => data.filter((p) => isPlottable(p, metric)), [data, metric]);
  const values = useMemo(() => plotData.map((p) => metricValue(p, metric)), [plotData, metric]);

  // Fixed 0-100% scale for completion rate, auto-scale for other metrics
  const isPct = metric === "pct";
  const maxVal = isPct ? 100 : Math.max(1, ...values);
  const minVal = isPct ? 0 : Math.min(0, ...values);

  const innerW = Math.max(0, width - PAD.left - PAD.right);
  const innerH = height - PAD.top - PAD.bottom;
  // A lone point would divide by zero here; give it a sensible hit box.
  const stepW = data.length > 1 ? innerW / (data.length - 1) : innerW;
  const xFor = useCallback(
    (i: number) => (data.length <= 1 ? PAD.left : PAD.left + (i / (data.length - 1)) * innerW),
    [data.length, innerW]
  );
  const yFor = useCallback(
    (v: number) => PAD.top + innerH - ((v - minVal) / (maxVal - minVal || 1)) * innerH,
    [innerH, minVal, maxVal]
  );

  // X positions stay pinned to the full timeline so a gap keeps its true width;
  // only the drawn segments skip the empty days. A run of one is drawn as a stem
  // from the baseline so a single active day still reads as a line.
  const segments = useMemo(
    () =>
      splitIntoSegments(data, metric).map((run) => {
        const pts = run.map(
          (i) => [xFor(i), yFor(metricValue(data[i], metric))] as [number, number]
        );
        return pts.length === 1 ? soloSegment(pts[0], PAD.top + innerH) : pts;
      }),
    [data, metric, xFor, yFor, innerH]
  );

  // Segments are drawn exactly where the data is. The chart used to splice two
  // synthetic points onto the ends of a lone segment — to "reach the chart
  // edges" — but xFor already maps the first and last index onto those edges, so
  // that only ever duplicated the endpoints. With a single active day it turned
  // one real point into a flat line across the whole chart at that day's rate.
  // Gaps stay gaps; a lone point is widened only to its own slot.
  const areaPaths = useMemo(
    () =>
      segments
        .filter((seg) => seg.length > 1)
        .map(
          (seg) =>
            `${smoothLine(seg)} L${seg[seg.length - 1][0]},${PAD.top + innerH} L${seg[0][0]},${PAD.top + innerH} Z`
        ),
    [segments, innerH]
  );

  const linePaths = useMemo(
    () => segments.filter((seg) => seg.length > 1).map((seg) => smoothLine(seg)),
    [segments]
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

          {(() => {
            // Candidate labels follow the existing every-Nth rule; then any
            // label that would physically overlap the previous one is dropped.
            // The collision test is a no-op when there is room, so short labels
            // like "Mon" are never affected. The current period always shows:
            // if it collides it evicts its left neighbour instead of vanishing.
            const showAll = data.length <= 7;
            const interval = showAll ? 1 : Math.max(2, Math.floor(data.length / 5));
            const last = data.length - 1;
            const out: { key: number; right: number; node: React.ReactNode }[] = [];
            data.forEach((p, i) => {
              if (i % interval !== 0 && i !== last) return;
               const labelText = p.label;
              const x = xFor(i);
              // Inter at 10px; generous estimate so we skip early rather than clip.
              const w = labelText.length * 6.2;
              // Centre every label except the outer two, which anchor inward.
              // A centred first/last label spills past the plot edge and the
              // SVG viewport clips it, chopping the date in half.
              const isFirst = i === 0;
              const isLast = i === last;
              const anchor = isFirst ? "start" : isLast ? "end" : "middle";
              const left = isFirst ? x : isLast ? x - w : x - w / 2;
              const right = left + w;
              // A date cut off at the edge is worse than one dropped label.
              if (right > width - PAD.right + 0.5 && !isLast) return;
              if (out.length > 0 && left < out[out.length - 1].right) {
                // Only the current period is allowed to displace a neighbour;
                // everything else just yields.
                if (!isLast) return;
                out.pop();
              }
              out.push({
                key: i,
                right,
                node: (
                  <text
                    key={i}
                    x={x}
                    y={height - 4}
                    textAnchor={anchor}
                    fontSize={10}
                    fill="var(--text-muted)"
                  >
                    {labelText}
                  </text>
                ),
              });
            });
            return out.map((o) => o.node);
          })()}

          {data.map((p, i) => (
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
