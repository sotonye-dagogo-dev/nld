import { NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";

import { queryWithTimeout } from "@/data/db";
import { bankAccounts } from "@/data/db/schema";
import { requireAdmin } from "@/lib/admin-auth";
import { recordAudit } from "@/lib/audit";

export const runtime = "nodejs";

const bankAccountSchema = z.object({
  id: z.string().uuid().optional(),
  bankName: z.string().min(1),
  accountName: z.string().min(1),
  accountNumber: z.string().min(1),
  currency: z.string().min(3).max(3).default("NGN"),
  sortCode: z.string().optional(),
  swiftCode: z.string().optional(),
  instructions: z.string().optional(),
  isActive: z.boolean().default(true),
  displayOrder: z.number().int().default(0),
});

const bodySchema = z.object({
  accounts: z.array(bankAccountSchema),
});

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ ok: false, error: "Forbidden." }, { status: 403 });
  }

  try {
    const accounts = await queryWithTimeout((db) =>
      db.select().from(bankAccounts).orderBy(bankAccounts.displayOrder)
    );
    return NextResponse.json({ ok: true, accounts });
  } catch {
    return NextResponse.json({ ok: false, error: "Could not fetch bank accounts." }, { status: 503 });
  }
}

export async function POST(request: Request) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ ok: false, error: "Forbidden." }, { status: 403 });
  }

  let payload: z.infer<typeof bodySchema>;
  try {
    payload = bodySchema.parse(await request.json());
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request body." }, { status: 400 });
  }

  try {
    // Delete all existing accounts and insert new ones (simple replace strategy)
    await queryWithTimeout((db) => db.delete(bankAccounts));
    
    if (payload.accounts.length > 0) {
      await queryWithTimeout((db) =>
        db.insert(bankAccounts).values(
          payload.accounts.map((acc, index) => ({
            ...acc,
            displayOrder: index,
            updatedAt: new Date(),
          }))
        )
      );
    }
  } catch {
    return NextResponse.json(
      { ok: false, error: "Could not save bank accounts. Please try again." },
      { status: 503 },
    );
  }

  await recordAudit({
    actor: admin.email,
    action: "settings.update",
    entity: "bank_accounts",
    after: { count: payload.accounts.length },
  });

  return NextResponse.json({ ok: true });
}