// Pure analytics helpers for the admin dashboard. No DB, no env, no
// server-only import — safe to import from anywhere and unit-testable without
// a database. Day buckets use UTC day keys ('YYYY-MM-DD') so dashboard math is
// deterministic regardless of server/session timezone; SQL callers pass day
// strings produced with `to_char(created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD')`.

/** A single day bucket in a time series. */
export interface DayCount {
  /** UTC day key 'YYYY-MM-DD' — stable across timezones. */
  key: string;
  /** Human label, e.g. "Aug 20". */
  label: string;
  /** Number of events/bucketed rows on that day. */
  count: number;
}

/** UTC 'YYYY-MM-DD' key for a Date. */
export function utcDayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** Human label for a UTC day key ('2026-08-20' → 'Aug 20'). */
export function dayLabelFromKey(key: string): string {
  const d = new Date(`${key}T00:00:00Z`);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", timeZone: "UTC" });
}

/**
 * Build an inclusive, gap-filled series of the last `days` days ending on
 * `end`. Rows are `{ day: 'YYYY-MM-DD', count }` (any granularity). Days with
 * no rows get a count of 0, so a bare table can be turned into a chart without
 * the caller needing SQL to emit zero rows.
 */
export function fillDaySeries(
  rows: Array<{ day: string; count: number }>,
  days: number,
  end: Date,
): DayCount[] {
  const counts = new Map<string, number>();
  for (const r of rows) {
    counts.set(r.day, (counts.get(r.day) ?? 0) + r.count);
  }

  const endKey = utcDayKey(end);
  const endDate = new Date(`${endKey}T00:00:00Z`);
  const out: DayCount[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(endDate);
    d.setUTCDate(d.getUTCDate() - i);
    const key = d.toISOString().slice(0, 10);
    out.push({ key, label: dayLabelFromKey(key), count: counts.get(key) ?? 0 });
  }
  return out;
}

/**
 * Purchase conversion rate (completed / started), as a percentage with one
 * decimal place. Returns 0 when there was no started base to convert from.
 */
export function conversionRate(completed: number, started: number): number {
  if (started <= 0) return 0;
  return Math.round((completed / started) * 1000) / 10;
}