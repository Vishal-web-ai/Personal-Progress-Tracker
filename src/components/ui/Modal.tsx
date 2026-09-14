"use client";

import React, { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  hideHeader?: boolean;
  children: React.ReactNode;
  className?: string;
  footer?: React.ReactNode;
}

export function Modal({ open, onClose, title, hideHeader, children, className, footer }: ModalProps) {
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
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, requestClose]);

  if (!open && !closing) return null;

  return createPortal(
    <div
      className={cn(
        "fixed inset-0 z-40 flex items-end justify-center sm:items-center",
        closing ? "pointer-events-none" : ""
      )}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        className={cn("modal-backdrop absolute inset-0 bg-black/60", closing && "opacity-0 transition-opacity duration-150")}
        onClick={requestClose}
      />
      <div
        className={cn(
          "modal-dialog relative z-10 flex max-h-[88dvh] w-full flex-col overflow-hidden rounded-t-[22px] border border-border bg-surface shadow-2xl sm:max-w-md sm:rounded-[22px]",
          closing && "opacity-0 scale-[0.98] translate-y-1 transition-all duration-150",
          className
        )}
      >
        {!hideHeader && (
          <div className="flex items-center justify-between border-b border-border-soft px-5 py-4">
            <h2 className="text-[17px] font-semibold text-primary">{title}</h2>
            <button
              onClick={requestClose}
              aria-label="Close dialog"
              className="pressable -mr-1 flex h-9 w-9 items-center justify-center rounded-full text-muted hover:bg-surface-elevated hover:text-primary"
            >
              <X size={18} />
            </button>
          </div>
        )}
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer && (
          <div className="border-t border-border-soft px-5 py-4">{footer}</div>
        )}
      </div>
    </div>,
    document.body
  );
}