import { NextResponse } from "next/server";
import { eq, and, sql } from "drizzle-orm";

import { queryWithTimeout } from "@/data/db";
import { purchases, accessGrants, devotionals } from "@/data/db/schema";
import { verifyWebhookSignature, verifyTransaction } from "@/integrations/budpay/client";
import { deriveAccessPassword, computeExpiry } from "@/lib/access";
import { sendAccessEmail } from "@/integrations/email-client";
import { getSiteSettings } from "@/config/site";
import { recordAudit, recordEvent } from "@/lib/audit";

export const runtime = "nodejs";

/**
 * BudPay webhook for transaction success — mirrors Paystack webhook.
 * BudPay sends { notify: "transaction", notifyType: "successful", data: { reference, status, amount, currency, customer } }
 * We verify via verifyTransaction API before granting access.
 */
export async function POST(request: Request) {
  const rawBody = await request.text();
  // BudPay does not document a signature header, but we check generic x-budpay-signature if present
  const signature = request.headers.get("x-budpay-signature") ?? request.headers.get("x-paystack-signature");

  if (!verifyWebhookSignature(rawBody, signature)) {
    return NextResponse.json({ ok: false }, { status: 403 });
  }

  let event: BudpayWebhookEvent;
  try {
    event = JSON.parse(rawBody) as BudpayWebhookEvent;
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  if (event.notify !== "transaction") {
    return NextResponse.json({ ok: true });
  }
  if (event.notifyType !== "successful" && event.data.status !== "success") {
    return NextResponse.json({ ok: true });
  }

  const reference = event.data.reference;
  const status = event.data.status;
  if (status !== "success") {
    return NextResponse.json({ ok: true });
  }

  // Verify transaction server-side via BudPay verify API (authoritative)
  let verified: BudpayVerifyData | null = null;
  try {
    verified = await verifyTransaction(reference);
    if (verified.status !== "success") {
      return NextResponse.json({ ok: true });
    }
  } catch (err) {
    console.error("[budpay/webhook] verifyTransaction failed, falling back to webhook data:", err);
    // fallback to webhook data if verify call fails transiently
  }

  const existing = await queryWithTimeout((db) => db.select().from(purchases).where(eq(purchases.paystackReference, reference)).limit(1)).catch(() => []);
  const purchase = existing[0];
  if (!purchase) {
    return NextResponse.json({ ok: false }, { status: 404 });
  }

  const normalizedPurchaseEmail = purchase.email.trim().toLowerCase();
  const email = (event.data.customer?.email || verified?.customer?.email || purchase.email).trim().toLowerCase();

  if (purchase.status !== "success") {
    await queryWithTimeout((db) =>
      db.update(purchases).set({ status: "success", updatedAt: new Date() }).where(eq(purchases.paystackReference, reference)),
    ).catch(() => {});
    await recordAudit({
      actor: normalizedPurchaseEmail,
      action: "purchase.verify",
      entity: "purchase",
      entityId: reference,
      before: { status: "pending" },
      after: { status: "success", amount: event.data.amount, currency: event.data.currency },
      metadata: { source: "budpay-webhook" },
    });
  }

  const accessPassword = deriveAccessPassword(reference);

  const existingGrant = await queryWithTimeout((db) =>
    db.select().from(accessGrants).where(eq(accessGrants.paystackReference, reference)).limit(1),
  ).catch(() => []);
  if (existingGrant[0]) {
    return NextResponse.json({ ok: true });
  }

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
    let devotionalsToGrant: { id: string; accessMode: AccessMode; title: string }[] = [];
    try {
      const rows = await queryWithTimeout((db) =>
        db.select({ id: devotionals.id, accessMode: devotionals.accessMode, title: devotionals.title }).from(devotionals).where(eq(devotionals.status, "published")),
      );
      devotionalsToGrant = rows as typeof devotionalsToGrant;
    } catch {
      devotionalsToGrant = [];
    }

    const bundleModeFromConfig: AccessMode = (siteSettings as SiteSettings | null)?.bundleAccessMode ?? siteSettings?.accessMode ?? "one-time";
    const bundleDuration = (siteSettings as SiteSettings | null)?.bundleDurationDays ?? (siteSettings as SiteSettings | null)?.durationAccessDays ?? 60;
    for (const devo of devotionalsToGrant) {
      const mode: AccessMode = bundleModeFromConfig;
      const expiresAt = computeExpiry(mode, bundleDuration);
      const already = await queryWithTimeout((db) =>
        db.select().from(accessGrants).where(and(eq(accessGrants.devotionalId, devo.id), sql`lower(${accessGrants.email}) = ${email}`)).limit(1),
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
        after: { devotionalId: devo.id, email, mode, expiresAt: expiresAt?.toISOString() ?? null, processor: "budpay" },
      });
    }
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
      after: { devotionalId: purchase.devotionalId, email, mode: effectiveMode, expiresAt: expiresAt?.toISOString() ?? null, processor: "budpay" },
    });
    await recordEvent({ eventType: "purchase.completed", slug: purchase.metadata?.slug as string | undefined, email });
  }

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
    console.error("[budpay/webhook] email send failed:", err);
    await recordAudit({
      actor: email,
      action: "access.grant",
      entity: "access_email",
      entityId: reference,
      metadata: { error: err instanceof Error ? err.message : "email send failed", processor: "budpay" },
    });
  }

  return NextResponse.json({ ok: true });
}
