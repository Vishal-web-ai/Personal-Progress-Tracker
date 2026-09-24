"use client";

import React, { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface SheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  className?: string;
  footer?: React.ReactNode;
}

export function Sheet({ open, onClose, title, children, className, footer }: SheetProps) {
  const [closing, setClosing] = useState(false);

  const requestClose = useCallback(() => {
    setClosing(true);
    window.setTimeout(() => {
      setClosing(false);
      onClose();
    }, 170);
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") requestClose();
    };
    window.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, requestClose]);

  if (!open && !closing) return null;

  return createPortal(
    <div className="fixed inset-0 z-30" role="dialog" aria-modal="true" aria-label={title}>
      <div
        className={cn(
          "sheet-backdrop absolute inset-0 bg-black/60",
          closing && "opacity-0 transition-opacity duration-150"
        )}
        onClick={requestClose}
      />
      <div
        className={cn(
          "sheet-panel absolute inset-x-0 bottom-0 flex max-h-[92dvh] flex-col overflow-hidden rounded-t-[22px] border border-border bg-surface shadow-2xl",
          "sm:inset-y-0 sm:right-0 sm:left-auto sm:h-full sm:max-h-none sm:w-full sm:max-w-[400px] sm:rounded-none",
          closing && "translate-y-full transition-transform duration-200 sm:translate-x-full",
          className
        )}
      >
        <div className="flex shrink-0 justify-center pt-2 sm:hidden">
          <span className="h-1 w-10 rounded-full bg-border" aria-hidden />
        </div>
        {title && (
          <div className="flex shrink-0 items-center justify-between border-b border-border-soft px-5 py-4 sm:pt-1">
            <h2 className="text-[17px] font-semibold text-primary">{title}</h2>
            <button
              onClick={requestClose}
              aria-label="Close panel"
              className="pressable -mr-1 flex h-9 w-9 items-center justify-center rounded-full text-muted hover:bg-surface-elevated hover:text-primary"
            >
              <X size={18} />
            </button>
          </div>
        )}
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer && (
          <div className="shrink-0 border-t border-border-soft px-5 py-4">{footer}</div>
        )}
      </div>
    </div>,
    document.body
  );
}