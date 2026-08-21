import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { getPageCount, getPageItems } from "@/lib/pagination";

// Universal Pagination (§13 baseline, §21 inherent pagination). One component
// for every paginated view — list pages use hrefForPage (server-rendered
// links), client-side tables use onPageChange (buttons). Hidden entirely when
// there is a single page so call sites stay clean.

interface PaginationProps {
  page: number;
  pageSize: number;
  total: number;
  /** When provided, page numbers render as links (server-driven navigation). */
  hrefForPage?: (page: number) => string;
  /** When provided, page numbers render as buttons (client-side navigation). */
  onPageChange?: (page: number) => void;
  className?: string;
  "aria-label"?: string;
}

export function Pagination({
  page,
  pageSize,
  total,
  hrefForPage,
  onPageChange,
  className,
  "aria-label": ariaLabel = "Pagination",
}: PaginationProps) {
  const pageCount = getPageCount(total, pageSize);
  const current = Math.min(Math.max(1, Math.trunc(page) || 1), pageCount);
  if (pageCount <= 1) return null;

  const items = getPageItems(current, pageCount);

  const itemClass = (active: boolean) =>
    cn(
      "inline-flex h-8 min-w-8 items-center justify-center rounded-lg px-2 text-sm",
      active
        ? "bg-primary text-white"
        : "border border-border bg-surface text-text-muted hover:bg-background hover:text-text-primary",
    );

  const renderPage = (item: { type: "page" | "ellipsis"; value: number }) => {
    if (item.type === "ellipsis") {
      return (
        <span key={`e-${item.value}`} aria-hidden className="inline-flex h-8 min-w-8 items-center justify-center text-sm text-text-muted">
          …
        </span>
      );
    }
    const active = item.value === current;
    if (hrefForPage) {
      return (
        <Link
          key={item.value}
          href={hrefForPage(item.value)}
          aria-current={active ? "page" : undefined}
          aria-label={`Page ${item.value}`}
          className={itemClass(active)}
        >
          {item.value}
        </Link>
      );
    }
    return (
      <button
        key={item.value}
        type="button"
        aria-current={active ? "page" : undefined}
        aria-label={`Page ${item.value}`}
        disabled={active}
        onClick={() => onPageChange?.(item.value)}
        className={itemClass(active)}
      >
        {item.value}
      </button>
    );
  };

  const navIconClass =
    "inline-flex h-8 items-center justify-center gap-1 rounded-lg border border-border bg-surface px-2 text-sm text-text-muted hover:bg-background hover:text-text-primary disabled:cursor-not-allowed disabled:opacity-40";

  return (
    <nav aria-label={ariaLabel} className={cn("flex flex-wrap items-center justify-between gap-2", className)}>
      <p className="text-sm text-text-muted">
        Page {current} of {pageCount}
      </p>
      <div className="flex flex-wrap items-center gap-1">
        {hrefForPage && current > 1 ? (
          <Link href={hrefForPage(current - 1)} aria-label="Previous page" className={navIconClass}>
            <ChevronLeft aria-hidden className="h-4 w-4" />
            <span className="hidden sm:inline">Previous</span>
          </Link>
        ) : (
          <button type="button" aria-label="Previous page" disabled={current <= 1} onClick={() => onPageChange?.(current - 1)} className={navIconClass}>
            <ChevronLeft aria-hidden className="h-4 w-4" />
            <span className="hidden sm:inline">Previous</span>
          </button>
        )}

        <div className="hidden items-center gap-1 sm:flex">{items.map(renderPage)}</div>

        {hrefForPage && current < pageCount ? (
          <Link href={hrefForPage(current + 1)} aria-label="Next page" className={navIconClass}>
            <span className="hidden sm:inline">Next</span>
            <ChevronRight aria-hidden className="h-4 w-4" />
          </Link>
        ) : (
          <button type="button" aria-label="Next page" disabled={current >= pageCount} onClick={() => onPageChange?.(current + 1)} className={navIconClass}>
            <span className="hidden sm:inline">Next</span>
            <ChevronRight aria-hidden className="h-4 w-4" />
          </button>
        )}
      </div>
    </nav>
  );
}