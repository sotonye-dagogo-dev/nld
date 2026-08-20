// Pure, client-safe email template rendering. No server-only imports so the
// admin editor can preview templates live in the browser. The server store in
// `src/lib/email-templates.ts` re-exports these and adds the DB layer.

export type TemplateVariables = Record<string, string | number | boolean>;

/** HTML-escape an interpolated value so template output cannot inject markup. */
export function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Replace {{name}} placeholders with escaped values (HTML body context). */
export function renderTemplate(template: string, variables: TemplateVariables): string {
  return template.replace(/\{\{\s*([A-Za-z0-9_]+)\s*\}\}/g, (match, name: string) => {
    return name in variables ? escapeHtml(variables[name]) : match;
  });
}

/** Replace {{name}} placeholders with plain text values (subject line). */
export function renderTemplateSubject(template: string, variables: TemplateVariables): string {
  return template.replace(/\{\{\s*([A-Za-z0-9_]+)\s*\}\}/g, (match, name: string) => {
    return name in variables ? String(variables[name]) : match;
  });
}

/** Sample values used by the editor's live preview pane. */
export const SAMPLE_EMAIL_VARIABLES: Record<string, string> = {
  platformName: "Next Level Devotional",
  devotionalTitle: "30 Days of Prayer",
  accessPassword: "AB2CDEFG3HJK",
  accessUrl: "https://example.com/access",
  supportEmail: "support@example.com",
  inviteUrl: "https://example.com/admin/invite/abc123",
  expiresAt: "2026-08-27",
};