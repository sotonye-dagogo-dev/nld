import { describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS, CURRENCIES, formatPrice } from "@/config/defaults";
import { coerceValue } from "@/config/site";

describe("DEFAULT_SETTINGS", () => {
  it("provides fallback values for every admin-configurable setting", () => {
    expect(DEFAULT_SETTINGS.platformName).toBeTruthy();
    expect(DEFAULT_SETTINGS.currency).toBe("NGN");
    expect(DEFAULT_SETTINGS.defaultPriceMinor).toBeGreaterThan(0);
    expect(DEFAULT_SETTINGS.freePreviewDays).toBeGreaterThanOrEqual(0);
    expect(DEFAULT_SETTINGS.antiScreenshotEnabled).toBe(true);
    expect(DEFAULT_SETTINGS.paymentsEnabled).toBe(true);
  });

  it("knows a display symbol for the default currency", () => {
    expect(CURRENCIES[DEFAULT_SETTINGS.currency].symbol).toBe("₦");
  });
});

describe("formatPrice", () => {
  it("formats minor units with the currency symbol", () => {
    expect(formatPrice(500000, "NGN")).toContain("₦");
    expect(formatPrice(500000, "NGN")).toContain("5,000.00");
  });

  it("falls back to NGN for unknown currencies", () => {
    expect(formatPrice(100, "XYZ")).toContain("₦");
  });
});

describe("coerceValue", () => {
  it("keeps numbers when valid, falls back otherwise", () => {
    expect(coerceValue("freePreviewDays", "5", 3)).toBe(5);
    expect(coerceValue("freePreviewDays", "not-a-number", 3)).toBe(3);
    expect(coerceValue("defaultPriceMinor", 0, 500000)).toBe(0);
  });

  it("parses boolean strings with fallback", () => {
    expect(coerceValue("paymentsEnabled", "true", false)).toBe(true);
    expect(coerceValue("paymentsEnabled", "0", true)).toBe(false);
    expect(coerceValue("antiScreenshotEnabled", "maybe", true)).toBe(true);
  });

  it("uses the fallback for empty strings on text settings", () => {
    expect(coerceValue("platformName", "", "Fallback")).toBe("Fallback");
    expect(coerceValue("platformName", "Next Level", "Fallback")).toBe("Next Level");
  });
});