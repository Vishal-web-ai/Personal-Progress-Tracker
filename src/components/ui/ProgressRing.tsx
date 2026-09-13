"use client";

import React, { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface ProgressRingProps {
  value: number; // 0..100
  size?: number;
  stroke?: number;
  label?: string;
  sublabel?: string;
  className?: string;
  showValue?: boolean;
  valueClassName?: string;
  trackOpacity?: number;
}

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Gradient-free SVG progress ring. `value` transitions smoothly from its
 * previous value (entrance plays 0 → value once). Never glows, never restarts.
 */
export function ProgressRing({
  value,
  size = 168,
  stroke = 18,
  label,
  sublabel,
  className,
  showValue = true,
  valueClassName,
  trackOpacity = 1,
}: ProgressRingProps) {
  const clamped = Math.max(0, Math.min(100, value));
  const [reduced] = useState(() => prefersReducedMotion());
  const displayRef = useRef(0);
  const [display, setDisplay] = useState(0);

  // When motion is preferred/first value lands, snap display to the target.
  const mountedReduced = reduced;
  const show = mountedReduced && display === 0 ? clamped : display;

  useEffect(() => {
    if (reduced) {
      displayRef.current = clamped;
      return;
    }
    const from = displayRef.current;
    const to = clamped;
    if (to === from) return;
    const duration = 600;
    const start = performance.now();
    let raf = 0;
    const step = (t: number) => {
      const k = Math.min(1, (t - start) / duration);
      const eased = 1 - Math.pow(1 - k, 3);
      const cur = from + (to - from) * eased;
      displayRef.current = cur;
      setDisplay(cur);
      if (k < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [clamped, reduced]);

  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - show / 100);
  const angle = (show / 100) * 360;

  return (
    <div
      className={cn("relative inline-flex items-center justify-center", className)}
      style={{ width: size, height: size }}
      role="img"
      aria-label={`${Math.round(show)}% ${label ?? "progress"}`}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--ring-track)"
          strokeWidth={stroke}
          strokeOpacity={trackOpacity}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--accent)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
        />
        {/* tick at the current value */}
        <CircleMarker size={size} r={r} angle={angle} />
      </svg>
      {showValue && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <span
            className={cn(
              "font-bold text-primary leading-none",
              valueClassName ?? "text-[42px]"
            )}
            style={{ letterSpacing: "-0.02em" }}
          >
            {Math.round(show)}
            <span className="text-[0.6em] align-baseline">%</span>
          </span>
          {show >= 95 && <span className="mt-0.5 text-[10px] italic text-accent">done</span>}
          {label && (
            <span className="mt-1.5 text-[12px] text-secondary">{label}</span>
          )}
          {sublabel && (
            <span className="mt-0.5 text-[11px] text-muted">{sublabel}</span>
          )}
        </div>
      )}
    </div>
  );
}

function CircleMarker({ size, r, angle }: { size: number; r: number; angle: number }) {
  const rad = (angle * Math.PI) / 180;
  const cx = size / 2 + r * Math.cos(rad);
  const cy = size / 2 + r * Math.sin(rad);
  return (
    <circle
      cx={cx}
      cy={cy}
      r={5}
      fill="var(--accent)"
      stroke="var(--background)"
      strokeWidth={3}
      className="transition-[cx,cy] duration-700 ease-out"
      style={{ transformBox: "fill-box" }}
    />
  );
}