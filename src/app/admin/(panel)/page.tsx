import type { Metadata } from "next";
import { Card, CardTitle } from "@/components/ui/card";
import { ErrorState } from "@/components/ui/error-state";
import { getDb } from "@/data/db";
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

export default async function AdminDashboardPage() {
  let counts: { devotionals: number; purchases: number; grants: number; events: number } | null = null;
  try {
    const db = getDb();
    const [d, p, g, e] = await Promise.all([
      db.select({ n: sql<number>`count(*)::int` }).from(devotionals),
      db.select({ n: sql<number>`count(*)::int` }).from(purchases),
      db.select({ n: sql<number>`count(*)::int` }).from(accessGrants),
      db.select({ n: sql<number>`count(*)::int` }).from(events),
    ]);
    counts = {
      devotionals: d[0]?.n ?? 0,
      purchases: p[0]?.n ?? 0,
      grants: g[0]?.n ?? 0,
      events: e[0]?.n ?? 0,
    };
  } catch {
    counts = null;
  }

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
          <Card>
            <CardTitle>Sprint 2 complete</CardTitle>
            <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-text-muted">
              <li>Admin auth via Supabase + seeded superadmin, invite flow for team members.</li>
              <li>Devotional editor with content, pricing, and preview days.</li>
              <li>Records tables for payments, access grants, and audit log.</li>
              <li>Settings editor for platform name, logo, copy, and toggles.</li>
            </ul>
          </Card>
        </>
      )}
    </div>
  );
}