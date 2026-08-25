import "server-only";

import { getSiteSettings } from "@/config/site";
import { renderTemplate, renderTemplateSubject } from "@/lib/email-render";
import { DEFAULT_EMAIL_TEMPLATES } from "@/config/defaults";
import type { DefaultEmailTemplate } from "@/config/defaults";

// Email client abstraction — swap providers by implementing this interface.
// Current implementation uses Resend; Cloudflare Workers + MailChannels is also supported.
// See EMAIL_SERVICE_ALTERNATIVES.md for alternatives.

export interface AccessEmailParams {
  to: string;
  platformName: string;
  devotionalTitle: string;
  accessPassword: string;
  accessUrl: string;
  supportEmail: string;
}

export interface TemplateEmailParams {
  to: string;
  templateKey: string;
  variables: Record<string, string>;
}

export interface EmailClient {
  sendAccessEmail(params: AccessEmailParams): Promise<void>;
  sendTemplateEmail(params: TemplateEmailParams): Promise<void>;
}

let emailClientInstance: EmailClient | null = null;

export async function getEmailClient(): Promise<EmailClient> {
  if (emailClientInstance) return emailClientInstance;

  const provider = process.env.EMAIL_PROVIDER ?? "cloudflare";

  switch (provider) {
    case "resend": {
      const { createResendClient } = await import("./resend/client");
      emailClientInstance = createResendClient();
      break;
    }
    case "cloudflare": {
      const { createCloudflareEmailClient } = await import("./cloudflare/client");
      emailClientInstance = createCloudflareEmailClient();
      break;
    }
    case "brevo":
    case "sendgrid":
    case "mailgun":
    case "postmark":
    case "mailchannels":
      // These providers are documented in EMAIL_SERVICE_ALTERNATIVES.md
      // Create the corresponding client file to enable them.
      throw new Error(
        `Email provider "${provider}" is not implemented yet. ` +
        `See EMAIL_SERVICE_ALTERNATIVES.md for implementation guide.`
      );
    default:
      throw new Error(`Unknown email provider: ${provider}`);
  }

  return emailClientInstance;
}

/** High-level helper: send the access password email using the configured provider. */
export async function sendAccessEmail(params: AccessEmailParams): Promise<void> {
  const client = await getEmailClient();
  return client.sendAccessEmail(params);
}

/** High-level helper: send a templated email using the configured provider. */
export async function sendTemplateEmail(params: TemplateEmailParams): Promise<void> {
  const client = await getEmailClient();
  return client.sendTemplateEmail(params);
}

/** Render an email template (DB-backed with code fallback). */
export async function renderEmailTemplate(
  key: string,
  variables: Record<string, string>,
): Promise<{ subject: string; html: string }> {
  const { value: settings } = await getSiteSettings();

  // Merge settings into variables for templates that use platformName, supportEmail, etc.
  const mergedVars = {
    ...variables,
    platformName: settings.platformName,
    supportEmail: settings.supportEmail,
    currency: settings.currency,
  };

  // Try DB template first, fall back to code default
  let template: DefaultEmailTemplate | undefined;
  try {
    const { getEmailTemplate } = await import("@/lib/email-templates");
    const dbTemplate = await getEmailTemplate(key);
    if (dbTemplate) {
      template = {
        name: dbTemplate.name,
        subject: dbTemplate.subject,
        bodyHtml: dbTemplate.bodyHtml,
        variables: dbTemplate.variables,
      };
    }
  } catch {
    // DB unavailable or template not found — use code fallback
  }

  if (!template) {
    template = DEFAULT_EMAIL_TEMPLATES[key];
  }

  if (!template) {
    throw new Error(`Email template not found: ${key}`);
  }

  const subject = renderTemplateSubject(template.subject, mergedVars);
  const html = renderTemplate(template.bodyHtml, mergedVars);
  return { subject, html };
}