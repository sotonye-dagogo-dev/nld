// Pure pagination math (engineering principle §21 — inherent pagination).
// Client-safe, no DB/env — keeps page-range logic unit-testable.

export interface PageItem {
  type: "page" | "ellipsis";
  value: number;
}

/** Build the paginated page-number list with ellipsis for wide ranges. */
export function getPageItems(
  current: number,
  total: number,
  siblingCount = 1,
): PageItem[] {
  if (total <= 0 || current < 1) return [];
  const currentClamped = Math.min(Math.max(Math.trunc(current), 1), total);
  const totalClamped = Math.max(1, Math.trunc(total));

  // Small ranges render every page.
  if (totalClamped <= 7) {
    return Array.from({ length: totalClamped }, (_, i) => ({
      type: "page" as const,
      value: i + 1,
    }));
  }

  const leftSibling = Math.max(1, currentClamped - siblingCount);
  const rightSibling = Math.min(totalClamped, currentClamped + siblingCount);
  const showLeftEllipsis = leftSibling > 2;
  const showRightEllipsis = rightSibling < totalClamped - 1;

  const items: PageItem[] = [{ type: "page", value: 1 }];

  if (showLeftEllipsis) {
    items.push({ type: "ellipsis", value: leftSibling - 1 });
  } else if (leftSibling > 1) {
    items.push({ type: "page", value: 2 });
  }

  for (let p = leftSibling; p <= rightSibling; p++) {
    if (p === 1) continue;
    items.push({ type: "page", value: p });
  }

  if (showRightEllipsis) {
    items.push({ type: "ellipsis", value: rightSibling + 1 });
  } else if (rightSibling < totalClamped - 1) {
    items.push({ type: "page", value: totalClamped - 1 });
  }

  items.push({ type: "page", value: totalClamped });
  return items;
}

/** Total page count from total rows and page size (min 1). */
export function getPageCount(total: number, pageSize: number): number {
  const size = Math.max(1, Math.trunc(pageSize) || 1);
  const t = Math.max(0, Math.trunc(total));
  return Math.max(1, Math.ceil(t / size));
}