import "server-only";

import { DEFAULT_SETTINGS } from "./defaults";
import { getDb } from "@/data/db";
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

export async function getSiteSettings(): Promise<ConfigValue<SiteSettings>> {
  const out: SiteSettings = { ...DEFAULT_SETTINGS };
  let readDb = false;

  try {
    const rows = await getDb().select().from(settings);
    readDb = true;
    for (const row of rows) {
      const key = row.key as keyof SiteSettings;
      if (SETTING_KEYS.includes(key)) {
        const record = out as unknown as Record<string, string | number | boolean>;
        record[key] = coerceValue(key, row.value, record[key]);
      }
    }
  } catch {
    // DB unavailable → fall back to defaults (documented in defaults.ts)
  }

  return { value: out, source: readDb ? "db" : "fallback" };
}