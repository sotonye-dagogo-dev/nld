import { NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";

import { queryWithTimeout, getDb } from "@/data/db";
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
  contentFileUrl: z.string().max(2000).optional().or(z.literal("")),
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

/** Create a devotional with its days — one transaction (§12). */
export async function POST(request: Request) {
  const admin = await requireAdmin();
  if (!admin || !can(admin, "devotionals")) {
    return NextResponse.json({ ok: false, error: "Forbidden." }, { status: 403 });
  }

  let payload: z.infer<typeof bodySchema>;
  try {
    payload = bodySchema.parse(await request.json());
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request body." }, { status: 400 });
  }

  const slug = payload.slug?.trim() || slugify(payload.title);
  if (!slug) {
    return NextResponse.json({ ok: false, error: "A slug is required." }, { status: 400 });
  }

  const existing = await queryWithTimeout((db) => db.select().from(devotionals).where(eq(devotionals.slug, slug)).limit(1)).catch(() => []);
  if (existing[0]) {
    return NextResponse.json({ ok: false, error: "That slug is already in use." }, { status: 409 });
  }

  try {
    const created = await queryWithTimeout(async () => {
      const db = getDb();
      return db.transaction(async (tx) => {
        const [devotional] = await tx
          .insert(devotionals)
          .values({
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
          })
          .returning();
        if (!devotional) throw new Error("insert returned no row");
        await tx.insert(devotionalDays).values(
          payload.days.map((d) => ({
            devotionalId: devotional.id,
            dayNumber: d.dayNumber,
            title: d.title,
            content: d.content,
            sermonUrl: d.sermonUrl || null,
            contentFileUrl: d.contentFileUrl || null,
          })),
        );
        return devotional;
      });
    });

    await recordAudit({
      actor: admin.email,
      action: "devotional.create",
      entity: "devotional",
      entityId: created.id,
      after: { slug, title: payload.title, priceMinor: payload.priceMinor, days: payload.days.length },
    });

    return NextResponse.json({ ok: true, id: created.id, slug });
  } catch (err) {
    console.error("[admin/devotionals] create failed:", err);
    return NextResponse.json(
      { ok: false, error: "Could not save the devotional. Please try again." },
      { status: 503 },
    );
  }
}