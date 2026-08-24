import { NextResponse } from "next/server";
import { z } from "zod";

import { queryWithTimeout } from "@/data/db";
import { emailTemplates } from "@/data/db/schema";
import { listEmailTemplates } from "@/lib/email-templates";
import { EMAIL_TEMPLATE_KEYS } from "@/config/defaults";
import { requireAdmin, isSuperAdmin } from "@/lib/admin-auth";
import { recordAudit } from "@/lib/audit";

export const runtime = "nodejs";

const bodySchema = z.object({
  key: z.string().min(1).max(100),
  name: z.string().min(1).max(200),
  subject: z.string().min(1).max(500),
  bodyHtml: z.string().min(1),
  variables: z.record(z.string(), z.string()).optional(),
});

/** List templates with their current (DB or fallback) content — superadmin only. */
export async function GET() {
  const admin = await requireAdmin();
  if (!admin || !isSuperAdmin(admin)) {
    return NextResponse.json({ ok: false, error: "Forbidden." }, { status: 403 });
  }
  const templates = await listEmailTemplates().catch(() => []);
  return NextResponse.json({ ok: true, templates });
}

/** Save a template — superadmin only. Keys are validated against known keys. */
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

  if (!EMAIL_TEMPLATE_KEYS.includes(payload.key)) {
    return NextResponse.json({ ok: false, error: "Unknown template key." }, { status: 400 });
  }

  try {
    await queryWithTimeout((db) =>
      db.insert(emailTemplates)
        .values({
          key: payload.key,
          name: payload.name,
          subject: payload.subject,
          bodyHtml: payload.bodyHtml,
          variables: payload.variables ?? {},
          updatedBy: admin.email,
        })
        .onConflictDoUpdate({
          target: emailTemplates.key,
          set: {
            name: payload.name,
            subject: payload.subject,
            bodyHtml: payload.bodyHtml,
            variables: payload.variables ?? {},
            updatedBy: admin.email,
            updatedAt: new Date(),
          },
        })
    );
  } catch {
    return NextResponse.json(
      { ok: false, error: "Could not save the template. Please try again." },
      { status: 503 },
    );
  }

  await recordAudit({
    actor: admin.email,
    action: "email_template.update",
    entity: "email_template",
    entityId: payload.key,
    after: { name: payload.name, subject: payload.subject },
  });

  return NextResponse.json({ ok: true });
}