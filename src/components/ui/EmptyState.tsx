import React from "react";
import { cn } from "@/lib/utils";

export function EmptyState({
  icon,
  title,
  message,
  action,
  className,
}: {
  icon: React.ReactNode;
  title: string;
  message?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-[22px] border border-border-soft bg-surface px-8 py-14 text-center",
        className
      )}
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-surface-elevated text-muted">
        {icon}
      </div>
      <div>
        <p className="text-[15px] font-medium text-primary">{title}</p>
        {message && <p className="mt-1 text-[13px] text-secondary">{message}</p>}
      </div>
      {action}
    </div>
  );
}