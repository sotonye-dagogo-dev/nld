"use client";

import { useEffect, useState } from "react";
import { useToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Copy, CheckCircle, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface AccessPasswordFallbackProps {
  reference: string;
  devotionalSlug: string;
}

export function AccessPasswordFallback({ reference, devotionalSlug }: AccessPasswordFallbackProps) {
  const { toast } = useToast();
  const [password, setPassword] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isPending, setIsPending] = useState(false);

  async function verifyAndFetch() {
    setLoading(true);
    setError(null);
    setIsPending(false);
    try {
      const verifyOne = async (path: string) => {
        try {
          const r = await fetch(`${path}?reference=${encodeURIComponent(reference)}`);
          await r.json().catch(() => null);
        } catch {}
      };
      // Preferred: unified verify that dispatch by stored processor (avoids wrong-gateway 502 noise)
      await verifyOne("/api/payment/verify");
      // Legacy fallback: keep both processor endpoints for resilience (now processor-aware, so cheap)
      await verifyOne("/api/paystack/verify");
      await verifyOne("/api/budpay/verify");

      const res = await fetch(`/api/access/password?reference=${encodeURIComponent(reference)}`);
      const data = await res.json().catch(() => null);
      if (res.status === 202) {
        setIsPending(true);
        setError(data?.error ?? "Payment pending — awaiting verification. Please wait a moment and refresh.");
        return;
      }
      if (!res.ok || !data?.ok) {
        if (res.status === 403) {
          setError(data?.error ?? "Purchase not completed — payment was cancelled or failed. Please try again.");
        } else {
          setError(data?.error ?? "Could not retrieve access password.");
        }
        return;
      }
      setPassword(data.accessPassword);
    } catch {
      setError("Network error while fetching access password.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    verifyAndFetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reference]);

  if (loading) {
    return (
      <Card className="border-primary/40 bg-primary/5 animate-pulse">
        <div className="flex items-center gap-2 text-sm text-primary">
          <div className="h-4 w-4 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          <span>Fetching your access password...</span>
        </div>
      </Card>
    );
  }

  if (error || !password) {
    return (
      <Card className={isPending ? "border-warning/40 bg-warning/5" : "border-danger/40 bg-danger/5"}>
        <div className="flex items-center gap-2 text-sm">
          <AlertCircle aria-hidden className={isPending ? "h-4 w-4 shrink-0 text-warning" : "h-4 w-4 shrink-0 text-danger"} />
          <span className={isPending ? "text-warning" : "text-danger"}>{error ?? "Access password not available yet. Check your email."}</span>
        </div>
        {isPending && (
          <Button variant="secondary" size="sm" className="mt-3" onClick={verifyAndFetch}>
            Retry verification
          </Button>
        )}
      </Card>
    );
  }

  async function copyPassword() {
    try {
      await navigator.clipboard.writeText(password!);
      setCopied(true);
      toast("Access password copied to clipboard!", "success");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast("Failed to copy password.", "error");
    }
  }

  return (
    <Card className={cn("border-success/40 bg-success/5", "animate-slide-up")}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 text-sm font-medium text-success">
            <CheckCircle aria-hidden className="h-4 w-4 shrink-0" />
            <span>Payment successful! Your access password is ready.</span>
          </div>
          <p className="mt-2 text-sm text-text-muted">
            Use this password to unlock <strong>{devotionalSlug}</strong> on the{" "}
            <a href="/access" className="underline hover:text-primary">access page</a>
            {" or below."}
          </p>
          <div className="mt-4 flex flex-col sm:flex-row gap-2">
            <div className="flex-1 flex gap-2">
              <input
                type="text"
                value={password}
                readOnly
                className="flex-1 rounded-lg border border-border bg-surface px-3 py-2 text-sm font-mono text-text-primary"
                aria-label="Access password"
              />
              <Button variant="secondary" size="sm" onClick={copyPassword} aria-label={copied ? "Copied!" : "Copy password"}>
                {copied ? (
                  <>
                    <CheckCircle aria-hidden className="h-4 w-4" />
                    <span className="hidden sm:inline">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy aria-hidden className="h-4 w-4" />
                    <span className="hidden sm:inline">Copy</span>
                  </>
                )}
              </Button>
            </div>
            <a
              href={`/access?slug=${encodeURIComponent(devotionalSlug)}&email=&password=${encodeURIComponent(password!)}`}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-background text-center hover:bg-primary-hover"
            >
              Unlock now
            </a>
          </div>
        </div>
      </div>
    </Card>
  );
}