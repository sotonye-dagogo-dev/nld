import "server-only";

import { eq, and, sql } from "drizzle-orm";
import { queryWithTimeout } from "@/data/db";
import { purchases, accessGrants, devotionals } from "@/data/db/schema";
import { deriveAccessPassword, computeExpiry } from "@/lib/access";
import { sendAccessEmail } from "@/integrations/email-client";
import { getSiteSettings } from "@/config/site";
import { recordAudit, recordEvent } from "@/lib/audit";

/**
 * Shared helper to flip a pending purchase to success and create access grants.
 * Used by both Paystack/BudPay webhooks and verify endpoints to avoid drift.
 * Idempotent: safe to call multiple times.
 */
export async function fulfillSuccessfulPurchase(reference: string, opts?: { source?: string; amount?: number | string; currency?: string; customerEmail?: string }): Promise<{ ok: boolean; alreadyFulfilled?: boolean }> {
  const existing = await queryWithTimeout((db) => db.select().from(purchases).where(eq(purchases.paystackReference, reference)).limit(1)).catch(() => []);
  const purchase = existing[0] as typeof purchases.$inferSelect | undefined;
  if (!purchase) return { ok: false };
  const normalizedPurchaseEmail = purchase.email.trim().toLowerCase();
  const email = (opts?.customerEmail || purchase.email).trim().toLowerCase();

  if (purchase.status !== "success") {
    await queryWithTimeout((db) => db.update(purchases).set({ status: "success", updatedAt: new Date() }).where(eq(purchases.paystackReference, reference))).catch(() => {});
    await recordAudit({
      actor: normalizedPurchaseEmail,
      action: "purchase.verify",
      entity: "purchase",
      entityId: reference,
      before: { status: "pending" },
      after: { status: "success", amount: opts?.amount, currency: opts?.currency },
      metadata: { source: opts?.source ?? "verify" },
    });
  }

  const existingGrant = await queryWithTimeout((db) => db.select().from(accessGrants).where(eq(accessGrants.paystackReference, reference)).limit(1)).catch(() => []);
  if (existingGrant[0]) {
    return { ok: true, alreadyFulfilled: true };
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
  const accessPassword = deriveAccessPassword(reference);

  if (isBundle) {
    let devotionalsToGrant: { id: string; accessMode: AccessMode; title: string }[] = [];
    try {
      const rows = await queryWithTimeout((db) => db.select({ id: devotionals.id, accessMode: devotionals.accessMode, title: devotionals.title }).from(devotionals).where(eq(devotionals.status, "published")));
      devotionalsToGrant = rows as typeof devotionalsToGrant;
    } catch {
      devotionalsToGrant = [];
    }
    const bundleModeFromConfig: AccessMode = (siteSettings as SiteSettings | null)?.bundleAccessMode ?? siteSettings?.accessMode ?? "one-time";
    const bundleDuration = (siteSettings as SiteSettings | null)?.bundleDurationDays ?? (siteSettings as SiteSettings | null)?.durationAccessDays ?? 60;
    for (const devo of devotionalsToGrant) {
      const mode: AccessMode = bundleModeFromConfig;
      const expiresAt = computeExpiry(mode, bundleDuration);
      const already = await queryWithTimeout((db) => db.select().from(accessGrants).where(and(eq(accessGrants.devotionalId, devo.id), sql`lower(${accessGrants.email}) = ${email}`)).limit(1)).catch(() => []);
      if (already.length > 0) continue;
      await queryWithTimeout((db) => db.insert(accessGrants).values({ devotionalId: devo.id, email, paystackReference: `${reference}__${devo.id}`, status: "active", expiresAt })).catch(() => {});
      await recordAudit({ actor: email, action: "access.grant", entity: "access_grant", entityId: `${reference}__${devo.id}`, after: { devotionalId: devo.id, email, mode, expiresAt: expiresAt?.toISOString() ?? null } });
    }
    const bundleExpiry = computeExpiry(bundleModeFromConfig, bundleDuration);
    await queryWithTimeout((db) => db.insert(accessGrants).values({ devotionalId: purchase.devotionalId, email, paystackReference: reference, status: "active", expiresAt: bundleExpiry })).catch(() => {});
    await recordEvent({ eventType: "purchase.completed", slug: "all", email });
  } else {
    let devotionalMode: AccessMode | null = null;
    try {
      const rows = await queryWithTimeout((db) => db.select({ accessMode: devotionals.accessMode }).from(devotionals).where(eq(devotionals.id, purchase.devotionalId)).limit(1));
      devotionalMode = (rows[0]?.accessMode as AccessMode) ?? null;
    } catch {
      devotionalMode = null;
    }
    const effectiveMode: AccessMode = devotionalMode ?? siteSettings?.accessMode ?? "one-time";
    const effectiveDuration = (siteSettings as SiteSettings | null)?.durationAccessDays ?? 60;
    const expiresAt = computeExpiry(effectiveMode, effectiveDuration);
    await queryWithTimeout((db) => db.insert(accessGrants).values({ devotionalId: purchase.devotionalId, email, paystackReference: reference, status: "active", expiresAt })).catch(() => {});
    await recordAudit({ actor: email, action: "access.grant", entity: "access_grant", entityId: reference, after: { devotionalId: purchase.devotionalId, email, mode: effectiveMode, expiresAt: expiresAt?.toISOString() ?? null } });
    await recordEvent({ eventType: "purchase.completed", slug: purchase.metadata?.slug as string | undefined, email });
  }

  try {
    const { env } = await import("@/config/env");
    const settings = siteSettings ?? (await getSiteSettings()).value;
    const devotionalTitle = (purchase.metadata?.title as string | undefined) ?? (isBundle ? "all devotionals" : "your devotional");
    await sendAccessEmail({
      to: email,
      platformName: settings.platformName,
      devotionalTitle,
      accessPassword,
      accessUrl: `${env.appUrl}/access`,
      supportEmail: settings.supportEmail,
    });
  } catch (err) {
    console.error("[payment-helpers] email send failed:", err);
  }

  return { ok: true };
}

/**
 * Mark a purchase as failed (cancelled/abandoned). Idempotent.
 */
export async function markPurchaseFailed(reference: string, source: string, reason?: string) {
  const existing = await queryWithTimeout((db) => db.select().from(purchases).where(eq(purchases.paystackReference, reference)).limit(1)).catch(() => []);
  const purchase = existing[0] as typeof purchases.$inferSelect | undefined;
  if (!purchase) return { ok: false };
  if (purchase.status === "failed") return { ok: true, already: true };
  if (purchase.status === "success") return { ok: true, alreadySuccess: true }; // do not downgrade success
  await queryWithTimeout((db) => db.update(purchases).set({ status: "failed", updatedAt: new Date() }).where(eq(purchases.paystackReference, reference))).catch(() => {});
  await recordAudit({
    actor: purchase.email,
    action: "purchase.verify",
    entity: "purchase",
    entityId: reference,
    before: { status: "pending" },
    after: { status: "failed" },
    metadata: { source, reason: reason ?? "verification failed" },
  });
  return { ok: true };
}
