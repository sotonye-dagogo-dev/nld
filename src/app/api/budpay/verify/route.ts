import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { queryWithTimeout } from "@/data/db";
import { purchases } from "@/data/db/schema";
import { verifyTransaction } from "@/integrations/budpay/client";
import { fulfillSuccessfulPurchase, markPurchaseFailed } from "@/lib/payment-helpers";

export const runtime = "nodejs";

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
    console.error("[budpay/verify] failed:", err);
    const msg = err instanceof Error ? err.message : "Verification failed";
    if (msg.toLowerCase().includes("not found") || msg.includes("404")) {
      return NextResponse.json({ ok: false, error: "Transaction not found on BudPay yet." }, { status: 404 });
    }
    return NextResponse.json({ ok: false, error: "Could not verify transaction. Please try again." }, { status: 502 });
  }
}

export async function GET(request: Request) {
  return POST(request);
}
