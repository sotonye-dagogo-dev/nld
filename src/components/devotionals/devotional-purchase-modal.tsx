"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { PurchaseCheckout } from "@/components/devotionals/purchase-checkout";
import { AccessGate } from "@/components/devotionals/access-gate";
import { Button } from "@/components/ui/button";
import { ShoppingCart, Lock } from "lucide-react";

interface Props {
  devotional: Devotional;
  settings: SiteSettings;
  onUnlock?: (days: DevotionalDay[]) => void;
}

export function DevotionalPurchaseModal({ devotional, settings, onUnlock }: Props) {
  const [purchaseOpen, setPurchaseOpen] = useState(false);
  const [unlockOpen, setUnlockOpen] = useState(false);

  if (devotional.priceMinor <= 0) return null;

  return (
    <>
      <div className="flex items-center gap-2 shrink-0">
        <Button variant="secondary" size="sm" onClick={() => setUnlockOpen(true)}>
          <Lock className="h-4 w-4" aria-hidden /> Unlock
        </Button>
        {settings.paymentsEnabled ? (
          <Button size="sm" onClick={() => setPurchaseOpen(true)}>
            <ShoppingCart className="h-4 w-4" aria-hidden /> Purchase access
          </Button>
        ) : (
          <span className="rounded-lg bg-text-muted px-4 py-2 text-sm font-semibold text-white opacity-60">Payments disabled</span>
        )}
      </div>

      <Modal open={purchaseOpen} onClose={() => setPurchaseOpen(false)} title={`Purchase — ${devotional.title}`}>
        <PurchaseCheckout devotional={devotional} settings={settings} />
      </Modal>

      <Modal open={unlockOpen} onClose={() => setUnlockOpen(false)} title={`Unlock — ${devotional.title}`}>
        <AccessGate
          devotional={devotional}
          settings={settings}
          onUnlock={onUnlock}
          onCloseModal={() => setUnlockOpen(false)}
        />
      </Modal>
    </>
  );
}
