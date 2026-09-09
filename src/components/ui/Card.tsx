import React from "react";
import { cn } from "@/lib/utils";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  radius?: "xl" | "lg" | "md";
}

export function Card({ radius = "xl", className, children, ...props }: CardProps) {
  return (
    <div
      className={cn(
        "card-shadow-sm border bg-surface",
        radius === "xl" && "rounded-[22px]",
        radius === "lg" && "rounded-[18px]",
        radius === "md" && "rounded-[14px]",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}