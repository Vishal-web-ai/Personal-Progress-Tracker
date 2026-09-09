"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";
import { CheckCircle2, Info, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

type ToastTone = "success" | "info" | "warn";

interface ToastItem {
  id: number;
  title: string;
  tone: ToastTone;
}

interface ToastContextValue {
  toast: (title: string, tone?: ToastTone, action?: { label: string; onClick: () => void }) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}

const TONE_META: Record<ToastTone, { icon: React.ReactNode; ring: string }> = {
  success: { icon: <CheckCircle2 size={16} />, ring: "border-accent/40" },
  info: { icon: <Info size={16} />, ring: "border-border" },
  warn: { icon: <AlertTriangle size={16} />, ring: "border-medium/50" },
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => {
    setItems((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback<ToastContextValue["toast"]>(
    (title, tone = "success") => {
      const id = nextId.current++;
      setItems((prev) => [...prev.slice(-3), { id, title, tone }]);
      window.setTimeout(() => dismiss(id), 3200);
    },
    [dismiss]
  );

  const value = useMemo(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed bottom-20 left-0 right-0 z-50 flex flex-col items-center gap-2 px-4 md:bottom-6 md:items-end md:pr-6">
        {items.map((t) => {
          const meta = TONE_META[t.tone];
          return (
            <div
              key={t.id}
              role="status"
              className={cn(
                "toast-in flex items-center gap-2.5 rounded-full border bg-surface-elevated px-4 py-2.5 text-sm text-primary shadow-lg",
                meta.ring
              )}
            >
              <span className="text-accent">{meta.icon}</span>
              <span className="text-primary">{t.title}</span>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}