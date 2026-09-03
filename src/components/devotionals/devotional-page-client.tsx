"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { ErrorState } from "@/components/ui/error-state";
import { AccessGate } from "@/components/devotionals/access-gate";
import { AccessPasswordFallback } from "@/components/devotionals/access-password-fallback";
import { ContentReader, MAX_PREVIEW_CHARS } from "@/components/devotionals/content-reader";
import { DevotionalPurchaseModal } from "@/components/devotionals/devotional-purchase-modal";
import { LockedCoverOverlay } from "@/components/devotionals/locked-cover-overlay";
import { formatPrice } from "@/config/defaults";

interface Props {
  devotional: Devotional;
  days: DevotionalDay[];
  settings: SiteSettings;
  reference?: string;
  previewDays: number;
}

export function DevotionalPageClient({ devotional, days, settings, reference, previewDays }: Props) {
  const [unlockedDays, setUnlockedDays] = useState<DevotionalDay[] | null>(null);

  const visibleDays = days.slice(0, previewDays);
  const lockedDays = days.slice(previewDays);
  const devotionalAssetUrl = (devotional as Devotional & { assetUrl?: string | null }).assetUrl ?? null;
  const hasSingleAsset = Boolean(devotionalAssetUrl && devotionalAssetUrl.trim().length > 0);
  const assetFileType: "pdf" | "docx" = (devotionalAssetUrl ?? "").toLowerCase().endsWith(".pdf") ? "pdf" : "docx";
  const assetFileName = devotionalAssetUrl?.split("/").pop()?.split(".").slice(0, -1).join(".") || devotional.title || "Devotional";
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

      {/* Single-asset devotional (no days) or hybrid — asset viewer with optional days */}
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
          {isUnlocked && hasSingleAsset && (
            <p className="mt-2 text-xs text-success text-center font-medium">Access granted — you can now read the full devotional file above.</p>
          )}
        </section>
      )}

      {days.length === 0 && !hasSingleAsset ? (
        <ErrorState title="No content yet" message="This devotional has not been published yet. Check back soon." />
      ) : days.length === 0 && hasSingleAsset ? (
        // Asset-only: gate and purchase are already handled above; still show fallback & gate
        <div className="section-gap">
          {reference && devotional.priceMinor > 0 && (
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
                {day.contentFileUrl ? (
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

          {/* Locked days — blurred preview with cover + watermark unlock (shown until unlocked) */}
          {hasAccessControl && !isUnlocked && lockedDays.length > 0 && (
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

          {/* Render unlocked locked-days directly with full access */}
          {isUnlocked && unlockedDays!.length > 0 && (
            <div className="section-gap animate-fade-in">
              <Card variant="glass" className="border-success/40 bg-success/5">
                <p className="text-sm text-success font-medium">Access unlocked — {unlockedDays!.length} additional day{unlockedDays!.length === 1 ? "" : "s"} available.</p>
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
                  <div className="mt-4">
                    <ContentReader
                      fileUrl={day.contentFileUrl ?? ""}
                      fileName={day.contentFileUrl?.split("/").pop()?.split(".").slice(0, -1).join(".") || `${day.title || "Content"} — Day ${day.dayNumber}`}
                      fileType={(day.contentFileUrl ?? "").toLowerCase().endsWith(".pdf") ? "pdf" : "docx"}
                      maxPreviewChars={MAX_PREVIEW_CHARS}
                      hasFullAccess={true}
                      coverUrl={devotional.coverUrl}
                    />
                  </div>
                </article>
              ))}
            </div>
          )}

          {reference && devotional.priceMinor > 0 && (
            <AccessPasswordFallback reference={reference} devotionalSlug={devotional.title} />
          )}

          {hasAccessControl && !isUnlocked && (
            <AccessGate id="access-gate" devotional={devotional} settings={settings} onUnlock={setUnlockedDays} />
          )}
          {hasAccessControl && isUnlocked && unlockedDays!.length === 0 && (
            <Card className="text-center">
              <p className="text-sm text-text-muted">All unlocked content is now visible above.</p>
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
