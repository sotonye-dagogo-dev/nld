import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";

import { queryWithTimeout } from "@/data/db";
import { purchases } from "@/data/db/schema";
import { verifyWebhookSignature, verifyTransaction } from "@/integrations/budpay/client";
import { fulfillSuccessfulPurchase, markPurchaseFailed } from "@/lib/payment-helpers";

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

  const reference = event.data?.reference;
  const status = (event.data?.status ?? "").toLowerCase();
  const notifyType = (event.notifyType ?? "").toLowerCase();

  if (!reference) {
    return NextResponse.json({ ok: true });
  }

  // Non-successful webhook → mark as failed if still pending
  const isSuccess = status === "success" || notifyType === "successful";
  if (!isSuccess) {
    const shouldFail = notifyType === "failed" || ["failed", "abandoned", "cancelled"].includes(status);
    if (shouldFail) {
      await markPurchaseFailed(reference, "budpay-webhook", `webhook notifyType: ${notifyType || status}`);
    }
    return NextResponse.json({ ok: true });
  }

  // Re-verify via API before fulfilling (authoritative)
  let customerEmail = event.data.customer?.email as string | undefined;
  try {
    const verified = await verifyTransaction(reference);
    customerEmail = verified.customer?.email ?? customerEmail;
    if ((verified.status ?? "").toLowerCase() !== "success") {
      if (["failed", "abandoned", "cancelled"].includes((verified.status ?? "").toLowerCase())) {
        await markPurchaseFailed(reference, "budpay-webhook-verify", `verify status: ${verified.status}`);
      }
      return NextResponse.json({ ok: true });
    }
  } catch (err) {
    console.error("[budpay/webhook] verifyTransaction failed, falling back to webhook data:", err);
  }

  const res = await fulfillSuccessfulPurchase(reference, { source: "budpay-webhook", amount: event.data.amount, currency: event.data.currency, customerEmail });
  if (!res.ok) return NextResponse.json({ ok: false }, { status: 404 });
  return NextResponse.json({ ok: true });
}
