import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { queryWithTimeout } from "@/data/db";
import { accessGrants, devotionalDays } from "@/data/db/schema";
import { getDevotionalBySlug } from "@/lib/catalog";
import { verifyAccessPassword, derivePasswordForGrant } from "@/lib/access";
import { getSiteSettings } from "@/config/site";
import { recordAudit, recordEvent } from "@/lib/audit";
import { clampInt, isEmail } from "@/lib/utils";

export const runtime = "nodejs";

const bodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(1).max(64),
});

/**
 * Server-side unlock for the devotional reader. Locked day content is NEVER
 * shipped in the client bundle; it is only returned here AFTER the access
 * password is verified against a stored grant. The reader fetches this route
 * on successful verification.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;

  let payload: z.infer<typeof bodySchema>;
  try {
    payload = bodySchema.parse(await request.json());
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request body." }, { status: 400 });
  }
  if (!isEmail(payload.email)) {
    return NextResponse.json({ ok: false, error: "A valid email address is required." }, { status: 400 });
  }

  let devotional: Devotional | null = null;
  try {
    devotional = await getDevotionalBySlug(slug);
  } catch {
    return NextResponse.json(
      { ok: false, error: "Service temporarily unavailable. Please try again shortly." },
      { status: 503 },
    );
  }
  if (!devotional) {
    return NextResponse.json({ ok: false, error: "Devotional not found." }, { status: 404 });
  }

  // Primary lookup: direct grant for this devotional + email
  const grant = await queryWithTimeout((db) =>
    db.select().from(accessGrants).where(and(eq(accessGrants.devotionalId, devotional.id), eq(accessGrants.email, payload.email))).limit(1)
  ).catch(() => []);

  let active = grant.find((g) => g.status === "active") ?? null;

  // Fallback / bundle-aware verification: if direct grant missing or password mismatch,
  // scan all active grants for this email and check if submitted password matches ANY grant.
  // This handles: (a) bundle purchases where per-devotional grant creation partially failed,
  // (b) future devotionals not present at bundle time, (c) paystack reference suffix copies.
  // If a matching bundle grant is found we lazily ensure a per-devotional grant exists.
  async function findMatchingBundleGrant(): Promise<typeof active> {
    const all = await queryWithTimeout((db) =>
      db.select().from(accessGrants).where(eq(accessGrants.email, payload.email))
    ).catch(() => []);
    for (const g of all) {
      if (g.status !== "active") continue;
      if (g.expiresAt && g.expiresAt < new Date()) continue;
      if (verifyAccessPassword(payload.password, derivePasswordForGrant(g.paystackReference))) return g;
    }
    return null;
  }

  if (!active) {
    active = await findMatchingBundleGrant();
    if (!active) {
      return NextResponse.json(
        { ok: false, error: "No active access for that email on this devotional." },
        { status: 403 },
      );
    }
    // Lazily create per-devotional grant so future direct lookups succeed
    try {
      const { computeExpiry } = await import("@/lib/access");
      const { getSiteSettings: getSettings } = await import("@/config/site");
      const { value: s } = await getSettings().catch(() => ({ value: null as unknown as SiteSettings }));
      const dur = (s as unknown as SiteSettings | null)?.durationAccessDays ?? 60;
      const bd = (s as unknown as SiteSettings | null)?.bundleDurationDays ?? dur;
      const modeFromBundle: AccessMode = (active as unknown as { paystackReference: string })?.paystackReference?.startsWith("BT-") || active.paystackReference?.includes("__")
        ? (s?.bundleAccessMode ?? s?.accessMode ?? "one-time")
        : s?.accessMode ?? "one-time";
      const maybeExpiry = active.expiresAt ?? computeExpiry(modeFromBundle, modeFromBundle === "duration" ? bd : dur);
      await queryWithTimeout((db) =>
        db.insert(accessGrants).values({
          devotionalId: devotional.id,
          email: payload.email,
          paystackReference: `${active!.paystackReference}__lazy-${devotional.id.slice(0, 8)}`,
          status: "active",
          expiresAt: maybeExpiry,
        })
      ).catch(() => {});
      // re-use active for audit
    } catch {
      // non-fatal
    }
  } else {
    if (active.expiresAt && active.expiresAt < new Date()) {
      return NextResponse.json(
        { ok: false, error: "This access has expired. Please purchase again." },
        { status: 403 },
      );
    }

    if (!verifyAccessPassword(payload.password, derivePasswordForGrant(active.paystackReference))) {
      // Try bundle fallback before failing
      const fallback = await findMatchingBundleGrant();
      if (fallback) {
        active = fallback;
      } else {
        await recordAudit({
          actor: payload.email,
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

  const days = (await queryWithTimeout((db) =>
    db.select().from(devotionalDays).where(and(eq(devotionalDays.devotionalId, devotional.id), eq(devotionalDays.published, true))).orderBy(devotionalDays.dayNumber)
  ).catch(() => [])) as DevotionalDay[];

  const { value: settings } = await getSiteSettings().catch(() => ({ value: null }));
  const previewDays = clampInt(
    devotional.previewDays > 0 ? devotional.previewDays : (settings?.freePreviewDays ?? 3),
    0,
    days.length,
  );
  const lockedDays = days.slice(previewDays);

  await recordAudit({
    actor: payload.email,
    action: "access.verify",
    entity: "access_grant",
    entityId: active.id,
    metadata: { result: "ok", daysReturned: lockedDays.length },
  });
  await recordEvent({ eventType: "access.used", slug: devotional.slug, email: payload.email });

  return NextResponse.json({ ok: true, days: lockedDays });
}