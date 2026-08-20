import "server-only";

import { Resend } from "resend";
import { resendConfig } from "./config";
import type { AccessEmailData } from "./types";

// Resend client wrapper — the ONLY place the Resend SDK is touched
// (engineering principle §17). Templates are rendered here from typed data.

/**
 * Build the access-password email body from a template (principle §18). Kept
 * as a pure function so it can be previewed/tested without sending.
 */
export function renderAccessEmail(data: AccessEmailData): {
  subject: string;
  html: string;
} {
  const subject = `Your access to "${data.devotionalTitle}" on ${data.platformName}`;
  const html = [
    `<h1>${data.platformName}</h1>`,
    `<p>Thanks for purchasing <strong>${data.devotionalTitle}</strong>.</p>`,
    `<p>Use this access password to unlock the devotional:</p>`,
    `<p style="font-size:1.4rem;font-weight:700;letter-spacing:.15em;padding:.75rem 1rem;background:#f1f5f9;border-radius:.5rem">${data.accessPassword}</p>`,
    `<p>Open <a href="${data.accessUrl}">${data.accessUrl}</a> and enter the password to start reading.</p>`,
    `<p>Need help? Contact ${data.supportEmail}.</p>`,
  ].join("\n");
  return { subject, html };
}

/** Send the access-password email. Throws only when Resend is unreachable. */
export async function sendAccessEmail(data: AccessEmailData): Promise<void> {
  const { subject, html } = renderAccessEmail(data);
  const resend = new Resend(resendConfig.apiKey);
  const { error } = await resend.emails.send({
    from: resendConfig.from,
    to: [data.to],
    subject,
    html,
  });
  if (error) {
    throw new Error(`Resend send failed: ${error.message}`);
  }
}