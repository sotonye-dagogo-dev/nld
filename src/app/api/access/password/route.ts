import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { queryWithTimeout } from "@/data/db";
import { purchases, accessGrants } from "@/data/db/schema";

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

    const grant = await queryWithTimeout((db) =>
      db.select().from(accessGrants).where(eq(accessGrants.paystackReference, reference)).limit(1)
    ).then((rows) => rows[0]);

    if (!grant) {
      return NextResponse.json({ ok: false, error: "Access grant not found." }, { status: 404 });
    }

    return NextResponse.json({
      ok: true,
      accessPassword: grant.accessPassword,
      devotionalId: grant.devotionalId,
      email: grant.email,
    });
  } catch {
    return NextResponse.json({ ok: false, error: "Could not fetch access password." }, { status: 500 });
  }
}