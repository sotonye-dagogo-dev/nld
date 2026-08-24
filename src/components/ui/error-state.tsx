"use client";

import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

// Universal Error State (§13 baseline). One component for data-loading
// failures — no per-screen error implementations. Uses client-side navigation
// for retry to avoid server-to-client function passing.

export function ErrorState({
  title = "Something went wrong",
  message,
  retryLabel,
  retryHref,
  className,
  children,
}: {
  title?: string;
  message?: string;
  retryLabel?: string;
  retryHref?: string;
  className?: string;
  children?: ReactNode;
}) {
  const router = useRouter();

  function handleRetry() {
    if (retryHref) {
      router.push(retryHref);
    }
  }

  return (
    <div
      role="alert"
      className={cn("flex flex-col items-center justify-center gap-2 rounded-xl border border-danger/40 bg-danger/5 p-10 text-center", className)}
    >
      <p className="text-lg font-semibold text-danger">{title}</p>
      {message && <p className="max-w-sm text-sm text-text-muted">{message}</p>}
      {retryLabel && retryHref && (
        <button
          type="button"
          onClick={handleRetry}
          className="mt-2 rounded-lg border border-border bg-surface px-4 py-2 text-sm font-medium text-text-primary hover:bg-background"
        >
          {retryLabel}
        </button>
      )}
      {children}
    </div>
  );
}