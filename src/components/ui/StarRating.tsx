"use client";

import React, { useState } from "react";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface StarRatingProps {
  value: number;
  onChange?: (v: number) => void;
  size?: number;
  className?: string;
}

export function StarRating({ value, onChange, size = 30, className }: StarRatingProps) {
  const [hover, setHover] = useState(0);
  const effective = hover || value;

  return (
    <div className={cn("flex items-center gap-1.5", className)} role="radiogroup" aria-label="Focus rating">
      {[1, 2, 3, 4, 5].map((n) => {
        const filled = n <= effective;
        const interactive = Boolean(onChange);
        return (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={value === n}
            aria-label={`${n} star${n > 1 ? "s" : ""}`}
            disabled={!interactive}
            onMouseEnter={interactive ? () => setHover(n) : undefined}
            onMouseLeave={interactive ? () => setHover(0) : undefined}
            onClick={interactive ? () => onChange?.(n) : undefined}
            className={cn(
              "shrink-0 rounded-md transition-transform duration-100",
              interactive && "cursor-pointer hover:scale-105 active:scale-95"
            )}
          >
            <Star
              size={size}
              strokeWidth={1.8}
              className={cn(
                "transition-colors duration-150",
                filled ? "text-accent fill-accent" : "text-border fill-transparent"
              )}
            />
          </button>
        );
      })}
    </div>
  );
}