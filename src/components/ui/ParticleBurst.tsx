"use client";

import React, { useMemo } from "react";

const COLORS = ["#B8FF4A", "#9FE82C", "#E9FFB8"];

function mulberry32(a: number) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Particle = {
  kind: "confetti" | "spark";
  tx: number;
  ty: number;
  rz: number;
  d: number;
  color: string;
  w: number;
  h: number;
};

export function ParticleBurst({ seed = 1 }: { seed?: number }) {
  const particles = useMemo<Particle[]>(() => {
    const rand = mulberry32(seed);
    const arr: Particle[] = [];
    for (let i = 0; i < 14; i++) {
      const confetti = i < 10;
      const angle = rand() * Math.PI * 2;
      const dist = 100 + rand() * 150;
      const size = confetti ? 10 + rand() * 8 : 7 + rand() * 5;
      arr.push({
        kind: confetti ? "confetti" : "spark",
        tx: Math.cos(angle) * dist,
        ty: Math.sin(angle) * dist - 30,
        rz: (rand() - 0.3) * 260,
        d: rand() * 0.05,
        color: COLORS[Math.floor(rand() * COLORS.length)],
        w: size,
        h: confetti ? 4 + rand() * 2 : size,
      });
    }
    return arr;
  }, [seed]);

  return (
    <div className="particle-burst" aria-hidden>
      {particles.map((p, i) => (
        <span
          key={i}
          className={p.kind === "confetti" ? "particle particle--confetti" : "particle particle--spark"}
          style={
            {
              width: `${p.w}px`,
              height: `${p.h}px`,
              background: p.color,
              animationDelay: `${p.d}s`,
              "--tx": `${p.tx}px`,
              "--ty": `${p.ty}px`,
              "--rz": `${p.rz}deg`,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
}