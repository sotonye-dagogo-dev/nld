import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";

import { queryWithTimeout } from "@/data/db";
import { bankTransfers, devotionals, accessGrants } from "@/data/db/schema";
import { deriveAccessPassword } from "@/lib/access";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const transferId = searchParams.get("transferId");

  if (!transferId) {
    return NextResponse.json({ ok: false, error: "Transfer ID is required." }, { status: 400 });
  }

  // Fetch the transfer
  let transfer: BankTransfer | null = null;
  try {
    const result = await queryWithTimeout((db) =>
      db
        .select({
          id: bankTransfers.id,
          devotionalId: bankTransfers.devotionalId,
          email: bankTransfers.email,
          amountMinor: bankTransfers.amountMinor,
          currency: bankTransfers.currency,
          reference: bankTransfers.reference,
          status: bankTransfers.status,
          rejectionReason: bankTransfers.rejectionReason,
        })
        .from(bankTransfers)
        .where(eq(bankTransfers.id, transferId))
        .limit(1)
    );
    transfer = result[0] ?? null;
  } catch {
    return NextResponse.json({ ok: false, error: "Could not fetch transfer." }, { status: 503 });
  }

  if (!transfer) {
    return NextResponse.json({ ok: false, error: "Transfer not found." }, { status: 404 });
  }

  // Fetch devotional
  let devotional: Devotional | null = null;
  try {
    const result = await queryWithTimeout((db) =>
      db.select({ title: devotionals.title, slug: devotionals.slug }).from(devotionals).where(eq(devotionals.id, transfer.devotionalId)).limit(1)
    );
    devotional = result[0] ?? null;
  } catch {
    return NextResponse.json({ ok: false, error: "Could not fetch devotional." }, { status: 503 });
  }

  if (transfer.status === "verified") {
    // Derive deterministically from reference — no DB column needed
    const accessPassword = deriveAccessPassword(`BT-${transfer.reference}-${transfer.id}`);

    return NextResponse.json({
      ok: true,
      status: "verified",
      devotionalTitle: devotional?.title ?? "",
      devotionalSlug: devotional?.slug ?? "",
      accessPassword,
    });
  }

  return NextResponse.json({
    ok: true,
    status: transfer.status,
    devotionalTitle: devotional?.title ?? "",
    devotionalSlug: devotional?.slug ?? "",
    rejectionReason: transfer.rejectionReason,
  });
}

interface BankTransfer {
  id: string;
  devotionalId: string;
  email: string;
  amountMinor: number;
  currency: string;
  reference: string;
  status: string;
  rejectionReason: string | null;
}

interface Devotional {
  title: string;
  slug: string;
}