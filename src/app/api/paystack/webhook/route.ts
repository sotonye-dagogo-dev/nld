import { NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";

import { queryWithTimeout } from "@/data/db";
import { purchases, accessGrants, devotionals } from "@/data/db/schema";
import { verifyWebhookSignature } from "@/integrations/paystack/client";
import { deriveAccessPassword, computeExpiry } from "@/lib/access";
import { sendAccessEmail } from "@/integrations/resend/client";
import { getSiteSettings } from "@/config/site";
import { recordAudit, recordEvent } from "@/lib/audit";

export const runtime = "nodejs";

/**
 * Paystack webhook for `charge.success`.
 *
 * Flow: verify signature over the RAW body → flip purchase to success →
 * derive password → create grant(s) with config-driven expiry → email.
 *
 * Platform config drives access handling:
 * - `accessMode` per devotional or site fallback determines expiry (forever vs time-bound)
 * - `isBundle` purchases grant access to all devotionals
 *
 * Idempotency: keyed on paystack_reference (unique) and on (devotionalId, email)
 */
export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-paystack-signature");

  if (!verifyWebhookSignature(rawBody, signature)) {
    return NextResponse.json({ ok: false }, { status: 403 });
  }

  let event: PaystackWebhookEvent;
  try {
    event = JSON.parse(rawBody) as PaystackWebhookEvent;
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  if (event.event !== "charge.success") {
    return NextResponse.json({ ok: true });
  }

  const { reference, status, amount, currency, customer } = event.data;
  if (status !== "success") {
    return NextResponse.json({ ok: true });
  }

  const existing = await queryWithTimeout((db) => db.select().from(purchases).where(eq(purchases.paystackReference, reference)).limit(1)).catch(() => []);
  const purchase = existing[0];
  if (!purchase) {
    return NextResponse.json({ ok: false }, { status: 404 });
  }

  if (purchase.status !== "success") {
    await queryWithTimeout((db) =>
      db.update(purchases).set({ status: "success", updatedAt: new Date() }).where(eq(purchases.paystackReference, reference)),
    ).catch(() => {});
    await recordAudit({
      actor: purchase.email,
      action: "purchase.verify",
      entity: "purchase",
      entityId: reference,
      before: { status: "pending" },
      after: { status: "success", amount, currency },
      metadata: { source: "paystack-webhook" },
    });
  }

  const accessPassword = deriveAccessPassword(reference);
  const email = customer.email || purchase.email;

  // Check existing grant(s) for idempotency
  const existingGrant = await queryWithTimeout((db) =>
    db.select().from(accessGrants).where(eq(accessGrants.paystackReference, reference)).limit(1),
  ).catch(() => []);
  if (existingGrant[0]) {
    return NextResponse.json({ ok: true });
  }

  // Resolve settings for expiry computation
  let siteSettings: SiteSettings | null = null;
  try {
    const s = await getSiteSettings();
    siteSettings = s.value;
  } catch {
    siteSettings = null;
  }

  const meta = (purchase.metadata ?? {}) as Record<string, unknown>;
  const isBundle = meta.isBundle === true || meta.isBundle === "true";

  if (isBundle) {
    // Bundle: grant access to every published devotional
    let devotionalsToGrant: { id: string; accessMode: AccessMode; title: string }[] = [];
    try {
      const rows = await queryWithTimeout((db) =>
        db.select({ id: devotionals.id, accessMode: devotionals.accessMode, title: devotionals.title }).from(devotionals).where(eq(devotionals.status, "published")),
      );
      devotionalsToGrant = rows as typeof devotionalsToGrant;
    } catch {
      devotionalsToGrant = [];
    }

    // Determine bundle expiry from config (bundleAccessMode takes precedence)
    const bundleModeFromConfig: AccessMode = (siteSettings as SiteSettings | null)?.bundleAccessMode ?? siteSettings?.accessMode ?? "one-time";
    const bundleDuration = (siteSettings as SiteSettings | null)?.bundleDurationDays ?? (siteSettings as SiteSettings | null)?.durationAccessDays ?? 60;
    for (const devo of devotionalsToGrant) {
      // Bundle purchase respects bundleAccessMode; fallback to per-devotional if bundle mode is one-time? Use bundle mode for bundle buys.
      const mode: AccessMode = bundleModeFromConfig;
      const expiresAt = computeExpiry(mode, bundleDuration);
      // Check if grant already exists for this email+devotional (admin manual etc)
      const already = await queryWithTimeout((db) =>
        db.select().from(accessGrants).where(and(eq(accessGrants.devotionalId, devo.id), eq(accessGrants.email, email))).limit(1),
      ).catch(() => []);
      if (already.length > 0) continue;
      await queryWithTimeout((db) =>
        db.insert(accessGrants).values({
          devotionalId: devo.id,
          email,
          paystackReference: `${reference}__${devo.id}`,
          status: "active",
          expiresAt,
        }),
      ).catch(() => {});
      await recordAudit({
        actor: email,
        action: "access.grant",
        entity: "access_grant",
        entityId: `${reference}__${devo.id}`,
        after: { devotionalId: devo.id, email, mode, expiresAt: expiresAt?.toISOString() ?? null },
      });
    }
    // Also keep bundle anchor grant for backward compatibility and future-devotional fallback
    const bundleExpiry = computeExpiry(bundleModeFromConfig, bundleDuration);
    await queryWithTimeout((db) =>
      db.insert(accessGrants).values({
        devotionalId: purchase.devotionalId,
        email,
        paystackReference: reference,
        status: "active",
        expiresAt: bundleExpiry,
      }),
    ).catch(() => {});

    await recordEvent({ eventType: "purchase.completed", slug: "all", email });
  } else {
    // Single devotional: compute expiry from devotional's accessMode or site fallback
    let devotionalMode: AccessMode | null = null;
    try {
      const rows = await queryWithTimeout((db) =>
        db.select({ accessMode: devotionals.accessMode }).from(devotionals).where(eq(devotionals.id, purchase.devotionalId)).limit(1),
      );
      devotionalMode = (rows[0]?.accessMode as AccessMode) ?? null;
    } catch {
      devotionalMode = null;
    }
    const effectiveMode: AccessMode = devotionalMode ?? siteSettings?.accessMode ?? "one-time";
    const effectiveDuration = (siteSettings as SiteSettings | null)?.durationAccessDays ?? 60;
    const expiresAt = computeExpiry(effectiveMode, effectiveDuration);

    await queryWithTimeout((db) =>
      db.insert(accessGrants).values({
        devotionalId: purchase.devotionalId,
        email,
        paystackReference: reference,
        status: "active",
        expiresAt,
      }),
    ).catch(() => {});
    await recordAudit({
      actor: email,
      action: "access.grant",
      entity: "access_grant",
      entityId: reference,
      after: { devotionalId: purchase.devotionalId, email, mode: effectiveMode, expiresAt: expiresAt?.toISOString() ?? null },
    });
    await recordEvent({ eventType: "purchase.completed", slug: purchase.metadata?.slug as string | undefined, email });
  }

  // Deliver the password (best-effort)
  try {
    const settings = siteSettings ?? (await getSiteSettings()).value;
    const devotionalTitle = (purchase.metadata?.title as string | undefined) ?? (isBundle ? "all devotionals" : "your devotional");
    await sendAccessEmail({
      to: email,
      platformName: settings.platformName,
      devotionalTitle,
      accessPassword,
      accessUrl: `${new URL(request.url).origin}/access`,
      supportEmail: settings.supportEmail,
    });
  } catch (err) {
    console.error("[paystack/webhook] email send failed:", err);
    await recordAudit({
      actor: email,
      action: "access.grant",
      entity: "access_email",
      entityId: reference,
      metadata: { error: err instanceof Error ? err.message : "email send failed" },
    });
  }

  return NextResponse.json({ ok: true });
}
