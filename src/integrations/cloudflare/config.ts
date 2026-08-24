import "server-only";

import { env } from "@/config/env";

// Cloudflare Workers + MailChannels configuration — server-only.
// Uses a Cloudflare Worker as an SMTP relay to MailChannels (free for Cloudflare users).

export const cloudflareEmailConfig = {
  workerUrl: env.cloudflareEmailWorkerUrl,
  workerSecret: env.cloudflareEmailWorkerSecret,
  from: env.emailFrom || "Next Level Devotional <devotional@example.com>",
} as const;

export function isCloudflareEmailConfigured(): boolean {
  return Boolean(cloudflareEmailConfig.workerUrl && cloudflareEmailConfig.workerSecret);
}