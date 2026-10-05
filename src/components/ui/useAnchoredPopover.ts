"use client";

import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { anchoredPanelPos } from "@/lib/popover";

export interface PopoverPos {
  top: number;
  left: number;
}

/**
 * Portal popover anchored to a trigger, positioned so it can never leave the
 * viewport: it opens below the trigger when it fits, flips above when it does
 * not, and clamps both axes.
 *
 * It measures the real panel instead of estimating — and re-measures via
 * ResizeObserver when the panel's own content changes height (the footer row
 * appears and disappears as the calendar navigates to and from the current
 * month). The previous width-only math assumed there was infinite room below,
 * which pushed the calendar off screen inside the composer: `Modal` sets
 * `body { overflow: hidden }`, so nothing could scroll to reveal it.
 *
 * Escape is handled in the capture phase so it closes this popover rather than
 * falling through to the modal underneath.
 */
export function useAnchoredPopover<
  Trigger extends HTMLElement = HTMLButtonElement,
  Panel extends HTMLElement = HTMLDivElement,
>() {
  const triggerRef = useRef<Trigger | null>(null);
  const panelRef = useRef<Panel | null>(null);
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<PopoverPos | null>(null);

  const close = useCallback(() => {
    setOpen(false);
    setPos(null);
  }, []);

  const openPanel = useCallback(() => {
    setPos(null);
    setOpen(true);
  }, []);

  const toggle = useCallback(() => {
    setPos(null);
    setOpen((v) => !v);
  }, []);

  useLayoutEffect(() => {
    if (!open) return;

    const update = () => {
      const trigger = triggerRef.current;
      const panel = panelRef.current;
      if (!trigger || !panel) return;
      const r = trigger.getBoundingClientRect();
      const s = panel.getBoundingClientRect();
      const next = anchoredPanelPos({
        trigger: { top: r.top, bottom: r.bottom, left: r.left },
        panel: { width: s.width, height: s.height },
        viewport: { width: window.innerWidth, height: window.innerHeight },
      });
      setPos((prev) =>
        prev && prev.top === next.top && prev.left === next.left ? prev : next
      );
    };

    update();

    const observer =
      typeof ResizeObserver !== "undefined" && panelRef.current
        ? new ResizeObserver(update)
        : null;
    if (observer && panelRef.current) observer.observe(panelRef.current);

    const onScroll = () => update();
    const onResize = () => update();
    window.addEventListener("scroll", onScroll, { capture: true, passive: true });
    window.addEventListener("resize", onResize);

    return () => {
      if (observer) observer.disconnect();
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onResize);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const onPointer = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node;
      if (panelRef.current?.contains(target) || triggerRef.current?.contains(target)) return;
      close();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.stopPropagation();
      close();
    };

    document.addEventListener("mousedown", onPointer);
    document.addEventListener("touchstart", onPointer);
    window.addEventListener("keydown", onKey, true);

    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("touchstart", onPointer);
      window.removeEventListener("keydown", onKey, true);
    };
  }, [open, close]);

  const panelStyle: React.CSSProperties | undefined = open
    ? {
        top: pos?.top ?? 0,
        left: pos?.left ?? 0,
        visibility: pos ? "visible" : "hidden",
      }
    : undefined;

  return { open, pos, triggerRef, panelRef, openPanel, close, toggle, panelStyle };
}