import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { z } from "zod";

import { env } from "@/config/env";
import { queryWithTimeout } from "@/data/db";
import { purchases } from "@/data/db/schema";
import { getDevotionalBySlug, getPurchasableDevotionals } from "@/lib/catalog";
import { initializeTransaction } from "@/integrations/paystack/client";
import { recordAudit, recordEvent } from "@/lib/audit";
import { isEmail } from "@/lib/utils";
import { getSiteSettings } from "@/config/site";

export const runtime = "nodejs";

const bodySchema = z.object({
  slug: z.string().min(1).max(200),
  email: z.string().email(),
});

function isDuplicateError(err: unknown): boolean {
  const e = err as Record<string, unknown> | null;
  if (!e) return false;
  const code = typeof e.code === "string" ? e.code : "";
  const msg = typeof e.message === "string" ? e.message.toLowerCase() : "";
  return code === "23505" || msg.includes("duplicate key") || msg.includes("unique constraint");
}

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

  // Respect platform payment config end-to-end
  let settings: SiteSettings;
  try {
    const s = await getSiteSettings();
    settings = s.value;
  } catch {
    return NextResponse.json({ ok: false, error: "Service temporarily unavailable. Please try again shortly." }, { status: 503 });
  }
  if (!settings.paymentsEnabled) {
    return NextResponse.json({ ok: false, error: "Payments are currently disabled." }, { status: 400 });
  }
  if (!settings.paystackEnabled) {
    return NextResponse.json({ ok: false, error: "Paystack payments are currently disabled. Please use bank transfer." }, { status: 400 });
  }

  const isBundle = payload.slug === "all" || payload.slug === "__all__" || payload.slug === "bundle";

  // For bundle: compute aggregate price and use first devotional as anchor
  let devotional: Devotional | null = null;
  let bundleDevotionals: Devotional[] | null = null;
  let amountMinor: number;
  let currency: string;
  let devotionalId: string;
  let callbackSlug: string;

  if (isBundle) {
    try {
      bundleDevotionals = await getPurchasableDevotionals();
    } catch {
      return NextResponse.json({ ok: false, error: "Service temporarily unavailable. Please try again shortly." }, { status: 503 });
    }
    if (!bundleDevotionals || bundleDevotionals.length === 0) {
      return NextResponse.json({ ok: false, error: "No devotionals available for bundle purchase." }, { status: 404 });
    }
    // Config-driven bundle fee: platform one-time fee if set, else sum
    if (settings.accessMode === "one-time" && settings.defaultPriceMinor > 0) {
      amountMinor = settings.defaultPriceMinor;
    } else {
      amountMinor = bundleDevotionals.reduce((sum, d) => sum + d.priceMinor, 0);
    }
    currency = bundleDevotionals[0].currency;
    devotionalId = bundleDevotionals[0].id;
    callbackSlug = "all";
  } else {
    try {
      devotional = await getDevotionalBySlug(payload.slug);
    } catch {
      return NextResponse.json({ ok: false, error: "Service temporarily unavailable. Please try again shortly." }, { status: 503 });
    }
    if (!devotional) {
      return NextResponse.json({ ok: false, error: "Devotional not found." }, { status: 404 });
    }
    if (devotional.priceMinor <= 0) {
      return NextResponse.json({ ok: false, error: "This devotional is free — no purchase needed." }, { status: 400 });
    }
    amountMinor = devotional.priceMinor;
    currency = devotional.currency;
    devotionalId = devotional.id;
    callbackSlug = devotional.slug;
  }

  // Generate reference and attempt Paystack init with one retry on duplicate insertion
  let reference = `NL-${randomUUID()}`;
  let lastError: unknown = null;

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const init = await initializeTransaction({
        email: payload.email,
        amountMinor,
        currency,
        reference,
        callbackUrl: `${env.appUrl}/devotionals/${callbackSlug}`,
        metadata: {
          devotionalId,
          slug: callbackSlug,
          isBundle: isBundle ? "true" : "false",
          bundleCount: isBundle ? String(bundleDevotionals?.length ?? 0) : undefined,
        },
      });

      // Record pending purchase (audit trail + webhook reconciliation)
      try {
        await queryWithTimeout((db) =>
          db.insert(purchases).values({
            devotionalId,
            email: payload.email,
            amountMinor,
            currency,
            paystackReference: reference,
            status: "pending",
            metadata: {
              initAccessCode: init.access_code,
              isBundle: isBundle,
              bundleDevotionalIds: isBundle ? bundleDevotionals?.map((d) => d.id) : undefined,
              slug: callbackSlug,
              title: isBundle ? "All Devotionals Bundle" : devotional?.title,
            },
          }),
        );
      } catch (dbErr) {
        if (isDuplicateError(dbErr)) {
          // Very rare UUID collision — generate new reference and retry once
          if (attempt === 0) {
            reference = `NL-${randomUUID()}`;
            continue;
          }
          throw dbErr;
        }
        // If DB insert fails after Paystack succeeded, we still have a dangling
        // Paystack transaction but webhook will not find purchase. Log and return
        // 502 so client can retry with new reference; Paystack will handle dup.
        console.error("[paystack/init] db insert failed after paystack init:", dbErr);
        return NextResponse.json({ ok: false, error: "Could not record payment. Please try again." }, { status: 502 });
      }

      await recordAudit({
        actor: payload.email,
        action: "purchase.init",
        entity: "purchase",
        entityId: reference,
        after: { devotionalId, amountMinor, currency, isBundle },
      });
      await recordEvent({ eventType: "purchase.started", slug: callbackSlug, email: payload.email });

      return NextResponse.json({ ok: true, authorizationUrl: init.authorization_url, reference });
    } catch (err) {
      lastError = err;
      // If it's a duplicate-reference error from DB, we already handled above with continue
      // Otherwise it's a Paystack network error — retry once with new reference? No, paystack
      // reference is already unique, so just fail fast for paystack errors.
      if (isDuplicateError(err) && attempt === 0) {
        reference = `NL-${randomUUID()}`;
        continue;
      }
      break;
    }
  }

  console.error("[paystack/init] failed:", lastError);
  // Provide more actionable error based on failure type
  const msg = lastError instanceof Error ? lastError.message.toLowerCase() : "";
  if (msg.includes("paystack") || msg.includes("fetch") || msg.includes("failed")) {
    return NextResponse.json({ ok: false, error: "Paystack service unavailable. Please try again or use bank transfer." }, { status: 502 });
  }
  return NextResponse.json({ ok: false, error: "Could not start payment. Please try again." }, { status: 502 });
}
