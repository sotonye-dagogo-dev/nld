import "server-only";

import { env } from "@/config/env";

// Supabase wrapper configuration — server-only.

export const supabaseConfig = {
  url: env.supabaseUrl,
  anonKey: env.supabaseAnonKey,
  serviceRoleKey: env.supabaseServiceRoleKey,
} as const;

export function isSupabaseConfigured(): boolean {
  return Boolean(supabaseConfig.url && supabaseConfig.anonKey && supabaseConfig.serviceRoleKey);
}