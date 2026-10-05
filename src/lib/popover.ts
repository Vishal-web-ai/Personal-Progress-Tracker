export const PANEL_GAP = 6;
export const VIEWPORT_MARGIN = 8;

export interface TriggerRect {
  top: number;
  bottom: number;
  left: number;
}

export interface PanelSize {
  width: number;
  height: number;
}

export interface ViewportSize {
  width: number;
  height: number;
}

/**
 * Position a fixed popover over its anchor without leaving the viewport.
 *
 * Horizontal: keep the trigger's left edge, but clamp so the panel never hangs
 * past the right (or left) edge of the screen.
 *
 * Vertical: open below by default. When the panel would run off the bottom,
 * flip above the trigger — the case that left the calendar unreachable inside
 * the composer, where `Modal` sets `body { overflow: hidden }` and nothing can
 * scroll to reveal it. If neither side fits (panel taller than the viewport),
 * keep whichever overflows least, then pin to the top margin so its header
 * stays visible.
 */
export function anchoredPanelPos({
  trigger,
  panel,
  viewport,
  gap = PANEL_GAP,
  margin = VIEWPORT_MARGIN,
}: {
  trigger: TriggerRect;
  panel: PanelSize;
  viewport: ViewportSize;
  gap?: number;
  margin?: number;
}): { top: number; left: number } {
  const minLeft = margin;
  const maxLeft = Math.max(minLeft, viewport.width - margin - panel.width);
  const left = Math.min(Math.max(trigger.left, minLeft), maxLeft);

  const below = trigger.bottom + gap;
  const above = trigger.top - gap - panel.height;
  const fitsBelow = below + panel.height <= viewport.height - margin;
  const fitsAbove = above >= margin;

  let top: number;
  if (fitsBelow) {
    top = below;
  } else if (fitsAbove) {
    top = above;
  } else {
    const overflowsBelow = below + panel.height - (viewport.height - margin);
    const overflowsAbove = margin - above;
    top = overflowsBelow <= overflowsAbove ? below : above;
  }

  const maxTop = Math.max(margin, viewport.height - margin - panel.height);
  top = Math.min(Math.max(top, margin), maxTop);

  return { top, left };
}