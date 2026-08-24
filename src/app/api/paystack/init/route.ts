import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { z } from "zod";

import { env } from "@/config/env";
import { queryWithTimeout } from "@/data/db";
import { purchases } from "@/data/db/schema";
import { getDevotionalBySlug } from "@/lib/catalog";
import { initializeTransaction } from "@/integrations/paystack/client";
import { recordAudit, recordEvent } from "@/lib/audit";
import { isEmail } from "@/lib/utils";

export const runtime = "nodejs";

const bodySchema = z.object({
  slug: z.string().min(1).max(200),
  email: z.string().email(),
});

export async function POST(request: Request) {
  let payload: z.infer<typeof bodySchema>;
  try {
    payload = bodySchema.parse(await request.json());
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request body." }, { status: 400 });
  }

  if (!isEmail(payload.email)) {
    return NextResponse.json({ ok: false, error: "A valid email address is required." }, { status: 400 });
  }

  let devotional: Devotional | null = null;
  try {
    devotional = await getDevotionalBySlug(payload.slug);
  } catch {
    return NextResponse.json(
      { ok: false, error: "Service temporarily unavailable. Please try again shortly." },
      { status: 503 },
    );
  }
  if (!devotional) {
    return NextResponse.json({ ok: false, error: "Devotional not found." }, { status: 404 });
  }
  if (devotional.priceMinor <= 0) {
    return NextResponse.json({ ok: false, error: "This devotional is free — no purchase needed." }, { status: 400 });
  }

  const reference = `NL-${randomUUID()}`;

  try {
    const init = await initializeTransaction({
      email: payload.email,
      amountMinor: devotional.priceMinor,
      currency: devotional.currency,
      reference,
      callbackUrl: `${env.appUrl}/devotionals/${devotional.slug}`,
      metadata: { devotionalId: devotional.id, slug: devotional.slug },
    });

    // Record a pending purchase for the audit trail + webhook reconciliation.
    await queryWithTimeout((db) =>
      db.insert(purchases).values({
        devotionalId: devotional.id,
        email: payload.email,
        amountMinor: devotional.priceMinor,
        currency: devotional.currency,
        paystackReference: reference,
        status: "pending",
        metadata: { initAccessCode: init.access_code },
      })
    );

    await recordAudit({
      actor: payload.email,
      action: "purchase.init",
      entity: "purchase",
      entityId: reference,
      after: { devotionalId: devotional.id, amountMinor: devotional.priceMinor, currency: devotional.currency },
    });
    await recordEvent({ eventType: "purchase.started", slug: devotional.slug, email: payload.email });

    return NextResponse.json({ ok: true, authorizationUrl: init.authorization_url });
  } catch (err) {
    console.error("[paystack/init] failed:", err);
    return NextResponse.json(
      { ok: false, error: "Could not start payment. Please try again." },
      { status: 502 },
    );
  }
}