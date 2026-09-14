"use client";

import React, { useMemo } from "react";

const COLORS = ["#B8FF4A", "#9FE82C", "#E9FFB8", "#6FDE78", "#E8C85A"];

function mulberry32(a: number) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Piece = {
  ax: string;
  ay: string;
  ex: string;
  ey: string;
  rz: number;
  dur: number;
  delay: number;
  color: string;
  w: number;
  h: number;
  spark: boolean;
};

/**
 * Full-screen celebration confetti: a burst near the top-center that arcs up,
 * then slowly falls and tumbles across the whole viewport. Rendered above the
 * modal, pointer-events disabled, so it never blocks taps. The global
 * prefers-reduced-motion rule collapses the animation to near-instant.
 */
export function ConfettiRain({ active, seed = 1 }: { active: boolean; seed?: number }) {
  const pieces = useMemo<Piece[]>(() => {
    if (!active) return [];
    const rand = mulberry32(seed);
    return Array.from({ length: 84 }, () => {
      const spark = rand() < 0.12;
      const bx = (rand() * 2 - 1) * 9; // burst horizontal reach (vw)
      const apexY = -(1.5 + rand() * 5); // how high the burst arcs (vh, negative = up)
      return {
        ax: `${bx * 0.5}vw`,
        ay: `${apexY}vh`,
        // final landing: spread across lower area, generous tumble
        ex: `${bx * 1.6 + (rand() * 2 - 1) * 16}vw`,
        ey: `${26 + rand() * 62}vh`,
        rz: (rand() - 0.4) * 560,
        dur: 2.6 + rand() * 1.8,
        delay: rand() * 0.4,
        color: COLORS[Math.floor(rand() * COLORS.length)],
        w: spark ? 5 + rand() * 3 : 9 + rand() * 7,
        h: spark ? 5 + rand() * 3 : 3 + rand() * 3,
        spark,
      };
    });
  }, [active, seed]);

  if (pieces.length === 0) return null;

  return (
    <div className="confetti-rain" aria-hidden>
      {pieces.map((p, i) => (
        <span
          key={i}
          className={p.spark ? "spark" : undefined}
          style={
            {
              width: `${p.w}px`,
              height: `${p.h}px`,
              background: p.color,
              animationDuration: `${p.dur}s`,
              animationDelay: `${p.delay}s`,
              "--ax": p.ax,
              "--ay": p.ay,
              "--ex": p.ex,
              "--ey": p.ey,
              "--rz": `${p.rz}deg`,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
}