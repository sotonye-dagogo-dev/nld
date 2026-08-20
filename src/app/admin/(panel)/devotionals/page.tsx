import type { Metadata } from "next";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { getDb } from "@/data/db";
import { devotionals } from "@/data/db/schema";
import { formatPrice } from "@/config/defaults";

export const metadata: Metadata = { title: "Admin — Devotionals" };
export const dynamic = "force-dynamic";

export default async function AdminDevotionalsPage() {
  let rows: Devotional[] | null = null;
  try {
    const db = getDb();
    const result = await db.select().from(devotionals).orderBy(devotionals.createdAt);
    rows = result as Devotional[];
  } catch {
    rows = null;
  }

  return (
    <div className="space-y-6">
      <div className="flex-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Devotionals</h1>
          <p className="text-sm text-text-muted">Upload and manage devotional content.</p>
        </div>
        <Link
          href="/admin/devotionals/new"
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover"
        >
          Upload devotional
        </Link>
      </div>

      {rows === null ? (
        <ErrorState title="Database unavailable" message="Devotionals could not be loaded." />
      ) : rows.length === 0 ? (
        <EmptyState
          title="No devotionals yet"
          description="Upload the first devotional to publish it to the platform."
          action={
            <Link
              href="/admin/devotionals/new"
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover"
            >
              Upload devotional
            </Link>
          }
        />
      ) : (
        <Card className="overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-background text-left text-text-muted">
                <th className="px-4 py-3 font-medium">Title</th>
                <th className="px-4 py-3 font-medium">Price</th>
                <th className="px-4 py-3 font-medium">Access</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Created</th>
                <th className="px-4 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((d) => (
                <tr key={d.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 font-medium text-text-primary">
                    <Link href={`/admin/devotionals/${d.id}`} className="hover:underline">
                      {d.title}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-text-muted">
                    {d.priceMinor > 0 ? formatPrice(d.priceMinor, d.currency) : "Free"}
                  </td>
                  <td className="px-4 py-3 text-text-muted">{d.accessMode}</td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-background px-2 py-0.5 text-xs text-text-muted">{d.status}</span>
                  </td>
                  <td className="px-4 py-3 text-text-muted">{d.createdAt.toISOString().slice(0, 10)}</td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/admin/devotionals/${d.id}`}
                      className="rounded-lg border border-border bg-surface px-3 py-1 text-xs text-text-muted hover:bg-background"
                    >
                      Edit
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}