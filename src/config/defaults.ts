// Hardcoded fallback defaults for every config-driven value (engineering
// principles §1 and §3). This module is pure — no DB, no env, safe to import
// from anywhere (client or server). The real, admin-editable values live in
// the `settings` table and are loaded by `src/config/site.ts`; when a setting
// is unset or the DB is unavailable, these defaults keep the app working.

export const DEFAULT_SETTINGS: SiteSettings = {
  platformName: "Next Level Devotional",
  tagline: "Daily devotionals for your walk with God",
  logoUrl: "",
  currency: "NGN",
  defaultPriceMinor: 500000, // ₦5,000 in kobo
  freePreviewDays: 3,
  accessMode: "one-time",
  antiScreenshotEnabled: true,
  paymentsEnabled: true,
  emailFrom: "Next Level Devotional <devotional@example.com>",
  supportEmail: "support@example.com",
  footerDevCreditName: "S.D.",
  footerDevCreditUrl: "https://sotonye-dagogo.is-a.dev",
  footerDevCreditEnabled: true,
};

/** Currency display helpers, config-driven with fallbacks. */
export const CURRENCIES: Record<string, { symbol: string; label: string }> = {
  NGN: { symbol: "₦", label: "Naira" },
  USD: { symbol: "$", label: "US Dollar" },
  GHS: { symbol: "GH₵", label: "Cedi" },
  KES: { symbol: "KSh", label: "Shilling" },
  GBP: { symbol: "£", label: "Pound" },
  EUR: { symbol: "€", label: "Euro" },
};

/** Format a minor-unit amount into a display string. */
export function formatPrice(
  amountMinor: number,
  currency: string,
): string {
  const c = CURRENCIES[currency] ?? CURRENCIES.NGN;
  return `${c.symbol}${(amountMinor / 100).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

// ---------------------------------------------------------------------------
// Default email templates (§18). DB-backed with code fallbacks: the admin
// editor overrides rows in `email_templates`; when a row is missing (seeding
// not run, DB down) these values are used. `variables` maps each placeholder
// name to a human label the editor renders as insertable chips.
// Placeholders use {{name}} syntax and are escaped on render (see
// `src/lib/email-templates.ts`).
// ---------------------------------------------------------------------------

export interface DefaultEmailTemplate {
  name: string;
  subject: string;
  bodyHtml: string;
  variables: Record<string, string>;
}

export const DEFAULT_EMAIL_TEMPLATES: Record<string, DefaultEmailTemplate> = {
  access_password: {
    name: "Access password",
    subject: "Your access to {{devotionalTitle}} on {{platformName}}",
    bodyHtml: [
      "<h1>{{platformName}}</h1>",
      "<p>Thanks for purchasing <strong>{{devotionalTitle}}</strong>.</p>",
      "<p>Use this access password to unlock the devotional:</p>",
      '<div style="display:block;font-size:1.4rem;font-weight:700;letter-spacing:.15em;padding:.75rem 1rem;background:#f1f5f9;border-radius:.5rem;password-box">{{accessPassword}}</div>',
      '<p>Open <a href="{{accessUrl}}">{{accessUrl}}</a> and enter the password to start reading.</p>',
      '<p>Need help? Contact <a href="mailto:{{supportEmail}}">{{supportEmail}}</a>.</p>',
    ].join("\n"),
    variables: {
      platformName: "Platform name",
      devotionalTitle: "Devotional title",
      accessPassword: "Access password",
      accessUrl: "Unlock URL",
      supportEmail: "Support email",
    },
  },
  admin_invite: {
    name: "Admin invitation",
    subject: "You've been invited to admin {{platformName}}",
    bodyHtml: [
      "<h1>{{platformName}}</h1>",
      "<p>You have been invited to join the admin team for <strong>{{platformName}}</strong>.</p>",
      '<a href="{{inviteUrl}}" style="display:inline-block;background:#4f46e5;color:#ffffff;padding:.75rem 1.25rem;border-radius:.5rem;text-decoration:none">Accept invitation</a>',
      "<p>This invitation link expires on {{expiresAt}}.</p>",
    ].join("\n"),
    variables: {
      platformName: "Platform name",
      inviteUrl: "Invitation link",
      expiresAt: "Expiry date",
    },
  },
};

/** All template keys the platform knows how to send. */
export const EMAIL_TEMPLATE_KEYS = Object.keys(DEFAULT_EMAIL_TEMPLATES);