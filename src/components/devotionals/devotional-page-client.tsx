"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { ErrorState } from "@/components/ui/error-state";
import { AccessGate } from "@/components/devotionals/access-gate";
import { AccessPasswordFallback } from "@/components/devotionals/access-password-fallback";
import { ContentReader, MAX_PREVIEW_CHARS } from "@/components/devotionals/content-reader";
import { DevotionalPurchaseModal } from "@/components/devotionals/devotional-purchase-modal";
import { LockedCoverOverlay } from "@/components/devotionals/locked-cover-overlay";
import { formatPrice } from "@/config/defaults";
import { useToast } from "@/components/ui/toast";

interface Props {
  devotional: Devotional;
  days: DevotionalDay[];
  settings: SiteSettings;
  reference?: string;
  previewDays: number;
}

export function DevotionalPageClient({ devotional, days, settings, reference, previewDays }: Props) {
  const { toast } = useToast();
  const [unlockedDays, setUnlockedDays] = useState<DevotionalDay[] | null>(null);

  // Sync global Unlock modal (AccessEntry → /api/access/verify) with this page's reader:
  // when a password is verified in the navbar modal, the devotional page listener
  // auto-fetches the locked days via the devotional unlock endpoint and reveals the reader
  // without requiring a second form submission. Also hydrates from sessionStorage on mount
  // so a redirect from the modal still unlocks.
  useEffect(() => {
    if (unlockedDays !== null) return;
    async function doUnlock(email: string, password: string) {
      try {
        const res = await fetch(`/api/devotionals/${encodeURIComponent(devotional.slug)}/unlock`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: email.trim().toLowerCase(), password: password.trim() }),
        });
        const ct = res.headers.get("content-type") ?? "";
        let data: { ok: boolean; days?: DevotionalDay[]; error?: string } | null = null;
        if (ct.includes("application/json")) {
          try {
            data = (await res.json()) as { ok: boolean; days?: DevotionalDay[]; error?: string };
          } catch {
            return;
          }
        } else return;
        if (!res.ok || !data?.ok || !Array.isArray((data as { days?: unknown }).days)) return;
        setUnlockedDays((data as { days?: DevotionalDay[] }).days ?? []);
        toast("Access granted — opening your devotional!", "success");
        // clear one-time pending entry
        try {
          const raw = sessionStorage.getItem("nld:lastUnlock");
          if (raw) {
            const j = JSON.parse(raw) as { slug?: string };
            if (j.slug === devotional.slug) sessionStorage.removeItem("nld:lastUnlock");
          }
        } catch {}
      } catch {}
    }

    const onUnlockEvent = (e: Event) => {
      const detail = (e as CustomEvent<{ slug: string; email: string; password: string }>).detail;
      if (!detail || typeof detail.slug !== "string" || typeof detail.email !== "string" || typeof detail.password !== "string") return;
      if (detail.slug !== devotional.slug) return;
      void doUnlock(detail.email, detail.password);
    };
    window.addEventListener("nld:access-unlocked" as unknown as keyof WindowEventMap, onUnlockEvent as EventListener);

    // Hydrate from sessionStorage (covers modal → navigation without event propagation)
    try {
      const raw = sessionStorage.getItem("nld:lastUnlock");
      if (raw) {
        const parsed = JSON.parse(raw) as { slug: string; email: string; password: string; ts: number };
        if (parsed.slug === devotional.slug && typeof parsed.email === "string" && typeof parsed.password === "string") {
          const age = Date.now() - (parsed.ts ?? 0);
          if (age >= 0 && age < 10 * 60 * 1000) void doUnlock(parsed.email, parsed.password);
          else sessionStorage.removeItem("nld:lastUnlock");
        }
      }
    } catch {}

    return () => window.removeEventListener("nld:access-unlocked" as unknown as keyof WindowEventMap, onUnlockEvent as EventListener);
  }, [devotional.slug, unlockedDays, toast]);

  const visibleDays = days.slice(0, previewDays);
  const lockedDays = days.slice(previewDays);
  const devotionalAssetUrl = (devotional as Devotional & { assetUrl?: string | null }).assetUrl ?? null;
  const hasSingleAsset = Boolean(devotionalAssetUrl && typeof devotionalAssetUrl === "string" && devotionalAssetUrl.trim().length > 0);
  const assetFileType: "pdf" | "docx" = typeof devotionalAssetUrl === "string" && devotionalAssetUrl.toLowerCase().endsWith(".pdf") ? "pdf" : "docx";
  const assetFileName = (typeof devotionalAssetUrl === "string" ? devotionalAssetUrl.split("/").pop()?.split(".").slice(0, -1).join(".") : "") || devotional.title || "Devotional";
  const hasLockedDays = days.length > previewDays;
  const hasLockedAsset = hasSingleAsset && devotional.priceMinor > 0;
  // Access gate shown when there is any locked content (days beyond preview OR a paid single-file asset)
  const hasAccessControl = devotional.priceMinor > 0 && (hasLockedDays || hasLockedAsset);
  const isUnlocked = !!unlockedDays;
  // Asset is considered accessible when free or after successful unlock
  const assetHasFullAccess = !hasSingleAsset ? false : devotional.priceMinor === 0 || isUnlocked;

  return (
    <div className="section-gap">
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
            <DevotionalPurchaseModal devotional={devotional} settings={settings} onUnlock={setUnlockedDays} />
          </div>
        )}
      </section>

      {devotional.description && <p className="max-w-2xl text-text-muted mb-8">{devotional.description}</p>}

      {/* Single-asset devotional (no days) or hybrid — asset viewer with optional days
          The ContentReader's locked overlay is the single protected view (cover + watermark);
          no second blurred cover block is rendered when an asset is present. */}
      {hasSingleAsset && (
        <section className="mb-8">
          <ContentReader
            fileUrl={devotionalAssetUrl ?? ""}
            fileName={assetFileName}
            fileType={assetFileType}
            maxPreviewChars={MAX_PREVIEW_CHARS}
            hasFullAccess={assetHasFullAccess}
            coverUrl={devotional.coverUrl}
            upgradeHref={hasAccessControl && !isUnlocked ? "#access-gate" : undefined}
          />
          {hasLockedAsset && !isUnlocked && (
            <p className="mt-2 text-xs text-text-muted text-center">This file is protected — purchase access or enter your access code below to unlock.</p>
          )}
        </section>
      )}

      {days.length === 0 && !hasSingleAsset ? (
        <ErrorState title="No content yet" message="This devotional has not been published yet. Check back soon." />
      ) : days.length === 0 && hasSingleAsset ? (
        // Asset-only: gate and purchase are already handled above; still show fallback & gate
        <div className="section-gap">
          {reference && devotional.priceMinor > 0 && !isUnlocked && (
            <AccessPasswordFallback reference={reference} devotionalSlug={devotional.title} />
          )}
          {hasAccessControl && !isUnlocked && (
            <AccessGate id="access-gate" devotional={devotional} settings={settings} onUnlock={setUnlockedDays} />
          )}
          {hasAccessControl && isUnlocked && (
            <Card className="text-center">
              <p className="text-sm text-text-muted">You now have full access to this devotional.</p>
            </Card>
          )}
          {hasAccessControl === false && (
            <Card className="text-center">
              <p className="text-sm text-text-muted">This devotional is available for free.</p>
            </Card>
          )}
        </div>
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
                    <iframe src={day.sermonUrl} title={`Day ${day.dayNumber} sermon`} className="h-full w-full" loading="lazy" />
                  </div>
                )}
                {/* Per-day file viewer suppressed when a single asset houses the full devotional
                    (avoid duplicate PDF viewers and second cover-blur block) */}
                {day.contentFileUrl && !hasSingleAsset ? (
                  <div className="mt-4">
                    <ContentReader
                      fileUrl={day.contentFileUrl}
                      fileName={day.contentFileUrl.split("/").pop()?.split(".").slice(0, -1).join(".") || "Content"}
                      fileType={(day.contentFileUrl ?? "").toLowerCase().endsWith(".pdf") ? "pdf" : "docx"}
                      maxPreviewChars={MAX_PREVIEW_CHARS}
                      hasFullAccess={true}
                      coverUrl={devotional.coverUrl}
                    />
                  </div>
                ) : null}
              </article>
            ))}
          </section>

          {/* Locked days — blurred preview with cover + watermark unlock (shown until unlocked)
              Suppressed when devotional has a single asset (PDF/DOCX housing all days) to avoid
              redundant cover-with-blur blocks: asset's ContentReader already shows the locked overlay. */}
          {hasAccessControl && !isUnlocked && lockedDays.length > 0 && !hasSingleAsset && (
            <section className="space-y-6" aria-label="Locked devotional days">
              <div className="flex items-center gap-3">
                <div className="h-px flex-1 bg-border" />
                <p className="text-xs font-semibold tracking-widest text-text-muted uppercase">
                  {lockedDays.length} more day{lockedDays.length === 1 ? "" : "s"} — unlock to read
                </p>
                <div className="h-px flex-1 bg-border" />
              </div>
              {lockedDays.map((day) => (
                <LockedCoverOverlay
                  key={day.id}
                  coverUrl={devotional.coverUrl}
                  title={`Day ${day.dayNumber} — ${day.title}`}
                  subtitle={`${lockedDays.length} day${lockedDays.length === 1 ? "" : "s"} remaining • Purchase access or enter your access code`}
                  unlockHref={settings.paymentsEnabled ? `/purchase/${devotional.slug}` : "#access-gate"}
                  unlockLabel={settings.paymentsEnabled ? "Purchase to Unlock" : "Enter Access Code"}
                >
                  <article className="rounded-xl border border-border bg-surface p-6">
                    <h2 className="mb-2 text-xl font-semibold text-text-primary">
                      Day {day.dayNumber} — {day.title}
                    </h2>
                    <div className="prose-devotional">
                      {(day.content ?? "").slice(0, 400)}
                      {(day.content ?? "").length > 400 ? "…" : ""}
                    </div>
                    {day.contentFileUrl && (
                      <div className="mt-4 rounded-lg border border-border bg-background p-4 text-sm text-text-muted">
                        {day.contentFileUrl.split("/").pop()} — file content
                      </div>
                    )}
                  </article>
                </LockedCoverOverlay>
              ))}
            </section>
          )}
          {hasSingleAsset && hasAccessControl && !isUnlocked && lockedDays.length > 0 && (
            <section className="space-y-2" aria-label="Locked days notice">
              <div className="flex items-center gap-3">
                <div className="h-px flex-1 bg-border" />
                <p className="text-xs font-semibold tracking-widest text-text-muted uppercase">
                  {lockedDays.length} additional day{lockedDays.length === 1 ? "" : "s"} included in file — unlock to access
                </p>
                <div className="h-px flex-1 bg-border" />
              </div>
              <p className="text-center text-xs text-text-muted">The full devotional content is contained in the protected file above. Unlock to read all {days.length} days.</p>
            </section>
          )}

          {/* Render unlocked locked-days directly with full access — single success banner (no duplicate) */}
          {isUnlocked && unlockedDays!.length > 0 && (
            <div className="section-gap animate-fade-in">
              <Card variant="glass" className="border-success/40 bg-success/5">
                <p className="text-sm text-success font-medium">
                  {hasSingleAsset
                    ? "Access granted — you can now read the full devotional file above."
                    : `Access granted — you can now read ${unlockedDays!.length} additional day${unlockedDays!.length === 1 ? "" : "s"} below.`}
                </p>
              </Card>
              {unlockedDays!.map((day) => (
                <article key={day.id} className="rounded-xl border border-border bg-surface p-6 animate-slide-up">
                  <h3 className="mb-2 text-xl font-semibold text-text-primary">
                    Day {day.dayNumber} — {day.title}
                  </h3>
                  <div className="prose-devotional">{day.content ?? ""}</div>
                  {day.sermonUrl && (
                    <div className="mt-4 aspect-video overflow-hidden rounded-lg">
                      <iframe src={day.sermonUrl} title={`Day ${day.dayNumber} sermon`} className="h-full w-full" loading="lazy" />
                    </div>
                  )}
                  {day.contentFileUrl && !hasSingleAsset ? (
                    <div className="mt-4">
                      <ContentReader
                        fileUrl={day.contentFileUrl}
                        fileName={day.contentFileUrl?.split("/").pop()?.split(".").slice(0, -1).join(".") || `${day.title || "Content"} — Day ${day.dayNumber}`}
                        fileType={(day.contentFileUrl ?? "").toLowerCase().endsWith(".pdf") ? "pdf" : "docx"}
                        maxPreviewChars={MAX_PREVIEW_CHARS}
                        hasFullAccess={true}
                        coverUrl={devotional.coverUrl}
                      />
                    </div>
                  ) : null}
                </article>
              ))}
            </div>
          )}

          {reference && devotional.priceMinor > 0 && !isUnlocked && (
            <AccessPasswordFallback reference={reference} devotionalSlug={devotional.title} />
          )}

          {hasAccessControl && !isUnlocked && (
            <AccessGate id="access-gate" devotional={devotional} settings={settings} onUnlock={setUnlockedDays} />
          )}
          {hasAccessControl && isUnlocked && unlockedDays!.length === 0 && (
            <Card className="text-center border-success/30 bg-success/5">
              <p className="text-sm text-success font-medium">
                {hasSingleAsset ? "Access granted — you can now read the full devotional file above." : "All unlocked content is now visible above."}
              </p>
            </Card>
          )}
          {hasAccessControl === false && !isUnlocked && (
            <Card className="text-center">
              <p className="text-sm text-text-muted">All {days.length} days are available for free.</p>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
