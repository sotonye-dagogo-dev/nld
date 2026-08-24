import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { queryWithTimeout } from "@/data/db";
import { accessGrants, devotionalDays } from "@/data/db/schema";
import { getDevotionalBySlug } from "@/lib/catalog";
import { verifyAccessPassword } from "@/lib/access";
import { getSiteSettings } from "@/config/site";
import { recordAudit, recordEvent } from "@/lib/audit";
import { clampInt, isEmail } from "@/lib/utils";

export const runtime = "nodejs";

const bodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(1).max(64),
});

/**
 * Server-side unlock for the devotional reader. Locked day content is NEVER
 * shipped in the client bundle; it is only returned here AFTER the access
 * password is verified against a stored grant. The reader fetches this route
 * on successful verification.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;

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
    devotional = await getDevotionalBySlug(slug);
  } catch {
    return NextResponse.json(
      { ok: false, error: "Service temporarily unavailable. Please try again shortly." },
      { status: 503 },
    );
  }
  if (!devotional) {
    return NextResponse.json({ ok: false, error: "Devotional not found." }, { status: 404 });
  }

  const grant = await queryWithTimeout((db) =>
    db.select().from(accessGrants).where(and(eq(accessGrants.devotionalId, devotional.id), eq(accessGrants.email, payload.email))).limit(1)
  ).catch(() => []);

  const active = grant.find((g) => g.status === "active");
  if (!active) {
    return NextResponse.json(
      { ok: false, error: "No active access for that email on this devotional." },
      { status: 403 },
    );
  }

  if (active.expiresAt && active.expiresAt < new Date()) {
    return NextResponse.json(
      { ok: false, error: "This access has expired. Please purchase again." },
      { status: 403 },
    );
  }

  if (!verifyAccessPassword(payload.password, active.accessPassword)) {
    await recordAudit({
      actor: payload.email,
      action: "access.verify",
      entity: "access_grant",
      entityId: active.id,
      metadata: { result: "failed" },
    });
    return NextResponse.json(
      { ok: false, error: "That access password did not match. Please check your email." },
      { status: 403 },
    );
  }

  const days = (await queryWithTimeout((db) =>
    db.select().from(devotionalDays).where(and(eq(devotionalDays.devotionalId, devotional.id), eq(devotionalDays.published, true))).orderBy(devotionalDays.dayNumber)
  ).catch(() => [])) as DevotionalDay[];

  const { value: settings } = await getSiteSettings().catch(() => ({ value: null }));
  const previewDays = clampInt(
    devotional.previewDays > 0 ? devotional.previewDays : (settings?.freePreviewDays ?? 3),
    0,
    days.length,
  );
  const lockedDays = days.slice(previewDays);

  await recordAudit({
    actor: payload.email,
    action: "access.verify",
    entity: "access_grant",
    entityId: active.id,
    metadata: { result: "ok", daysReturned: lockedDays.length },
  });
  await recordEvent({ eventType: "access.used", slug: devotional.slug, email: payload.email });

  return NextResponse.json({ ok: true, days: lockedDays });
}