import React from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "outline" | "danger" | "destructive";
type Size = "sm" | "md" | "lg" | "icon";

const VARIANTS: Record<Variant, string> = {
  primary:
    "bg-accent text-[#061B14] hover:bg-accent-soft focus-visible:outline-accent",
  secondary:
    "bg-surface-elevated text-primary hover:bg-surface-soft border border-border",
  ghost:
    "bg-transparent text-secondary hover:bg-surface-elevated hover:text-primary",
  outline:
    "bg-transparent text-primary border border-border hover:bg-surface-elevated",
  danger:
    "bg-transparent text-high border border-high/40 hover:bg-high/10",
  destructive:
    "bg-high text-[#061B14] hover:bg-high/90",
};

const SIZES: Record<Size, string> = {
  sm: "h-8 px-3 text-[13px] gap-1.5",
  md: "h-10 px-4 text-sm gap-2",
  lg: "h-12 px-6 text-[15px] gap-2",
  icon: "h-10 w-10 p-0 justify-center",
};

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

export function Button({
  variant = "primary",
  size = "md",
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        "pressable inline-flex select-none items-center justify-center rounded-xl font-medium",
        "disabled:pointer-events-none disabled:opacity-45",
        VARIANTS[variant],
        SIZES[size],
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}