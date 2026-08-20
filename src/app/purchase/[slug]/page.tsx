import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ErrorState } from "@/components/ui/error-state";
import { PurchaseCheckout } from "@/components/devotionals/purchase-checkout";
import { getDevotionalBySlug } from "@/lib/catalog";
import { getSiteSettings } from "@/config/site";

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

  return (
    <div className="page-shell">
      <PurchaseCheckout devotional={devotional} settings={settings} />
    </div>
  );
}