import { NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";

import { queryWithTimeout } from "@/data/db";
import { adminInvites } from "@/data/db/schema";
import { requireAdmin, isSuperAdmin } from "@/lib/admin-auth";
import { sendTemplateEmail } from "@/integrations/email-client";
import { getSiteSettings } from "@/config/site";
import { env } from "@/config/env";
import { recordAudit } from "@/lib/audit";

export const runtime = "nodejs";

const bodySchema = z.object({
  token: z.string().min(1).max(200),
  email: z.string().email(),
});

export async function POST(request: Request) {
  const admin = await requireAdmin();
  if (!admin || !isSuperAdmin(admin)) {
    return NextResponse.json({ ok: false, error: "Forbidden." }, { status: 403 });
  }

  let payload: z.infer<typeof bodySchema>;
  try {
    payload = bodySchema.parse(await request.json());
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request body." }, { status: 400 });
  }

  const invite = await queryWithTimeout((db) =>
    db.select().from(adminInvites).where(eq(adminInvites.token, payload.token)).limit(1)
  ).catch(() => []);

  const row = invite[0];
  if (!row) {
    return NextResponse.json({ ok: false, error: "Invitation not found." }, { status: 404 });
  }
  if (row.email !== payload.email) {
    return NextResponse.json({ ok: false, error: "Invitation email mismatch." }, { status: 400 });
  }
  if (row.status !== "pending") {
    return NextResponse.json(
      { ok: false, error: "This invitation has already been used." },
      { status: 400 },
    );
  }
  if (row.expiresAt < new Date()) {
    return NextResponse.json(
      { ok: false, error: "This invitation has expired. Ask a superadmin to send a new one." },
      { status: 410 },
    );
  }

  try {
    const { value: settings } = await getSiteSettings();
    await sendTemplateEmail({
      to: row.email,
      templateKey: "admin_invite",
      variables: {
        platformName: settings.platformName,
        inviteUrl: `${env.appUrl}/admin/invite/${row.token}`,
        expiresAt: row.expiresAt.toISOString().slice(0, 10),
      },
    });
  } catch (err) {
    console.error("[admin/invites/resend] invite email send failed:", err);
    await recordAudit({
      actor: admin.email,
      action: "admin.invite.resend",
      entity: "admin_invite_email",
      entityId: row.id,
      metadata: { error: err instanceof Error ? err.message : "invite email send failed" },
    });
    return NextResponse.json({ ok: false, error: "Failed to send email. Please try again." }, { status: 502 });
  }

  await recordAudit({
    actor: admin.email,
    action: "admin.invite.resend",
    entity: "admin_invite",
    entityId: row.id,
  });

  return NextResponse.json({ ok: true });
}