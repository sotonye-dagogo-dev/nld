import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ErrorState } from "@/components/ui/error-state";
import { PurchaseCheckout } from "@/components/devotionals/purchase-checkout";
import { getDevotionalBySlug, getPurchasableDevotionals } from "@/lib/catalog";
import { getSiteSettings } from "@/config/site";
import { recordEvent } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  if (slug === "all") return { title: "Purchase — All Devotionals Bundle" };
  const devotional = await getDevotionalBySlug(slug).catch(() => null);
  return { title: devotional ? `Purchase — ${devotional.title}` : "Purchase" };
}

export default async function PurchasePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { value: settings } = await getSiteSettings();

  const isBundle = slug === "all";

  if (isBundle) {
    let purchasables: Devotional[] = [];
    let loadError = false;
    try {
      purchasables = await getPurchasableDevotionals();
    } catch {
      loadError = true;
    }
    if (loadError) {
      return (
        <div className="page-shell">
          <ErrorState title="Could not load devotionals" message="The checkout is temporarily unavailable. Please try again shortly." />
        </div>
      );
    }
    if (purchasables.length === 0) {
      return (
        <div className="page-shell">
          <ErrorState title="No purchasable devotionals" message="All devotionals are currently free." />
        </div>
      );
    }
    const totalMinor = purchasables.reduce((s, d) => s + d.priceMinor, 0);
    const currency = purchasables[0].currency;
    // Synthetic devotional for bundle checkout (uses first devotional's id as anchor)
    const bundleDevotional: Devotional = {
      id: purchasables[0].id,
      slug: "all",
      title: "All Devotionals Bundle",
      subtitle: `${purchasables.length} titles`,
      description: `One purchase unlocks every published devotional (${purchasables.length} titles).`,
      coverUrl: purchasables[0].coverUrl,
      priceMinor: totalMinor,
      currency,
      accessMode: settings.accessMode,
      previewDays: 0,
      status: "published",
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    recordEvent({ eventType: "page.view", slug: "all", meta: { path: "/purchase/all" } }).catch(() => undefined);
    return (
      <div className="page-shell">
        <PurchaseCheckout devotional={bundleDevotional} settings={settings} isBundle />
      </div>
    );
  }

  let devotional: Devotional | null = null;
  let loadError = false;
  try {
    devotional = await getDevotionalBySlug(slug);
  } catch {
    loadError = true;
  }

  if (loadError) {
    return (
      <div className="page-shell">
        <ErrorState
          title="Could not load this devotional"
          message="The checkout is temporarily unavailable. Please try again shortly."
        />
      </div>
    );
  }

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
