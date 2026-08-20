import { describe, expect, it } from "vitest";
import { isSuperAdmin, can, ADMIN_PRIVILEGES } from "@/lib/admin-auth";

describe("isSuperAdmin", () => {
  it("returns true only for owner role", () => {
    expect(isSuperAdmin({ id: "1", email: "a@x.com", role: "owner", createdAt: new Date() })).toBe(true);
    expect(isSuperAdmin({ id: "1", email: "a@x.com", role: "admin", createdAt: new Date() })).toBe(false);
    expect(isSuperAdmin({ id: "1", email: "a@x.com", role: "editor", createdAt: new Date() })).toBe(false);
  });
});

describe("can / privilege mapping", () => {
  it("owner can invite and edit email templates; admin cannot", () => {
    const owner = { id: "1", email: "o@x.com", role: "owner" as AdminRole, createdAt: new Date() };
    const admin = { id: "2", email: "a@x.com", role: "admin" as AdminRole, createdAt: new Date() };
    expect(can(owner, "invite")).toBe(true);
    expect(can(owner, "email-templates")).toBe(true);
    expect(can(admin, "invite")).toBe(false);
    expect(can(admin, "email-templates")).toBe(false);
  });

  it("both owner and admin can edit settings, devotionals, and view records", () => {
    for (const role of ["owner", "admin"] as AdminRole[]) {
      const user = { id: "1", email: "a@x.com", role, createdAt: new Date() };
      for (const priv of ["settings", "devotionals", "records"]) {
        expect(can(user, priv)).toBe(true);
      }
    }
  });

  it("editor has only devotional access", () => {
    const editor = { id: "3", email: "e@x.com", role: "editor" as AdminRole, createdAt: new Date() };
    expect(can(editor, "devotionals")).toBe(true);
    expect(can(editor, "settings")).toBe(false);
    expect(can(editor, "records")).toBe(false);
    expect(can(editor, "invite")).toBe(false);
  });

  it("covers every role in the privilege map", () => {
    expect(Object.keys(ADMIN_PRIVILEGES).sort()).toEqual(["admin", "editor", "owner"]);
  });
});