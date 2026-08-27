import "server-only";

import { createClient } from "@supabase/supabase-js";
import { supabaseConfig } from "./config";

// Supabase client wrapper — the ONLY place the Supabase SDK is touched
// (engineering principle §17). The service-role client is server-only.

let serviceClient: ReturnType<typeof createClient> | null = null;

const AUTH_TIMEOUT_MS = 8000; // Reduced for Vercel serverless
const VALIDATE_TIMEOUT_MS = 5000; // Reduced for Vercel serverless

function withAbortTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), ms);
  return promise
    .then((result) => {
      clearTimeout(timeoutId);
      return result;
    })
    .catch((err) => {
      clearTimeout(timeoutId);
      if (err.name === "AbortError" || err.name === "CancellationError") {
        throw new Error("Request timeout");
      }
      throw err;
    });
}

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
    global: {
      fetch: (url, options) => {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), AUTH_TIMEOUT_MS);
        return fetch(url, {
          ...options,
          signal: controller.signal,
        }).finally(() => clearTimeout(timeoutId));
      },
    },
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
    const { data, error } = await withAbortTimeout(
      getAdminClient().auth.getUser(token),
      VALIDATE_TIMEOUT_MS,
    );
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
    const message = err instanceof Error ? err.message : "auth error";
    if (message.includes("timeout") || message.includes("AbortError") || message.includes("CancellationError")) {
      return { ok: false, error: "Authentication service unavailable" };
    }
    if (message.includes("ECONNREFUSED") || message.includes("ENOTFOUND")) {
      return { ok: false, error: "Authentication service unavailable" };
    }
    return { ok: false, error: message };
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
    const { data, error } = await withAbortTimeout(
      getAdminClient().auth.signInWithPassword({ email, password }),
      AUTH_TIMEOUT_MS,
    );
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
    const message = err instanceof Error ? err.message : "Sign-in error.";
    if (message.includes("timeout") || message.includes("AbortError") || message.includes("CancellationError")) {
      return { ok: false, error: "Authentication service unavailable. Please try again." };
    }
    if (message.includes("ECONNREFUSED") || message.includes("ENOTFOUND")) {
      return { ok: false, error: "Authentication service unavailable. Please try again." };
    }
    return { ok: false, error: message };
  }
}

// --- Storage helpers (devotional assets: covers, etc.) ---

export interface UploadResult {
  path: string;
  publicUrl: string;
}

const UPLOAD_TIMEOUT_MS = 15000;

/** Upload a file to Supabase Storage (devotional-assets bucket). */
export async function uploadAsset(
  file: Buffer,
  path: string,
  contentType: string,
): Promise<UploadResult> {
  const client = getAdminClient();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), UPLOAD_TIMEOUT_MS);
  try {
    const { data, error } = await client.storage
      .from(supabaseConfig.storage.bucket)
      .upload(path, file, { contentType, upsert: true });
    if (error) throw new Error(`Storage upload failed: ${error.message}`);
    return { path: data.path, publicUrl: `${supabaseConfig.storage.publicUrl}/${data.path}` };
  } catch (err) {
    if (err instanceof Error && (err.name === "AbortError" || err.name === "CancellationError" || err.message.includes("timeout"))) {
      throw new Error("Upload timeout - file too large or network slow");
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}

/** Delete a file from Supabase Storage. */
export async function deleteAsset(path: string): Promise<void> {
  const client = getAdminClient();
  const { error } = await client.storage.from(supabaseConfig.storage.bucket).remove([path]);
  if (error) throw new Error(`Storage delete failed: ${error.message}`);
}

/** Get public URL for an asset path. */
export function getAssetPublicUrl(path: string): string {
  return `${supabaseConfig.storage.publicUrl}/${path}`;
}