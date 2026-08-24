import type { Metadata } from "next";
import { desc, sql } from "drizzle-orm";
import { queryWithTimeout } from "@/data/db";
import { auditLogs } from "@/data/db/schema";
import { getAdminSession } from "@/lib/admin-auth";
import { clampInt } from "@/lib/utils";
import { ErrorState } from "@/components/ui/error-state";
import { RecordsTable, type TableColumn } from "@/components/admin/records-table";

export const metadata: Metadata = { title: "Admin — Audit log" };
export const dynamic = "force-dynamic";

const PAGE_SIZE = 25;

interface AuditRow {
  id: string;
  actor: string;
  action: string;
  entity: string;
  entityId: string;
  created: string;
}

export default async function AuditLogPage({
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

  let rows: AuditRow[] = [];
  let total = 0;
  let error = false;
  try {
    const [result, count] = await Promise.all([
      queryWithTimeout((db) =>
        db
          .select({
            id: auditLogs.id,
            actor: auditLogs.actor,
            action: auditLogs.action,
            entity: auditLogs.entity,
            entityId: auditLogs.entityId,
            created: auditLogs.createdAt,
          })
          .from(auditLogs)
          .orderBy(desc(auditLogs.createdAt))
          .limit(PAGE_SIZE)
          .offset((page - 1) * PAGE_SIZE)
      ),
      queryWithTimeout((db) => db.select({ n: sql<number>`count(*)::int` }).from(auditLogs)),
    ]);
    rows = result.map((r) => ({
      id: r.id,
      actor: r.actor,
      action: r.action,
      entity: r.entity,
      entityId: r.entityId,
      created: r.created.toISOString().slice(0, 16).replace("T", " "),
    }));
    total = count[0]?.n ?? 0;
  } catch {
    error = true;
  }

  const columns: TableColumn<AuditRow>[] = [
    { key: "created", header: "When" },
    { key: "actor", header: "Actor" },
    { key: "action", header: "Action" },
    { key: "entity", header: "Entity" },
    { key: "entityId", header: "Entity ID" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Audit log</h1>
        <p className="text-sm text-text-muted">
          Every state-changing action on the platform, newest first.
        </p>
      </div>
      {error ? (
        <ErrorState title="Could not load the audit log" message="Records could not be fetched." />
      ) : (
        <RecordsTable
          columns={columns}
          rows={rows}
          rowKey={(r) => r.id}
          page={page}
          pageSize={PAGE_SIZE}
          total={total}
          basePath="/admin/records/audit"
          emptyMessage="No audit entries recorded yet."
        />
      )}
    </div>
  );
}