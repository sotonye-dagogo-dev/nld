"use client";

import { useState } from "react";
import { useToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Plus, Trash2, GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";

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
    paystackEnabled: initial.paystackEnabled,
    bankTransferEnabled: initial.bankTransferEnabled,
    antiScreenshotEnabled: initial.antiScreenshotEnabled,
    footerDevCreditName: initial.footerDevCreditName,
    footerDevCreditUrl: initial.footerDevCreditUrl,
    footerDevCreditEnabled: initial.footerDevCreditEnabled,
    bundleEnabled: (initial.bundleEnabled ?? true) as boolean,
    bundlePriceMinor: String(initial.bundlePriceMinor ?? 0),
    bundleAccessMode: (initial.bundleAccessMode ?? initial.accessMode ?? "one-time") as AccessMode,
    bundleDurationDays: String(initial.bundleDurationDays ?? 60),
    allowIndividualPurchase: (initial.allowIndividualPurchase ?? true) as boolean,
    durationAccessDays: String(initial.durationAccessDays ?? 60),
  });
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>(initial.bankAccounts ?? []);
  const [saving, setSaving] = useState(false);
  const [savingAccounts, setSavingAccounts] = useState(false);

  interface BankAccount {
    id?: string;
    bankName: string;
    accountName: string;
    accountNumber: string;
    currency: string;
    sortCode?: string;
    swiftCode?: string;
    instructions?: string;
    isActive: boolean;
    displayOrder: number;
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    // Validate at least one payment method is enabled
    if (!form.paystackEnabled && !form.bankTransferEnabled) {
      toast("At least one payment method must be enabled.", "error");
      return;
    }
    // If bank transfer enabled, require at least one active bank account
    if (form.bankTransferEnabled && bankAccounts.filter((a) => a.isActive).length === 0) {
      toast("At least one active bank account is required when bank transfer is enabled.", "error");
      return;
    }
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
            bundlePriceMinor: Number(form.bundlePriceMinor) || 0,
            bundleDurationDays: Number(form.bundleDurationDays) || 60,
            durationAccessDays: Number(form.durationAccessDays) || 60,
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

  async function saveBankAccounts() {
    if (bankAccounts.filter((a) => a.isActive).length === 0 && form.bankTransferEnabled) {
      toast("At least one active bank account is required.", "error");
      return;
    }
    setSavingAccounts(true);
    try {
      const res = await fetch("/api/admin/bank-accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accounts: bankAccounts }),
      });
      const data = (await res.json()) as { ok: boolean; error?: string };
      if (!res.ok || !data.ok) {
        toast(data.error ?? "Could not save bank accounts.", "error");
        return;
      }
      toast("Bank accounts saved.", "success");
    } catch {
      toast("Network error while saving.", "error");
    } finally {
      setSavingAccounts(false);
    }
  }

  function addBankAccount() {
    setBankAccounts([
      ...bankAccounts,
      {
        bankName: "",
        accountName: "",
        accountNumber: "",
        currency: "NGN",
        sortCode: "",
        swiftCode: "",
        instructions: "",
        isActive: true,
        displayOrder: bankAccounts.length,
      },
    ]);
  }

  function updateBankAccount(index: number, field: keyof BankAccount, value: string | boolean) {
    setBankAccounts(
      bankAccounts.map((acc, i) =>
        i === index ? { ...acc, [field]: value, displayOrder: i } : { ...acc, displayOrder: i }
      )
    );
  }

  function removeBankAccount(index: number) {
    setBankAccounts(bankAccounts.filter((_, i) => i !== index).map((acc, i) => ({ ...acc, displayOrder: i })));
  }

  return (
    <Card className="max-w-3xl">
      <form onSubmit={save} className="space-y-4">
        <Input
          name="platformName"
          required
          label="Platform name"
          value={form.platformName}
          onChange={(e) => setForm({ ...form, platformName: e.target.value })}
          type="text"
          autoComplete="off"
        />
        <Input
          name="tagline"
          label="Tagline"
          value={form.tagline}
          onChange={(e) => setForm({ ...form, tagline: e.target.value })}
          type="text"
          autoComplete="off"
        />
        <Input
          name="logoUrl"
          label="Logo URL"
          placeholder="https://..."
          value={form.logoUrl}
          onChange={(e) => setForm({ ...form, logoUrl: e.target.value })}
          type="text"
          autoComplete="off"
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            name="emailFrom"
            label="Email sender"
            placeholder="Name <email@domain.com>"
            value={form.emailFrom}
            onChange={(e) => setForm({ ...form, emailFrom: e.target.value })}
            type="text"
            autoComplete="off"
          />
          <Input
            name="supportEmail"
            type="email"
            label="Support email"
            value={form.supportEmail}
            onChange={(e) => setForm({ ...form, supportEmail: e.target.value })}
            autoComplete="off"
          />
          <Input
            name="currency"
            label="Currency"
            placeholder="NGN"
            value={form.currency}
            onChange={(e) => setForm({ ...form, currency: e.target.value })}
            type="text"
            autoComplete="off"
          />
          <Input
            name="defaultPriceMinor"
            type="number"
            min={0}
            step={100}
            label="Default price (minor units)"
            value={form.defaultPriceMinor}
            onChange={(e) => setForm({ ...form, defaultPriceMinor: e.target.value })}
            autoComplete="off"
          />
          <Input
            name="freePreviewDays"
            type="number"
            min={0}
            label="Free preview days"
            value={form.freePreviewDays}
            onChange={(e) => setForm({ ...form, freePreviewDays: e.target.value })}
            autoComplete="off"
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

        {/* Dynamic access & pricing policy — config-driven, enables flexible client requirements */}
        <div className="space-y-4 border-t border-border pt-4">
          <h3 className="text-lg font-semibold text-text-primary">Access & Pricing Policy</h3>
          <p className="text-sm text-text-muted">
            Configure how users purchase access. Supports per-devotional, bundle (all devotionals), and time-bound variations without code changes.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="flex items-center justify-between gap-4 rounded-lg border border-border bg-surface px-3 py-3 text-sm text-text-primary">
              <span>Allow individual purchase<span className="block text-xs text-text-muted">Users can buy a single devotional</span></span>
              <input type="checkbox" checked={form.allowIndividualPurchase} onChange={(e) => setForm({ ...form, allowIndividualPurchase: e.target.checked })} className="h-4 w-4 accent-primary" />
            </label>
            <label className="flex items-center justify-between gap-4 rounded-lg border border-border bg-surface px-3 py-3 text-sm text-text-primary">
              <span>Enable bundle<span className="block text-xs text-text-muted">One fee for all devotionals / set</span></span>
              <input type="checkbox" checked={form.bundleEnabled} onChange={(e) => setForm({ ...form, bundleEnabled: e.target.checked })} className="h-4 w-4 accent-primary" />
            </label>
            <Input name="bundlePriceMinor" type="number" min={0} step={100} label="Bundle price (minor units)" hint="Fee for all devotionals when bundle enabled (0 = use Default price or sum)" value={form.bundlePriceMinor} onChange={(e) => setForm({ ...form, bundlePriceMinor: e.target.value })} autoComplete="off" />
            <label className="flex flex-col gap-1.5 text-sm font-medium text-text-primary">
              Bundle access mode
              <select name="bundleAccessMode" value={form.bundleAccessMode} onChange={(e) => setForm({ ...form, bundleAccessMode: e.target.value as AccessMode })} className="rounded-lg border border-border bg-surface px-3 py-2 text-sm">
                <option value="one-time">One-time (forever)</option>
                <option value="monthly">Monthly (30 days)</option>
                <option value="duration">Duration (custom days)</option>
              </select>
            </label>
            <Input name="bundleDurationDays" type="number" min={1} label="Bundle duration (days)" hint="Used when bundle mode is Duration" value={form.bundleDurationDays} onChange={(e) => setForm({ ...form, bundleDurationDays: e.target.value })} autoComplete="off" />
            <Input name="durationAccessDays" type="number" min={1} label="Duration days (individual)" hint="Days for Duration mode on individual devotionals" value={form.durationAccessDays} onChange={(e) => setForm({ ...form, durationAccessDays: e.target.value })} autoComplete="off" />
          </div>
        </div>

        <div className="space-y-3 border-t border-border pt-4">
          <h3 className="text-lg font-semibold text-text-primary">Payment Methods</h3>
          <p className="text-sm text-text-muted">At least one payment method must be enabled.</p>
          <label className="flex items-center justify-between gap-4 text-sm text-text-primary">
            <span>
              Paystack (card/bank/USSD)
              <span className="block text-xs text-text-muted">Allow new purchases through Paystack.</span>
            </span>
            <input
              type="checkbox"
              checked={form.paystackEnabled}
              onChange={(e) => setForm({ ...form, paystackEnabled: e.target.checked })}
              className="h-4 w-4 accent-primary"
            />
          </label>
          <label className="flex items-center justify-between gap-4 text-sm text-text-primary">
            <span>
              Bank Transfer
              <span className="block text-xs text-text-muted">Allow users to pay via bank transfer and upload proof.</span>
            </span>
            <input
              type="checkbox"
              checked={form.bankTransferEnabled}
              onChange={(e) => setForm({ ...form, bankTransferEnabled: e.target.checked })}
              className="h-4 w-4 accent-primary"
            />
          </label>
        </div>

        <div className="space-y-3 border-t border-border pt-4">
          <h3 className="text-lg font-semibold text-text-primary">Bank Accounts</h3>
          <p className="text-sm text-text-muted">
            Configure bank accounts for transfer payments. Multiple accounts supported for different currencies/regions.
          </p>
          {bankAccounts.map((acc, index) => (
            <div key={index} className="border border-border rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-text-primary">Account #{index + 1}</h4>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeBankAccount(index)}
                  disabled={bankAccounts.length <= 1}
                  aria-label="Remove bank account"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Input
                  label="Bank name"
                  placeholder="e.g. Access Bank, GTBank"
                  value={acc.bankName}
                  onChange={(e) => updateBankAccount(index, "bankName", e.target.value)}
                  type="text"
                  autoComplete="off"
                />
                <Input
                  label="Account name"
                  placeholder="e.g. Next Level Devotional Ltd"
                  value={acc.accountName}
                  onChange={(e) => updateBankAccount(index, "accountName", e.target.value)}
                  type="text"
                  autoComplete="off"
                />
                <Input
                  label="Account number"
                  placeholder="e.g. 1234567890"
                  value={acc.accountNumber}
                  onChange={(e) => updateBankAccount(index, "accountNumber", e.target.value)}
                  type="text"
                  autoComplete="off"
                />
                <Input
                  label="Currency"
                  placeholder="NGN"
                  value={acc.currency}
                  onChange={(e) => updateBankAccount(index, "currency", e.target.value)}
                  type="text"
                  autoComplete="off"
                />
                <Input
                  label="Sort code (optional)"
                  placeholder="e.g. 044"
                  value={acc.sortCode ?? ""}
                  onChange={(e) => updateBankAccount(index, "sortCode", e.target.value)}
                  type="text"
                  autoComplete="off"
                />
                <Input
                  label="SWIFT code (optional)"
                  placeholder="e.g. GTBINGLA"
                  value={acc.swiftCode ?? ""}
                  onChange={(e) => updateBankAccount(index, "swiftCode", e.target.value)}
                  type="text"
                  autoComplete="off"
                />
              </div>
              <Input
                label="Instructions (optional)"
                placeholder="Additional instructions for the user (e.g. include your email in reference)"
                value={acc.instructions ?? ""}
                onChange={(e) => updateBankAccount(index, "instructions", e.target.value)}
                type="text"
                autoComplete="off"
              />
              <label className="flex items-center gap-2 text-sm text-text-primary">
                <input
                  type="checkbox"
                  checked={acc.isActive}
                  onChange={(e) => updateBankAccount(index, "isActive", e.target.checked)}
                  className="h-4 w-4 accent-primary"
                />
                <span>Active</span>
              </label>
            </div>
          ))}
          <Button type="button" variant="secondary" onClick={addBankAccount} className="w-full sm:w-auto">
            <Plus className="h-4 w-4 mr-2" /> Add Bank Account
          </Button>
          <div className="flex justify-end border-t border-border pt-4">
            <Button type="button" onClick={saveBankAccounts} loading={savingAccounts}>
              Save Bank Accounts
            </Button>
          </div>
        </div>

        <div className="space-y-3 border-t border-border pt-4">
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

        <div className="flex justify-end border-t border-border pt-4">
          <Button type="submit" loading={saving}>
            Save Settings
          </Button>
        </div>
        {/* Footer developer credit — config-driven but not admin-editable
        <div className="space-y-3 border-t border-border pt-4">
          <h3 className="text-lg font-semibold text-text-primary">Developer Credit</h3>
          <p className="text-sm text-text-muted">This credit appears in the site footer. Not editable via admin panel.</p>
          <Input
            name="footerDevCreditName"
            label="Credit name"
            value={form.footerDevCreditName}
            onChange={(e) => setForm({ ...form, footerDevCreditName: e.target.value })}
          />
          <Input
            name="footerDevCreditUrl"
            label="Credit URL"
            placeholder="https://example.com"
            value={form.footerDevCreditUrl}
            onChange={(e) => setForm({ ...form, footerDevCreditUrl: e.target.value })}
          />
          <label className="flex items-center justify-between gap-4 text-sm text-text-primary">
            <span>Show credit</span>
            <input
              type="checkbox"
              checked={form.footerDevCreditEnabled}
              onChange={(e) => setForm({ ...form, footerDevCreditEnabled: e.target.checked })}
              className="h-4 w-4 accent-primary"
            />
          </label>
        </div>
        */}
      </form>
    </Card>
  );
}