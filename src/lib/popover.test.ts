import { describe, expect, it } from "vitest";
import { anchoredPanelPos, VIEWPORT_MARGIN } from "@/lib/popover";

const MARGIN = VIEWPORT_MARGIN;
const panel = { width: 284, height: 340 };
const viewport = { width: 390, height: 844 };

describe("anchoredPanelPos", () => {
  it("opens below the trigger when there is room", () => {
    const pos = anchoredPanelPos({
      trigger: { top: 100, bottom: 140, left: 40 },
      panel,
      viewport,
    });
    expect(pos.top).toBe(146);
    expect(pos.left).toBe(40);
  });

  it("flips above the trigger when there is not enough room below", () => {
    const pos = anchoredPanelPos({
      trigger: { top: 700, bottom: 740, left: 40 },
      panel,
      viewport,
    });
    expect(pos.top).toBe(700 - 6 - 340);
    expect(pos.top + panel.height).toBeLessThanOrEqual(viewport.height - MARGIN);
  });

  it("never lets the panel run off the bottom", () => {
    const trigger = { top: 600, bottom: 640, left: 40 };
    const pos = anchoredPanelPos({ trigger, panel, viewport });
    expect(pos.top + panel.height).toBeLessThanOrEqual(viewport.height - MARGIN);
    expect(pos.top).toBeGreaterThanOrEqual(MARGIN);
  });

  it("clamps a trigger near the right edge so the panel stays on screen", () => {
    const pos = anchoredPanelPos({
      trigger: { top: 100, bottom: 140, left: 340 },
      panel,
      viewport,
    });
    expect(pos.left).toBe(viewport.width - MARGIN - panel.width);
    expect(pos.left + panel.width).toBeLessThanOrEqual(viewport.width - MARGIN);
  });

  it("keeps the trigger's left edge when it already fits", () => {
    const pos = anchoredPanelPos({
      trigger: { top: 100, bottom: 140, left: 60 },
      panel,
      viewport,
    });
    expect(pos.left).toBe(60);
  });

  it("does not let a trigger near the left edge push the panel off screen", () => {
    const pos = anchoredPanelPos({
      trigger: { top: 100, bottom: 140, left: -20 },
      panel,
      viewport,
    });
    expect(pos.left).toBe(MARGIN);
    expect(pos.left).toBeGreaterThanOrEqual(0);
  });

  it("pins a panel taller than the viewport at the top margin", () => {
    const tall = { width: 284, height: 2000 };
    const pos = anchoredPanelPos({
      trigger: { top: 700, bottom: 740, left: 40 },
      panel: tall,
      viewport,
    });
    expect(pos.top).toBe(MARGIN);
  });

  it("pins a panel taller than the viewport at the top margin even in a short window", () => {
    const tall = { width: 284, height: 500 };
    const shortVp = { width: 390, height: 420 };
    const pos = anchoredPanelPos({
      trigger: { top: 350, bottom: 390, left: 40 },
      panel: tall,
      viewport: shortVp,
    });
    expect(pos.top).toBeGreaterThanOrEqual(MARGIN);
    expect(pos.top).toBeLessThanOrEqual(MARGIN);
  });

  it("handles a trigger at the very bottom of the screen", () => {
    const pos = anchoredPanelPos({
      trigger: { top: 830, bottom: 840, left: 40 },
      panel,
      viewport,
    });
    expect(pos.top + panel.height).toBeLessThanOrEqual(viewport.height - MARGIN);
  });

  it("handles a trigger at the very top of the screen with no room above", () => {
    const pos = anchoredPanelPos({
      trigger: { top: 2, bottom: 12, left: 40 },
      panel: { width: 284, height: 840 },
      viewport,
    });
    expect(pos.top).toBeGreaterThanOrEqual(MARGIN);
    expect(pos.top).toBeLessThanOrEqual(MARGIN);
  });

  it("never places the panel outside the viewport, on any trigger position", () => {
    for (let top = 0; top <= viewport.height; top += 37) {
      for (const left of [0, 5, 40, 120, 300, 389]) {
        const pos = anchoredPanelPos({
          trigger: { top, bottom: top + 40, left },
          panel,
          viewport,
        });
        expect(pos.left + panel.width).toBeLessThanOrEqual(viewport.width - MARGIN);
        expect(pos.left).toBeGreaterThanOrEqual(MARGIN);
        expect(pos.top).toBeGreaterThanOrEqual(MARGIN);
        expect(pos.top + panel.height).toBeLessThanOrEqual(viewport.height - MARGIN);
      }
    }
  });

  it("uses the gap between trigger and panel", () => {
    const pos = anchoredPanelPos({
      trigger: { top: 100, bottom: 140, left: 40 },
      panel: { width: 284, height: 500 },
      viewport,
      gap: 12,
    });
    expect(pos.top).toBe(140 + 12);
  });
});