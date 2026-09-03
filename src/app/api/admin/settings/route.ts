import { NextResponse } from "next/server";
import { z } from "zod";

import { queryWithTimeout } from "@/data/db";
import { settings } from "@/data/db/schema";
import { getSiteSettings } from "@/config/site";
import { DEFAULT_SETTINGS } from "@/config/defaults";
import { requireAdmin } from "@/lib/admin-auth";
import { recordAudit } from "@/lib/audit";

export const runtime = "nodejs";

const SETTING_KEYS = Object.keys(DEFAULT_SETTINGS) as (keyof SiteSettings)[];

const bodySchema = z.object({
  settings: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])),
});

/** Read current settings (DB merged over defaults). */
export async function GET() {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ ok: false, error: "Forbidden." }, { status: 403 });
  }
  const { value, source } = await getSiteSettings();
  return NextResponse.json({ ok: true, settings: value, source });
}

/** Update settings — any logged-in admin. Only known keys are persisted. */
export async function POST(request: Request) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ ok: false, error: "Forbidden." }, { status: 403 });
  }

  let payload: z.infer<typeof bodySchema>;
  try {
    payload = bodySchema.parse(await request.json());
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request body." }, { status: 400 });
  }

  const before: Record<string, string | number | boolean> = {};
  const after: Record<string, string | number | boolean> = {};

  // Server-side guard: at least one payment method must remain enabled (paystack/budpay/bank)
  const incoming = payload.settings as Record<string, unknown>;
  const paystackIn = incoming.paystackEnabled !== undefined ? String(incoming.paystackEnabled) === "true" : undefined;
  const budpayIn = incoming.budpayEnabled !== undefined ? String(incoming.budpayEnabled) === "true" : undefined;
  const bankIn = incoming.bankTransferEnabled !== undefined ? String(incoming.bankTransferEnabled) === "true" : undefined;
  // If any of the three are explicitly set in this request, validate the resulting effective state
  if (paystackIn !== undefined || budpayIn !== undefined || bankIn !== undefined) {
    try {
      const { value: cur } = await getSiteSettings().catch(() => ({ value: DEFAULT_SETTINGS as SiteSettings }));
      const effectivePaystack = paystackIn !== undefined ? paystackIn : cur.paystackEnabled;
      const effectiveBudpay = budpayIn !== undefined ? budpayIn : (cur as unknown as { budpayEnabled?: boolean }).budpayEnabled ?? true;
      const effectiveBank = bankIn !== undefined ? bankIn : cur.bankTransferEnabled;
      if (!effectivePaystack && !effectiveBudpay && !effectiveBank) {
        return NextResponse.json({ ok: false, error: "At least one payment method (Paystack, BudPay, Bank Transfer) must be enabled." }, { status: 400 });
      }
    } catch {}
  }

  try {
    for (const key of Object.keys(payload.settings) as (keyof SiteSettings)[]) {
      if (!SETTING_KEYS.includes(key)) continue;
      const raw = payload.settings[key];
      const stored = typeof raw === "boolean" ? String(raw) : typeof raw === "number" ? String(raw) : raw;
      before[key] = stored;
      after[key] = stored;
      await queryWithTimeout((db) =>
        db.insert(settings)
          .values({ key: key as string, value: stored, updatedAt: new Date() })
          .onConflictDoUpdate({
            target: settings.key,
            set: { value: stored, updatedAt: new Date() },
          })
      );
    }
  } catch {
    return NextResponse.json(
      { ok: false, error: "Could not save settings. Please try again." },
      { status: 503 },
    );
  }

  await recordAudit({
    actor: admin.email,
    action: "settings.update",
    entity: "settings",
    after,
  });

  return NextResponse.json({ ok: true });
}