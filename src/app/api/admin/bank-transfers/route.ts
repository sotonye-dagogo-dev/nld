import { NextResponse } from "next/server";
import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { randomUUID } from "node:crypto";

import { queryWithTimeout } from "@/data/db";
import { bankTransfers, accessGrants, devotionals, bankAccounts } from "@/data/db/schema";
import { deriveAccessPassword, computeExpiry } from "@/lib/access";
import { requireAdmin } from "@/lib/admin-auth";
import { recordAudit, recordEvent } from "@/lib/audit";
import { getSiteSettings } from "@/config/site";
import { sendTemplateEmail } from "@/integrations/email-client";

export const runtime = "nodejs";

const verifySchema = z.object({
  transferId: z.string().uuid(),
  action: z.enum(["verify", "reject"]),
  rejectionReason: z.string().optional(),
});

export async function POST(request: Request) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ ok: false, error: "Forbidden." }, { status: 403 });
  }

  let payload: z.infer<typeof verifySchema>;
  try {
    payload = verifySchema.parse(await request.json());
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request body." }, { status: 400 });
  }

  if (payload.action === "reject" && !payload.rejectionReason) {
    return NextResponse.json({ ok: false, error: "Rejection reason is required." }, { status: 400 });
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
          bankAccountId: bankTransfers.bankAccountId,
          reference: bankTransfers.reference,
          proofUrl: bankTransfers.proofUrl,
          status: bankTransfers.status,
        })
        .from(bankTransfers)
        .where(eq(bankTransfers.id, payload.transferId))
        .limit(1)
    );
    transfer = result[0] ?? null;
  } catch {
    return NextResponse.json({ ok: false, error: "Could not fetch transfer." }, { status: 503 });
  }

  if (!transfer) {
    return NextResponse.json({ ok: false, error: "Transfer not found." }, { status: 404 });
  }
  if (transfer.status !== "pending") {
    return NextResponse.json({ ok: false, error: "Transfer has already been processed." }, { status: 400 });
  }

  // Fetch devotional
  let devotional: Devotional | null = null;
  try {
    const result = await queryWithTimeout((db) =>
      db.select().from(devotionals).where(eq(devotionals.id, transfer.devotionalId)).limit(1)
    );
    devotional = result[0] ?? null;
  } catch {
    return NextResponse.json({ ok: false, error: "Could not fetch devotional." }, { status: 503 });
  }

  if (!devotional) {
    return NextResponse.json({ ok: false, error: "Devotional not found." }, { status: 404 });
  }

  const { value: settings } = await getSiteSettings();

  if (payload.action === "verify") {
    // Derive access password from transfer reference (consistent with Paystack approach)
    const accessPassword = deriveAccessPassword(`BT-${transfer.reference}-${transfer.id}`);

    // Platform-config-driven expiry (devotional mode → site fallback)
    const effectiveMode: AccessMode = (devotional.accessMode as AccessMode) ?? settings.accessMode ?? "one-time";
    const expiresAt = computeExpiry(effectiveMode);

    // Create access grant (idempotent)
    const existingGrant = await queryWithTimeout((db) =>
      db
        .select()
        .from(accessGrants)
        .where(and(eq(accessGrants.devotionalId, devotional.id), eq(accessGrants.email, transfer.email)))
        .limit(1)
    );

    if (existingGrant.length === 0) {
      await queryWithTimeout((db) =>
        db.insert(accessGrants).values({
          devotionalId: devotional.id,
          email: transfer.email,
          paystackReference: `BT-${transfer.reference}-${transfer.id}`,
          accessPassword,
          status: "active",
          expiresAt,
        })
      );
    } else if (existingGrant[0].expiresAt == null && expiresAt != null) {
      // Update expiry if grant was forever but now mode is time-bound
      await queryWithTimeout((db) =>
        db.update(accessGrants).set({ expiresAt }).where(eq(accessGrants.id, existingGrant[0].id))
      ).catch(() => {});
    }

    // Bundle detection: if amount equals sum of all purchasables, grant all
    try {
      const allPub = await queryWithTimeout((db) =>
        db.select({ id: devotionals.id, slug: devotionals.slug, accessMode: devotionals.accessMode, priceMinor: devotionals.priceMinor }).from(devotionals).where(eq(devotionals.status, "published")),
      );
      const totalBundle = allPub.reduce((s, d) => s + (d.priceMinor as number), 0);
      const isBundleTransfer = allPub.length > 1 && transfer.amountMinor === totalBundle;
      if (isBundleTransfer) {
        for (const devo of allPub) {
          if (devo.id === devotional.id) continue; // already handled
          const mode: AccessMode = (devo.accessMode as AccessMode) ?? settings.accessMode ?? "one-time";
          const exp = computeExpiry(mode);
          const exists = await queryWithTimeout((db) =>
            db.select().from(accessGrants).where(and(eq(accessGrants.devotionalId, devo.id), eq(accessGrants.email, transfer.email))).limit(1),
          ).catch(() => []);
          if (exists.length > 0) continue;
          await queryWithTimeout((db) =>
            db.insert(accessGrants).values({
              devotionalId: devo.id,
              email: transfer.email,
              paystackReference: `BT-${transfer.reference}-${transfer.id}__${devo.id}`,
              accessPassword,
              status: "active",
              expiresAt: exp,
            }),
          ).catch(() => {});
        }
      }
    } catch {
      // best-effort bundle grant
    }

    // Update transfer status
    await queryWithTimeout((db) =>
      db
        .update(bankTransfers)
        .set({ status: "verified", verifiedBy: admin.id, verifiedAt: new Date(), updatedAt: new Date() })
        .where(eq(bankTransfers.id, payload.transferId))
    );

    await recordAudit({
      actor: admin.email,
      action: "bank_transfer.verify",
      entity: "bank_transfer",
      entityId: payload.transferId,
      before: { status: "pending" },
      after: { status: "verified", accessPassword },
      metadata: { verifiedBy: admin.id },
    });
    await recordEvent({ eventType: "bank_transfer.verified", slug: devotional.slug, email: transfer.email });

    // Send access email to user
    try {
      const accessUrl = `${new URL(request.url).origin}/access`;
      await sendTemplateEmail({
        to: transfer.email,
        templateKey: "bank_transfer_verified",
        variables: {
          platformName: settings.platformName,
          devotionalTitle: devotional.title,
          accessPassword,
          accessUrl,
          supportEmail: settings.supportEmail,
        },
      });
    } catch (err) {
      console.error("[bank-transfer/verify] user email failed:", err);
      await recordAudit({
        actor: transfer.email,
        action: "bank_transfer.verify",
        entity: "bank_transfer_email",
        entityId: payload.transferId,
        metadata: { error: err instanceof Error ? err.message : "email send failed" },
      });
    }

    return NextResponse.json({ ok: true, accessPassword });
  } else {
    // Reject
    await queryWithTimeout((db) =>
      db
        .update(bankTransfers)
        .set({
          status: "rejected",
          verifiedBy: admin.id,
          verifiedAt: new Date(),
          rejectionReason: payload.rejectionReason,
          updatedAt: new Date(),
        })
        .where(eq(bankTransfers.id, payload.transferId))
    );

    await recordAudit({
      actor: admin.email,
      action: "bank_transfer.reject",
      entity: "bank_transfer",
      entityId: payload.transferId,
      before: { status: "pending" },
      after: { status: "rejected", rejectionReason: payload.rejectionReason },
      metadata: { verifiedBy: admin.id },
    });

    // Send rejection email to user
    try {
      await sendTemplateEmail({
        to: transfer.email,
        templateKey: "bank_transfer_rejected",
        variables: {
          platformName: settings.platformName,
          devotionalTitle: devotional.title,
          rejectionReason: payload.rejectionReason ?? "Insufficient proof or incorrect amount",
          supportEmail: settings.supportEmail,
        },
      });
    } catch (err) {
      console.error("[bank-transfer/reject] user email failed:", err);
      await recordAudit({
        actor: transfer.email,
        action: "bank_transfer.reject",
        entity: "bank_transfer_email",
        entityId: payload.transferId,
        metadata: { error: err instanceof Error ? err.message : "email send failed" },
      });
    }

    return NextResponse.json({ ok: true });
  }
}

interface BankTransfer {
  id: string;
  devotionalId: string;
  email: string;
  amountMinor: number;
  currency: string;
  bankAccountId: string;
  reference: string;
  proofUrl: string;
  status: string;
}

interface Devotional {
  id: string;
  slug: string;
  title: string;
  accessMode?: AccessMode;
}