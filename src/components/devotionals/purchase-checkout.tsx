"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { formatPrice } from "@/config/defaults";

// Checkout — collects the purchaser email and starts a Paystack transaction
// via /api/paystack/init. On success the browser is redirected to Paystack's
// hosted authorization page.

interface PurchaseCheckoutProps {
  devotional: Devotional;
  settings: SiteSettings;
}

export function PurchaseCheckout({ devotional, settings }: PurchaseCheckoutProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function startPayment(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/paystack/init", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: devotional.slug, email }),
      });
      const data = (await res.json()) as { ok: boolean; authorizationUrl?: string; error?: string };
      if (!res.ok || !data.ok || !data.authorizationUrl) {
        setError(data.error ?? "Could not start payment. Please try again.");
        return;
      }
      router.push(data.authorizationUrl);
    } catch {
      setError("Network error while starting payment. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (!settings.paymentsEnabled) {
    return (
      <Card>
        <p className="text-sm text-text-muted">Payments are temporarily disabled. Please check back soon.</p>
      </Card>
    );
  }

  return (
    <Card className="max-w-md">
      <h2 className="mb-1 text-lg font-semibold text-text-primary">Purchase access</h2>
      <p className="mb-4 text-sm text-text-muted">
        One-time access to <strong>{devotional.title}</strong> —{" "}
        {formatPrice(devotional.priceMinor, devotional.currency)}. Your access
        password will be emailed to you after payment.
      </p>
      <form onSubmit={startPayment} className="space-y-4">
        <Input
          name="email"
          type="email"
          required
          label="Email address"
          placeholder="you@example.com"
          hint="We send your access password to this address."
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={error ?? undefined}
        />
        <Button type="submit" loading={loading} className="w-full">
          Pay with Paystack
        </Button>
      </form>
      <p className="mt-4 text-xs text-text-muted">
        Secure payment processed by Paystack. You will also receive a receipt
        from Paystack by email.
      </p>
    </Card>
  );
}