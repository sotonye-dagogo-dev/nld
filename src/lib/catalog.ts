import "server-only";

import { eq, and, sql } from "drizzle-orm";
import { queryWithTimeout } from "@/data/db";
import { devotionals, devotionalDays } from "@/data/db/schema";
import { clampInt } from "./utils";

// Catalog read helpers — the only data-access layer the public pages touch.
// All list reads are paginated (§21); fallback defaults keep pages rendering
// when the DB is unavailable.

const DEFAULT_PAGE_SIZE = 9;

async function countRows(): Promise<number> {
  const rows = await queryWithTimeout((db) =>
    db.select({ n: sql<number>`count(*)::int` }).from(devotionals).where(eq(devotionals.status, "published"))
  );
  return rows[0]?.n ?? 0;
}

/** Paginated list of published devotionals, newest first (§21). */
export async function getPublishedDevotionals(page: number, pageSize?: number) {
  const size = clampInt(pageSize ?? DEFAULT_PAGE_SIZE, 1, 60);
  const p = clampInt(page, 1, Number.MAX_SAFE_INTEGER);
  const [rows, total] = await Promise.all([
    queryWithTimeout((db) =>
      db.select().from(devotionals).where(eq(devotionals.status, "published")).orderBy(sql`${devotionals.createdAt} desc`).limit(size).offset((p - 1) * size)
    ),
    countRows(),
  ]);
  return { rows: rows as Devotional[], total, page: p, pageSize: size };
}

/** Single published devotional by slug (or null). */
export async function getDevotionalBySlug(slug: string): Promise<Devotional | null> {
  const rows = await queryWithTimeout((db) =>
    db.select().from(devotionals).where(and(eq(devotionals.slug, slug), eq(devotionals.status, "published"))).limit(1)
  );
  return (rows[0] as Devotional | undefined) ?? null;
}

/** Published days for a devotional, ordered by day number. */
export async function getDevotionalDays(devotionalId: string): Promise<DevotionalDay[]> {
  const rows = await queryWithTimeout((db) =>
    db.select().from(devotionalDays).where(and(eq(devotionalDays.devotionalId, devotionalId), eq(devotionalDays.published, true))).orderBy(devotionalDays.dayNumber)
  );
  return rows as DevotionalDay[];
}