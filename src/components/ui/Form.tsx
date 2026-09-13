import React, { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown, X } from "lucide-react";
import { cn } from "@/lib/utils";

const baseField =
  "w-full rounded-[12px] border bg-surface-elevated px-3.5 py-2.5 text-[14px] text-primary placeholder:text-muted transition-colors duration-150 outline-none focus:border-accent/60 focus:ring-2 focus:ring-accent/20";

export const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(function Input({ className, ...props }, ref) {
  return <input ref={ref} className={cn(baseField, "border-border", className)} {...props} />;
});

function resizeTextarea(el: HTMLTextAreaElement) {
  el.style.height = "0px";
  el.style.height = `${el.scrollHeight}px`;
}

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(function Textarea({ className, ...props }, ref) {
  const ownRef = useRef<HTMLTextAreaElement | null>(null);
  const { value } = props;

  useLayoutEffect(() => {
    const el = ownRef.current;
    if (!el) return;
    resizeTextarea(el);
  }, [value]);

  return (
    <textarea
      ref={(el) => {
        ownRef.current = el;
        if (typeof ref === "function") ref(el);
        else if (ref) ref.current = el;
      }}
      className={cn(baseField, "border-border min-h-[88px] resize-none overflow-hidden", className)}
      {...props}
    />
  );
});

interface SelectOption {
  value: string;
  label: string;
  /** Present on options that support inline removal (e.g. saved custom areas). */
  onRemove?: () => void;
}

interface SelectProps
  extends Omit<
    React.ButtonHTMLAttributes<HTMLButtonElement>,
    "value" | "onChange" | "onClick" | "onKeyDown" | "onMouseDown" | "autoFocus" | "aria-label"
  > {
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  /** Rendered inside the panel below the options; receives a helper to close the dropdown. */
  footer?: (helpers: { close: () => void }) => React.ReactNode;
  label?: string;
  placeholder?: string;
}

interface PanelPos {
  top: number;
  left: number;
  width: number;
  maxHeight: number;
}

export function Select({
  options,
  value,
  onChange,
  footer,
  label,
  placeholder,
  className,
  disabled,
  ...rest
}: SelectProps) {
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState<number | null>(null);
  const [pos, setPos] = useState<PanelPos | null>(null);

  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const optionRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const listId = useId();

  const close = useCallback(() => {
    setOpen(false);
    setHighlight(null);
  }, []);

  const openPanel = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const spaceBelow = window.innerHeight - r.bottom - 8;
    const maxHeight = Math.max(132, Math.min(280, spaceBelow));
    setPos({ top: r.bottom + 6, left: r.left, width: r.width, maxHeight });
    setHighlight(Math.max(0, options.findIndex((o) => o.value === value)));
    setOpen(true);
  }, [options, value]);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: MouseEvent | TouchEvent) => {
      const t = e.target as Node;
      if (panelRef.current?.contains(t) || triggerRef.current?.contains(t)) return;
      close();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    const onScroll = (e: Event) => {
      const t = e.target;
      if (t instanceof Node && (panelRef.current?.contains(t) || triggerRef.current?.contains(t))) return;
      close();
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("touchstart", onPointer);
    window.addEventListener("keydown", onKey);
    window.addEventListener("scroll", onScroll, { capture: true, passive: true });
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("touchstart", onPointer);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", onScroll, { capture: true });
    };
  }, [open, close]);

  const select = useCallback(
    (v: string) => {
      onChange(v);
      close();
    },
    [onChange, close]
  );

  const step = useCallback(
    (dir: 1 | -1) => {
      if (!options.length) return;
      setHighlight((h) => {
        const base = h == null ? (dir === 1 ? -1 : options.length) : h;
        const next = Math.max(0, Math.min(options.length - 1, base + dir));
        optionRefs.current[next]?.scrollIntoView({ block: "nearest" });
        return next;
      });
    },
    [options.length]
  );

  const onTriggerKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        if (open) step(1);
        else openPanel();
        break;
      case "ArrowUp":
        e.preventDefault();
        if (open) step(-1);
        else openPanel();
        break;
      case "Home":
        e.preventDefault();
        setHighlight(0);
        break;
      case "End":
        e.preventDefault();
        setHighlight(options.length - 1);
        break;
      case "Enter":
      case " ":
        e.preventDefault();
        if (open) {
          if (highlight != null && options[highlight]) select(options[highlight].value);
        } else openPanel();
        break;
      case "Escape":
        if (open) {
          e.preventDefault();
          close();
        }
        break;
      case "Tab":
        if (open) close();
        break;
    }
  };

  const selected = options.find((o) => o.value === value);
  const activeId =
    open && highlight != null && options[highlight] ? `pulse-opt-${listId}-${highlight}` : undefined;

  return (
    <>
      <button
        {...rest}
        ref={triggerRef}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? `pulse-list-${listId}` : undefined}
        aria-activedescendant={activeId}
        aria-label={label}
        onClick={() => (open ? close() : openPanel())}
        onKeyDown={onTriggerKeyDown}
        disabled={disabled}
        className={cn(
          baseField,
          "flex cursor-pointer select-none items-center justify-between gap-2 text-left",
          open ? "border-accent/60 ring-2 ring-accent/20" : "border-border",
          className
        )}
        {...rest}
      >
        <span className={cn("truncate", !selected && "text-muted")}>
          {selected ? selected.label : (placeholder ?? "Select…")}
        </span>
        <ChevronDown
          size={16}
          aria-hidden
          className={cn(
            "shrink-0 transition-transform duration-150",
            open ? "rotate-180 text-accent" : "text-muted"
          )}
        />
      </button>

      {open &&
        pos &&
        createPortal(
          <div
            ref={panelRef}
            id={`pulse-list-${listId}`}
            role="listbox"
            aria-label={label}
            className="dropdown-in card-shadow-sm fixed z-[60] overflow-auto rounded-[12px] border border-border bg-surface-elevated p-1.5"
            style={{ top: pos.top, left: pos.left, width: pos.width, maxHeight: pos.maxHeight }}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <ul className="space-y-0.5">
              {options.map((o, i) => {
                const isSelected = o.value === value;
                const isActive = i === highlight;
                return (
                  <li key={o.value}>
                    <div
                      role="option"
                      aria-selected={isSelected}
                      id={`pulse-opt-${listId}-${i}`}
                      onMouseEnter={() => setHighlight(i)}
                      className={cn(
                        "flex items-center gap-2 rounded-[10px] px-2.5 py-2 text-[13.5px] outline-none transition-colors duration-100",
                        isActive ? "bg-surface-soft text-primary" : "text-secondary hover:bg-surface-soft hover:text-primary"
                      )}
                    >
                      <button
                        ref={(el) => {
                          optionRefs.current[i] = el;
                        }}
                        type="button"
                        onClick={() => select(o.value)}
                        className="flex min-w-0 flex-1 items-center justify-between gap-2 text-left outline-none"
                      >
                        <span className="truncate">{o.label}</span>
                        {isSelected && (
                          <span className="flex h-[20px] w-4 shrink-0 items-center justify-center">
                            <Check size={15} aria-hidden className="text-accent" />
                          </span>
                        )}
                      </button>
                      {o.onRemove && (
                        <button
                          type="button"
                          aria-label={`Remove ${o.label}`}
                          title={`Remove ${o.label}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            o.onRemove?.();
                          }}
                          className="pressable flex h-[20px] w-[20px] shrink-0 items-center justify-center rounded-md text-muted transition-colors hover:bg-high/15 hover:text-high"
                        >
                          <X size={13} aria-hidden />
                        </button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
            {footer && (
              <>
                <div className="mx-1 my-1.5 h-px bg-border-soft" aria-hidden />
                {footer({ close })}
              </>
            )}
          </div>,
          document.body
        )}
    </>
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