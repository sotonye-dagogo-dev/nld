import type { Metadata } from "next";
import { AccessEntry } from "@/components/access/access-entry";
import { BankTransferStatus } from "@/components/access/bank-transfer-status";
import { recordEvent } from "@/lib/audit";

export const metadata: Metadata = {
  title: "Unlock your devotional",
};
export const dynamic = "force-dynamic";

export default async function AccessPage({ searchParams }: { searchParams: Promise<{ transferId?: string }> }) {
  const params = await searchParams;
  const transferId = params.transferId;

  // Fire-and-forget analytics (never blocks render).
  recordEvent({ eventType: "page.view", meta: { path: "/access" } }).catch(() => undefined);

  return (
    <div className="page-shell space-y-6">
      {transferId && <BankTransferStatus transferId={transferId} />}
      <AccessEntry />
    </div>
  );
}