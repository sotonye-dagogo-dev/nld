import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";

import { queryWithTimeout } from "@/data/db";
import { purchases } from "@/data/db/schema";
import { verifyWebhookSignature } from "@/integrations/paystack/client";
import { fulfillSuccessfulPurchase, markPurchaseFailed } from "@/lib/payment-helpers";

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

  // Paystack primarily sends charge.success, but handle any transaction with reference
  const data = (event as unknown as { data?: { reference?: string; status?: string; amount?: number; currency?: string; customer?: { email?: string } } }).data;
  const reference = data?.reference;
  const status = (data?.status ?? "").toLowerCase();
  const amount = data?.amount;
  const currency = data?.currency;
  const customerEmail = data?.customer?.email;

  if (!reference) {
    // No reference to reconcile; ignore
    return NextResponse.json({ ok: true });
  }

  // If status is not success, mark purchase as failed (cancelled/abandoned)
  if (status !== "success") {
    // Only transition if purchase exists and is pending; do not downgrade success
    const existingFail = await queryWithTimeout((db) => db.select().from(purchases).where(eq(purchases.paystackReference, reference)).limit(1)).catch(() => []);
    if (existingFail[0] && existingFail[0].status === "pending") {
      const lowered = status || "failed";
      if (["failed", "abandoned", "cancelled", "reversed"].includes(lowered) || event.event !== "charge.success") {
        await markPurchaseFailed(reference, "paystack-webhook", `webhook status: ${status || event.event}`);
      }
    }
    return NextResponse.json({ ok: true });
  }

  // Success path — delegate to shared helper (updates purchase to success, creates grants, sends email)
  if (event.event !== "charge.success") {
    // Still allow success if webhook type differs but status is success
  }
  const res = await fulfillSuccessfulPurchase(reference, { source: "paystack-webhook", amount, currency, customerEmail });
  if (!res.ok) {
    return NextResponse.json({ ok: false }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
