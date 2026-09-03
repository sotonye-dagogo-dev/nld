"use client";

import { useState } from "react";
import { useToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Table, type TableColumn } from "@/components/ui/table";
import { Modal } from "@/components/ui/modal";
import { Copy, Eye, EyeOff } from "lucide-react";

interface GrantRow {
  id: string;
  email: string;
  devotional: string;
  status: string;
  password: string;
  granted: string;
  expires: string;
}

interface GrantsTableProps {
  rows: GrantRow[];
  page: number;
  pageSize: number;
  total: number;
  basePath: string;
  emptyMessage?: string;
}

export function GrantsTable({
  rows,
  page,
  pageSize,
  total,
  basePath,
  emptyMessage,
}: GrantsTableProps) {
  const { toast } = useToast();
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [selectedGrant, setSelectedGrant] = useState<GrantRow | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  function copyPassword() {
    if (!selectedGrant) return;
    navigator.clipboard.writeText(selectedGrant.password);
    toast("Access password copied to clipboard.", "success");
  }

  const columns: TableColumn<GrantRow>[] = [
    { key: "email", header: "Email" },
    { key: "devotional", header: "Devotional" },
    { key: "status", header: "Status" },
    { key: "granted", header: "Granted" },
    { key: "expires", header: "Expires" },
    {
      key: "actions",
      header: "Actions",
      cellClass: "text-right",
      render: (row) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setSelectedGrant(row);
            setShowPassword(false);
            setShowPasswordModal(true);
          }}
          aria-label={`View access password for ${row.email}`}
        >
          <Eye aria-hidden className="h-4 w-4" />
        </Button>
      ),
    },
  ];

  return (
    <>
      <Table
        columns={columns}
        rows={rows}
        rowKey="id"
        page={page}
        pageSize={pageSize}
        total={total}
        onPageChange={(p) => {
          const url = new URL(window.location.href);
          url.searchParams.set("page", String(p));
          window.history.pushState({}, "", url);
          window.location.reload();
        }}
        emptyMessage={emptyMessage}
      />
      <Modal
        open={showPasswordModal}
        onClose={() => setShowPasswordModal(false)}
        title="Access Password"
      >
        <div className="space-y-4">
          {selectedGrant && (
            <>
              <p className="text-sm text-text-muted">
                Access password for <strong>{selectedGrant.email}</strong> on <strong>{selectedGrant.devotional}</strong>
              </p>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-text-primary">Access Password</label>
                <div className="flex gap-2">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={selectedGrant.password}
                    readOnly
                    className="flex-1 rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-primary font-mono"
                  />
                  <Button variant="secondary" size="sm" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? "Hide password" : "Show password"}>
                    {showPassword ? <EyeOff aria-hidden className="h-4 w-4" /> : <Eye aria-hidden className="h-4 w-4" />}
                  </Button>
                  <Button variant="secondary" size="sm" onClick={copyPassword} aria-label="Copy password">
                    <Copy aria-hidden className="h-4 w-4" />
                    <span className="hidden sm:inline">Copy</span>
                  </Button>
                </div>
                <p className="text-xs text-text-muted">This password was emailed to the purchaser. Use the copy button to share it manually if needed.</p>
              </div>
            </>
          )}
          <div className="flex justify-end pt-2">
            <Button variant="secondary" onClick={() => setShowPasswordModal(false)}>Close</Button>
          </div>
        </div>
      </Modal>
    </>
  );
}