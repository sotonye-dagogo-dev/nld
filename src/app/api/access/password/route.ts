import { NextResponse } from "next/server";
import { eq, like } from "drizzle-orm";
import { queryWithTimeout } from "@/data/db";
import { purchases, accessGrants } from "@/data/db/schema";
import { deriveAccessPassword, derivePasswordForGrant } from "@/lib/access";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const reference = searchParams.get("reference");

  if (!reference) {
    return NextResponse.json({ ok: false, error: "Reference is required." }, { status: 400 });
  }

  try {
    const purchase = await queryWithTimeout((db) =>
      db.select().from(purchases).where(eq(purchases.paystackReference, reference)).limit(1)
    ).then((rows) => rows[0]);

    if (!purchase || purchase.status !== "success") {
      return NextResponse.json({ ok: false, error: "Purchase not found or not completed." }, { status: 404 });
    }

    // Try exact grant first, then bundle suffix variants (e.g. NL-xxx__<id>)
    let grant = await queryWithTimeout((db) =>
      db.select().from(accessGrants).where(eq(accessGrants.paystackReference, reference)).limit(1)
    ).then((rows) => rows[0] as typeof rows[0] | undefined);

    if (!grant) {
      const prefixed = await queryWithTimeout((db) =>
        db.select().from(accessGrants).where(like(accessGrants.paystackReference, `${reference}%`)).limit(1)
      ).catch(() => [] as typeof grant[]);
      grant = (prefixed[0] as typeof grant | undefined) ?? undefined;
    }

    // Even if no grant row yet (webhook race / partial failure), the password is derivable from base reference
    const accessPassword = grant ? derivePasswordForGrant(grant.paystackReference) : deriveAccessPassword(reference);

    // Ensure a grant exists for future verify flows — lazily create if missing
    if (!grant) {
      try {
        const { getSiteSettings } = await import("@/config/site");
        const { computeExpiry } = await import("@/lib/access");
        const { value: s } = await getSiteSettings().catch(() => ({ value: null as unknown as SiteSettings }));
        const devotionalId = purchase.devotionalId;
        // Use per-devotional or site fallback for expiry; bundle purchases already have per-devotional rows via webhook
        let mode: AccessMode | null = null;
        try {
          const { devotionals } = await import("@/data/db/schema");
          const rows = await queryWithTimeout((db) =>
            db.select({ accessMode: devotionals.accessMode }).from(devotionals).where(eq(devotionals.id, devotionalId)).limit(1)
          );
          mode = (rows[0]?.accessMode as AccessMode) ?? null;
        } catch {}
        const effectiveMode: AccessMode = mode ?? s?.accessMode ?? "one-time";
        const dur = (s as unknown as SiteSettings | null)?.durationAccessDays ?? 60;
        const expiresAt = computeExpiry(effectiveMode, dur);
        await queryWithTimeout((db) =>
          db.insert(accessGrants).values({
            devotionalId,
            email: purchase.email,
            paystackReference: reference,
            status: "active",
            expiresAt,
          })
        ).catch(() => {});
      } catch {}
    }

    return NextResponse.json({
      ok: true,
      accessPassword,
      devotionalId: grant?.devotionalId ?? purchase.devotionalId,
      email: grant?.email ?? purchase.email,
    });
  } catch {
    return NextResponse.json({ ok: false, error: "Could not fetch access password." }, { status: 500 });
  }
}