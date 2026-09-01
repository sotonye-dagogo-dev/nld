import type { Metadata } from "next";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { DevotionalCard } from "@/components/devotionals/devotional-card";
import { getPurchasableDevotionals } from "@/lib/catalog";
import { getSiteSettings } from "@/config/site";
import { recordEvent } from "@/lib/audit";

export const metadata: Metadata = {
  title: "Purchase Devotionals",
};

export const dynamic = "force-dynamic";

export default async function PurchaseListingPage() {
  const { value: settings } = await getSiteSettings();

  let devotionals: Devotional[] = [];
  let error = false;
  try {
    devotionals = await getPurchasableDevotionals();
  } catch {
    error = true;
  }

  // Fire-and-forget analytics (never blocks render).
  recordEvent({ eventType: "page.view", meta: { path: "/purchase" } }).catch(() => undefined);

  if (!settings.paymentsEnabled) {
    return (
      <div className="page-shell section-gap animate-fade-in">
        <section className="mb-8">
          <h1 className="text-4xl font-bold text-text-primary tracking-tight">Purchase Devotionals</h1>
          <p className="mt-3 text-lg text-text-muted">Browse and purchase access to premium devotionals.</p>
        </section>
        <ErrorState
          title="Payments temporarily disabled"
          message="Purchase functionality is currently unavailable. Please check back soon."
        />
      </div>
    );
  }

  return (
    <div className="page-shell section-gap animate-fade-in">
      <section className="mb-8">
        <h1 className="text-4xl font-bold text-text-primary tracking-tight">Purchase Devotionals</h1>
        <p className="mt-3 text-lg text-text-muted">Browse and purchase access to premium devotionals. Your access password will be emailed after payment.</p>
      </section>

      {error ? (
        <ErrorState
          title="Could not load devotionals"
          message="The purchase catalog is temporarily unavailable. Please try again shortly."
        />
      ) : devotionals.length === 0 ? (
        <EmptyState
          title="No purchasable devotionals yet"
          description="All published devotionals are currently free. Check back later for premium content."
        />
      ) : (
        <section className="devotional-grid" role="list">
          {devotionals.map((devotional) => (
            <DevotionalCard key={devotional.id} devotional={devotional} />
          ))}
        </section>
      )}
    </div>
  );
}