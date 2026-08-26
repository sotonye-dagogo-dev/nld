import type { Metadata } from "next";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Pagination } from "@/components/ui/pagination";
import { DevotionalCard } from "@/components/devotionals/devotional-card";
import { getPublishedDevotionals } from "@/lib/catalog";
import { getSiteSettings } from "@/config/site";
import { clampInt } from "@/lib/utils";
import { recordEvent } from "@/lib/audit";

export const metadata: Metadata = {
  title: "Devotionals",
};

export const dynamic = "force-dynamic";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const params = await searchParams;
  const page = clampInt(Number(params.page ?? 1) || 1, 1, 1_000_000);
  const { value: settings } = await getSiteSettings();

  let result;
  let error = false;
  try {
    result = await getPublishedDevotionals(page);
  } catch {
    error = true;
  }

  // Fire-and-forget analytics (never blocks render).
  recordEvent({ eventType: "page.view", meta: { path: "/", page } }).catch(() => undefined);

  return (
    <div className="page-shell section-gap animate-fade-in">
      <section className="mb-8">
        <h1 className="text-4xl font-bold text-text-primary tracking-tight">{settings.platformName}</h1>
        {settings.tagline && <p className="mt-3 text-lg text-text-muted">{settings.tagline}</p>}
      </section>

      {error ? (
        <ErrorState
          title="Could not load devotionals"
          message="The devotional catalog is temporarily unavailable. Please try again shortly."
        />
      ) : result && result.rows.length === 0 ? (
        <EmptyState
          title="No devotionals yet"
          description="Devotionals uploaded by the platform team will appear here."
        />
      ) : result ? (
        <>
          <section className="devotional-grid" role="list">
            {result.rows.map((devotional) => (
              <DevotionalCard key={devotional.id} devotional={devotional} />
            ))}
          </section>
          <Pagination
            page={result.page}
            pageSize={result.pageSize}
            total={result.total}
            hrefForPage={(p) => `/?page=${p}`}
            className="mt-10"
          />
        </>
      ) : null}
    </div>
  );
}