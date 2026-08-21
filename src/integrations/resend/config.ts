import "server-only";

import { env } from "@/config/env";

// Resend wrapper configuration — server-only.

export const resendConfig = {
  apiKey: env.resendApiKey,
  from: env.emailFrom || "Next Level Devotional <devotional@example.com>",
} as const;

export function isResendConfigured(): boolean {
  return Boolean(resendConfig.apiKey);
}