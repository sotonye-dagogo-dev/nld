import { describe, expect, it } from "vitest";
import { deriveAccessPassword, verifyAccessPassword } from "@/lib/access";

describe("deriveAccessPassword", () => {
  it("is deterministic for the same reference", () => {
    const a = deriveAccessPassword("NL-abc-123");
    const b = deriveAccessPassword("NL-abc-123");
    expect(a).toBe(b);
  });

  it("produces different passwords for different references", () => {
    const a = deriveAccessPassword("NL-abc-123");
    const b = deriveAccessPassword("NL-abc-124");
    expect(a).not.toBe(b);
  });

  it("uses only the unambiguous alphabet", () => {
    const pwd = deriveAccessPassword("NL-xyz-999");
    expect(pwd).toMatch(/^[A-HJ-NP-Z2-9]+$/); // no I/O/0/1
    expect(pwd).toHaveLength(12);
  });
});

describe("verifyAccessPassword", () => {
  const reference = "NL-webhook-42";
  const expected = deriveAccessPassword(reference);

  it("accepts the exact password", () => {
    expect(verifyAccessPassword(expected, expected)).toBe(true);
  });

  it("accepts case-insensitive + trimmed input", () => {
    expect(verifyAccessPassword(`  ${expected.toLowerCase()}  `, expected)).toBe(true);
  });

  it("rejects a wrong password", () => {
    expect(verifyAccessPassword("AAAAAAAAAAAA", expected)).toBe(false);
  });

  it("rejects non-string or empty inputs", () => {
    expect(verifyAccessPassword("", expected)).toBe(false);
    expect(verifyAccessPassword(expected, "")).toBe(false);
  });
});