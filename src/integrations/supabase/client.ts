import "server-only";

import { createClient } from "@supabase/supabase-js";
import { supabaseConfig } from "./config";

// Supabase client wrapper — the ONLY place the Supabase SDK is touched
// (engineering principle §17). The service-role client is server-only.

let serviceClient: ReturnType<typeof createClient> | null = null;

/**
 * Server-only admin client using the service-role key. Bypasses RLS by
 * design; only call from route handlers / server components / wrappers.
 */
export function getAdminClient() {
  if (serviceClient) return serviceClient;
  if (!supabaseConfig.url || !supabaseConfig.serviceRoleKey) {
    throw new Error("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not set");
  }
  serviceClient = createClient(supabaseConfig.url, supabaseConfig.serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  return serviceClient;
}

/**
 * Validate a Bearer token against Supabase Auth. Used by admin route guards.
 * Never trusts the caller — resolves the token server-side.
 */
export async function validateAdminToken(
  token: string | null,
): Promise<AdminSessionResult> {
  if (!token) return { ok: false, error: "missing token" };
  try {
    const { data, error } = await getAdminClient().auth.getUser(token);
    if (error || !data.user) return { ok: false, error: error?.message ?? "invalid token" };
    return {
      ok: true,
      user: {
        id: data.user.id,
        email: data.user.email ?? "",
        emailVerified: Boolean(data.user.email_confirmed_at),
      },
    };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "auth error" };
  }
}

/**
 * Sign an admin in with email + password against Supabase Auth. Returns the
 * access token to store in the admin session cookie. Used only by the admin
 * login route; never exposed to client components.
 */
export async function adminSignIn(
  email: string,
  password: string,
): Promise<AdminSessionResult & { token?: string }> {
  try {
    const { data, error } = await getAdminClient().auth.signInWithPassword({ email, password });
    if (error || !data.session) {
      return { ok: false, error: error?.message ?? "Invalid email or password." };
    }
    return {
      ok: true,
      token: data.session.access_token,
      user: {
        id: data.user.id,
        email: data.user.email ?? "",
        emailVerified: Boolean(data.user.email_confirmed_at),
      },
    };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Sign-in error." };
  }
}