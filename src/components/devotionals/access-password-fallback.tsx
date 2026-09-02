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

  useEffect(() => {
    let mounted = true;
    async function fetchPassword() {
      try {
        const res = await fetch(`/api/access/password?reference=${encodeURIComponent(reference)}`);
        const data = await res.json();
        if (!mounted) return;
        if (!res.ok || !data.ok) {
          setError(data.error ?? "Could not retrieve access password.");
          return;
        }
        setPassword(data.accessPassword);
      } catch {
        if (mounted) setError("Network error while fetching access password.");
      } finally {
        if (mounted) setLoading(false);
      }
    }
    fetchPassword();
    return () => { mounted = false; };
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
      <Card className="border-danger/40 bg-danger/5">
        <div className="flex items-center gap-2 text-sm text-danger">
          <AlertCircle aria-hidden className="h-4 w-4 shrink-0" />
          <span>{error ?? "Access password not available yet. Check your email."}</span>
        </div>
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