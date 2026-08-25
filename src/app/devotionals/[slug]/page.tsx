import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Card } from "@/components/ui/card";
import { ErrorState } from "@/components/ui/error-state";
import { AccessGate } from "@/components/devotionals/access-gate";
import { AntiScreenshot } from "@/components/devotionals/anti-screenshot";
import { AccessPasswordFallback } from "@/components/devotionals/access-password-fallback";
import { getDevotionalBySlug, getDevotionalDays } from "@/lib/catalog";
import { getSiteSettings } from "@/config/site";
import { recordEvent } from "@/lib/audit";
import { clampInt } from "@/lib/utils";
import { formatPrice } from "@/config/defaults";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const devotional = await getDevotionalBySlug(slug);
  return { title: devotional?.title ?? "Devotional" };
}

export default async function DevotionalPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ reference?: string }>;
}) {
  const { slug } = await params;
  const { reference } = await searchParams;
  const { value: settings } = await getSiteSettings();

  let devotional: Devotional | null = null;
  let days: DevotionalDay[] = [];
  let loadError = false;
  try {
    devotional = await getDevotionalBySlug(slug);
    if (devotional) {
      days = await getDevotionalDays(devotional.id).catch(() => []);
    }
  } catch {
    loadError = true;
  }

  if (loadError) {
    return (
      <div className="page-shell">
        <ErrorState
          title="Could not load this devotional"
          message="The devotional is temporarily unavailable. Please try again shortly."
        />
      </div>
    );
  }

  if (!devotional) notFound();

  // Fire-and-forget analytics (never blocks render).
  recordEvent({ eventType: "devotional.open", slug: devotional.slug }).catch(() => undefined);

  const previewDays = clampInt(devotional.previewDays > 0 ? devotional.previewDays : settings.freePreviewDays, 0, days.length);
  const visibleDays = days.slice(0, previewDays);
  const hasAccessControl = devotional.priceMinor > 0 && days.length > previewDays;

  return (
    <AntiScreenshot enabled={settings.antiScreenshotEnabled}>
      <div className="page-shell section-gap">
        <section className="flex-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold text-text-primary">{devotional.title}</h1>
            {devotional.subtitle && <p className="mt-2 text-text-muted">{devotional.subtitle}</p>}
          </div>
          {devotional.priceMinor > 0 && (
            <span className="rounded-lg bg-surface px-4 py-2 text-lg font-semibold text-text-primary">
              {formatPrice(devotional.priceMinor, devotional.currency)}
            </span>
          )}
        </section>

        {devotional.description && (
          <p className="max-w-2xl text-text-muted">{devotional.description}</p>
        )}

        {days.length === 0 ? (
          <ErrorState
            title="No content yet"
            message="This devotional has not been published yet. Check back soon."
          />
        ) : (
          <div className="section-gap">
            <section className="space-y-6">
              {visibleDays.map((day) => (
                <article key={day.id} className="rounded-xl border border-border bg-surface p-6">
                  <h2 className="mb-2 text-xl font-semibold text-text-primary">
                    Day {day.dayNumber} — {day.title}
                  </h2>
                  <div className="prose-devotional">{day.content}</div>
                  {day.sermonUrl && (
                    <div className="mt-4 aspect-video overflow-hidden rounded-lg">
                      <iframe
                        src={day.sermonUrl}
                        title={`Day ${day.dayNumber} sermon`}
                        className="h-full w-full"
                        loading="lazy"
                      />
                    </div>
                  )}
                  {day.contentFileUrl && (
                    <a
                      href={day.contentFileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-4 inline-flex items-center gap-2 text-sm text-primary hover:underline"
                    >
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      <span>View/download content file (PDF/DOCX)</span>
                    </a>
                  )}
                </article>
              ))}
            </section>

            {reference && devotional.priceMinor > 0 && (
              <AccessPasswordFallback reference={reference} devotionalSlug={devotional.title} />
            )}

            {hasAccessControl && <AccessGate devotional={devotional} settings={settings} />}
            {hasAccessControl === false && (
              <Card className="text-center">
                <p className="text-sm text-text-muted">All {days.length} days are available for free.</p>
              </Card>
            )}
          </div>
        )}
      </div>
    </AntiScreenshot>
  );
}