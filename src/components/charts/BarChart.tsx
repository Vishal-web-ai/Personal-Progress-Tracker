"use client";

import React, { useState } from "react";
import { useContainerWidth } from "@/lib/useContainerWidth";
import { cn } from "@/lib/utils";

interface BarChartProps {
  data: { label: string; value: number; highlight?: boolean }[];
  height?: number;
  valueFormat?: (ms: number) => string;
  className?: string;
}

/** Minimal, dependency-free bar chart. Bars are real hours/values; gridlines are hairline. */
export function BarChart({ data, height = 160, valueFormat, className }: BarChartProps) {
  const { ref, width } = useContainerWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);

  const max = Math.max(1, ...data.map((d) => d.value));
  const pad = { top: 18, bottom: 20, left: 6, right: 6 };
  const innerW = Math.max(0, width - pad.left - pad.right);
  const innerH = height - pad.top - pad.bottom;
  const slot = data.length > 0 ? innerW / data.length : 0;
  const barW = Math.max(2, Math.min(26, slot * 0.55));

  return (
    <div ref={ref} className={cn("w-full", className)}>
      {width === 0 ? (
        <div style={{ height }} />
      ) : (
        <svg width={width} height={height} role="img" aria-label="Bar chart">
          {[0, 0.5, 1].map((f) => {
            const y = pad.top + innerH * (1 - f);
            return (
              <line
                key={f}
                x1={pad.left}
                x2={width - pad.right}
                y1={y}
                y2={y}
                stroke="var(--border-soft)"
                strokeWidth={1}
              />
            );
          })}

          {data.map((d, i) => {
            const h = (d.value / max) * innerH;
            const x = pad.left + slot * i + (slot - barW) / 2;
            const y = pad.top + innerH - h;
            const isHover = hover === i;
            return (
              <g key={i} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
                <rect
                  x={pad.left + slot * i}
                  y={pad.top}
                  width={slot}
                  height={innerH}
                  fill="transparent"
                />
                <rect
                  x={x}
                  y={y}
                  width={barW}
                  height={Math.max(1, h)}
                  rx={Math.min(4, barW / 2)}
                  fill={d.highlight ? "var(--accent)" : "var(--accent-dark)"}
                  opacity={d.value === 0 ? 0.25 : isHover ? 1 : 0.9}
                  className="transition-all duration-200"
                />
                <text
                  x={x + barW / 2}
                  y={height - pad.bottom / 2}
                  textAnchor="middle"
                  fontSize={10}
                  fill="var(--text-muted)"
                >
                  {d.label}
                </text>
                {isHover && (
                  <g>
                    <rect
                      x={Math.min(width - 96, x)}
                      y={Math.max(2, y - 26)}
                      width={88}
                      height={20}
                      rx={8}
                      fill="var(--surface-elevated)"
                      stroke="var(--border)"
                    />
                    <text
                      x={Math.min(width - 96, x) + 44}
                      y={Math.max(14, y - 12)}
                      textAnchor="middle"
                      fontSize={11}
                      fill="var(--text-primary)"
                    >
                      {valueFormat ? valueFormat(d.value) : d.value}
                    </text>
                  </g>
                )}
              </g>
            );
          })}
        </svg>
      )}
    </div>
  );
}