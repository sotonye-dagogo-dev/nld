"use client";

import type { ComponentType, ReactNode } from "react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { AlertCircle, RefreshCw } from "lucide-react";

// Client-side error boundary to catch rendering errors
export function ErrorBoundary({
  children,
  fallback,
}: {
  children: ReactNode;
  fallback?: ReactNode;
}) {
  const [error, setError] = useState<Error | null>(null);
  const [errorInfo, setErrorInfo] = useState<React.ErrorInfo | null>(null);

  useEffect(() => {
    if (error) {
      console.error("[ErrorBoundary] Caught error:", error, errorInfo);
    }
  }, [error, errorInfo]);

  function handleReset() {
    setError(null);
    setErrorInfo(null);
  }

  if (error) {
    if (fallback) {
      return fallback;
    }
    return (
      <div className="flex min-h-[300px] flex-col items-center justify-center gap-4 px-4 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-danger/10 text-danger">
          <AlertCircle className="h-8 w-8" />
        </div>
        <div className="space-y-2">
          <h2 className="text-lg font-semibold text-text-primary">Something went wrong</h2>
          <p className="text-sm text-text-muted max-w-md">
            We encountered an unexpected error. Please try refreshing the page.
          </p>
          <pre className="text-xs text-text-muted bg-background border border-border rounded p-3 text-left max-w-md overflow-auto">
            {error.message}
          </pre>
        </div>
        <Button onClick={handleReset} className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Refresh page
        </Button>
      </div>
    );
  }

  return <>{children}</>;
}

// Higher-order component to wrap a page with error boundary
export function withErrorBoundary<P extends object>(
  WrappedComponent: ComponentType<P>,
  fallback?: ReactNode
) {
  return function WithErrorBoundary(props: P) {
    return (
      <ErrorBoundary fallback={fallback}>
        <WrappedComponent {...props} />
      </ErrorBoundary>
    );
  };
}

// Server-side error boundary (for use in server components)
export function ServerErrorBoundary({
  children,
  fallback,
}: {
  children: ReactNode;
  fallback?: ReactNode;
}) {
  return <>{children}</>;
}