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