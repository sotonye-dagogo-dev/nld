import "server-only";

import { eq } from "drizzle-orm";
import { getDb } from "@/data/db";
import { emailTemplates } from "@/data/db/schema";
import { DEFAULT_EMAIL_TEMPLATES, EMAIL_TEMPLATE_KEYS } from "@/config/defaults";
import {
  escapeHtml,
  renderTemplate,
  renderTemplateSubject,
  type TemplateVariables,
} from "./email-render";

// DB-backed email template store (engineering principle §18). Templates are
// stored in `email_templates` (admin-editable) with code fallbacks in
// `src/config/defaults.ts`; when a row is missing or the DB is down, the
// fallback renders so mail can never break the platform. Pure render helpers
// live in `./email-render` (client-safe) and are re-exported here.

export { escapeHtml, renderTemplate, renderTemplateSubject, SAMPLE_EMAIL_VARIABLES } from "./email-render";
export type { TemplateVariables } from "./email-render";

export type EmailTemplateKey = (typeof EMAIL_TEMPLATE_KEYS)[number];

/** Load a template by key, falling back to the code default on DB failure. */
export async function getEmailTemplate(key: EmailTemplateKey): Promise<EmailTemplate> {
  const fallback = DEFAULT_EMAIL_TEMPLATES[key];
  try {
    const rows = await getDb()
      .select()
      .from(emailTemplates)
      .where(eq(emailTemplates.key, key))
      .limit(1);
    const row = rows[0];
    if (row) {
      return {
        key: row.key,
        name: row.name,
        subject: row.subject,
        bodyHtml: row.bodyHtml,
        variables: (row.variables ?? {}) as Record<string, string>,
        updatedBy: row.updatedBy,
        updatedAt: row.updatedAt,
      };
    }
  } catch {
    // DB unavailable → code fallback (documented in defaults.ts).
  }
  return { key, ...fallback, updatedBy: "system", updatedAt: new Date() };
}

/** List all known templates (DB rows when available, else code defaults). */
export async function listEmailTemplates(): Promise<EmailTemplate[]> {
  let dbRows: Array<{
    key: string;
    name: string;
    subject: string;
    bodyHtml: string;
    variables: Record<string, string> | null;
    updatedBy: string;
    updatedAt: Date;
  }> = [];
  try {
    dbRows = (await getDb().select().from(emailTemplates)) as typeof dbRows;
  } catch {
    dbRows = [];
  }
  return EMAIL_TEMPLATE_KEYS.map((key) => {
    const dbRow = dbRows.find((r) => r.key === key);
    if (dbRow) {
      return {
        key: dbRow.key,
        name: dbRow.name,
        subject: dbRow.subject,
        bodyHtml: dbRow.bodyHtml,
        variables: (dbRow.variables ?? {}) as Record<string, string>,
        updatedBy: dbRow.updatedBy,
        updatedAt: dbRow.updatedAt,
      };
    }
    const fallback = DEFAULT_EMAIL_TEMPLATES[key];
    return { key, ...fallback, updatedBy: "system", updatedAt: new Date() };
  });
}

/** Render a template's subject + HTML body for a set of variables. */
export async function renderEmail(
  key: EmailTemplateKey,
  variables: TemplateVariables,
): Promise<{ subject: string; html: string }> {
  const template = await getEmailTemplate(key);
  return {
    subject: renderTemplateSubject(template.subject, variables),
    html: renderTemplate(template.bodyHtml, variables),
  };
}

/**
 * Idempotently seed code defaults into `email_templates`. Safe to call from a
 * seed script or deploy hook; existing admin edits are never overwritten
 * (conflict only touches `updatedAt`).
 */
export async function seedEmailTemplates(actor = "system"): Promise<void> {
  const db = getDb();
  for (const key of EMAIL_TEMPLATE_KEYS) {
    const t = DEFAULT_EMAIL_TEMPLATES[key];
    await db
      .insert(emailTemplates)
      .values({
        key,
        name: t.name,
        subject: t.subject,
        bodyHtml: t.bodyHtml,
        variables: t.variables,
        updatedBy: actor,
      })
      .onConflictDoUpdate({
        target: emailTemplates.key,
        set: { updatedAt: new Date() },
      });
  }
}