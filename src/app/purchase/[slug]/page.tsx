import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ErrorState } from "@/components/ui/error-state";
import { PurchaseCheckout } from "@/components/devotionals/purchase-checkout";
import { getDevotionalBySlug } from "@/lib/catalog";
import { getSiteSettings } from "@/config/site";
import { recordEvent } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const devotional = await getDevotionalBySlug(slug);
  return { title: devotional ? `Purchase — ${devotional.title}` : "Purchase" };
}

export default async function PurchasePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { value: settings } = await getSiteSettings();
  const devotional = await getDevotionalBySlug(slug);

  if (!devotional) notFound();
  if (devotional.priceMinor <= 0) {
    return (
      <div className="page-shell">
        <ErrorState
          title="This devotional is free"
          message="No purchase is needed — open it directly from the listing."
        />
      </div>
    );
  }

  // Fire-and-forget analytics (never blocks render).
  recordEvent({ eventType: "page.view", slug: devotional.slug, meta: { path: "/purchase" } }).catch(
    () => undefined,
  );

  return (
    <div className="page-shell">
      <PurchaseCheckout devotional={devotional} settings={settings} />
    </div>
  );
}