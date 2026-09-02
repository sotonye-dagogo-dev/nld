import type { Metadata } from "next";
import { AccessEntry } from "@/components/access/access-entry";
import { BankTransferStatus } from "@/components/access/bank-transfer-status";
import { getPublishedDevotionals } from "@/lib/catalog";
import { recordEvent } from "@/lib/audit";

export const metadata: Metadata = {
  title: "Unlock your devotional",
};
export const dynamic = "force-dynamic";

export default async function AccessPage({ searchParams }: { searchParams: Promise<{ transferId?: string; slug?: string; password?: string; email?: string }> }) {
  const params = await searchParams;
  const transferId = params.transferId;

  // Fire-and-forget analytics (never blocks render).
  recordEvent({ eventType: "page.view", meta: { path: "/access" } }).catch(() => undefined);

  let devotionals: { slug: string; title: string }[] = [];
  try {
    const res = await getPublishedDevotionals(1, 100);
    devotionals = res.rows.map((d) => ({ slug: d.slug, title: d.title }));
  } catch {
    devotionals = [];
  }

  return (
    <div className="page-shell space-y-6">
      {transferId && <BankTransferStatus transferId={transferId} />}
      <AccessEntry devotionals={devotionals} initialSlug={params.slug} initialPassword={params.password} />
    </div>
  );
}