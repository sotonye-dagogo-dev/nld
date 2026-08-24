import "server-only";

import { cookies } from "next/headers";
import { or, eq } from "drizzle-orm";
import { validateAdminToken } from "@/integrations/supabase/client";
import { queryWithTimeout } from "@/data/db";
import { admins } from "@/data/db/schema";

// Admin session handling. A Supabase Auth access token is stored in an
// HttpOnly cookie; every guarded page validates it server-side and resolves
// the matching `admins` row (by auth_user_id when bound, else by email). The
// middleware only does a cheap presence check — real authorization happens in
// the guarded panel layout and API guards.

const SESSION_COOKIE = "admin_session";
const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

function isProduction(): boolean {
  return process.env.NODE_ENV === "production";
}

export async function createAdminSession(token: string): Promise<void> {
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: isProduction(), // Only secure in production (Vercel is HTTPS)
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
}

export async function destroyAdminSession(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

/** Resolve the current admin identity from the session cookie, or null. */
export async function getAdminSession(): Promise<AdminUser | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const result = await validateAdminToken(token);
  if (!result.ok || !result.user) return null;

  const user = result.user;
  try {
    const rows = await queryWithTimeout(
      (db) =>
        db.select().from(admins).where(
          or(
            user.id ? eq(admins.authUserId, user.id) : undefined,
            eq(admins.email, user.email),
          ),
        ).limit(1),
      0, // no retries for auth - fail fast
      10000, // 10 second timeout for auth (cold start tolerance)
    );
    const admin = rows[0];
    if (!admin) return null;
    return {
      id: admin.id,
      email: admin.email,
      role: admin.role,
      createdAt: admin.createdAt,
    };
  } catch {
    return null;
  }
}

/** Resolve the current admin or null. Throws nothing; callers decide. */
export async function requireAdmin(): Promise<AdminUser | null> {
  return getAdminSession();
}

/** True when the resolved admin has superadmin (owner) privileges. */
export function isSuperAdmin(admin: AdminUser): boolean {
  return admin.role === "owner";
}

/** Role → privilege map (§2 metadata-driven RBAC, extended as roles grow). */
export const ADMIN_PRIVILEGES: Record<AdminRole, string[]> = {
  owner: ["invite", "email-templates", "settings", "devotionals", "records"],
  admin: ["settings", "devotionals", "records"],
  editor: ["devotionals"],
};

export function can(admin: AdminUser, privilege: string): boolean {
  return ADMIN_PRIVILEGES[admin.role]?.includes(privilege) ?? false;
}