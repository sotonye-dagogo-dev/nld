import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";

import { getDb } from "@/data/db";
import { purchases, accessGrants } from "@/data/db/schema";
import { verifyWebhookSignature } from "@/integrations/paystack/client";
import { deriveAccessPassword } from "@/lib/access";
import { sendAccessEmail } from "@/integrations/resend/client";
import { getSiteSettings } from "@/config/site";
import { recordAudit, recordEvent } from "@/lib/audit";

export const runtime = "nodejs";

/**
 * Paystack webhook for `charge.success`.
 *
 * Flow: verify signature over the RAW body → verify the transaction
 * server-side → flip the pending purchase to success → derive the access
 * password → create the access grant (idempotent) → email the password.
 *
 * Idempotency: keyed on paystack_reference (unique) and on
 * (devotionalId, email) for grants; email is sent only when the grant is
 * first created.
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
    return NextResponse.json({ ok: true }); // accept + ignore other events
  }

  const { reference, status, amount, currency, customer } = event.data;
  if (status !== "success") {
    return NextResponse.json({ ok: true });
  }

  const db = getDb();

  // Flip the pending purchase to success (idempotent upsert by reference).
  const existing = await db.select().from(purchases).where(eq(purchases.paystackReference, reference)).limit(1);
  const purchase = existing[0];
  if (!purchase) {
    // Webhook for a purchase we never initialized — reject.
    return NextResponse.json({ ok: false }, { status: 404 });
  }

  if (purchase.status !== "success") {
    await db
      .update(purchases)
      .set({ status: "success", updatedAt: new Date() })
      .where(eq(purchases.paystackReference, reference));
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
  const existingGrant = await db
    .select()
    .from(accessGrants)
    .where(eq(accessGrants.paystackReference, reference))
    .limit(1);
  const grant = existingGrant[0];

  if (grant) {
    // Already granted (duplicate webhook / retry) — nothing more to do.
    return NextResponse.json({ ok: true });
  }

  await db.insert(accessGrants).values({
    devotionalId: purchase.devotionalId,
    email,
    paystackReference: reference,
    accessPassword,
    status: "active",
  });
  await recordAudit({
    actor: email,
    action: "access.grant",
    entity: "access_grant",
    entityId: reference,
    after: { devotionalId: purchase.devotionalId, email },
  });
  await recordEvent({ eventType: "purchase.completed", slug: purchase.metadata?.slug as string | undefined, email });

  // Deliver the password. If Resend fails, audit the failure so an operator
  // can re-send; the grant itself is already recorded.
  try {
    const { value: settings } = await getSiteSettings();
    await sendAccessEmail({
      to: email,
      platformName: settings.platformName,
      devotionalTitle: purchase.metadata?.title as string | undefined ?? "your devotional",
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