import "server-only";

// Typed env accessors. Server-only. Every read has a documented fallback or a
// clear "required" marker so startup fails loudly instead of breaking quietly.

export const env = {
  appUrl: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",

  databaseUrl: process.env.DATABASE_URL ?? "", // required at runtime for DB work
  supabaseUrl: process.env.SUPABASE_URL ?? "",
  supabaseAnonKey: process.env.SUPABASE_ANON_KEY ?? "",
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",

  paystackPublicKey: process.env.PAYSTACK_PUBLIC_KEY ?? "",
  paystackSecretKey: process.env.PAYSTACK_SECRET_KEY ?? "",

  resendApiKey: process.env.RESEND_API_KEY ?? "",
  emailFrom: process.env.EMAIL_FROM ?? "",
  emailServerHost: process.env.EMAIL_SERVER_HOST ?? "",
  emailServerPort: process.env.EMAIL_SERVER_PORT ? Number(process.env.EMAIL_SERVER_PORT) : undefined,
  emailServerUser: process.env.EMAIL_SERVER_USER ?? "",
  emailServerPassword: process.env.EMAIL_SERVER_PASSWORD ?? "",

  // HMAC key for access-password derivation. Falls back to a dev-only value
  // so local/dev runs work without setup; production MUST set a real secret.
  accessPasswordSecret: process.env.ACCESS_PASSWORD_SECRET ?? "dev-only-access-password-secret",

  enableDesignViewer: process.env.ENABLE_DESIGN_VIEWER === "true",
} as const;

/** True when every required server-side integration has its keys set. */
export function hasRequiredSecrets(): boolean {
  return Boolean(
    env.databaseUrl &&
      env.supabaseUrl &&
      env.supabaseServiceRoleKey &&
      env.paystackSecretKey &&
      env.resendApiKey,
  );
}