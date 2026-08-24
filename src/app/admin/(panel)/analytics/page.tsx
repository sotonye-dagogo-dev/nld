import type { Metadata } from "next";
import { and, desc, eq, gte, isNotNull, sql } from "drizzle-orm";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { ErrorState } from "@/components/ui/error-state";
import { EmptyState } from "@/components/ui/empty-state";
import { AnalyticsBars } from "@/components/admin/analytics-bars";
import { getAdminSession } from "@/lib/admin-auth";
import { queryWithTimeout } from "@/data/db";
import { events, purchases, devotionals } from "@/data/db/schema";
import { conversionRate, fillDaySeries } from "@/lib/analytics";
import { formatPrice } from "@/config/defaults";

const ANALYTICS_QUERY_TIMEOUT_MS = 8000;

async function queryAnalytics<T>(fn: (db: ReturnType<typeof import("@/data/db").getDb>) => Promise<T>): Promise<T | null> {
  try {
    return await queryWithTimeout(fn, ANALYTICS_QUERY_TIMEOUT_MS);
  } catch {
    return null;
  }
}

export const metadata: Metadata = { title: "Admin — Analytics" };
export const dynamic = "force-dynamic";

const TREND_DAYS = 30;
const CUTOFF = new Date(Date.now() - TREND_DAYS * 24 * 60 * 60 * 1000);

// UTC day keys so the dashboard buckets match the pure helpers regardless of
// server/session timezone.
const TREND_DAY = (col: unknown) =>
  sql<string>`to_char(${col} AT TIME ZONE 'UTC', 'YYYY-MM-DD')`;

function stat(count: number | string, label: string) {
  return (
    <Card className="text-center">
      <p className="text-3xl font-bold text-text-primary">{count}</p>
      <p className="mt-1 text-sm text-text-muted">{label}</p>
    </Card>
  );
}

export default async function AdminAnalyticsPage() {
  const admin = await getAdminSession();
  if (!admin) {
    return <ErrorState title="Access denied" message="Sign in to view analytics." />;
  }

  let data:
    | {
        totalVisits: number;
        totalOpens: number;
        completedPurchases: number;
        revenue: number;
        conversion: number;
        visits: ReturnType<typeof fillDaySeries>;
        opens: ReturnType<typeof fillDaySeries>;
        purchases: ReturnType<typeof fillDaySeries>;
        topOpens: Array<{ title: string; slug: string; n: number }>;
        topPurchases: Array<{ title: string; slug: string; n: number; revenue: number }>;
        recent: Array<{ id: string; eventType: string; slug: string | null; email: string | null; createdAt: Date }>;
      }
    | null = null;
  let loadError = false;

  const [typeRows, revenueRows, trendRows, purchaseTrendRows, topOpenRows, topPurchaseRows, recentRows] =
      await Promise.all([
        queryAnalytics((db) =>
          db.select({ eventType: events.eventType, n: sql<number>`count(*)::int` }).from(events).groupBy(events.eventType)
        ),
        queryAnalytics((db) =>
          db
            .select({
              n: sql<number>`count(*)::int`,
              total: sql<number>`coalesce(sum(${purchases.amountMinor}), 0)::int`,
            })
            .from(purchases)
            .where(eq(purchases.status, "success"))
        ),
        queryAnalytics((db) =>
          db
            .select({
              eventType: events.eventType,
              day: TREND_DAY(events.createdAt),
              n: sql<number>`count(*)::int`,
            })
            .from(events)
            .where(gte(events.createdAt, CUTOFF))
            .groupBy(events.eventType, TREND_DAY(events.createdAt))
        ),
        queryAnalytics((db) =>
          db
            .select({
              day: TREND_DAY(purchases.createdAt),
              n: sql<number>`count(*)::int`,
            })
            .from(purchases)
            .where(and(eq(purchases.status, "success"), gte(purchases.createdAt, CUTOFF)))
            .groupBy(TREND_DAY(purchases.createdAt))
        ),
        queryAnalytics((db) =>
          db
            .select({
              slug: events.slug,
              title: devotionals.title,
              n: sql<number>`count(*)::int`,
            })
            .from(events)
            .leftJoin(devotionals, eq(events.slug, devotionals.slug))
            .where(and(eq(events.eventType, "devotional.open"), isNotNull(events.slug)))
            .groupBy(events.slug, devotionals.title)
            .orderBy(sql`count(*) desc`)
            .limit(10)
        ),
        queryAnalytics((db) =>
          db
            .select({
              devotionalId: purchases.devotionalId,
              title: devotionals.title,
              slug: devotionals.slug,
              n: sql<number>`count(*)::int`,
              revenue: sql<number>`sum(${purchases.amountMinor})::int`,
            })
            .from(purchases)
            .leftJoin(devotionals, eq(purchases.devotionalId, devotionals.id))
            .where(eq(purchases.status, "success"))
            .groupBy(purchases.devotionalId, devotionals.title, devotionals.slug)
            .orderBy(sql`count(*) desc`)
            .limit(10)
        ),
        queryAnalytics((db) => db.select().from(events).orderBy(desc(events.createdAt)).limit(8)),
      ]);

    const countBy = new Map((typeRows ?? []).map((r) => [r.eventType, r.n]));
    const now = new Date();
    data = {
      totalVisits: countBy.get("page.view") ?? 0,
      totalOpens: countBy.get("devotional.open") ?? 0,
      completedPurchases: revenueRows?.[0]?.n ?? 0,
      revenue: revenueRows?.[0]?.total ?? 0,
      conversion: conversionRate(revenueRows?.[0]?.n ?? 0, countBy.get("purchase.started") ?? 0),
      visits: fillDaySeries(
        (trendRows ?? [])
          .filter((r) => r.eventType === "page.view")
          .map((r) => ({ day: r.day, count: r.n })),
        TREND_DAYS,
        now,
      ),
      opens: fillDaySeries(
        (trendRows ?? [])
          .filter((r) => r.eventType === "devotional.open")
          .map((r) => ({ day: r.day, count: r.n })),
        TREND_DAYS,
        now,
      ),
      purchases: fillDaySeries(
        (purchaseTrendRows ?? []).map((r) => ({ day: r.day, count: r.n })),
        TREND_DAYS,
        now,
      ),
      topOpens: (topOpenRows ?? []).map((r) => ({
        title: r.title ?? r.slug ?? "Unknown devotional",
        slug: r.slug ?? "",
        n: r.n,
      })),
      topPurchases: (topPurchaseRows ?? []).map((r) => ({
        title: r.title ?? r.slug ?? "Unknown devotional",
        slug: r.slug ?? "",
        n: r.n,
        revenue: r.revenue,
      })),
      recent: (recentRows ?? []).map((r) => ({
        id: r.id,
        eventType: r.eventType,
        slug: r.slug,
        email: r.email,
        createdAt: r.createdAt,
      })),
    };

  const header = (
    <div>
      <h1 className="text-2xl font-bold text-text-primary">Analytics</h1>
      <p className="text-sm text-text-muted">
        Platform visits, devotional opens, and purchases. Data refreshes per page load.
      </p>
    </div>
  );

  if (loadError) {
    return (
      <div className="space-y-6">
        {header}
        <ErrorState
          title="Could not load analytics"
          message="Analytics could not be fetched. Check that DATABASE_URL is set and reachable."
        />
      </div>
    );
  }

  if (!data) return null;

  const hasAny =
    data.totalVisits + data.totalOpens + data.completedPurchases + data.recent.length > 0;

  return (
    <div className="space-y-6">
      {header}

      {!hasAny ? (
        <EmptyState
          title="No analytics yet"
          description="Analytics populate as visitors browse, open devotionals, and purchase. (Requires DATABASE_URL.)"
        />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
            {stat(data.totalVisits, "Platform visits")}
            {stat(data.totalOpens, "Devotional opens")}
            {stat(data.completedPurchases, "Purchases")}
            {stat(formatPrice(data.revenue, "NGN"), "Revenue")}
            {stat(`${data.conversion}%`, "Conversion")}
          </div>

          <section className="grid gap-4 lg:grid-cols-3">
            <AnalyticsBars title="Visits" hint="last 30 days" series={data.visits} barClass="bg-primary" />
            <AnalyticsBars title="Devotional opens" hint="last 30 days" series={data.opens} barClass="bg-secondary" />
            <AnalyticsBars title="Purchases" hint="last 30 days" series={data.purchases} barClass="bg-success" />
          </section>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Top devotionals by opens</CardTitle>
              </CardHeader>
              <TopDevotionalTable
                rows={data.topOpens}
                columns={["Title", "Opens"]}
                empty="No devotional opens yet."
              />
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Top devotionals by purchases</CardTitle>
              </CardHeader>
              <TopDevotionalTable
                rows={data.topPurchases}
                columns={["Title", "Purchases", "Revenue"]}
                empty="No completed purchases yet."
              />
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Recent events</CardTitle>
            </CardHeader>
            <RecentEventsTable rows={data.recent} />
          </Card>
        </>
      )}
    </div>
  );
}

function TopDevotionalTable({
  rows,
  columns,
  empty,
}: {
  rows: Array<{ title: string; slug: string; n: number; revenue?: number }>;
  columns: string[];
  empty: string;
}) {
  if (rows.length === 0) {
    return <p className="py-6 text-center text-sm text-text-muted">{empty}</p>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-text-muted">
            {columns.map((c) => (
              <th key={c} className="px-2 py-2 font-medium">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={`${r.slug}-${r.title}`} className="border-b border-border last:border-0">
              <td className="px-2 py-2 text-text-primary">{r.title}</td>
              <td className="px-2 py-2 text-text-muted">{r.n}</td>
              {typeof r.revenue === "number" && (
                <td className="px-2 py-2 text-text-muted">{formatPrice(r.revenue, "NGN")}</td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RecentEventsTable({
  rows,
}: {
  rows: Array<{ id: string; eventType: string; slug: string | null; email: string | null; createdAt: Date }>;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-text-muted">
            <th className="px-2 py-2 font-medium">Event</th>
            <th className="px-2 py-2 font-medium">Slug</th>
            <th className="px-2 py-2 font-medium">Email</th>
            <th className="px-2 py-2 font-medium">When</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-b border-border last:border-0">
              <td className="px-2 py-2 text-text-primary">{r.eventType}</td>
              <td className="px-2 py-2 text-text-muted">{r.slug ?? "—"}</td>
              <td className="px-2 py-2 text-text-muted">{r.email ?? "—"}</td>
              <td className="px-2 py-2 text-text-muted">
                {r.createdAt.toISOString().slice(0, 16).replace("T", " ")} UTC
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}