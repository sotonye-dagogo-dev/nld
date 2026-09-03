"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { formatPrice } from "@/config/defaults";
import { CreditCard, Banknote, Upload, Copy, CheckCircle, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

// Checkout — collects the purchaser email and starts a Paystack transaction
// via /api/paystack/init. On success the browser is redirected to Paystack's
// hosted authorization page. Also supports bank transfer with proof upload.

interface PurchaseCheckoutProps {
  devotional: Devotional;
  settings: SiteSettings;
  isBundle?: boolean;
}

interface BankAccount {
  id: string;
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

export function PurchaseCheckout({ devotional, settings, isBundle = false }: PurchaseCheckoutProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [method, setMethod] = useState<"paystack" | "bank_transfer">(
    settings.paystackEnabled ? "paystack" : "bank_transfer"
  );
  const [bankAccountId, setBankAccountId] = useState("");
  const [transferReference, setTransferReference] = useState("");
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [transferId, setTransferId] = useState<string | null>(null);

  const activeBankAccounts = (settings.bankAccounts ?? []).filter((a) => a.isActive);

  async function startPaystackPayment(e: React.FormEvent) {
    e.preventDefault();
    setFieldErrors({});
    setGeneralError(null);
    if (!email.trim()) {
      setFieldErrors({ email: "Email is required." });
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/paystack/init", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: devotional.slug, email }),
      });
      const data = (await res.json()) as { ok: boolean; authorizationUrl?: string; error?: string };
      if (!res.ok || !data.ok || !data.authorizationUrl) {
        const msg = data.error ?? "Could not start payment. Please try again.";
        if (msg.toLowerCase().includes("email")) setFieldErrors({ email: msg });
        else setGeneralError(msg);
        return;
      }
      router.push(data.authorizationUrl);
    } catch {
      setGeneralError("Network error while starting payment. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleProofUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 50 * 1024 * 1024) {
      setFieldErrors({ proofFile: `File size must be less than 50MB (got ${(file.size / 1024 / 1024).toFixed(1)}MB).` });
      return;
    }
    if (file.size === 0) {
      setFieldErrors({ proofFile: "Empty file." });
      return;
    }
    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "application/octet-stream"];
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
    if (!allowedTypes.includes(file.type) && file.type !== "" && !["jpg", "jpeg", "png", "webp", "pdf", "docx"].includes(ext)) {
      setFieldErrors({ proofFile: "Please upload an image (JPG, PNG, WebP), PDF or DOCX." });
      return;
    }
    setProofFile(file);
    setFieldErrors({});
    setGeneralError(null);
  }

  async function submitBankTransfer(e: React.FormEvent) {
    e.preventDefault();
    setFieldErrors({});
    setGeneralError(null);

    const errs: Record<string, string> = {};
    if (!email.trim()) errs.email = "Email address is required.";
    if (!bankAccountId) errs.bankAccountId = "Please select a bank account.";
    if (!transferReference.trim()) errs.transferReference = "Transfer reference is required.";
    if (!proofFile) errs.proofFile = "Proof of payment is required.";
    if (Object.keys(errs).length > 0) {
      setFieldErrors(errs);
      return;
    }

    setLoading(true);
    setUploadProgress(0);

    try {
// Upload proof file to storage
      const formData = new FormData();
      formData.append("file", proofFile as File);

      const uploadRes = await fetch("/api/bank-transfer/upload-proof", {
        method: "POST",
        body: formData,
      });
 const uploadData = await uploadRes.json();
      if (!uploadRes.ok || !uploadData.ok) {
        const msg = uploadData.error ?? "Failed to upload proof of payment.";
        if (msg.toLowerCase().includes("proof") || msg.toLowerCase().includes("file")) setFieldErrors({ proofFile: msg });
        else setGeneralError(msg);
        return;
      }

      setUploadProgress(100);

      // Submit bank transfer record
      const selectedAccount = activeBankAccounts.find((a) => a.id === bankAccountId);
      const res = await fetch("/api/bank-transfer/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          devotionalSlug: devotional.slug,
          email,
          amountMinor: devotional.priceMinor,
          currency: devotional.currency,
          bankAccountId,
          reference: transferReference,
          proofUrl: uploadData.url,
        }),
      });
      const data = (await res.json()) as { ok: boolean; transferId?: string; error?: string };
      if (!res.ok || !data.ok) {
        const msg = data.error ?? "Could not submit transfer. Please try again.";
        const low = msg.toLowerCase();
        if (low.includes("email")) setFieldErrors({ email: msg });
        else if (low.includes("bank account")) setFieldErrors({ bankAccountId: msg });
        else if (low.includes("reference")) setFieldErrors({ transferReference: msg });
        else setGeneralError(msg);
        return;
      }

      setTransferId(data.transferId ?? null);
      setSubmitted(true);
      toast("Proof of payment submitted! We'll verify and email your access password.", "success");
    } catch {
      setGeneralError("Network error while submitting. Please try again.");
    } finally {
      setLoading(false);
      setUploadProgress(0);
    }
  }

  async function copyAccountNumber(number: string) {
    await navigator.clipboard.writeText(number);
    toast("Account number copied!", "success");
  }

  if (!settings.paymentsEnabled) {
    return (
      <Card>
        <p className="text-sm text-text-muted">Payments are temporarily disabled. Please check back soon.</p>
      </Card>
    );
  }

  const showPaystack = settings.paystackEnabled;
  const showBankTransfer = settings.bankTransferEnabled && activeBankAccounts.length > 0;

  if (!showPaystack && !showBankTransfer) {
    return (
      <Card>
        <p className="text-sm text-text-muted">
          No payment methods are currently available. Please check back soon.
        </p>
      </Card>
    );
  }

  const accessLabel =
    settings.accessMode === "one-time"
      ? "forever"
      : settings.accessMode === "monthly"
        ? "for 30 days"
        : "for 60 days";

  return (
    <Card className="max-w-md">
      <h2 className="mb-1 text-lg font-semibold text-text-primary">
        {isBundle ? "Purchase Bundle" : "Purchase access"}
      </h2>
      <p className="mb-4 text-sm text-text-muted">
        {isBundle ? (
          <>
            Unlock <strong>{devotional.title}</strong> —{" "}
            {formatPrice(devotional.priceMinor, devotional.currency)} ({accessLabel}). Your
            access password will be emailed after payment.
          </>
        ) : (
          <>
            {accessLabel === "forever" ? "One-time" : "Time-bound"} access to <strong>{devotional.title}</strong> —{" "}
            {formatPrice(devotional.priceMinor, devotional.currency)} ({accessLabel}). Your access
            password will be emailed to you after payment.
          </>
        )}
      </p>

      {showPaystack && showBankTransfer && (
        <div className="mb-4 flex gap-2" role="tablist" aria-label="Payment method">
          <button
            role="tab"
            aria-selected={method === "paystack"}
            onClick={() => setMethod("paystack")}
            className={cn(
              "flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors",
              method === "paystack"
                ? "border-primary bg-primary text-background"
                : "border-border bg-surface text-text-primary hover:bg-background"
            )}
          >
            <CreditCard className="h-4 w-4 mr-1.5 inline-block" aria-hidden />
            Paystack
          </button>
          <button
            role="tab"
            aria-selected={method === "bank_transfer"}
            onClick={() => setMethod("bank_transfer")}
            className={cn(
              "flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors",
              method === "bank_transfer"
                ? "border-primary bg-primary text-background"
                : "border-border bg-surface text-text-primary hover:bg-background"
            )}
          >
            <Banknote className="h-4 w-4 mr-1.5 inline-block" aria-hidden />
            Bank Transfer
          </button>
        </div>
      )}

      {generalError && (
        <div className="flex items-center gap-2 text-sm text-danger bg-danger/5 p-3 rounded-lg mb-4" role="alert">
          <AlertCircle className="h-4 w-4 shrink-0" aria-hidden />
          <span>{generalError}</span>
        </div>
      )}

      {method === "paystack" && (
        <form onSubmit={startPaystackPayment} className="space-y-4" noValidate>
          <Input
            name="email"
            type="email"
            required
            label="Email address"
            placeholder="you@example.com"
            hint="We send your access password to this address."
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={fieldErrors.email}
          />
          <Button type="submit" loading={loading} className="w-full">
            Pay with Paystack
          </Button>
        </form>
      )}

      {method === "bank_transfer" && !submitted && (
        <form onSubmit={submitBankTransfer} className="space-y-4" noValidate>
          <Input
            name="email"
            type="email"
            required
            label="Email address"
            placeholder="you@example.com"
            hint="We send your access password to this address after verification."
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={fieldErrors.email}
          />
          <div className="space-y-3">
            <label className="block text-sm font-medium text-text-primary">
              Select bank account
              <select
                required
                value={bankAccountId}
                onChange={(e) => setBankAccountId(e.target.value)}
                className={cn("mt-1 w-full rounded-lg border bg-surface px-3 py-2 text-sm text-text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary", fieldErrors.bankAccountId ? "border-danger" : "border-border")}
              >
                <option value="">Choose a bank account</option>
                {activeBankAccounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.bankName} — {acc.accountName} ({acc.accountNumber})
                  </option>
                ))}
              </select>
              {fieldErrors.bankAccountId && <p className="text-xs text-danger" role="alert">{fieldErrors.bankAccountId}</p>}
            </label>

            {bankAccountId && (
              <>
                <div className="space-y-2 p-3 rounded-lg bg-surface border border-border">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-text-primary">
                        {activeBankAccounts.find((a) => a.id === bankAccountId)?.bankName}
                      </p>
                      <p className="text-sm text-text-muted">
                        Account:{" "}
                        <span className="font-mono">
                          {activeBankAccounts.find((a) => a.id === bankAccountId)?.accountName}
                        </span>
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() =>
                        copyAccountNumber(
                          activeBankAccounts.find((a) => a.id === bankAccountId)?.accountNumber ?? ""
                        )
                      }
                      aria-label="Copy account number"
                    >
                      <Copy className="h-4 w-4 mr-1.5" />
                      Copy
                    </Button>
                  </div>
                  <p className="font-mono text-text-primary">
                    {activeBankAccounts.find((a) => a.id === bankAccountId)?.accountNumber}
                  </p>
                  {activeBankAccounts.find((a) => a.id === bankAccountId)?.sortCode && (
                    <p className="text-xs text-text-muted">
                      Sort code: {activeBankAccounts.find((a) => a.id === bankAccountId)?.sortCode}
                    </p>
                  )}
                  {activeBankAccounts.find((a) => a.id === bankAccountId)?.swiftCode && (
                    <p className="text-xs text-text-muted">
                      SWIFT: {activeBankAccounts.find((a) => a.id === bankAccountId)?.swiftCode}
                    </p>
                  )}
                  {activeBankAccounts.find((a) => a.id === bankAccountId)?.instructions && (
                    <p className="text-xs text-text-muted">
                      {activeBankAccounts.find((a) => a.id === bankAccountId)?.instructions}
                    </p>
                  )}
                </div>
              </>
            )}
          </div>

          <Input
            name="reference"
            label="Transfer reference"
            placeholder="e.g. TRX123456789"
            hint="The reference from your bank transfer receipt"
            value={transferReference}
            onChange={(e) => setTransferReference(e.target.value)}
            error={fieldErrors.transferReference}
          />

          <div className="space-y-2">
            <label className="block text-sm font-medium text-text-primary">
              Proof of payment (image, PDF or DOCX — max 50MB)
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,application/pdf,.docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                onChange={handleProofUpload}
                className={cn("mt-1 w-full text-sm text-text-muted file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-primary file:text-background hover:file:bg-primary-hover", fieldErrors.proofFile && "ring-1 ring-danger rounded-lg")}
              />
            </label>
            {fieldErrors.proofFile && <p className="text-xs text-danger" role="alert">{fieldErrors.proofFile}</p>}
            {proofFile && (
              <div className="flex items-center gap-2 text-sm text-text-muted">
                <CheckCircle className="h-4 w-4 text-success" />
                <span>{proofFile.name} ({(proofFile.size / 1024).toFixed(1)} KB)</span>
              </div>
            )}
          </div>

          <Button type="submit" loading={loading} className="w-full" disabled={!proofFile}>
            Submit Proof of Payment
          </Button>
        </form>
      )}

      {submitted && transferId && (
        <div className="space-y-4 animate-slide-up">
          <div className="flex items-center gap-2 text-sm text-success">
            <CheckCircle className="h-5 w-5 shrink-0" />
            <span>Proof submitted successfully! Your payment is pending verification.</span>
          </div>
          <p className="text-sm text-text-muted">
            You will receive an email with your access password once the admin verifies your payment.
            You can also check back here later to see if your access password is ready.
          </p>
          <div className="space-y-2">
            <label className="block text-sm font-medium text-text-primary">Your submission ID</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={transferId}
                readOnly
                className="flex-1 rounded-lg border border-border bg-surface px-3 py-2 text-sm font-mono text-text-primary"
                aria-label="Transfer ID"
              />
              <Button variant="secondary" size="sm" onClick={() => navigator.clipboard.writeText(transferId!)}>
                <Copy className="h-4 w-4 mr-1.5" />
                Copy
              </Button>
            </div>
            <p className="text-xs text-text-muted">Save this ID to check your verification status.</p>
          </div>
          <Button variant="secondary" className="w-full" onClick={() => router.push(`/access?transferId=${transferId}`)}>
            Check Access Status
          </Button>
        </div>
      )}

      <p className="mt-4 text-xs text-text-muted">
        {showPaystack && showBankTransfer
          ? "Secure payments processed by Paystack or direct bank transfer."
          : showPaystack
          ? "Secure payment processed by Paystack. You will also receive a receipt from Paystack by email."
          : "Direct bank transfer. Your access password will be emailed after admin verification."}
      </p>
    </Card>
  );
}