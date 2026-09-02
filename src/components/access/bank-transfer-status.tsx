"use client";

import { useEffect, useState } from "react";
import { useToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Copy, CheckCircle, AlertCircle, Loader2, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface BankTransferStatusProps {
  transferId: string;
}

export function BankTransferStatus({ transferId }: BankTransferStatusProps) {
  const { toast } = useToast();
  const [status, setStatus] = useState<"pending" | "verified" | "rejected" | "not_found">("pending");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [accessPassword, setAccessPassword] = useState<string | null>(null);
  const [devotionalTitle, setDevotionalTitle] = useState("");
  const [devotionalSlug, setDevotionalSlug] = useState("");
  const [copied, setCopied] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");

  useEffect(() => {
    let mounted = true;
    async function checkStatus() {
      try {
        const res = await fetch(`/api/bank-transfer/status?transferId=${encodeURIComponent(transferId)}`);
        const data = await res.json();
        if (!mounted) return;
        if (!res.ok || !data.ok) {
          setStatus("not_found");
          setError(data.error ?? "Transfer not found.");
          return;
        }
        setStatus(data.status);
        setDevotionalTitle(data.devotionalTitle ?? "");
        setDevotionalSlug(data.devotionalSlug ?? "");
        if (data.status === "verified" && data.accessPassword) {
          setAccessPassword(data.accessPassword);
        }
        if (data.status === "rejected") {
          setRejectionReason(data.rejectionReason ?? "");
        }
      } catch {
        if (mounted) setError("Network error while checking status.");
      } finally {
        if (mounted) setLoading(false);
      }
    }
    checkStatus();
    return () => { mounted = false; };
  }, [transferId]);

  if (loading) {
    return (
      <Card className="border-primary/40 bg-primary/5 animate-pulse">
        <div className="flex items-center gap-2 text-sm text-primary">
          <div className="h-4 w-4 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          <span>Checking verification status...</span>
        </div>
      </Card>
    );
  }

  if (error || status === "not_found") {
    return (
      <Card className="border-danger/40 bg-danger/5">
        <div className="flex items-center gap-2 text-sm text-danger">
          <AlertCircle aria-hidden className="h-4 w-4 shrink-0" />
          <span>{error ?? "Transfer not found. Please check your submission ID."}</span>
        </div>
      </Card>
    );
  }

  if (status === "pending") {
    return (
      <Card className="border-warning/40 bg-warning/5">
        <div className="flex items-center gap-2 text-sm text-warning">
          <Loader2 className="h-4 w-4 animate-spin shrink-0" />
          <span>Your payment is still being verified. Please check back later.</span>
        </div>
        <p className="mt-2 text-xs text-text-muted">Verification typically takes a few hours during business hours.</p>
      </Card>
    );
  }

  if (status === "rejected") {
    return (
      <Card className="border-danger/40 bg-danger/5">
        <div className="flex items-center gap-2 text-sm text-danger">
          <XCircle className="h-4 w-4 shrink-0" />
          <span>Your payment could not be verified.</span>
        </div>
        {rejectionReason && (
          <p className="mt-2 text-sm text-text-muted">Reason: {rejectionReason}</p>
        )}
        <p className="mt-2 text-xs text-text-muted">If you believe this is an error, contact support with your transfer reference.</p>
      </Card>
    );
  }

  async function copyPassword() {
    try {
      await navigator.clipboard.writeText(accessPassword!);
      setCopied(true);
      toast("Access password copied to clipboard!", "success");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast("Failed to copy password.", "error");
    }
  }

  if (status === "verified" && !accessPassword) {
    return (
      <Card className="border-warning/40 bg-warning/5">
        <div className="flex items-center gap-2 text-sm text-warning">
          <Loader2 className="h-4 w-4 animate-spin shrink-0" />
          <span>Loading access password...</span>
        </div>
      </Card>
    );
  }

  return (
    <Card className={cn("border-success/40 bg-success/5", "animate-slide-up")}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 text-sm font-medium text-success">
            <CheckCircle aria-hidden className="h-4 w-4 shrink-0" />
            <span>Payment verified! Your access password is ready.</span>
          </div>
          <p className="mt-2 text-sm text-text-muted">
            Use this password to unlock <strong>{devotionalTitle}</strong> on the{" "}
            <a href="/access" className="underline hover:text-primary">access page</a>
            {" or below."}
          </p>
          <div className="mt-4 flex flex-col sm:flex-row gap-2">
            <div className="flex-1 flex gap-2">
              <input
                type="text"
                value={accessPassword!}
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
              href={`/access?slug=${encodeURIComponent(devotionalSlug)}&email=&password=${encodeURIComponent(accessPassword!)}`}
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