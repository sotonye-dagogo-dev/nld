"use client";

import { useState } from "react";
import Link from "next/link";
import { Navbar } from "@/components/ui/navbar";
import { Modal } from "@/components/ui/modal";
import { PurchaseTable } from "@/components/purchase/purchase-table";
import { AccessEntry } from "@/components/access/access-entry";
import { Lock, ShoppingCart } from "lucide-react";

interface ClientNavProps {
  platformName: string;
  logoUrl?: string;
  settings: SiteSettings;
  devotionals: { slug: string; title: string; id?: string }[];
  purchasable: Devotional[];
}

export function ClientNav({ platformName, logoUrl, settings, devotionals, purchasable }: ClientNavProps) {
  const [purchaseOpen, setPurchaseOpen] = useState(false);
  const [accessOpen, setAccessOpen] = useState(false);

  // Always-accessible entry points: Purchase + Unlock
  const navLinks = [{ href: "/", label: "Devotionals" }];

  return (
    <>
      <Navbar
        platformName={platformName}
        logoUrl={logoUrl}
        links={navLinks}
        trailing={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPurchaseOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-sm font-semibold text-background hover:bg-primary-hover"
            >
              <ShoppingCart className="h-4 w-4" aria-hidden /> Purchase
            </button>
            <button
              type="button"
              onClick={() => setAccessOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 text-sm font-medium text-text-primary hover:bg-background"
            >
              <Lock className="h-4 w-4" aria-hidden /> Unlock
            </button>
            <Link
              href="/admin"
              className="inline-flex rounded-lg border border-border bg-surface px-3 py-1.5 text-sm text-text-muted hover:bg-background"
            >
              Admin
            </Link>
          </div>
        }
      />

      {/* Purchase modal — table with config-driven bundle */}
      <Modal open={purchaseOpen} onClose={() => setPurchaseOpen(false)} title="Purchase Devotionals" wide>
        {purchasable.length === 0 ? (
          <p className="text-sm text-text-muted">No purchasable devotionals currently. All are free.</p>
        ) : (
          <PurchaseTable devotionals={purchasable} settings={settings} />
        )}
      </Modal>

      {/* Access modal — always accessible unlock, with select + auto-detect */}
      <Modal open={accessOpen} onClose={() => setAccessOpen(false)} title="Unlock your devotional">
        <AccessEntry
          devotionals={devotionals}
          onSuccess={(r) => {
            setAccessOpen(false);
            // global toast already triggered inside AccessEntry; navigate to matched devotional if available
            if (r.matchedSlug) window.location.href = `/devotionals/${r.matchedSlug}`;
          }}
        />
      </Modal>
    </>
  );
}
