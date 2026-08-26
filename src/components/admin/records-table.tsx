"use client";

import { useRouter } from "next/navigation";
import { Table, type TableColumn } from "@/components/ui/table";

export type { TableColumn } from "@/components/ui/table";
export interface SimpleColumn {
  key: string;
  header: string;
  align?: "left" | "right";
  cellClass?: string;
}

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
  columns: SimpleColumn[];
  rows: T[];
  rowKey: keyof T | string;
  page: number;
  pageSize: number;
  total: number;
  basePath: string;
  emptyMessage?: string;
}) {
  const router = useRouter();
  
  // Convert simple columns to TableColumn (without render functions)
  const tableColumns: TableColumn<T>[] = columns.map((c) => ({
    key: c.key,
    header: c.header,
    align: c.align,
    cellClass: c.cellClass,
  }));

  return (
    <Table
      columns={tableColumns}
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