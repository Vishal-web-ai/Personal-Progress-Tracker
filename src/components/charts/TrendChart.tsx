"use client";

import React, { useState } from "react";
import { useContainerWidth } from "@/lib/useContainerWidth";
import { cn } from "@/lib/utils";

interface TrendPoint {
  label: string; // day of month
  value: number; // cumulative actual minutes
  planned: number; // cumulative planned minutes
}

interface TrendChartProps {
  points: TrendPoint[];
  height?: number;
  valueFormat?: (min: number) => string;
  className?: string;
}

/** Planned (hairline) vs actual (accent) cumulative line chart. */
export function TrendChart({ points, height = 180, valueFormat, className }: TrendChartProps) {
  const { ref, width } = useContainerWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);

  const pad = { top: 18, bottom: 22, left: 34, right: 12 };
  const maxVal = Math.max(1, ...points.map((p) => Math.max(p.value, p.planned)));

  const innerW = Math.max(0, width - pad.left - pad.right);
  const innerH = height - pad.top - pad.bottom;

  const xFor = (i: number) =>
    points.length <= 1 ? pad.left : pad.left + (i / (points.length - 1)) * innerW;
  const yFor = (v: number) => pad.top + innerH - (v / maxVal) * innerH;

  // Extend paths to chart edges
  const leftX = pad.left;
  const rightX = width - pad.right;
  const firstY = yFor(points[0]?.value ?? 0);
  const lastY = yFor(points[points.length - 1]?.value ?? 0);
  const firstPlannedY = yFor(points[0]?.planned ?? 0);
  const lastPlannedY = yFor(points[points.length - 1]?.planned ?? 0);

  const plannedPath =
    points.length === 0
      ? ""
      : `M${leftX},${firstPlannedY} ` +
        points.map((p, i) => `L${xFor(i)},${yFor(p.planned)}`).join(" ") +
        ` L${rightX},${lastPlannedY}`;
  const actualPath =
    points.length === 0
      ? ""
      : `M${leftX},${firstY} ` +
        points.map((p, i) => `L${xFor(i)},${yFor(p.value)}`).join(" ") +
        ` L${rightX},${lastY}`;
  const areaPath = `${actualPath} L${rightX},${pad.top + innerH} L${leftX},${pad.top + innerH} Z`;

  return (
    <div ref={ref} className={cn("w-full", className)}>
      {width === 0 || points.length === 0 ? (
        <div style={{ height }} />
      ) : (
        <svg width={width} height={height} role="img" aria-label="Trend chart">
          {/* gridlines */}
          {[0, 0.5, 1].map((f) => {
            const y = pad.top + innerH * (1 - f);
            return (
              <line key={f} x1={pad.left} x2={width - pad.right} y1={y} y2={y} stroke="var(--border-soft)" strokeWidth={1} />
            );
          })}
          <text x={4} y={pad.top + 4} fontSize={10} fill="var(--text-muted)">max</text>
          <text x={4} y={pad.top + innerH} fontSize={10} fill="var(--text-muted)">0</text>

          <path d={areaPath} fill="var(--accent)" opacity={0.08} />
          <path d={plannedPath} fill="none" stroke="var(--text-muted)" strokeWidth={1.5} strokeDasharray="4 4" />
          <path d={actualPath} fill="none" stroke="var(--accent)" strokeWidth={2.5} strokeLinecap="round" />

          {points.map((p, i) =>
            i % Math.max(1, Math.floor(points.length / 8)) === 0 || i === points.length - 1 ? (
              <text
                key={i}
                x={xFor(i)}
                y={height - 6}
                textAnchor="middle"
                fontSize={10}
                fill="var(--text-muted)"
              >
                {p.label}
              </text>
            ) : null
          )}

          {/* hover scrim */}
          {points.map((p, i) => (
            <rect
              key={`h-${i}`}
              x={xFor(i) - innerW / (points.length - 1) / 2}
              y={pad.top}
              width={innerW / (points.length - 1)}
              height={innerH}
              fill="transparent"
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
            />
          ))}
          {hover !== null && (
            <g>
              <line x1={xFor(hover)} x2={xFor(hover)} y1={pad.top} y2={pad.top + innerH} stroke="var(--border)" strokeWidth={1} strokeDasharray="3 3" />
              <circle cx={xFor(hover)} cy={yFor(points[hover].value)} r={4} fill="var(--accent)" stroke="var(--surface)" strokeWidth={2} />
              {(() => {
                const label = valueFormat ? valueFormat(points[hover].value) : `${points[hover].value}`;
                const w = 92;
                const bx = Math.min(width - w - 4, Math.max(4, xFor(hover) - w / 2));
                const by = Math.max(4, yFor(points[hover].value) - 34);
                return (
                  <g>
                    <rect x={bx} y={by} width={w} height={28} rx={8} fill="var(--surface-elevated)" stroke="var(--border)" />
                    <text x={bx + w / 2} y={by + 12} textAnchor="middle" fontSize={10} fill="var(--text-muted)">Planned {valueFormat ? valueFormat(points[hover].planned) : points[hover].planned}</text>
                    <text x={bx + w / 2} y={by + 22} textAnchor="middle" fontSize={10} fill="var(--text-accent)">{label} actual</text>
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