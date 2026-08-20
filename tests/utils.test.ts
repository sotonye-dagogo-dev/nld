import { describe, expect, it } from "vitest";
import { slugify, isEmail, clampInt, cn } from "@/lib/utils";

describe("slugify", () => {
  it("lowercases and replaces spaces", () => {
    expect(slugify("30 Days of Prayer & Fasting")).toBe("30-days-of-prayer-fasting");
  });
  it("strips leading/trailing separators", () => {
    expect(slugify("  Devotional!  ")).toBe("devotional");
  });
});

describe("isEmail", () => {
  it("accepts valid emails", () => {
    expect(isEmail("user@example.com")).toBe(true);
    expect(isEmail("first.last+tag@sub.example.co")).toBe(true);
  });
  it("rejects invalid emails", () => {
    expect(isEmail("")).toBe(false);
    expect(isEmail("not-an-email")).toBe(false);
    expect(isEmail("a@b")).toBe(false);
  });
});

describe("clampInt", () => {
  it("clamps into range and truncates", () => {
    expect(clampInt(0, 1, 10)).toBe(1);
    expect(clampInt(99, 1, 10)).toBe(10);
    expect(clampInt(4.7, 1, 10)).toBe(4);
  });
  it("returns min for non-finite input", () => {
    expect(clampInt(Number.NaN, 1, 10)).toBe(1);
  });
});

describe("cn", () => {
  it("joins truthy class names", () => {
    expect(cn("a", false, null, "b", undefined, "c")).toBe("a b c");
  });
});