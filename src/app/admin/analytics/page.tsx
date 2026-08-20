import type { Metadata } from "next";
import { Card } from "@/components/ui/card";
import { ErrorState } from "@/components/ui/error-state";
import { getDb } from "@/data/db";
import { events } from "@/data/db/schema";
import { sql } from "drizzle-orm";

export const metadata: Metadata = { title: "Admin — Analytics" };
export const dynamic = "force-dynamic";

export default async function AdminAnalyticsPage() {
  let byType: Array<{ eventType: string; n: number }> = [];
  try {
    const db = getDb();
    const result = await db
      .select({
        eventType: events.eventType,
        n: sql<number>`count(*)::int`,
      })
      .from(events)
      .groupBy(events.eventType)
      .orderBy(sql`count(*) desc`);
    byType = result as Array<{ eventType: string; n: number }>;
  } catch {
    byType = [];
  }

  const total = byType.reduce((sum, r) => sum + r.n, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Analytics</h1>
        <p className="text-sm text-text-muted">
          Platform interactions: visits, devotional opens, purchases, access usage.
        </p>
      </div>

      {total === 0 ? (
        <ErrorState
          title="No events recorded yet"
          message="Analytics will populate as visitors browse and purchase. (Requires DATABASE_URL.)"
        />
      ) : (
        <Card>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-text-muted">
                <th className="px-4 py-3 font-medium">Event type</th>
                <th className="px-4 py-3 font-medium">Count</th>
              </tr>
            </thead>
            <tbody>
              {byType.map((row) => (
                <tr key={row.eventType} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 text-text-primary">{row.eventType}</td>
                  <td className="px-4 py-3 text-text-muted">{row.n}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}