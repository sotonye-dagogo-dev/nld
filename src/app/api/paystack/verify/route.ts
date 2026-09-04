import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { queryWithTimeout } from "@/data/db";
import { purchases } from "@/data/db/schema";
import { verifyTransaction } from "@/integrations/paystack/client";
import { fulfillSuccessfulPurchase, markPurchaseFailed } from "@/lib/payment-helpers";

export const runtime = "nodejs";

function isReferenceNotFoundMessage(msg: string): boolean {
  const low = msg.toLowerCase();
  // Handle both straight and curly apostrophes for "doesn't"
  return (
    low.includes("not found") ||
    low.includes("doesn't exist") ||
    low.includes("doesn\u2019t exist") ||
    low.includes("does not exist") ||
    low.includes("invalid reference") ||
    low.includes("reference not found") ||
    low.includes("no transaction") ||
    low.includes("404") ||
    (low.includes("reference") && low.includes("exist"))
  );
}

export async function POST(request: Request) {
  let reference: string | null = null;
  try {
    const body = await request.json().catch(() => null);
    if (body && typeof body.reference === "string") reference = body.reference;
  } catch {}
  if (!reference) {
    const url = new URL(request.url);
    reference = url.searchParams.get("reference");
  }
  if (!reference || typeof reference !== "string" || reference.trim().length === 0) {
    return NextResponse.json({ ok: false, error: "Reference is required." }, { status: 400 });
  }
  reference = reference.trim();

  const existing = await queryWithTimeout((db) => db.select().from(purchases).where(eq(purchases.paystackReference, reference)).limit(1)).catch(() => []);
  const purchase = existing[0] as typeof purchases.$inferSelect | undefined;
  if (!purchase) return NextResponse.json({ ok: false, error: "Purchase not found." }, { status: 404 });
  if (purchase.status === "success") {
    return NextResponse.json({ ok: true, status: "success", reference });
  }
  if (purchase.status === "failed") {
    return NextResponse.json({ ok: true, status: "failed", reference });
  }

  // If this reference was created via BudPay, proxy to BudPay verification instead of
  // calling Paystack (which will always return "Transaction reference doesn't exist" → 502 noise).
  const processor = (purchase.metadata as Record<string, unknown> | null | undefined)?.processor as string | undefined;
  if (processor === "budpay") {
    try {
      const { verifyTransaction: verifyBudpay } = await import("@/integrations/budpay/client");
      const verified = await verifyBudpay(reference);
      const status = (verified.status ?? "").toLowerCase();
      if (status === "success") {
        await fulfillSuccessfulPurchase(reference, { source: "paystack-verify→budpay-fallback", amount: Number(verified.amount) || undefined, currency: verified.currency, customerEmail: verified.customer?.email });
        return NextResponse.json({ ok: true, status: "success", reference, processor: "budpay" });
      }
      if (status === "failed" || status === "abandoned" || status === "cancelled") {
        await markPurchaseFailed(reference, "paystack-verify→budpay-fallback", `verify status: ${status}`);
        return NextResponse.json({ ok: true, status: "failed", reference, reason: status, processor: "budpay" });
      }
      return NextResponse.json({ ok: true, status: "pending", reference, gatewayStatus: status, processor: "budpay" });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Verification failed";
      if (isReferenceNotFoundMessage(msg)) {
        return NextResponse.json({ ok: false, error: "Transaction not found yet. It may still be processing — please wait a moment and retry, or contact support if the payment was marked failed." }, { status: 404 });
      }
      // Fall through to try Paystack as last resort before 502
    }
  }

  // Verify via Paystack API (authoritative)
  try {
    const verified = await verifyTransaction(reference);
    const status = (verified.status ?? "").toLowerCase();
    if (status === "success") {
      await fulfillSuccessfulPurchase(reference, { source: "paystack-verify", amount: verified.amount, currency: verified.currency, customerEmail: verified.customer?.email });
      return NextResponse.json({ ok: true, status: "success", reference });
    }
    if (status === "failed" || status === "abandoned") {
      await markPurchaseFailed(reference, "paystack-verify", `verify status: ${status}`);
      return NextResponse.json({ ok: true, status: "failed", reference, reason: status });
    }
    // pending / ongoing / not yet paid
    return NextResponse.json({ ok: true, status: "pending", reference, gatewayStatus: status });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Verification failed";
    if (isReferenceNotFoundMessage(msg)) {
      // For Paystack-intended refs that Paystack doesn't know yet, keep pending semantics
      // (transient). For BudPay refs that slipped through, try BudPay once before 404.
      if (processor !== "budpay") {
        try {
          const { verifyTransaction: verifyBudpay } = await import("@/integrations/budpay/client");
          const verified = await verifyBudpay(reference);
          const status = (verified.status ?? "").toLowerCase();
          if (status === "success") {
            await fulfillSuccessfulPurchase(reference, { source: "paystack-verify→budpay-retry", amount: Number(verified.amount) || undefined, currency: verified.currency, customerEmail: verified.customer?.email });
            return NextResponse.json({ ok: true, status: "success", reference, processor: "budpay" });
          }
          if (status === "failed" || status === "abandoned" || status === "cancelled") {
            await markPurchaseFailed(reference, "paystack-verify→budpay-retry", `verify status: ${status}`);
            return NextResponse.json({ ok: true, status: "failed", reference, reason: status, processor: "budpay" });
          }
          return NextResponse.json({ ok: true, status: "pending", reference, gatewayStatus: status, processor: "budpay" });
        } catch {
          // ignore, fall to 404 below
        }
      }
      return NextResponse.json({ ok: false, error: "Transaction not found yet. It may still be processing — please wait a moment and retry." }, { status: 404 });
    }
    // Transient gateway error — log for ops but surface as retryable 502 without noisy stack
    console.warn("[paystack/verify] transient failure:", msg.slice(0, 300));
    return NextResponse.json({ ok: false, error: "Could not verify transaction. Please try again shortly." }, { status: 502 });
  }
}

export async function GET(request: Request) {
  return POST(request);
}
