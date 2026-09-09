import React from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface CheckboxProps {
  checked: boolean;
  onChange: () => void;
  label?: string;
  className?: string;
}

export function Checkbox({ checked, onChange, label, className }: CheckboxProps) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={label ?? "Toggle task"}
      onClick={onChange}
      className={cn(
        "pressable flex h-6 w-6 shrink-0 items-center justify-center rounded-[7px] border-2 transition-colors duration-150",
        checked
          ? "border-accent bg-accent text-[#061B14]"
          : "border-secondary/60 bg-transparent text-transparent hover:border-accent/70",
        className
      )}
    >
      <Check size={14} strokeWidth={3} className={checked ? "opacity-100" : "opacity-0"} />
    </button>
  );
}