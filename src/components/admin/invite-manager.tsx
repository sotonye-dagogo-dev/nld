"use client";

import { useState } from "react";
import { useToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Table, type TableColumn } from "@/components/ui/table";

interface InviteRow {
  id: string;
  email: string;
  role: string;
  status: string;
  expiresAt: string;
  createdAt: string;
}

// Invite manager — create invitations (superadmin only) and list existing ones.

export function InviteManager({ initialInvites }: { initialInvites: AdminInvite[] }) {
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [invites, setInvites] = useState<InviteRow[]>(
    initialInvites.map((i) => ({
      id: i.id,
      email: i.email,
      role: i.role,
      status: i.status,
      expiresAt: i.expiresAt.toISOString().slice(0, 10),
      createdAt: i.createdAt.toISOString().slice(0, 10),
    })),
  );

  async function invite(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/admin/invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = (await res.json()) as { ok: boolean; error?: string };
      if (!res.ok || !data.ok) {
        toast(data.error ?? "Could not send the invitation.", "error");
        return;
      }
      toast("Invitation sent by email.", "success");
      setEmail("");
      const list = (await fetch("/api/admin/invites").then((r) => r.json())) as {
        ok: boolean;
        invites?: AdminInvite[];
      };
      if (list.ok && list.invites) {
        setInvites(
          list.invites.map((i) => ({
            id: i.id,
            email: i.email,
            role: i.role,
            status: i.status,
            expiresAt: i.expiresAt.toISOString().slice(0, 10),
            createdAt: i.createdAt.toISOString().slice(0, 10),
          })),
        );
      }
    } catch {
      toast("Network error while sending the invitation.", "error");
    } finally {
      setLoading(false);
    }
  }

  const columns: TableColumn<InviteRow>[] = [
    { key: "email", header: "Email" },
    { key: "role", header: "Role" },
    { key: "status", header: "Status" },
    { key: "expiresAt", header: "Expires" },
    { key: "createdAt", header: "Created" },
  ];

  return (
    <div className="space-y-6">
      <Card>
        <form onSubmit={invite} className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            <Input
              name="inviteEmail"
              type="email"
              required
              label="Email to invite"
              placeholder="colleague@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <Button type="submit" loading={loading}>
            Send invitation
          </Button>
        </form>
      </Card>

      <Table
        columns={columns}
        rows={invites}
        rowKey="id"
        page={1}
        pageSize={50}
        total={invites.length}
        onPageChange={() => undefined}
        emptyMessage="No invitations sent yet."
      />
    </div>
  );
}