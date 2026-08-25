import type { Metadata } from "next";
import { eq, desc, sql } from "drizzle-orm";
import { queryWithTimeout } from "@/data/db";
import { bankTransfers, devotionals, bankAccounts } from "@/data/db/schema";
import { getAdminSession } from "@/lib/admin-auth";
import { clampInt } from "@/lib/utils";
import { formatPrice } from "@/config/defaults";
import { ErrorState } from "@/components/ui/error-state";
import { RecordsTable, type TableColumn } from "@/components/admin/records-table";

export const metadata: Metadata = { title: "Admin — Bank Transfers" };
export const dynamic = "force-dynamic";

const PAGE_SIZE = 20;

interface BankTransferRow {
  id: string;
  email: string;
  devotional: string;
  amount: string;
  currency: string;
  bankName: string;
  accountName: string;
  reference: string;
  status: string;
  created: string;
}

export default async function BankTransfersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; transferId?: string }>;
}) {
  const admin = await getAdminSession();
  if (!admin) {
    return <ErrorState title="Access denied" message="Sign in to view records." />;
  }

  const params = await searchParams;
  const page = clampInt(Number(params.page ?? 1) || 1, 1, 1_000_000);
  const highlightTransferId = params.transferId;

  let rows: BankTransferRow[] = [];
  let total = 0;
  let error = false;
  try {
    const [result, count] = await Promise.all([
      queryWithTimeout((db) =>
        db
          .select({
            id: bankTransfers.id,
            email: bankTransfers.email,
            devotionalTitle: devotionals.title,
            devotionalSlug: devotionals.slug,
            amountMinor: bankTransfers.amountMinor,
            currency: bankTransfers.currency,
            bankName: bankAccounts.bankName,
            accountName: bankAccounts.accountName,
            reference: bankTransfers.reference,
            status: bankTransfers.status,
            created: bankTransfers.createdAt,
          })
          .from(bankTransfers)
          .leftJoin(devotionals, eq(bankTransfers.devotionalId, devotionals.id))
          .leftJoin(bankAccounts, eq(bankTransfers.bankAccountId, bankAccounts.id))
          .orderBy(desc(bankTransfers.createdAt))
          .limit(PAGE_SIZE)
          .offset((page - 1) * PAGE_SIZE)
      ),
      queryWithTimeout((db) => db.select({ n: sql<number>`count(*)::int` }).from(bankTransfers)),
    ]);
    rows = result.map((r) => ({
      id: r.id,
      email: r.email,
      devotional: r.devotionalTitle || r.devotionalSlug || "—",
      amount: formatPrice(r.amountMinor, r.currency),
      currency: r.currency,
      bankName: r.bankName || "—",
      accountName: r.accountName || "—",
      reference: r.reference,
      status: r.status,
      created: r.created.toISOString().slice(0, 16).replace("T", " "),
    }));
    total = count[0]?.n ?? 0;
  } catch {
    error = true;
  }

  const columns: TableColumn<BankTransferRow>[] = [
    { key: "email", header: "Email" },
    { key: "devotional", header: "Devotional" },
    { key: "amount", header: "Amount" },
    { key: "bankName", header: "Bank" },
    { key: "accountName", header: "Account" },
    { key: "reference", header: "Reference" },
    { key: "status", header: "Status" },
    { key: "created", header: "Created" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Bank Transfers</h1>
        <p className="text-sm text-text-muted">User-submitted bank transfer proofs awaiting verification.</p>
      </div>
      {error ? (
        <ErrorState title="Could not load bank transfers" message="Records could not be fetched." />
      ) : (
        <RecordsTable
          columns={columns}
          rows={rows}
          rowKey="id"
          page={page}
          pageSize={PAGE_SIZE}
          total={total}
          basePath="/admin/records/bank-transfers"
          emptyMessage="No bank transfers recorded yet."
        />
      )}
    </div>
  );
}