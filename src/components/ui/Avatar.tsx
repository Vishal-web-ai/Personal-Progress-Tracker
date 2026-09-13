"use client";

import React from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

export function Avatar({
  src,
  name,
  size = 52,
  className,
}: {
  src?: string;
  name: string;
  size?: number;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative shrink-0 overflow-hidden rounded-full border-2 border-accent/80 bg-surface-elevated",
        className
      )}
      style={{ width: size, height: size }}
    >
      {src ? (
        <Image
          src={src}
          alt=""
          width={size}
          height={size}
          unoptimized
          className="h-full w-full object-cover"
        />
      ) : (
        <div
          className="flex h-full w-full items-center justify-center font-bold text-accent"
          style={{ fontSize: Math.round(size * 0.38) }}
        >
          {name.charAt(0).toUpperCase()}
        </div>
      )}
    </div>
  );
}