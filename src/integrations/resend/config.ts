import "server-only";

import { env } from "@/config/env";

// Resend wrapper configuration — server-only.
// Supports both Resend API (apiKey) and SMTP (emailServerHost/port/user/password).
// If SMTP is configured, it will be used; otherwise falls back to Resend API.

export const resendConfig = {
  apiKey: env.resendApiKey,
  from: env.emailFrom || "Next Level Devotional <devotional@example.com>",
  smtp: {
    host: env.emailServerHost,
    port: env.emailServerPort,
    user: env.emailServerUser,
    password: env.emailServerPassword,
  },
} as const;

export function isResendConfigured(): boolean {
  return Boolean(resendConfig.apiKey || (resendConfig.smtp.host && resendConfig.smtp.user && resendConfig.smtp.password));
}

export function shouldUseSmtp(): boolean {
  return Boolean(resendConfig.smtp.host && resendConfig.smtp.user && resendConfig.smtp.password);
}