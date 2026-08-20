import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

// Universal Error State (§13 baseline). One component for data-loading
// failures — no per-screen error implementations.

export function ErrorState({
  title = "Something went wrong",
  message,
  retryLabel,
  onRetry,
  className,
}: {
  title?: string;
  message?: string;
  retryLabel?: string;
  onRetry?: () => void;
  className?: string;
  children?: ReactNode;
}) {
  return (
    <div
      role="alert"
      className={cn("flex flex-col items-center justify-center gap-2 rounded-xl border border-danger/40 bg-danger/5 p-10 text-center", className)}
    >
      <p className="text-lg font-semibold text-danger">{title}</p>
      {message && <p className="max-w-sm text-sm text-text-muted">{message}</p>}
      {onRetry && retryLabel && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-2 rounded-lg border border-border bg-surface px-4 py-2 text-sm font-medium text-text-primary hover:bg-background"
        >
          {retryLabel}
        </button>
      )}
    </div>
  );
}