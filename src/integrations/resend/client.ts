import "server-only";

import { Resend } from "resend";
import { createTransport } from "nodemailer";
import { resendConfig, shouldUseSmtp } from "./config";
import type { AccessEmailData } from "./types";
import { renderEmail, type EmailTemplateKey, type TemplateVariables } from "@/lib/email-templates";

// Resend client wrapper — the ONLY place the Resend SDK/nodemailer is touched
// (engineering principle §17). Email bodies render from the DB-backed
// template store (§18) with code fallbacks, never inline string-building.

let smtpTransporter: ReturnType<typeof createTransport> | null = null;

function getSmtpTransporter() {
  if (smtpTransporter) return smtpTransporter;
  if (!resendConfig.smtp.host || !resendConfig.smtp.user || !resendConfig.smtp.password) {
    throw new Error("SMTP not configured");
  }
  smtpTransporter = createTransport({
    host: resendConfig.smtp.host,
    port: resendConfig.smtp.port ?? 465,
    secure: (resendConfig.smtp.port ?? 465) === 465,
    auth: {
      user: resendConfig.smtp.user,
      pass: resendConfig.smtp.password,
    },
  });
  return smtpTransporter;
}

/**
 * Render the access-password email from the template store. Kept as a pure
 * function so it can be previewed/tested without sending.
 */
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

/** Send an already-rendered email via Resend API or SMTP. Throws only when unreachable. */
export async function sendEmail(input: {
  to: string;
  from?: string;
  subject: string;
  html: string;
}): Promise<void> {
  const from = input.from ?? resendConfig.from;

  if (shouldUseSmtp()) {
    const transporter = getSmtpTransporter();
    await transporter.sendMail({
      from,
      to: input.to,
      subject: input.subject,
      html: input.html,
    });
    return;
  }

  const resend = new Resend(resendConfig.apiKey);
  const { error } = await resend.emails.send({
    from,
    to: [input.to],
    subject: input.subject,
    html: input.html,
  });
  if (error) {
    throw new Error(`Resend send failed: ${error.message}`);
  }
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