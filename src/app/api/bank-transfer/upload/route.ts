import { NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";

import { queryWithTimeout } from "@/data/db";
import { bankTransfers, bankAccounts, devotionals } from "@/data/db/schema";
import { recordAudit, recordEvent } from "@/lib/audit";
import { env } from "@/config/env";
import { getSiteSettings } from "@/config/site";
import { sendTemplateEmail } from "@/integrations/email-client";

export const runtime = "nodejs";

const bodySchema = z.object({
  devotionalSlug: z.string().min(1).max(200),
  email: z.string().email(),
  amountMinor: z.number().int().positive(),
  currency: z.string().min(3).max(3).default("NGN"),
  bankAccountId: z.string().uuid(),
  reference: z.string().min(1).max(100),
  proofUrl: z.string().url(),
});

export async function POST(request: Request) {
  let payload: z.infer<typeof bodySchema>;
  try {
    payload = bodySchema.parse(await request.json());
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request body." }, { status: 400 });
  }

  const isBundle = payload.devotionalSlug === "all" || payload.devotionalSlug === "__all__";

  // Validate devotional exists and is published (or bundle)
  let devotional: Devotional | null = null;
  if (isBundle) {
    try {
      const result = await queryWithTimeout((db) =>
        db.select().from(devotionals).where(eq(devotionals.status, "published")).limit(1)
      );
      devotional = result[0] ?? null;
    } catch {
      return NextResponse.json({ ok: false, error: "Service temporarily unavailable. Please try again shortly." }, { status: 503 });
    }
    if (!devotional) {
      return NextResponse.json({ ok: false, error: "No devotionals available for bundle." }, { status: 404 });
    }
  } else {
    try {
      const result = await queryWithTimeout((db) =>
        db.select().from(devotionals).where(eq(devotionals.slug, payload.devotionalSlug)).limit(1)
      );
      devotional = result[0] ?? null;
    } catch {
      return NextResponse.json(
        { ok: false, error: "Service temporarily unavailable. Please try again shortly." },
        { status: 503 },
      );
    }
    if (!devotional) {
      return NextResponse.json({ ok: false, error: "Devotional not found." }, { status: 404 });
    }
    if (devotional.status !== "published") {
      return NextResponse.json({ ok: false, error: "This devotional is not available for purchase." }, { status: 400 });
    }
  }

  // Validate bank account exists and is active
  let bankAccount: BankAccount | null = null;
  try {
    const result = await queryWithTimeout((db) =>
      db.select().from(bankAccounts).where(eq(bankAccounts.id, payload.bankAccountId)).limit(1)
    );
    bankAccount = result[0] ?? null;
  } catch {
    return NextResponse.json(
      { ok: false, error: "Service temporarily unavailable. Please try again shortly." },
      { status: 503 },
    );
  }
  if (!bankAccount || !bankAccount.isActive) {
    return NextResponse.json({ ok: false, error: "Selected bank account is not available." }, { status: 400 });
  }

  // Check if bank transfer is enabled
  const { value: settings } = await getSiteSettings();
  if (!settings.bankTransferEnabled) {
    return NextResponse.json({ ok: false, error: "Bank transfer payments are not currently enabled." }, { status: 400 });
  }

  // Create bank transfer record (normalize email)
  const normalizedEmail = payload.email.trim().toLowerCase();
  const transferId = randomUUID();
  try {
    await queryWithTimeout((db) =>
      db.insert(bankTransfers).values({
        id: transferId,
        devotionalId: devotional.id,
        email: normalizedEmail,
        amountMinor: payload.amountMinor,
        currency: payload.currency,
        bankAccountId: payload.bankAccountId,
        reference: payload.reference,
        proofUrl: payload.proofUrl,
        status: "pending",
      })
    );
  } catch {
    return NextResponse.json(
      { ok: false, error: "Could not record transfer. Please try again." },
      { status: 503 },
    );
  }

  await recordAudit({
    actor: normalizedEmail,
    action: "bank_transfer.submit",
    entity: "bank_transfer",
    entityId: transferId,
    after: {
      devotionalId: devotional.id,
      amountMinor: payload.amountMinor,
      currency: payload.currency,
      bankAccountId: payload.bankAccountId,
      reference: payload.reference,
    },
  });
  await recordEvent({ eventType: "bank_transfer.submitted", slug: devotional.slug, email: normalizedEmail });

  // Notify admins
  try {
    const verificationUrl = `${env.appUrl}/admin/records/bank-transfers?transferId=${transferId}`;
    const amountDisplay = formatPrice(payload.amountMinor, payload.currency);
    
    await sendTemplateEmail({
      to: settings.supportEmail,
      templateKey: "bank_transfer_received",
      variables: {
        platformName: settings.platformName,
        devotionalTitle: devotional.title,
        email: normalizedEmail,
        amount: amountDisplay,
        bankName: bankAccount.bankName,
        accountName: bankAccount.accountName,
        reference: payload.reference,
        verificationUrl,
        supportEmail: settings.supportEmail,
      },
    });
  } catch (err) {
    console.error("[bank-transfer/upload] admin notification failed:", err);
    await recordAudit({
      actor: normalizedEmail,
      action: "bank_transfer.submit",
      entity: "bank_transfer_email",
      entityId: transferId,
      metadata: { error: err instanceof Error ? err.message : "email send failed" },
    });
  }

  return NextResponse.json({ ok: true, transferId });
}

function formatPrice(amountMinor: number, currency: string): string {
  const currencies: Record<string, { symbol: string }> = {
    NGN: { symbol: "₦" },
    USD: { symbol: "$" },
    GHS: { symbol: "GH₵" },
    KES: { symbol: "KSh" },
    GBP: { symbol: "£" },
    EUR: { symbol: "€" },
  };
  const c = currencies[currency] ?? currencies.NGN;
  return `${c.symbol}${(amountMinor / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

interface Devotional {
  id: string;
  slug: string;
  title: string;
  status: string;
}

interface BankAccount {
  id: string;
  bankName: string;
  accountName: string;
  accountNumber: string;
  currency: string;
  isActive: boolean;
}