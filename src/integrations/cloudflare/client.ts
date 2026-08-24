import "server-only";

import { cloudflareEmailConfig, isCloudflareEmailConfigured } from "./config";
import type { CloudflareEmailInput } from "./types";
import type { EmailClient, AccessEmailParams, TemplateEmailParams } from "@/integrations/email-client";
import { renderEmail, type EmailTemplateKey, type TemplateVariables } from "@/lib/email-templates";

// Cloudflare Worker + MailChannels client wrapper — the ONLY place the HTTP call is made.
// Email bodies render from the DB-backed template store with code fallbacks, never inline string-building.

/**
 * Send an already-rendered email via the Cloudflare Worker → MailChannels.
 * Throws only when unreachable or the worker returns an error.
 */
export async function sendEmail(input: CloudflareEmailInput): Promise<void> {
  if (!isCloudflareEmailConfigured()) {
    throw new Error("Cloudflare email not configured: set CLOUDFLARE_EMAIL_WORKER_URL and CLOUDFLARE_EMAIL_WORKER_SECRET");
  }

  const { workerUrl, workerSecret, from: defaultFrom } = cloudflareEmailConfig;
  const from = input.from ?? defaultFrom;

  const response = await fetch(workerUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${workerSecret}`,
    },
    body: JSON.stringify({
      to: input.to,
      from,
      subject: input.subject,
      html: input.html,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Cloudflare Worker email send failed: ${response.status} ${errorText}`);
  }
}

/** Render the access-password email from the template store. */
export async function renderAccessEmail(data: AccessEmailData): Promise<{
  subject: string;
  html: string;
}> {
  return renderEmail("access_password", {
    platformName: data.platformName,
    devotionalTitle: data.devotionalTitle,
    accessPassword: data.accessPassword,
    accessUrl: data.accessUrl,
    supportEmail: data.supportEmail,
  });
}

/** Send the access-password email from the template store. */
export async function sendAccessEmail(data: AccessEmailData): Promise<void> {
  const { subject, html } = await renderAccessEmail(data);
  await sendEmail({ to: data.to, subject, html });
}

/** Send any DB-backed template (e.g. admin_invite) to one recipient. */
export async function sendTemplateEmail(input: {
  to: string;
  key: EmailTemplateKey;
  variables: TemplateVariables;
  from?: string;
}): Promise<void> {
  const { subject, html } = await renderEmail(input.key, input.variables);
  await sendEmail({ to: input.to, from: input.from, subject, html });
}

/** Factory for the email client abstraction. */
export function createCloudflareEmailClient(): EmailClient {
  return {
    async sendAccessEmail(params: AccessEmailParams) {
      await sendAccessEmail(params);
    },
    async sendTemplateEmail(params: TemplateEmailParams) {
      await sendTemplateEmail({ to: params.to, key: params.templateKey as EmailTemplateKey, variables: params.variables });
    },
  };
}

// Re-export the data type for the access email
export interface AccessEmailData {
  to: string;
  platformName: string;
  devotionalTitle: string;
  accessPassword: string;
  accessUrl: string;
  supportEmail: string;
}