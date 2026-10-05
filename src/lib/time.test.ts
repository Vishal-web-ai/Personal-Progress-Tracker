import { describe, expect, it } from "vitest";
import { addDaysKey, daysBetweenKeys, formatFullDate, parseDayKey } from "@/lib/time";

describe("daysBetweenKeys", () => {
  it("is zero for the same day", () => {
    expect(daysBetweenKeys("2026-10-05", "2026-10-05")).toBe(0);
  });

  it("counts forward days", () => {
    expect(daysBetweenKeys("2026-10-05", "2026-10-07")).toBe(2);
  });

  it("counts backward days as negative", () => {
    expect(daysBetweenKeys("2026-10-07", "2026-10-05")).toBe(-2);
  });

  it("crosses a month boundary", () => {
    expect(daysBetweenKeys("2026-09-28", "2026-10-03")).toBe(5);
  });

  it("crosses a year boundary", () => {
    expect(daysBetweenKeys("2026-12-30", "2027-01-02")).toBe(3);
  });

  it("agrees with addDaysKey in both directions", () => {
    let cursor = "2026-01-01";
    for (let i = 0; i < 400; i++) {
      const next = addDaysKey(cursor, 1);
      expect(daysBetweenKeys(cursor, next)).toBe(1);
      expect(daysBetweenKeys(next, cursor)).toBe(-1);
      cursor = next;
    }
  });
});

describe("parseDayKey", () => {
  it("round-trips through dayKey", () => {
    expect(parseDayKey("2026-10-05").getFullYear()).toBe(2026);
    expect(parseDayKey("2026-10-05").getMonth()).toBe(9);
    expect(parseDayKey("2026-10-05").getDate()).toBe(5);
  });
});

describe("formatFullDate", () => {
  it("uses the real weekday, not a hardcoded Monday", () => {
    expect(formatFullDate(parseDayKey("2026-10-05").getTime())).toBe("Mon, 5 Oct 2026");
    expect(formatFullDate(parseDayKey("2026-10-07").getTime())).toBe("Wed, 7 Oct 2026");
  });
});