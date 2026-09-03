import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { z } from "zod";

import { env } from "@/config/env";
import { queryWithTimeout } from "@/data/db";
import { purchases } from "@/data/db/schema";
import { getDevotionalBySlug, getPurchasableDevotionals } from "@/lib/catalog";
import { initializeTransaction } from "@/integrations/budpay/client";
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
  const normalizedEmail = payload.email.trim().toLowerCase();

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
  if (!settings.budpayEnabled) {
    return NextResponse.json({ ok: false, error: "BudPay payments are currently disabled. Please use Paystack or bank transfer." }, { status: 400 });
  }

  const isBundle = payload.slug === "all" || payload.slug === "__all__" || payload.slug === "bundle";

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
    if (settings.bundlePriceMinor && settings.bundlePriceMinor > 0) {
      amountMinor = settings.bundlePriceMinor;
    } else if (settings.defaultPriceMinor > 0) {
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

  let reference = `NL-${randomUUID()}`;
  let lastError: unknown = null;

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const init = await initializeTransaction({
        email: normalizedEmail,
        amountMinor,
        currency,
        reference,
        callbackUrl: `${env.appUrl}/devotionals/${callbackSlug}`,
        metadata: {
          devotionalId,
          slug: callbackSlug,
          isBundle: isBundle ? "true" : "false",
          bundleCount: isBundle ? String(bundleDevotionals?.length ?? 0) : undefined,
          processor: "budpay",
        },
      });

      try {
        await queryWithTimeout((db) =>
          db.insert(purchases).values({
            devotionalId,
            email: normalizedEmail,
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
              processor: "budpay",
            },
          }),
        );
      } catch (dbErr) {
        if (isDuplicateError(dbErr)) {
          if (attempt === 0) {
            reference = `NL-${randomUUID()}`;
            continue;
          }
          throw dbErr;
        }
        console.error("[budpay/init] db insert failed after budpay init:", dbErr);
        return NextResponse.json({ ok: false, error: "Could not record payment. Please try again." }, { status: 502 });
      }

      await recordAudit({
        actor: normalizedEmail,
        action: "purchase.init",
        entity: "purchase",
        entityId: reference,
        after: { devotionalId, amountMinor, currency, isBundle, processor: "budpay" },
      });
      await recordEvent({ eventType: "purchase.started", slug: callbackSlug, email: normalizedEmail });

      return NextResponse.json({ ok: true, authorizationUrl: init.authorization_url, reference });
    } catch (err) {
      lastError = err;
      if (isDuplicateError(err) && attempt === 0) {
        reference = `NL-${randomUUID()}`;
        continue;
      }
      break;
    }
  }

  console.error("[budpay/init] failed:", lastError);
  const msg = lastError instanceof Error ? lastError.message.toLowerCase() : "";
  if (msg.includes("budpay") || msg.includes("fetch") || msg.includes("failed")) {
    return NextResponse.json({ ok: false, error: "BudPay service unavailable. Please try again or use Paystack / bank transfer." }, { status: 502 });
  }
  return NextResponse.json({ ok: false, error: "Could not start payment. Please try again." }, { status: 502 });
}
