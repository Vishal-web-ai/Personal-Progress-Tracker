import React from "react";
import { cn } from "@/lib/utils";

const baseField =
  "w-full rounded-[12px] border border-border bg-surface-elevated px-3.5 py-2.5 text-[14px] text-primary placeholder:text-muted transition-colors duration-150 outline-none focus:border-accent/60 focus:ring-2 focus:ring-accent/20";

export const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(function Input({ className, ...props }, ref) {
  return <input ref={ref} className={cn(baseField, className)} {...props} />;
});

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(function Textarea({ className, ...props }, ref) {
  return <textarea ref={ref} className={cn(baseField, "min-h-[88px] resize-y", className)} {...props} />;
});

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  options: { value: string; label: string }[];
}

export function Select({ options, className, ...props }: SelectProps) {
  return (
    <select className={cn(baseField, "appearance-none bg-no-repeat pr-9", className)} {...props}>
      {options.map((o) => (
        <option key={o.value} value={o.value} className="bg-surface-elevated text-primary">
          {o.label}
        </option>
      ))}
    </select>
  );
}

export function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[13px] font-medium text-secondary">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-[12px] text-muted">{hint}</span>}
    </label>
  );
}