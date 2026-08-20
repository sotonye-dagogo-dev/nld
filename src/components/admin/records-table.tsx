"use client";

import { useRouter } from "next/navigation";
import { Table, type TableColumn } from "@/components/ui/table";

export type { TableColumn } from "@/components/ui/table";

// Server-driven paginated table for records views. Rows are fetched and
// rendered by a server page; this thin client wrapper wires the universal
// Table's pagination to URL ?page=N so it works from server components.

export function RecordsTable<T>({
  columns,
  rows,
  rowKey,
  page,
  pageSize,
  total,
  basePath,
  emptyMessage,
}: {
  columns: TableColumn<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  page: number;
  pageSize: number;
  total: number;
  basePath: string;
  emptyMessage?: string;
}) {
  const router = useRouter();
  return (
    <Table
      columns={columns}
      rows={rows}
      rowKey={rowKey}
      page={page}
      pageSize={pageSize}
      total={total}
      onPageChange={(p) => router.push(`${basePath}?page=${p}`)}
      emptyMessage={emptyMessage}
    />
  );
}