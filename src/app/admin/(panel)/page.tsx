import type { Metadata } from "next";
import { Card } from "@/components/ui/card";
import { ErrorState } from "@/components/ui/error-state";
import { queryWithTimeout } from "@/data/db";
import { purchases, accessGrants, events, devotionals } from "@/data/db/schema";
import { sql } from "drizzle-orm";

export const metadata: Metadata = { title: "Admin — Dashboard" };
export const dynamic = "force-dynamic";

function stat(count: number, label: string) {
  return (
    <Card className="text-center">
      <p className="text-3xl font-bold text-text-primary">{count}</p>
      <p className="mt-1 text-sm text-text-muted">{label}</p>
    </Card>
  );
}

async function safeCount(
  fn: (db: ReturnType<typeof import("@/data/db").getDb>) => Promise<Array<{ n: number }>>,
): Promise<number | null> {
  try {
    const rows = await queryWithTimeout(fn);
    return rows[0]?.n ?? 0;
  } catch {
    return null;
  }
}

export default async function AdminDashboardPage() {
  const [d, p, g, e] = await Promise.all([
    safeCount((db) => db.select({ n: sql<number>`count(*)::int` }).from(devotionals)),
    safeCount((db) => db.select({ n: sql<number>`count(*)::int` }).from(purchases)),
    safeCount((db) => db.select({ n: sql<number>`count(*)::int` }).from(accessGrants)),
    safeCount((db) => db.select({ n: sql<number>`count(*)::int` }).from(events)),
  ]);

  const allFailed = d === null && p === null && g === null && e === null;
  const counts =
    allFailed
      ? null
      : {
          devotionals: d ?? 0,
          purchases: p ?? 0,
          grants: g ?? 0,
          events: e ?? 0,
        };
  const hasPartialFailure = !allFailed && (d === null || p === null || g === null || e === null);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Dashboard</h1>
        <p className="text-sm text-text-muted">Platform records at a glance.</p>
      </div>

      {counts === null ? (
        <ErrorState
          title="Database unavailable"
          message="Records could not be loaded. Check that DATABASE_URL is set and reachable."
        />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {stat(counts.devotionals, "Devotionals")}
            {stat(counts.purchases, "Purchases")}
            {stat(counts.grants, "Access grants")}
            {stat(counts.events, "Events logged")}
          </div>
          {hasPartialFailure && (
            <p className="text-xs text-text-muted">
              Some counts may be stale — a transient database hiccup was retried. Refresh to re-check.
            </p>
          )}
        </>
      )}
    </div>
  );
}