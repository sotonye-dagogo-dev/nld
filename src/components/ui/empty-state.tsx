import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

// Universal Empty State (§13 baseline). Shown when a list/feed has no data.

export function EmptyState({
  title,
  description,
  action,
  className,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border p-10 text-center", className)}>
      <p className="text-lg font-semibold text-text-primary">{title}</p>
      {description && <p className="max-w-sm text-sm text-text-muted">{description}</p>}
      {action}
    </div>
  );
}