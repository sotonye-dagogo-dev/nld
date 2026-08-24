import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Pagination } from "./pagination";

// Universal Table (§13 baseline). Pagination is a built-in contract (§21) —
// call sites pass page + pageSize and render rows; fetch stays paginated.

export interface TableColumn<T> {
  key: string;
  header: string;
  render?: (row: T) => ReactNode;
  align?: "left" | "right";
  cellClass?: string;
}

interface TableProps<T> {
  columns: TableColumn<T>[];
  rows: T[];
  rowKey: keyof T | string;
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  emptyMessage?: string;
}

export function Table<T>({
  columns,
  rows,
  rowKey,
  page,
  pageSize,
  total,
  onPageChange,
  emptyMessage = "No records found.",
}: TableProps<T>) {
  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-background text-left text-text-muted">
            {columns.map((c) => (
              <th
                key={c.key}
                className={cn("px-4 py-3 font-medium", c.align === "right" && "text-right")}
              >
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-4 py-10 text-center text-text-muted">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr key={String(row[rowKey as keyof T])} className="border-b border-border last:border-0 hover:bg-background/50">
                {columns.map((c) => (
                  <td key={c.key} className={cn("px-4 py-3 text-text-primary", c.align === "right" && "text-right", c.cellClass)}>
                    {c.render ? c.render(row) : String((row as Record<string, unknown>)[c.key] ?? "")}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
      <Pagination
        page={page}
        pageSize={pageSize}
        total={total}
        onPageChange={onPageChange}
        className="border-t border-border px-4 py-3"
      />
    </div>
  );
}