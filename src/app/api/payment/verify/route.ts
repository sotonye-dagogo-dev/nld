import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { queryWithTimeout } from "@/data/db";
import { purchases } from "@/data/db/schema";
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
    reference = url.searchParams.get("reference") ?? url.searchParams.get("trxref") ?? url.searchParams.get("trxref") ?? url.searchParams.get("trxRef");
  }
  if (!reference || typeof reference !== "string" || reference.trim().length === 0) {
    return NextResponse.json({ ok: false, error: "Reference is required." }, { status: 400 });
  }
  reference = reference.trim();

  const existing = await queryWithTimeout((db) => db.select().from(purchases).where(eq(purchases.paystackReference, reference)).limit(1)).catch(() => []);
  const purchase = existing[0] as typeof purchases.$inferSelect | undefined;
  if (!purchase) return NextResponse.json({ ok: false, error: "Purchase not found." }, { status: 404 });
  if (purchase.status === "success") return NextResponse.json({ ok: true, status: "success", reference, processor: (purchase.metadata as Record<string, unknown> | null)?.processor ?? "unknown" });
  if (purchase.status === "failed") return NextResponse.json({ ok: true, status: "failed", reference, processor: (purchase.metadata as Record<string, unknown> | null)?.processor ?? "unknown" });

  const processor = (purchase.metadata as Record<string, unknown> | null | undefined)?.processor as string | undefined;

  // Try processors in order: recorded processor first, then the other as fallback
  const order: Array<"paystack" | "budpay"> = processor === "budpay" ? ["budpay", "paystack"] : processor === "paystack" ? ["paystack", "budpay"] : ["paystack", "budpay"];

  let lastNotFound: string | null = null;
  for (const which of order) {
    try {
      if (which === "paystack") {
        const { verifyTransaction } = await import("@/integrations/paystack/client");
        const verified = await verifyTransaction(reference);
        const status = (verified.status ?? "").toLowerCase();
        if (status === "success") {
          await fulfillSuccessfulPurchase(reference, { source: "payment-verify:paystack", amount: verified.amount, currency: verified.currency, customerEmail: verified.customer?.email });
          return NextResponse.json({ ok: true, status: "success", reference, processor: "paystack" });
        }
        if (status === "failed" || status === "abandoned") {
          await markPurchaseFailed(reference, "payment-verify:paystack", `verify status: ${status}`);
          return NextResponse.json({ ok: true, status: "failed", reference, reason: status, processor: "paystack" });
        }
        return NextResponse.json({ ok: true, status: "pending", reference, gatewayStatus: status, processor: "paystack" });
      } else {
        const { verifyTransaction } = await import("@/integrations/budpay/client");
        const verified = await verifyTransaction(reference);
        const status = (verified.status ?? "").toLowerCase();
        if (status === "success") {
          await fulfillSuccessfulPurchase(reference, { source: "payment-verify:budpay", amount: Number(verified.amount) || undefined, currency: verified.currency, customerEmail: verified.customer?.email });
          return NextResponse.json({ ok: true, status: "success", reference, processor: "budpay" });
        }
        if (status === "failed" || status === "abandoned" || status === "cancelled") {
          await markPurchaseFailed(reference, "payment-verify:budpay", `verify status: ${status}`);
          return NextResponse.json({ ok: true, status: "failed", reference, reason: status, processor: "budpay" });
        }
        return NextResponse.json({ ok: true, status: "pending", reference, gatewayStatus: status, processor: "budpay" });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Verification failed";
      if (isReferenceNotFoundMessage(msg)) {
        lastNotFound = msg;
        continue; // try next processor
      }
      // Transient gateway error — warn and continue to next processor if not last
      console.warn(`[payment/verify:${which}] transient:`, msg.slice(0, 300));
      lastNotFound = msg;
      continue;
    }
  }

  // Both processors reported not-found or transient — surface as pending-ish 404 so UI can retry
  if (lastNotFound && isReferenceNotFoundMessage(lastNotFound)) {
    return NextResponse.json({ ok: false, error: "Transaction not found yet. It may still be processing — please wait a moment and retry." }, { status: 404 });
  }
  return NextResponse.json({ ok: false, error: "Could not verify transaction. Please try again shortly." }, { status: 502 });
}

export async function GET(request: Request) {
  return POST(request);
}
