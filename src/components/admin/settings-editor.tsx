"use client";

import { useState } from "react";
import { useToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";

// Settings editor — saves admin-configurable platform settings to the DB
// settings store via /api/admin/settings.

export function SettingsEditor({ initial }: { initial: SiteSettings }) {
  const { toast } = useToast();
  const [form, setForm] = useState({
    platformName: initial.platformName,
    tagline: initial.tagline,
    logoUrl: initial.logoUrl,
    emailFrom: initial.emailFrom,
    supportEmail: initial.supportEmail,
    currency: initial.currency,
    defaultPriceMinor: String(initial.defaultPriceMinor),
    freePreviewDays: String(initial.freePreviewDays),
    accessMode: initial.accessMode,
    paymentsEnabled: initial.paymentsEnabled,
    antiScreenshotEnabled: initial.antiScreenshotEnabled,
    footerDevCreditName: initial.footerDevCreditName,
    footerDevCreditUrl: initial.footerDevCreditUrl,
    footerDevCreditEnabled: initial.footerDevCreditEnabled,
  });
  const [saving, setSaving] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          settings: {
            ...form,
            defaultPriceMinor: Number(form.defaultPriceMinor) || 0,
            freePreviewDays: Number(form.freePreviewDays) || 0,
          },
        }),
      });
      const data = (await res.json()) as { ok: boolean; error?: string };
      if (!res.ok || !data.ok) {
        toast(data.error ?? "Could not save settings.", "error");
        return;
      }
      toast("Settings saved.", "success");
    } catch {
      toast("Network error while saving.", "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="max-w-2xl">
      <form onSubmit={save} className="space-y-4">
        <Input
          name="platformName"
          required
          label="Platform name"
          value={form.platformName}
          onChange={(e) => setForm({ ...form, platformName: e.target.value })}
        />
        <Input
          name="tagline"
          label="Tagline"
          value={form.tagline}
          onChange={(e) => setForm({ ...form, tagline: e.target.value })}
        />
        <Input
          name="logoUrl"
          label="Logo URL"
          placeholder="https://..."
          value={form.logoUrl}
          onChange={(e) => setForm({ ...form, logoUrl: e.target.value })}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            name="emailFrom"
            label="Email sender"
            placeholder="Name <email@domain.com>"
            value={form.emailFrom}
            onChange={(e) => setForm({ ...form, emailFrom: e.target.value })}
          />
          <Input
            name="supportEmail"
            type="email"
            label="Support email"
            value={form.supportEmail}
            onChange={(e) => setForm({ ...form, supportEmail: e.target.value })}
          />
          <Input
            name="currency"
            label="Currency"
            placeholder="NGN"
            value={form.currency}
            onChange={(e) => setForm({ ...form, currency: e.target.value })}
          />
          <Input
            name="defaultPriceMinor"
            type="number"
            min={0}
            step={100}
            label="Default price (minor units)"
            value={form.defaultPriceMinor}
            onChange={(e) => setForm({ ...form, defaultPriceMinor: e.target.value })}
          />
          <Input
            name="freePreviewDays"
            type="number"
            min={0}
            label="Free preview days"
            value={form.freePreviewDays}
            onChange={(e) => setForm({ ...form, freePreviewDays: e.target.value })}
          />
          <label className="flex flex-col gap-1.5 text-sm font-medium text-text-primary">
            Default access mode
            <select
              name="accessMode"
              value={form.accessMode}
              onChange={(e) => setForm({ ...form, accessMode: e.target.value as AccessMode })}
              className="rounded-lg border border-border bg-surface px-3 py-2 text-sm"
            >
              <option value="one-time">One-time purchase</option>
              <option value="monthly">Monthly access</option>
              <option value="duration">Time duration</option>
            </select>
          </label>
        </div>

        <div className="space-y-3 border-t border-border pt-4">
          <label className="flex items-center justify-between gap-4 text-sm text-text-primary">
            <span>
              Payments enabled
              <span className="block text-xs text-text-muted">Allow new purchases through Paystack.</span>
            </span>
            <input
              type="checkbox"
              checked={form.paymentsEnabled}
              onChange={(e) => setForm({ ...form, paymentsEnabled: e.target.checked })}
              className="h-4 w-4 accent-primary"
            />
          </label>
          <label className="flex items-center justify-between gap-4 text-sm text-text-primary">
            <span>
              Anti-screenshot protection
              <span className="block text-xs text-text-muted">
                Suppress copy/print/shortcuts and show the protected-content hint on readers.
              </span>
            </span>
            <input
              type="checkbox"
              checked={form.antiScreenshotEnabled}
              onChange={(e) => setForm({ ...form, antiScreenshotEnabled: e.target.checked })}
              className="h-4 w-4 accent-primary"
            />
          </label>
        </div>

        <div className="space-y-3 border-t border-border pt-4">
          <h3 className="text-lg font-semibold text-text-primary">Footer Developer Credit</h3>
          <label className="flex items-center justify-between gap-4 text-sm text-text-primary">
            <span>
              Show developer credit
              <span className="block text-xs text-text-muted">Display &lsquo;Built by [Name]&rsquo; in the footer.</span>
            </span>
            <input
              type="checkbox"
              checked={form.footerDevCreditEnabled}
              onChange={(e) => setForm({ ...form, footerDevCreditEnabled: e.target.checked })}
              className="h-4 w-4 accent-primary"
            />
          </label>
          <Input
            name="footerDevCreditName"
            label="Developer name"
            placeholder="S.D."
            value={form.footerDevCreditName}
            onChange={(e) => setForm({ ...form, footerDevCreditName: e.target.value })}
          />
          <Input
            name="footerDevCreditUrl"
            type="url"
            label="Developer URL"
            placeholder="https://example.com"
            value={form.footerDevCreditUrl}
            onChange={(e) => setForm({ ...form, footerDevCreditUrl: e.target.value })}
          />
        </div>

        <div className="flex justify-end border-t border-border pt-4">
          <Button type="submit" loading={saving}>
            Save settings
          </Button>
        </div>
      </form>
    </Card>
  );
}