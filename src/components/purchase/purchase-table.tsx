"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Package, Sparkles, Eye, ShoppingCart } from "lucide-react";
import { formatPrice } from "@/config/defaults";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { PurchaseCheckout } from "@/components/devotionals/purchase-checkout";

interface PurchaseTableProps {
  devotionals: Devotional[];
  settings: SiteSettings;
}

export function PurchaseTable({ devotionals, settings }: PurchaseTableProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [modalDevotional, setModalDevotional] = useState<Devotional | null>(null);
  const [modalBundle, setModalBundle] = useState(false);

  const allSelected = devotionals.length > 0 && selected.size === devotionals.length;

  // Config-driven bundle price: bundlePriceMinor is the primary source for "access to all".
  // Falls back to defaultPriceMinor (legacy) then sum. Also respects bundleEnabled.
  const bundlePriceMinor = useMemo(() => {
    if (settings.bundlePriceMinor && settings.bundlePriceMinor > 0) return settings.bundlePriceMinor;
    if (settings.defaultPriceMinor > 0) return settings.defaultPriceMinor;
    return devotionals.reduce((s, d) => s + d.priceMinor, 0);
  }, [devotionals, settings.bundlePriceMinor, settings.defaultPriceMinor]);

  const bundleCurrency = devotionals[0]?.currency ?? settings.currency;
  const bundleAccessMode: AccessMode = settings.bundleAccessMode ?? settings.accessMode ?? "one-time";

  function toggleAll() {
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(devotionals.map((d) => d.id)));
  }
  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const selectedTotal = useMemo(() => {
    if (selected.size === devotionals.length && devotionals.length > 1) return bundlePriceMinor;
    let sum = 0;
    for (const d of devotionals) if (selected.has(d.id)) sum += d.priceMinor;
    return sum;
  }, [selected, devotionals, bundlePriceMinor]);

  const durationDays = settings.durationAccessDays ?? settings.bundleDurationDays ?? 60;
  const accessModeLabel =
    bundleAccessMode === "one-time" ? "forever" : bundleAccessMode === "monthly" ? "30 days" : `${durationDays} days`;

  const showBundle = (settings.bundleEnabled ?? true) && devotionals.length > 1;
  const showIndividual = settings.allowIndividualPurchase ?? true;

  return (
    <div className="space-y-6">
      {/* Bundle — config-driven, respects bundleEnabled */}
      {showBundle && (
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
                    {formatPrice(bundlePriceMinor, bundleCurrency)}
                  </span>{" "}
                  total. Access mode: <span className="font-medium">{accessModeLabel}</span>.
                  {(settings.bundlePriceMinor > 0 || settings.defaultPriceMinor > 0) && (
                    <span className="block text-xs mt-1">Platform bundle fee (config-driven, not sum of titles).</span>
                  )}
                </p>
              </div>
            </div>
              <Button
              onClick={() => {
                const bundleDevotional: Devotional = {
                  id: devotionals[0].id,
                  slug: "all",
                  title: "All Devotionals Bundle",
                  subtitle: `${devotionals.length} titles`,
                  description: `One purchase unlocks every published devotional (${devotionals.length} titles).`,
                  coverUrl: devotionals[0].coverUrl,
                  priceMinor: bundlePriceMinor,
                  currency: bundleCurrency,
                  accessMode: bundleAccessMode,
                  previewDays: 0,
                  status: "published",
                  createdAt: new Date(),
                  updatedAt: new Date(),
                };
                setModalDevotional(bundleDevotional);
                setModalBundle(true);
              }}
            >
              <ShoppingCart className="h-4 w-4" aria-hidden /> Purchase Bundle
            </Button>
          </div>
        </section>
      )}

      {showIndividual && (
      <div className="rounded-xl border border-border bg-surface overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-background border-b border-border">
              <tr>
                <th className="px-3 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleAll}
                    aria-label="Select all devotionals"
                    className="h-4 w-4 accent-primary"
                  />
                </th>
                <th className="px-3 py-3 text-left font-semibold text-text-primary">Devotional</th>
                <th className="px-3 py-3 text-left font-semibold text-text-primary">Price</th>
                <th className="px-3 py-3 text-left font-semibold text-text-primary">Access</th>
                <th className="px-3 py-3 text-right font-semibold text-text-primary">Action</th>
              </tr>
            </thead>
            <tbody>
              {devotionals.map((d) => (
                <tr key={d.id} className="border-b border-border last:border-0 hover:bg-background/50">
                  <td className="px-3 py-3">
                    <input
                      type="checkbox"
                      checked={selected.has(d.id)}
                      onChange={() => toggleOne(d.id)}
                      aria-label={`Select ${d.title}`}
                      className="h-4 w-4 accent-primary"
                    />
                  </td>
                  <td className="px-3 py-3">
                    <div className="font-medium text-text-primary">{d.title}</div>
                    {d.subtitle && <div className="text-xs text-text-muted truncate max-w-[28ch]">{d.subtitle}</div>}
                    <div className="text-xs text-text-muted">{d.slug}</div>
                  </td>
                  <td className="px-3 py-3 font-mono text-text-primary">{formatPrice(d.priceMinor, d.currency)}</td>
                  <td className="px-3 py-3 text-text-muted">{d.accessMode}</td>
                  <td className="px-3 py-3">
                    <div className="flex justify-end gap-2">
                      <Link
                        href={`/devotionals/${d.slug}`}
                        className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-text-primary hover:bg-background"
                      >
                        <Eye className="h-3.5 w-3.5" aria-hidden /> View
                      </Link>
                      <Button
                        size="sm"
                        onClick={() => {
                          setModalDevotional(d);
                          setModalBundle(false);
                        }}
                      >
                        <ShoppingCart className="h-3.5 w-3.5" aria-hidden /> Buy
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {selected.size > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border bg-background px-4 py-3">
            <p className="text-sm text-text-muted">
              {selected.size} selected • Total{" "}
              <span className="font-semibold text-text-primary">{formatPrice(selectedTotal, bundleCurrency)}</span>
              {selected.size === devotionals.length && devotionals.length > 1 && (
                <span className="ml-2 text-xs">Bundle pricing applied</span>
              )}
            </p>
            <div className="flex gap-2">
              {selected.size === 1 ? (
                <Button
                  size="sm"
                  onClick={() => {
                    const d = devotionals.find((x) => selected.has(x.id))!;
                    setModalDevotional(d);
                    setModalBundle(false);
                  }}
                >
                  Purchase selected
                </Button>
              ) : (
                <Button
                  size="sm"
                  onClick={() => {
                    const bundleDevotional: Devotional = {
                      id: devotionals[0].id,
                      slug: "all",
                      title: "All Devotionals Bundle",
                      subtitle: `${devotionals.length} titles`,
                      description: `One purchase unlocks every published devotional (${devotionals.length} titles).`,
                      coverUrl: devotionals[0].coverUrl,
                      priceMinor: bundlePriceMinor,
                      currency: bundleCurrency,
                      accessMode: bundleAccessMode,
                      previewDays: 0,
                      status: "published",
                      createdAt: new Date(),
                      updatedAt: new Date(),
                    };
                    setModalDevotional(bundleDevotional);
                    setModalBundle(true);
                  }}
                >
                  Purchase Bundle (selected)
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
      )}

      <Modal
        open={!!modalDevotional}
        onClose={() => {
          setModalDevotional(null);
          setModalBundle(false);
        }}
        title={modalBundle ? "Purchase Bundle" : modalDevotional ? `Purchase — ${modalDevotional.title}` : "Purchase"}
      >
        {modalDevotional && <PurchaseCheckout devotional={modalDevotional} settings={settings} isBundle={modalBundle} />}
      </Modal>
    </div>
  );
}
