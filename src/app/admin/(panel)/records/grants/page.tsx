import type { Metadata } from "next";
import { eq, desc, sql } from "drizzle-orm";
import { queryWithTimeout } from "@/data/db";
import { accessGrants, devotionals } from "@/data/db/schema";
import { getAdminSession } from "@/lib/admin-auth";
import { clampInt } from "@/lib/utils";
import { ErrorState } from "@/components/ui/error-state";
import { RecordsTable, type TableColumn } from "@/components/admin/records-table";

export const metadata: Metadata = { title: "Admin — Access grants" };
export const dynamic = "force-dynamic";

const PAGE_SIZE = 20;

interface GrantRow {
  id: string;
  email: string;
  devotional: string;
  status: string;
  password: string;
  granted: string;
  expires: string;
}

export default async function AccessGrantsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const admin = await getAdminSession();
  if (!admin) {
    return <ErrorState title="Access denied" message="Sign in to view records." />;
  }

  const params = await searchParams;
  const page = clampInt(Number(params.page ?? 1) || 1, 1, 1_000_000);

  let rows: GrantRow[] = [];
  let total = 0;
  let error = false;
  try {
    const [result, count] = await Promise.all([
      queryWithTimeout((db) =>
        db
          .select({
            id: accessGrants.id,
            email: accessGrants.email,
            devotionalTitle: devotionals.title,
            devotionalSlug: devotionals.slug,
            status: accessGrants.status,
            password: accessGrants.accessPassword,
            granted: accessGrants.grantedAt,
            expires: accessGrants.expiresAt,
          })
          .from(accessGrants)
          .leftJoin(devotionals, eq(accessGrants.devotionalId, devotionals.id))
          .orderBy(desc(accessGrants.grantedAt))
          .limit(PAGE_SIZE)
          .offset((page - 1) * PAGE_SIZE)
      ),
      queryWithTimeout((db) => db.select({ n: sql<number>`count(*)::int` }).from(accessGrants)),
    ]);
    rows = result.map((r) => ({
      id: r.id,
      email: r.email,
      devotional: r.devotionalTitle || r.devotionalSlug || "—",
      status: r.status,
      password: r.password,
      granted: r.granted.toISOString().slice(0, 16).replace("T", " "),
      expires: r.expires ? r.expires.toISOString().slice(0, 10) : "—",
    }));
    total = count[0]?.n ?? 0;
  } catch {
    error = true;
  }

  const columns: TableColumn<GrantRow>[] = [
    { key: "email", header: "Email" },
    { key: "devotional", header: "Devotional" },
    { key: "status", header: "Status" },
    {
      key: "password",
      header: "Access password",
      render: (r) => <span className="font-mono">{r.password}</span>,
    },
    { key: "granted", header: "Granted" },
    { key: "expires", header: "Expires" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Access grants</h1>
        <p className="text-sm text-text-muted">
          Access passwords delivered after verified payments, newest first.
        </p>
      </div>
      {error ? (
        <ErrorState title="Could not load access grants" message="Records could not be fetched." />
      ) : (
        <RecordsTable
          columns={columns}
          rows={rows}
          rowKey={(r) => r.id}
          page={page}
          pageSize={PAGE_SIZE}
          total={total}
          basePath="/admin/records/grants"
          emptyMessage="No access grants recorded yet."
        />
      )}
    </div>
  );
}