import { describe, expect, it } from "vitest";
import {
  utcDayKey,
  dayLabelFromKey,
  fillDaySeries,
  conversionRate,
} from "@/lib/analytics";

describe("utcDayKey", () => {
  it("returns the UTC date portion of a date", () => {
    expect(utcDayKey(new Date("2026-08-20T23:59:59Z"))).toBe("2026-08-20");
    expect(utcDayKey(new Date("2026-08-20T00:00:00Z"))).toBe("2026-08-20");
  });
});

describe("dayLabelFromKey", () => {
  it("formats a UTC day key as a short label", () => {
    expect(dayLabelFromKey("2026-08-20")).toMatch(/Aug \d{1,2}/);
  });
});

describe("fillDaySeries", () => {
  const end = new Date("2026-08-20T12:00:00Z");

  it("returns the requested number of days ending at the end date", () => {
    const series = fillDaySeries([], 30, end);
    expect(series).toHaveLength(30);
    expect(series[29].key).toBe("2026-08-20");
    expect(series[28].key).toBe("2026-08-19");
    expect(series[0].key).toBe("2026-07-22");
  });

  it("fills days with no rows as zero", () => {
    const series = fillDaySeries([{ day: "2026-08-20", count: 5 }], 3, end);
    expect(series.map((s) => s.count)).toEqual([0, 0, 5]);
  });

  it("aggregates multiple rows on the same day", () => {
    const series = fillDaySeries(
      [
        { day: "2026-08-20", count: 2 },
        { day: "2026-08-20", count: 3 },
        { day: "2026-08-19", count: 1 },
      ],
      2,
      end,
    );
    expect(series[0]).toEqual({ key: "2026-08-19", label: expect.any(String), count: 1 });
    expect(series[1]).toEqual({ key: "2026-08-20", label: expect.any(String), count: 5 });
  });

  it("leaves unknown keys out of the range untouched", () => {
    const series = fillDaySeries([{ day: "2020-01-01", count: 9 }], 2, end);
    expect(series.map((s) => s.count)).toEqual([0, 0]);
  });
});

describe("conversionRate", () => {
  it("computes a one-decimal percentage", () => {
    expect(conversionRate(10, 100)).toBe(10);
    expect(conversionRate(1, 3)).toBe(33.3);
    expect(conversionRate(0, 10)).toBe(0);
  });

  it("returns 0 when there was nothing started", () => {
    expect(conversionRate(5, 0)).toBe(0);
  });
});