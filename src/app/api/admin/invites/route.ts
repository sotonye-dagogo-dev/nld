import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { z } from "zod";
import { eq, desc } from "drizzle-orm";

import { queryWithTimeout } from "@/data/db";
import { adminInvites, admins } from "@/data/db/schema";
import { requireAdmin, isSuperAdmin } from "@/lib/admin-auth";
import { sendTemplateEmail } from "@/integrations/email-client";
import { getSiteSettings } from "@/config/site";
import { env } from "@/config/env";
import { recordAudit } from "@/lib/audit";
import { isEmail } from "@/lib/utils";

export const runtime = "nodejs";

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

const bodySchema = z.object({
  email: z.string().email(),
  role: z.enum(["admin", "owner"]).optional().default("admin"),
});

/** List invites — superadmin only. */
export async function GET() {
  const admin = await requireAdmin();
  if (!admin || !isSuperAdmin(admin)) {
    return NextResponse.json({ ok: false, error: "Forbidden." }, { status: 403 });
  }
  try {
    const rows = await queryWithTimeout((db) => db.select().from(adminInvites).orderBy(desc(adminInvites.createdAt)));
    return NextResponse.json({ ok: true, invites: rows });
  } catch {
    return NextResponse.json({ ok: false, error: "Could not load invites." }, { status: 503 });
  }
}

/** Create an invitation link + email it — superadmin only. */
export async function POST(request: Request) {
  const admin = await requireAdmin();
  if (!admin || !isSuperAdmin(admin)) {
    return NextResponse.json({ ok: false, error: "Forbidden." }, { status: 403 });
  }

  let payload: z.infer<typeof bodySchema>;
  try {
    payload = bodySchema.parse(await request.json());
  } catch {
    return NextResponse.json({ ok: false, error: "A valid email address is required." }, { status: 400 });
  }
  const email = payload.email.trim().toLowerCase();
  const role = payload.role === "owner" ? "owner" : "admin";
  if (!isEmail(email)) {
    return NextResponse.json({ ok: false, error: "A valid email address is required." }, { status: 400 });
  }

  // Reject if the address is already an admin.
  const existingAdmin = await queryWithTimeout((db) => db.select().from(admins).where(eq(admins.email, email)).limit(1)).catch(() => []);
  if (existingAdmin[0]) {
    return NextResponse.json(
      { ok: false, error: "That email is already an admin." },
      { status: 409 },
    );
  }

  // Reject if a pending invite already exists.
  const existingInvite = await queryWithTimeout((db) =>
    db.select().from(adminInvites).where(eq(adminInvites.email, email)).limit(1)
  ).catch(() => []);
  if (existingInvite[0] && existingInvite[0].status === "pending") {
    return NextResponse.json(
      { ok: false, error: "A pending invitation already exists for that email." },
      { status: 409 },
    );
  }

  const token = randomBytes(24).toString("hex");
  const expiresAt = new Date(Date.now() + INVITE_TTL_MS);
  const inviteUrl = `${env.appUrl}/admin/invite/${token}`;

  await queryWithTimeout((db) =>
    db.insert(adminInvites).values({
      email,
      token,
      role,
      invitedBy: admin.id,
      status: "pending",
      expiresAt,
    })
  );

  await recordAudit({
    actor: admin.email,
    action: "admin.invite",
    entity: "admin_invite",
    entityId: token,
    after: { email, role, expiresAt: expiresAt.toISOString() },
  });

  // Deliver the invitation email. Failure is audited but non-fatal — the
  // invite row exists and can be re-sent from the panel.
  let emailSent = false;
  try {
    const { value: settings } = await getSiteSettings();
    await sendTemplateEmail({
      to: email,
      templateKey: "admin_invite",
      variables: {
        platformName: settings.platformName,
        inviteUrl,
        expiresAt: expiresAt.toISOString().slice(0, 10),
      },
    });
    emailSent = true;
  } catch (err) {
    console.error("[admin/invites] invite email send failed:", err);
    await recordAudit({
      actor: admin.email,
      action: "admin.invite",
      entity: "admin_invite_email",
      entityId: token,
      metadata: { error: err instanceof Error ? err.message : "invite email send failed" },
    });
  }

  return NextResponse.json({ ok: true, token, inviteUrl, emailSent });
}