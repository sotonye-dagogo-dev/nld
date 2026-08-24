import type { Metadata } from "next";
import { eq, desc, sql } from "drizzle-orm";
import { queryWithTimeout } from "@/data/db";
import { purchases, devotionals } from "@/data/db/schema";
import { getAdminSession } from "@/lib/admin-auth";
import { clampInt } from "@/lib/utils";
import { formatPrice } from "@/config/defaults";
import { ErrorState } from "@/components/ui/error-state";
import { RecordsTable, type TableColumn } from "@/components/admin/records-table";

export const metadata: Metadata = { title: "Admin — Payments" };
export const dynamic = "force-dynamic";

const PAGE_SIZE = 20;

interface PaymentRow {
  id: string;
  email: string;
  devotional: string;
  amount: string;
  currency: string;
  status: string;
  reference: string;
  created: string;
}

export default async function PaymentsPage({
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

  let rows: PaymentRow[] = [];
  let total = 0;
  let error = false;
  try {
    const [result, count] = await Promise.all([
      queryWithTimeout((db) =>
        db
          .select({
            id: purchases.id,
            email: purchases.email,
            devotionalTitle: devotionals.title,
            devotionalSlug: devotionals.slug,
            amountMinor: purchases.amountMinor,
            currency: purchases.currency,
            status: purchases.status,
            reference: purchases.paystackReference,
            created: purchases.createdAt,
          })
          .from(purchases)
          .leftJoin(devotionals, eq(purchases.devotionalId, devotionals.id))
          .orderBy(desc(purchases.createdAt))
          .limit(PAGE_SIZE)
          .offset((page - 1) * PAGE_SIZE)
      ),
      queryWithTimeout((db) => db.select({ n: sql<number>`count(*)::int` }).from(purchases)),
    ]);
    rows = result.map((r) => ({
      id: r.id,
      email: r.email,
      devotional: r.devotionalTitle || r.devotionalSlug || "—",
      amount: formatPrice(r.amountMinor, r.currency),
      currency: r.currency,
      status: r.status,
      reference: r.reference,
      created: r.created.toISOString().slice(0, 16).replace("T", " "),
    }));
    total = count[0]?.n ?? 0;
  } catch {
    error = true;
  }

  const columns: TableColumn<PaymentRow>[] = [
    { key: "email", header: "Email" },
    { key: "devotional", header: "Devotional" },
    { key: "amount", header: "Amount" },
    { key: "status", header: "Status" },
    { key: "reference", header: "Reference" },
    { key: "created", header: "Created" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Payments</h1>
        <p className="text-sm text-text-muted">All Paystack purchase records, newest first.</p>
      </div>
      {error ? (
        <ErrorState title="Could not load payments" message="Records could not be fetched." />
      ) : (
        <RecordsTable
          columns={columns}
          rows={rows}
          rowKey="id"
          page={page}
          pageSize={PAGE_SIZE}
          total={total}
          basePath="/admin/records/payments"
          emptyMessage="No payments recorded yet."
        />
      )}
    </div>
  );
}