import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Card } from "@/components/ui/card";
import { ErrorState } from "@/components/ui/error-state";
import { AccessGate } from "@/components/devotionals/access-gate";
import { AntiScreenshot } from "@/components/devotionals/anti-screenshot";
import { AccessPasswordFallback } from "@/components/devotionals/access-password-fallback";
import { ContentReader, truncateForPreview, MAX_PREVIEW_CHARS } from "@/components/devotionals/content-reader";
import { getDevotionalBySlug, getDevotionalDays } from "@/lib/catalog";
import { getSiteSettings } from "@/config/site";
import { recordEvent } from "@/lib/audit";
import { clampInt } from "@/lib/utils";
import { formatPrice } from "@/config/defaults";
import { generateDevotionalMetadata } from "@/lib/metadata";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  try {
    const devotional = await getDevotionalBySlug(slug);
    const { value: settings } = await getSiteSettings();
    if (!devotional) return { title: "Devotional Not Found" };
    return generateDevotionalMetadata(devotional, settings);
  } catch {
    return { title: "Devotional" };
  }
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
      <div className="page-shell section-gap animate-fade-in">
        <section className="flex-between flex-wrap gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-text-primary">{devotional.title}</h1>
            {devotional.subtitle && <p className="mt-2 text-text-muted">{devotional.subtitle}</p>}
          </div>
          {devotional.priceMinor > 0 && (
            <div className="flex items-center gap-3 shrink-0">
              <span className="rounded-lg bg-surface px-4 py-2 text-lg font-semibold text-text-primary border border-border">
                {formatPrice(devotional.priceMinor, devotional.currency)}
              </span>
              {settings.paymentsEnabled ? (
                <Link
                  href={`/purchase/${devotional.slug}`}
                  aria-label={`Purchase access to ${devotional.title}`}
                  className="rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 transition-colors"
                >
                  Purchase access
                </Link>
              ) : (
                <span
                  aria-disabled="true"
                  className="rounded-lg bg-text-muted px-5 py-2.5 text-sm font-semibold text-white opacity-60 cursor-not-allowed"
                >
                  Payments disabled
                </span>
              )}
            </div>
          )}
        </section>

        {devotional.description && (
          <p className="max-w-2xl text-text-muted mb-8">{devotional.description}</p>
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
                <article key={day.id} className="rounded-xl border border-border bg-surface p-6 animate-slide-up">
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
                      <div className="mt-4">
                        <ContentReader
                          fileUrl={day.contentFileUrl}
                          fileName={day.contentFileUrl.split("/").pop()?.split(".").slice(0, -1).join(".") || "Content"}
                          fileType={day.contentFileUrl.toLowerCase().endsWith(".pdf") ? "pdf" : "docx"}
                          maxPreviewChars={MAX_PREVIEW_CHARS}
                          hasFullAccess={!hasAccessControl}
                          upgradeHref={hasAccessControl ? "#access-gate" : undefined}
                        />
                      </div>
                    )}
                </article>
              ))}
            </section>

            {reference && devotional.priceMinor > 0 && (
              <AccessPasswordFallback reference={reference} devotionalSlug={devotional.title} />
            )}

            {hasAccessControl && (
              <AccessGate
                id="access-gate"
                devotional={devotional}
                settings={settings}
              />
            )}
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