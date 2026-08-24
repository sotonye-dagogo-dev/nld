"use client";

import { ErrorBoundary } from "./error-boundary";
import type { ReactNode } from "react";

export function ErrorBoundaryProvider({ children }: { children: ReactNode }) {
  return <ErrorBoundary>{children}</ErrorBoundary>;
}