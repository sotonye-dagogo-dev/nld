import "server-only";

import { DEFAULT_SETTINGS } from "./defaults";
import { queryWithTimeout } from "@/data/db";
import { settings } from "@/data/db/schema";

// Server-only loader for admin-configurable platform settings.
//
// Reads the `settings` table and merges over the code fallbacks so the app
// always has a value (§1/§3). Never throws when the DB is unavailable — it
// degrades to fallbacks and reports `source: "fallback"`.

const SETTING_KEYS: (keyof SiteSettings)[] = [
  "platformName",
  "tagline",
  "logoUrl",
  "currency",
  "defaultPriceMinor",
  "freePreviewDays",
  "accessMode",
  "antiScreenshotEnabled",
  "paymentsEnabled",
  "emailFrom",
  "supportEmail",
  "footerDevCreditName",
  "footerDevCreditUrl",
  "footerDevCreditEnabled",
];

export function coerceValue<T>(key: keyof SiteSettings, raw: unknown, fallback: T): T {
  switch (key) {
    case "defaultPriceMinor":
    case "freePreviewDays": {
      const n = Number(raw);
      return (Number.isFinite(n) ? n : fallback) as T;
    }
    case "antiScreenshotEnabled":
    case "paymentsEnabled": {
      if (typeof raw === "boolean") return raw as T;
      if (raw === "true" || raw === "1") return true as T;
      if (raw === "false" || raw === "0") return false as T;
      return fallback; // unrecognized string → safe default
    }
    default:
      return (typeof raw === "string" && raw.length > 0 ? raw : fallback) as T;
  }
}

// Shorter timeout for settings since they're non-critical and have fallbacks
const SETTINGS_QUERY_TIMEOUT_MS = 1000;

async function fetchSettingsFromDb(): Promise<Partial<SiteSettings>> {
  try {
    const rows = await queryWithTimeout(
      (db) => db.select().from(settings),
      0, // no retries for settings - fail fast to fallbacks
      1000, // 1 second timeout for settings
    );
    const out: Partial<SiteSettings> = {};
    for (const row of rows) {
      const key = row.key as keyof SiteSettings;
      if (SETTING_KEYS.includes(key)) {
        const record = out as unknown as Record<string, string | number | boolean>;
        record[key] = coerceValue(key, row.value, record[key] ?? DEFAULT_SETTINGS[key]);
      }
    }
    return out;
  } catch {
    return {};
  }
}

export async function getSiteSettings(): Promise<ConfigValue<SiteSettings>> {
  const dbSettings = await fetchSettingsFromDb();
  const out: SiteSettings = { ...DEFAULT_SETTINGS, ...dbSettings };
  return { value: out, source: Object.keys(dbSettings).length > 0 ? "db" : "fallback" };
}