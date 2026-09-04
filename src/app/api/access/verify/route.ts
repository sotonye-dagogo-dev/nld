import { NextResponse } from "next/server";
import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";

import { queryWithTimeout } from "@/data/db";
import { accessGrants, devotionalDays, devotionals } from "@/data/db/schema";
import { getDevotionalBySlug } from "@/lib/catalog";
import { verifyAccessPassword, derivePasswordForGrant } from "@/lib/access";
import { recordAudit, recordEvent } from "@/lib/audit";
import { isEmail } from "@/lib/utils";

function normalizeEmail(v: string): string {
  return v.trim().toLowerCase();
}

export const runtime = "nodejs";

const bodySchema = z.object({
  slug: z.string().max(200),
  email: z.string().email(),
  password: z.string().min(1).max(64),
});

export async function POST(request: Request) {
  let payload: z.infer<typeof bodySchema>;
  try {
    payload = bodySchema.parse(await request.json());
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request body." }, { status: 400 });
  }
  if (!isEmail(payload.email)) {
    return NextResponse.json({ ok: false, error: "A valid email address is required." }, { status: 400 });
  }
  const normalizedEmail = normalizeEmail(payload.email);
  const trimmedPassword = payload.password.trim();

  // Auto-detect mode: slug empty → scan all grants for email and match password
  const trimmedSlug = payload.slug.trim();
  if (!trimmedSlug) {
    let allGrants: typeof accessGrants.$inferSelect[] = [];
    try {
      allGrants = await queryWithTimeout((db) =>
        db.select().from(accessGrants).where(sql`lower(${accessGrants.email}) = ${normalizedEmail}`)
      );
    } catch {
      return NextResponse.json({ ok: false, error: "Service temporarily unavailable. Please try again shortly." }, { status: 503 });
    }
    const activeGrants = allGrants.filter((g) => g.status === "active" && (!g.expiresAt || g.expiresAt > new Date()));
    for (const g of activeGrants) {
      if (verifyAccessPassword(trimmedPassword, derivePasswordForGrant(g.paystackReference))) {
        const devotionalRows = await queryWithTimeout((db) => db.select().from(devotionals).where(eq(devotionals.id, g.devotionalId)).limit(1)).catch(() => []);
        const devotional = devotionalRows[0] as unknown as Devotional | undefined;
        const days = devotional ? await queryWithTimeout((db) => db.select({ n: devotionalDays.dayNumber }).from(devotionalDays).where(and(eq(devotionalDays.devotionalId, devotional.id), eq(devotionalDays.published, true)))).then((r) => r.length).catch(() => 0) : 0;
        if (devotional) {
          await recordAudit({ actor: normalizedEmail, action: "access.verify", entity: "access_grant", entityId: g.id, metadata: { result: "ok", autoDetect: true } });
          await recordEvent({ eventType: "access.used", slug: devotional.slug, email: normalizedEmail });
          return NextResponse.json({ ok: true, devotional: devotional.title, days, matchedSlug: devotional.slug });
        }
      }
    }
    // Auto-detect fallback: check purchases directly (handles bundle / pending-verify)
    try {
      const { purchases } = await import("@/data/db/schema");
      const { deriveAccessPassword } = await import("@/lib/access");
      const rows = await queryWithTimeout((db) => db.select().from(purchases).where(sql`lower(${purchases.email}) = ${normalizedEmail}`)).catch(() => []);
      for (const p of rows) {
        if (p.status !== "success") continue;
        if (!verifyAccessPassword(trimmedPassword, deriveAccessPassword(p.paystackReference))) continue;
        const devotionalRows = await queryWithTimeout((db) => db.select().from(devotionals).where(eq(devotionals.id, p.devotionalId)).limit(1)).catch(() => []);
        const devotional = devotionalRows[0] as unknown as Devotional | undefined;
        if (devotional) {
          await recordAudit({ actor: normalizedEmail, action: "access.verify", entity: "access_grant", entityId: p.id, metadata: { result: "ok", autoDetect: true, via: "purchase" } });
          await recordEvent({ eventType: "access.used", slug: devotional.slug, email: normalizedEmail });
          const days = await queryWithTimeout((db) => db.select({ n: devotionalDays.dayNumber }).from(devotionalDays).where(and(eq(devotionalDays.devotionalId, devotional.id), eq(devotionalDays.published, true)))).then((r) => r.length).catch(() => 0);
          return NextResponse.json({ ok: true, devotional: devotional.title, days, matchedSlug: devotional.slug });
        }
      }
    } catch {}
    return NextResponse.json({ ok: false, error: "No matching devotional found for that email and password. Please select a devotional." }, { status: 403 });
  }

  let devotional: Devotional | null = null;
  try {
    devotional = await getDevotionalBySlug(trimmedSlug);
  } catch {
    return NextResponse.json(
      { ok: false, error: "Service temporarily unavailable. Please try again shortly." },
      { status: 503 },
    );
  }
  if (!devotional) {
    return NextResponse.json({ ok: false, error: "Devotional not found." }, { status: 404 });
  }

  let grant: typeof accessGrants.$inferSelect[] = [];
  try {
    grant = await queryWithTimeout((db) =>
      db.select().from(accessGrants).where(and(eq(accessGrants.devotionalId, devotional.id), sql`lower(${accessGrants.email}) = ${normalizedEmail}`)).limit(1)
    );
  } catch (e) {
    const msg = (e instanceof Error ? e.message : String(e)).toLowerCase();
    if (msg.includes("timeout") || msg.includes("connection") || msg.includes("57014")) {
      return NextResponse.json({ ok: false, error: "Service temporarily unavailable. Please try again shortly." }, { status: 503 });
    }
    grant = [];
  }

  let active = grant.find((g) => g.status === "active") ?? null;

  // Bundle-aware fallback: scan all grants for email and see if password matches any active grant
  async function findMatchingGrant(): Promise<typeof active> {
    let all: typeof accessGrants.$inferSelect[] = [];
    try {
      all = await queryWithTimeout((db) =>
        db.select().from(accessGrants).where(sql`lower(${accessGrants.email}) = ${normalizedEmail}`)
      );
    } catch {
      return null;
    }
    for (const g of all) {
      if (g.status !== "active") continue;
      if (g.expiresAt && g.expiresAt < new Date()) continue;
      if (verifyAccessPassword(trimmedPassword, derivePasswordForGrant(g.paystackReference))) return g;
    }
    return null;
  }

  async function tryVerifyPendingPurchase(p: { paystackReference: string; status: string }): Promise<boolean> {
    if (p.status !== "pending") return false;
    try {
      const { fulfillSuccessfulPurchase } = await import("@/lib/payment-helpers");
      for (const verifier of [
        async () => {
          const { verifyTransaction } = await import("@/integrations/paystack/client");
          const v = await verifyTransaction(p.paystackReference);
          return (v.status ?? "").toLowerCase() === "success";
        },
        async () => {
          const { verifyTransaction } = await import("@/integrations/budpay/client");
          const v = await verifyTransaction(p.paystackReference);
          return (v.status ?? "").toLowerCase() === "success";
        },
      ]) {
        try {
          const isSuccess = await verifier();
          if (isSuccess) {
            await fulfillSuccessfulPurchase(p.paystackReference, { source: "access-verify-pending" });
            return true;
          }
        } catch {}
      }
    } catch {}
    return false;
  }

  // Purchases fallback: success-verified purchases grant access; pending are verified on-the-fly.
  async function findMatchingPurchase(): Promise<typeof active> {
    try {
      const { purchases } = await import("@/data/db/schema");
      const { deriveAccessPassword } = await import("@/lib/access");
      let rows: typeof purchases.$inferSelect[] = [];
      try {
        rows = await queryWithTimeout((db) =>
          db.select().from(purchases).where(sql`lower(${purchases.email}) = ${normalizedEmail}`)
        );
      } catch {
        return null;
      }
      for (const p of rows) {
        const expected = deriveAccessPassword(p.paystackReference);
        if (!verifyAccessPassword(trimmedPassword, expected)) continue;
        if (p.status === "pending") {
          const promoted = await tryVerifyPendingPurchase(p as unknown as { paystackReference: string; status: string });
          if (!promoted) continue;
          try {
            const fresh = await queryWithTimeout((db) =>
              db.select().from(purchases).where(eq(purchases.paystackReference, p.paystackReference)).limit(1)
            );
            if (fresh[0]?.status !== "success") continue;
          } catch {
            continue;
          }
        } else if (p.status !== "success") {
          continue;
        }
        // Lazily create grant for this devotional so future direct lookups succeed
        try {
          const { computeExpiry } = await import("@/lib/access");
          const { getSiteSettings: getSettings2 } = await import("@/config/site");
          const { value: s2 } = await getSettings2().catch(() => ({ value: null as unknown as SiteSettings }));
          const dur2 = (s2 as unknown as SiteSettings | null)?.durationAccessDays ?? 60;
          const mode2: AccessMode = s2?.accessMode ?? "one-time";
          const exp2 = computeExpiry(mode2, dur2);
          const inserted = await queryWithTimeout((db) =>
            db.insert(accessGrants).values({
              devotionalId: devotional!.id,
              email: normalizedEmail,
              paystackReference: p.paystackReference,
              status: "active",
              expiresAt: exp2,
            }).returning({ id: accessGrants.id })
          ).catch(() => [] as { id: string }[]);
          if (inserted && inserted.length > 0) {
            const newGrant = await queryWithTimeout((db) => db.select().from(accessGrants).where(eq(accessGrants.id, inserted[0].id)).limit(1)).catch(() => []);
            if (newGrant[0]) return newGrant[0] as typeof active;
          }
        } catch {}
        // Fallback: return pseudo-grant shaped object for audit (use existing purchase ref)
        return {
          id: p.id,
          devotionalId: devotional!.id,
          email: normalizedEmail,
          paystackReference: p.paystackReference,
          status: "active",
          expiresAt: null,
          grantedAt: new Date(),
        } as unknown as typeof active;
      }
    } catch {}
    return null;
  }

  if (!active) {
    active = await findMatchingGrant();
    if (!active) {
      active = await findMatchingPurchase();
    }
    if (!active) {
      return NextResponse.json(
        { ok: false, error: "No active access for that email on this devotional." },
        { status: 403 },
      );
    }
    // Lazily ensure per-devotional grant for future direct lookup
    try {
      const { computeExpiry } = await import("@/lib/access");
      const { getSiteSettings: getSettings } = await import("@/config/site");
      const { value: s } = await getSettings().catch(() => ({ value: null as unknown as SiteSettings }));
      const dur = (s as unknown as SiteSettings | null)?.durationAccessDays ?? 60;
      const bd = (s as unknown as SiteSettings | null)?.bundleDurationDays ?? dur;
      const modeFromBundle: AccessMode = active.paystackReference?.startsWith("BT-") || active.paystackReference?.includes("__")
        ? s?.bundleAccessMode ?? s?.accessMode ?? "one-time"
        : s?.accessMode ?? "one-time";
      const maybeExpiry = active.expiresAt ?? computeExpiry(modeFromBundle, modeFromBundle === "duration" ? bd : dur);
      await queryWithTimeout((db) =>
        db.insert(accessGrants).values({
          devotionalId: devotional.id,
          email: normalizedEmail,
          paystackReference: `${active!.paystackReference}__lazy-${devotional.id.slice(0, 8)}`,
          status: "active",
          expiresAt: maybeExpiry,
        })
      ).catch(() => {});
    } catch {}
  } else {
    if (active.expiresAt && active.expiresAt < new Date()) {
      return NextResponse.json(
        { ok: false, error: "This access has expired. Please purchase again." },
        { status: 403 },
      );
    }

    if (!verifyAccessPassword(trimmedPassword, derivePasswordForGrant(active.paystackReference))) {
      const fallback = await findMatchingGrant();
      if (fallback) {
        active = fallback;
      } else {
        const purchaseFallback = await findMatchingPurchase();
        if (purchaseFallback) {
          active = purchaseFallback;
        } else {
          await recordAudit({
            actor: normalizedEmail,
            action: "access.verify",
            entity: "access_grant",
            entityId: active.id,
            metadata: { result: "failed" },
          });
          return NextResponse.json(
            { ok: false, error: "That access password did not match. Please check your email." },
            { status: 403 },
          );
        }
      }
    }
  }

  // Password matches — grant was verified. Count the unlocked days.
  const days = await queryWithTimeout((db) =>
    db.select({ n: devotionalDays.dayNumber }).from(devotionalDays).where(and(eq(devotionalDays.devotionalId, devotional.id), eq(devotionalDays.published, true)))
  ).then((rows) => rows.length).catch(() => 0);

  await recordAudit({
    actor: normalizedEmail,
    action: "access.verify",
    entity: "access_grant",
    entityId: active.id,
    metadata: { result: "ok" },
  });
  await recordEvent({ eventType: "access.used", slug: devotional.slug, email: normalizedEmail });

  return NextResponse.json({ ok: true, devotional: devotional.title, days });
}