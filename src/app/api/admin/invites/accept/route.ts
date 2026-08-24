import { NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";

import { queryWithTimeout } from "@/data/db";
import { adminInvites, admins } from "@/data/db/schema";
import { adminSignIn, getAdminClient } from "@/integrations/supabase/client";
import { createAdminSession } from "@/lib/admin-auth";
import { recordAudit } from "@/lib/audit";
import { isEmail } from "@/lib/utils";

export const runtime = "nodejs";

const bodySchema = z.object({
  token: z.string().min(1).max(200),
  password: z.string().min(8).max(200),
});

/**
 * Accept an invitation: creates (or reuses) the Supabase Auth user, adds the
 * `admins` row at the invited role, marks the invite accepted, and logs the
 * new admin in so they land straight on the panel.
 */
export async function POST(request: Request) {
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
  if (!isEmail(row.email)) {
    return NextResponse.json({ ok: false, error: "Invitation has an invalid email." }, { status: 400 });
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

  // Create or reuse the Supabase Auth user for the invited email.
  const supabase = getAdminClient();
  let authUserId: string;
  try {
    const { data: users } = await supabase.auth.admin.listUsers();
    const match = users?.users.find(
      (u) => u.email?.toLowerCase() === row.email.toLowerCase(),
    );
    if (match) {
      await supabase.auth.admin.updateUserById(match.id, {
        password: payload.password,
        email_confirm: true,
      });
      authUserId = match.id;
    } else {
      const { data, error } = await supabase.auth.admin.createUser({
        email: row.email,
        password: payload.password,
        email_confirm: true,
      });
      if (error || !data.user) {
        return NextResponse.json(
          { ok: false, error: `Could not create the account: ${error?.message ?? "unknown error"}` },
          { status: 502 },
        );
      }
      authUserId = data.user.id;
    }
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Account creation failed." },
      { status: 502 },
    );
  }

  // Add/confirm the admins row at the invited role.
  await queryWithTimeout((db) =>
    db.insert(admins).values({ authUserId, email: row.email, role: row.role }).onConflictDoUpdate({
      target: admins.email,
      set: { authUserId, role: row.role },
    })
  );

  await queryWithTimeout((db) => db.update(adminInvites).set({ status: "accepted" }).where(eq(adminInvites.id, row.id)));

  await recordAudit({
    actor: row.email,
    action: "admin.invite.accept",
    entity: "admin_invite",
    entityId: row.id,
    after: { role: row.role },
  });

  // Auto-login: sign in with the freshly set password and store the session.
  const signIn = await adminSignIn(row.email, payload.password);
  if (signIn.ok && signIn.token) {
    await createAdminSession(signIn.token);
  }

  return NextResponse.json({ ok: true });
}