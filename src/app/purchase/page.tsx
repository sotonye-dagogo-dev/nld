import type { Metadata } from "next";
import Link from "next/link";
import { Package, Sparkles } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { DevotionalCard } from "@/components/devotionals/devotional-card";
import { getPurchasableDevotionals } from "@/lib/catalog";
import { getSiteSettings } from "@/config/site";
import { recordEvent } from "@/lib/audit";
import { formatPrice } from "@/config/defaults";

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
        <>
          {/* Bundle: All devotionals — config-driven */}
          {devotionals.length > 1 && (
            <section className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 via-surface to-background p-6 shadow-sm">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-background shrink-0">
                    <Package className="h-5 w-5" aria-hidden />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-text-primary flex items-center gap-2">
                      All Devotionals Bundle <Sparkles className="h-4 w-4 text-primary" aria-hidden />
                    </h2>
                    <p className="mt-1 text-sm text-text-muted">
                      One purchase unlocks every published devotional ({devotionals.length} titles) —{" "}
                      <span className="font-medium text-text-primary">
                        {formatPrice(
                          devotionals.reduce((s, d) => s + d.priceMinor, 0),
                          devotionals[0].currency,
                        )}
                      </span>{" "}
                      total. Access mode: <span className="font-medium">{settings.accessMode === "one-time" ? "forever" : settings.accessMode === "monthly" ? "30 days" : "60 days"}</span>.
                    </p>
                  </div>
                </div>
                <Link
                  href="/purchase/all"
                  className="inline-flex items-center justify-center rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-background hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary shrink-0"
                >
                  Purchase Bundle
                </Link>
              </div>
            </section>
          )}
          <section className="devotional-grid" role="list">
            {devotionals.map((devotional) => (
              <DevotionalCard key={devotional.id} devotional={devotional} />
            ))}
          </section>
        </>
      )}
    </div>
  );
}