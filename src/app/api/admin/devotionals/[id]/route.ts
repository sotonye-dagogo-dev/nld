import { NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";

import { getDb } from "@/data/db";
import { devotionals, devotionalDays } from "@/data/db/schema";
import { requireAdmin, can } from "@/lib/admin-auth";
import { recordAudit } from "@/lib/audit";
import { slugify } from "@/lib/utils";

export const runtime = "nodejs";

const daySchema = z.object({
  dayNumber: z.number().int().min(1),
  title: z.string().min(1).max(300),
  content: z.string().min(1),
  sermonUrl: z.string().max(2000).optional().or(z.literal("")),
});

const bodySchema = z.object({
  title: z.string().min(1).max(300),
  subtitle: z.string().max(500).optional(),
  description: z.string().max(2000).optional(),
  slug: z.string().max(200).optional(),
  coverUrl: z.string().max(2000).optional(),
  priceMinor: z.number().int().min(0),
  currency: z.string().min(1).max(10).default("NGN"),
  accessMode: z.enum(["one-time", "monthly", "duration"]),
  previewDays: z.number().int().min(0).max(999),
  status: z.enum(["draft", "published", "archived"]).default("published"),
  days: z.array(daySchema).min(1),
});

/** Update a devotional + replace its days — one transaction (§12). */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await requireAdmin();
  if (!admin || !can(admin, "devotionals")) {
    return NextResponse.json({ ok: false, error: "Forbidden." }, { status: 403 });
  }

  const { id } = await params;
  let payload: z.infer<typeof bodySchema>;
  try {
    payload = bodySchema.parse(await request.json());
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request body." }, { status: 400 });
  }

  const db = getDb();
  const existing = await db.select().from(devotionals).where(eq(devotionals.id, id)).limit(1).catch(() => []);
  if (!existing[0]) {
    return NextResponse.json({ ok: false, error: "Devotional not found." }, { status: 404 });
  }

  const slug = payload.slug?.trim() || slugify(payload.title);
  if (!slug) {
    return NextResponse.json({ ok: false, error: "A slug is required." }, { status: 400 });
  }
  const clash = await db
    .select()
    .from(devotionals)
    .where(eq(devotionals.slug, slug))
    .limit(1)
    .catch(() => []);
  if (clash[0] && clash[0].id !== id) {
    return NextResponse.json({ ok: false, error: "That slug is already in use." }, { status: 409 });
  }

  const before = {
    slug: existing[0].slug,
    title: existing[0].title,
    priceMinor: existing[0].priceMinor,
    status: existing[0].status,
  };

  try {
    await db.transaction(async (tx) => {
      await tx
        .update(devotionals)
        .set({
          slug,
          title: payload.title,
          subtitle: payload.subtitle ?? "",
          description: payload.description ?? "",
          coverUrl: payload.coverUrl ?? "",
          priceMinor: payload.priceMinor,
          currency: payload.currency,
          accessMode: payload.accessMode,
          previewDays: payload.previewDays,
          status: payload.status,
          updatedAt: new Date(),
        })
        .where(eq(devotionals.id, id));
      await tx.delete(devotionalDays).where(eq(devotionalDays.devotionalId, id));
      await tx.insert(devotionalDays).values(
        payload.days.map((d) => ({
          devotionalId: id,
          dayNumber: d.dayNumber,
          title: d.title,
          content: d.content,
          sermonUrl: d.sermonUrl || null,
        })),
      );
    });

    await recordAudit({
      actor: admin.email,
      action: "devotional.update",
      entity: "devotional",
      entityId: id,
      before,
      after: { slug, title: payload.title, priceMinor: payload.priceMinor, days: payload.days.length },
    });

    return NextResponse.json({ ok: true, id, slug });
  } catch (err) {
    console.error("[admin/devotionals] update failed:", err);
    return NextResponse.json(
      { ok: false, error: "Could not save the devotional. Please try again." },
      { status: 503 },
    );
  }
}

/** Delete a devotional. Days cascade; purchases/grants block deletion. */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await requireAdmin();
  if (!admin || !can(admin, "devotionals")) {
    return NextResponse.json({ ok: false, error: "Forbidden." }, { status: 403 });
  }

  const { id } = await params;
  const db = getDb();
  const existing = await db.select().from(devotionals).where(eq(devotionals.id, id)).limit(1).catch(() => []);
  if (!existing[0]) {
    return NextResponse.json({ ok: false, error: "Devotional not found." }, { status: 404 });
  }

  try {
    await db.delete(devotionals).where(eq(devotionals.id, id));
  } catch {
    return NextResponse.json(
      { ok: false, error: "Cannot delete — this devotional has purchase or access-grant records." },
      { status: 409 },
    );
  }

  await recordAudit({
    actor: admin.email,
    action: "devotional.delete",
    entity: "devotional",
    entityId: id,
    before: { slug: existing[0].slug, title: existing[0].title },
  });

  return NextResponse.json({ ok: true });
}