"use client";

import { useState } from "react";
import { useToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Table, type TableColumn } from "@/components/ui/table";
import { Modal } from "@/components/ui/modal";
import { Copy } from "lucide-react";

interface AdminInvite {
  id: string;
  email: string;
  role: string;
  status: string;
  expiresAt: Date;
  createdAt: Date;
}

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
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteLink, setInviteLink] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [emailSent, setEmailSent] = useState(true);

  async function invite(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/admin/invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = (await res.json()) as { ok: boolean; error?: string; token?: string; inviteUrl?: string; emailSent?: boolean };
      if (!res.ok || !data.ok) {
        toast(data.error ?? "Could not send the invitation.", "error");
        return;
      }
      if (data.inviteUrl) {
        setInviteLink(data.inviteUrl);
        setInviteEmail(email);
        setEmailSent(data.emailSent ?? true);
        setShowInviteModal(true);
      }
      toast(data.emailSent ? "Invitation sent by email." : "Invitation created (email delivery failed — link shown below).", data.emailSent ? "success" : "info");
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

  async function copyInviteLink() {
    try {
      await navigator.clipboard.writeText(inviteLink);
      toast("Invite link copied to clipboard.", "success");
    } catch {
      toast("Failed to copy link.", "error");
    }
  }

  async function resendInviteEmail(token: string, email: string) {
    try {
      const res = await fetch("/api/admin/invites/resend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, email }),
      });
      const data = (await res.json()) as { ok: boolean; error?: string };
      if (!res.ok || !data.ok) {
        toast(data.error ?? "Could not resend invitation.", "error");
        return;
      }
      toast("Invitation email resent.", "success");
    } catch {
      toast("Network error while resending.", "error");
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

      <Modal
        open={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        title="Invitation Created"
      >
        <div className="space-y-4">
          <p className="text-sm text-text-muted">
            An invitation has been created for <strong>{inviteEmail}</strong>.
            {emailSent ? " The invitation email has been sent." : " Email delivery failed — please share the link manually."}
          </p>
          <div className="space-y-2">
            <label className="block text-sm font-medium text-text-primary">Invitation Link</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={inviteLink}
                readOnly
                className="flex-1 rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-primary font-mono"
              />
              <Button variant="secondary" size="sm" onClick={copyInviteLink} aria-label="Copy invite link">
                <Copy aria-hidden className="h-4 w-4" />
                <span className="hidden sm:inline">Copy</span>
              </Button>
            </div>
            <p className="text-xs text-text-muted">Share this link with the invitee. It expires in 7 days.</p>
          </div>
          {!emailSent && (
            <div className="border-t border-border pt-4">
              <p className="text-sm text-text-muted mb-2">Email delivery failed. You can retry sending the email:</p>
              <Button variant="secondary" size="sm" onClick={() => resendInviteEmail(inviteLink.split("/").pop() ?? "", inviteEmail)}>
                Resend Email
              </Button>
            </div>
          )}
          <div className="flex justify-end pt-2">
            <Button variant="secondary" onClick={() => setShowInviteModal(false)}>Close</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}