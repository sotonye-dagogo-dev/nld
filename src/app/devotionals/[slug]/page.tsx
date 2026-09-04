import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ErrorState } from "@/components/ui/error-state";
import { AntiScreenshot } from "@/components/devotionals/anti-screenshot";
import { DevotionalPageClient } from "@/components/devotionals/devotional-page-client";
import { getDevotionalBySlug, getDevotionalDays } from "@/lib/catalog";
import { getSiteSettings } from "@/config/site";
import { recordEvent } from "@/lib/audit";
import { clampInt } from "@/lib/utils";
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
  searchParams: Promise<{ reference?: string; trxref?: string; trxRef?: string }>;
}) {
  const { slug } = await params;
  const sp = await searchParams;
  const reference = sp.reference ?? sp.trxref ?? sp.trxRef;
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

  return (
    <AntiScreenshot enabled={settings.antiScreenshotEnabled}>
      <div className="page-shell animate-fade-in">
        <DevotionalPageClient
          devotional={devotional}
          days={days}
          settings={settings}
          previewDays={previewDays}
          reference={reference}
        />
      </div>
    </AntiScreenshot>
  );
}