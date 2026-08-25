import type { Metadata } from "next";
import { eq } from "drizzle-orm";
import { queryWithTimeout } from "@/data/db";
import { bankTransfers, devotionals, bankAccounts } from "@/data/db/schema";
import { getAdminSession } from "@/lib/admin-auth";
import { formatPrice } from "@/config/defaults";
import { ErrorState } from "@/components/ui/error-state";
import { BankTransferActions } from "./bank-transfer-actions";

export const metadata: Metadata = { title: "Admin — Bank Transfer Details" };
export const dynamic = "force-dynamic";

interface TransferDetail {
  id: string;
  email: string;
  devotionalId: string;
  devotionalTitle: string | null;
  devotionalSlug: string | null;
  amountMinor: number;
  currency: string;
  bankName: string | null;
  accountName: string | null;
  accountNumber: string | null;
  sortCode: string | null;
  swiftCode: string | null;
  instructions: string | null;
  reference: string;
  proofUrl: string;
  status: string;
  createdAt: Date;
  rejectionReason: string | null;
}

async function fetchTransfer(transferId: string): Promise<TransferDetail | null> {
  try {
    const result = await queryWithTimeout((db) =>
      db
        .select({
          id: bankTransfers.id,
          email: bankTransfers.email,
          devotionalId: bankTransfers.devotionalId,
          devotionalTitle: devotionals.title,
          devotionalSlug: devotionals.slug,
          amountMinor: bankTransfers.amountMinor,
          currency: bankTransfers.currency,
          bankName: bankAccounts.bankName,
          accountName: bankAccounts.accountName,
          accountNumber: bankAccounts.accountNumber,
          sortCode: bankAccounts.sortCode,
          swiftCode: bankAccounts.swiftCode,
          instructions: bankAccounts.instructions,
          reference: bankTransfers.reference,
          proofUrl: bankTransfers.proofUrl,
          status: bankTransfers.status,
          createdAt: bankTransfers.createdAt,
          rejectionReason: bankTransfers.rejectionReason,
        })
        .from(bankTransfers)
        .leftJoin(devotionals, eq(bankTransfers.devotionalId, devotionals.id))
        .leftJoin(bankAccounts, eq(bankTransfers.bankAccountId, bankAccounts.id))
        .where(eq(bankTransfers.id, transferId))
        .limit(1)
    );
    return result[0] ?? null;
  } catch {
    return null;
  }
}

export default async function BankTransferDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const admin = await getAdminSession();
  if (!admin) {
    return <ErrorState title="Access denied" message="Sign in to view records." />;
  }

  const { id } = await params;
  const transfer = await fetchTransfer(id);

  if (!transfer) {
    return <ErrorState title="Not found" message="Bank transfer not found." />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Bank Transfer Details</h1>
          <p className="text-sm text-text-muted">Review and verify the submitted proof of payment.</p>
        </div>
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${
            transfer.status === "verified"
              ? "bg-success/10 text-success"
              : transfer.status === "rejected"
              ? "bg-danger/10 text-danger"
              : "bg-warning/10 text-warning"
          }`}
        >
          {transfer.status === "verified" && <CheckCircle className="h-3 w-3" />}
          {transfer.status === "rejected" && <XCircle className="h-3 w-3" />}
          {transfer.status === "pending" && <AlertCircle className="h-3 w-3" />}
          {transfer.status.charAt(0).toUpperCase() + transfer.status.slice(1)}
        </span>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <h3 className="mb-4 text-lg font-semibold text-text-primary">Purchaser Details</h3>
          <dl className="space-y-3 text-sm">
            <div>
              <dt className="text-text-muted">Email</dt>
              <dd className="text-text-primary">{transfer.email}</dd>
            </div>
            <div>
              <dt className="text-text-muted">Devotional</dt>
              <dd className="text-text-primary">{transfer.devotionalTitle} ({transfer.devotionalSlug})</dd>
            </div>
            <div>
              <dt className="text-text-muted">Amount</dt>
              <dd className="text-text-primary">{formatPrice(transfer.amountMinor, transfer.currency)}</dd>
            </div>
            <div>
              <dt className="text-text-muted">Currency</dt>
              <dd className="text-text-primary">{transfer.currency}</dd>
            </div>
            <div>
              <dt className="text-text-muted">Transfer Reference</dt>
              <dd className="font-mono text-text-primary">{transfer.reference}</dd>
            </div>
            <div>
              <dt className="text-text-muted">Submitted</dt>
              <dd className="text-text-primary">{transfer.createdAt.toISOString().slice(0, 16).replace("T", " ")} UTC</dd>
            </div>
          </dl>
        </Card>

        <Card>
          <h3 className="mb-4 text-lg font-semibold text-text-primary">Bank Account Details</h3>
          <dl className="space-y-3 text-sm">
            <div>
              <dt className="text-text-muted">Bank</dt>
              <dd className="text-text-primary">{transfer.bankName}</dd>
            </div>
            <div>
              <dt className="text-text-muted">Account Name</dt>
              <dd className="text-text-primary">{transfer.accountName}</dd>
            </div>
            <div>
              <dt className="text-text-muted">Account Number</dt>
              <dd className="font-mono text-text-primary">{transfer.accountNumber}</dd>
            </div>
            {transfer.sortCode && (
              <div>
                <dt className="text-text-muted">Sort Code</dt>
                <dd className="font-mono text-text-primary">{transfer.sortCode}</dd>
              </div>
            )}
            {transfer.swiftCode && (
              <div>
                <dt className="text-text-muted">SWIFT Code</dt>
                <dd className="font-mono text-text-primary">{transfer.swiftCode}</dd>
              </div>
            )}
            {transfer.instructions && (
              <div>
                <dt className="text-text-muted">Instructions</dt>
                <dd className="text-text-primary">{transfer.instructions}</dd>
              </div>
            )}
          </dl>
        </Card>
      </div>

      <Card>
        <h3 className="mb-4 text-lg font-semibold text-text-primary">Proof of Payment</h3>
        <div className="max-w-md">
          <Image
            src={transfer.proofUrl}
            alt="Proof of payment"
            width={600}
            height={400}
            className="rounded-lg border border-border"
          />
        </div>
        {transfer.status === "rejected" && transfer.rejectionReason && (
          <div className="mt-4 p-3 rounded-lg bg-danger/10 border border-danger/20 text-danger text-sm">
            <strong>Rejection reason:</strong> {transfer.rejectionReason}
          </div>
        )}
      </Card>

      {transfer.status === "pending" && <BankTransferActions transferId={transfer.id} />}
    </div>
  );
}

import { CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import Image from "next/image";