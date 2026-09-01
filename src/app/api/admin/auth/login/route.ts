import { NextResponse } from "next/server";
import { z } from "zod";

import { adminSignIn } from "@/integrations/supabase/client";
import { createAdminSession } from "@/lib/admin-auth";
import { queryWithTimeout } from "@/data/db";
import { admins } from "@/data/db/schema";
import { or, eq } from "drizzle-orm";
import { recordAudit } from "@/lib/audit";

export const runtime = "nodejs";

const bodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(1).max(200),
});

export async function POST(request: Request) {
  let payload: z.infer<typeof bodySchema>;
  try {
    payload = bodySchema.parse(await request.json());
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request body." }, { status: 400 });
  }

  const result = await adminSignIn(payload.email, payload.password);
  if (!result.ok || !result.token || !result.user) {
    return NextResponse.json(
      { ok: false, error: result.error ?? "Invalid email or password." },
      { status: 401 },
    );
  }

  // Authorization: the Supabase user must exist in the `admins` table.
  let adminRole: AdminRole | null = null;
  const user = result.user;
  try {
    const rows = await queryWithTimeout((db) =>
      db.select().from(admins).where(
        or(
          user.id ? eq(admins.authUserId, user.id) : undefined,
          eq(admins.email, user.email),
        ),
      ).limit(1)
    , 0, 5000); // 5s timeout, no retries
    adminRole = rows[0]?.role ?? null;
  } catch {
    // DB unavailable — do not allow login (authorization cannot be verified).
  }

  if (!adminRole) {
    await recordAudit({
      actor: user.email,
      action: "admin.login",
      entity: "admin",
      metadata: { result: "denied" },
    });
    return NextResponse.json(
      { ok: false, error: "This account is not authorized to access the admin panel." },
      { status: 403 },
    );
  }

  await createAdminSession(result.token);
  await recordAudit({
    actor: user.email,
    action: "admin.login",
    entity: "admin",
    after: { role: adminRole },
    metadata: { result: "ok" },
  });

  return NextResponse.json({ ok: true, role: adminRole });
}