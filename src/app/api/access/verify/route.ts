import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { queryWithTimeout } from "@/data/db";
import { accessGrants, devotionalDays, devotionals } from "@/data/db/schema";
import { getDevotionalBySlug } from "@/lib/catalog";
import { verifyAccessPassword } from "@/lib/access";
import { recordAudit, recordEvent } from "@/lib/audit";
import { isEmail } from "@/lib/utils";

export const runtime = "nodejs";

const bodySchema = z.object({
  slug: z.string().max(200),
  email: z.string().email(),
  password: z.string().min(1).max(64),
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

  // Auto-detect mode: slug empty → scan all grants for email and match password
  const trimmedSlug = payload.slug.trim();
  if (!trimmedSlug) {
    const allGrants = await queryWithTimeout((db) =>
      db.select().from(accessGrants).where(eq(accessGrants.email, payload.email))
    ).catch(() => []);
    const activeGrants = allGrants.filter((g) => g.status === "active" && (!g.expiresAt || g.expiresAt > new Date()));
    for (const g of activeGrants) {
      if (verifyAccessPassword(payload.password, g.accessPassword)) {
        const devotionalRows = await queryWithTimeout((db) => db.select().from(devotionals).where(eq(devotionals.id, g.devotionalId)).limit(1)).catch(() => []);
        const devotional = devotionalRows[0] as unknown as Devotional | undefined;
        const days = devotional ? await queryWithTimeout((db) => db.select({ n: devotionalDays.dayNumber }).from(devotionalDays).where(and(eq(devotionalDays.devotionalId, devotional.id), eq(devotionalDays.published, true)))).then((r) => r.length).catch(() => 0) : 0;
        if (devotional) {
          await recordAudit({ actor: payload.email, action: "access.verify", entity: "access_grant", entityId: g.id, metadata: { result: "ok", autoDetect: true } });
          await recordEvent({ eventType: "access.used", slug: devotional.slug, email: payload.email });
          return NextResponse.json({ ok: true, devotional: devotional.title, days, matchedSlug: devotional.slug });
        }
      }
    }
    return NextResponse.json({ ok: false, error: "No matching devotional found for that email and password. Please select a devotional." }, { status: 403 });
  }

  let devotional: Devotional | null = null;
  try {
    devotional = await getDevotionalBySlug(trimmedSlug);
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

  // Password matches — grant was verified. Count the unlocked days.
  const days = await queryWithTimeout((db) =>
    db.select({ n: devotionalDays.dayNumber }).from(devotionalDays).where(and(eq(devotionalDays.devotionalId, devotional.id), eq(devotionalDays.published, true)))
  ).then((rows) => rows.length).catch(() => 0);

  await recordAudit({
    actor: payload.email,
    action: "access.verify",
    entity: "access_grant",
    entityId: active.id,
    metadata: { result: "ok" },
  });
  await recordEvent({ eventType: "access.used", slug: devotional.slug, email: payload.email });

  return NextResponse.json({ ok: true, devotional: devotional.title, days });
}