import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { queryWithTimeout } from "@/data/db";
import { purchases } from "@/data/db/schema";
import { verifyTransaction } from "@/integrations/budpay/client";
import { fulfillSuccessfulPurchase, markPurchaseFailed } from "@/lib/payment-helpers";

export const runtime = "nodejs";

function isReferenceNotFoundMessage(msg: string): boolean {
  const low = msg.toLowerCase();
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
  if (purchase.status === "success") return NextResponse.json({ ok: true, status: "success", reference });
  if (purchase.status === "failed") return NextResponse.json({ ok: true, status: "failed", reference });

  const processor = (purchase.metadata as Record<string, unknown> | null | undefined)?.processor as string | undefined;
  if (processor === "paystack" || !processor) {
    // Reference likely belongs to Paystack; try Paystack first if this is a BudPay verify hit for a Paystack ref
    try {
      const { verifyTransaction: verifyPaystack } = await import("@/integrations/paystack/client");
      const verified = await verifyPaystack(reference);
      const status = (verified.status ?? "").toLowerCase();
      if (status === "success") {
        await fulfillSuccessfulPurchase(reference, { source: "budpay-verify→paystack-fallback", amount: verified.amount, currency: verified.currency, customerEmail: verified.customer?.email });
        return NextResponse.json({ ok: true, status: "success", reference, processor: "paystack" });
      }
      if (status === "failed" || status === "abandoned") {
        await markPurchaseFailed(reference, "budpay-verify→paystack-fallback", `verify status: ${status}`);
        return NextResponse.json({ ok: true, status: "failed", reference, reason: status, processor: "paystack" });
      }
      return NextResponse.json({ ok: true, status: "pending", reference, gatewayStatus: status, processor: "paystack" });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Verification failed";
      if (isReferenceNotFoundMessage(msg)) {
        // Paystack reports not-found; fall through to try BudPay below (may be BudPay ref mis-routed)
      } else {
        // Transient Paystack error — don't mask, try BudPay as alternative then report
      }
    }
    // If processor is explicitly paystack, don't silently swallow "not found" → surface helpful 404
    if (processor === "paystack") {
      // Continue to BudPay attempt as fallback for resilience, but if that also not-found we will return 404
    }
  }

  try {
    const verified = await verifyTransaction(reference);
    const status = (verified.status ?? "").toLowerCase();
    if (status === "success") {
      await fulfillSuccessfulPurchase(reference, { source: "budpay-verify", amount: Number(verified.amount) || undefined, currency: verified.currency, customerEmail: verified.customer?.email });
      return NextResponse.json({ ok: true, status: "success", reference });
    }
    if (status === "failed" || status === "abandoned" || status === "cancelled") {
      await markPurchaseFailed(reference, "budpay-verify", `verify status: ${status}`);
      return NextResponse.json({ ok: true, status: "failed", reference, reason: status });
    }
    return NextResponse.json({ ok: true, status: "pending", reference, gatewayStatus: status });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Verification failed";
    if (isReferenceNotFoundMessage(msg)) {
      // If BudPay says not-found but purchase claims to be budpay, try Paystack once as fallback (mis-routed)
      if (processor === "budpay") {
        try {
          const { verifyTransaction: verifyPaystack } = await import("@/integrations/paystack/client");
          const verified = await verifyPaystack(reference);
          const status = (verified.status ?? "").toLowerCase();
          if (status === "success") {
            await fulfillSuccessfulPurchase(reference, { source: "budpay-verify→paystack-retry", amount: verified.amount, currency: verified.currency, customerEmail: verified.customer?.email });
            return NextResponse.json({ ok: true, status: "success", reference, processor: "paystack" });
          }
          if (status === "failed" || status === "abandoned") {
            await markPurchaseFailed(reference, "budpay-verify→paystack-retry", `verify status: ${status}`);
            return NextResponse.json({ ok: true, status: "failed", reference, reason: status, processor: "paystack" });
          }
          return NextResponse.json({ ok: true, status: "pending", reference, gatewayStatus: status, processor: "paystack" });
        } catch {
          // ignore
        }
      }
      return NextResponse.json({ ok: false, error: "Transaction not found yet. It may still be processing — please wait a moment and retry." }, { status: 404 });
    }
    console.warn("[budpay/verify] transient failure:", msg.slice(0, 300));
    return NextResponse.json({ ok: false, error: "Could not verify transaction. Please try again shortly." }, { status: 502 });
  }
}

export async function GET(request: Request) {
  return POST(request);
}
