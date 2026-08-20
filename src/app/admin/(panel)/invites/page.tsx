import type { Metadata } from "next";
import { desc } from "drizzle-orm";
import { getDb } from "@/data/db";
import { adminInvites } from "@/data/db/schema";
import { getAdminSession, isSuperAdmin } from "@/lib/admin-auth";
import { ErrorState } from "@/components/ui/error-state";
import { InviteManager } from "@/components/admin/invite-manager";

export const metadata: Metadata = { title: "Admin — Invite admins" };
export const dynamic = "force-dynamic";

export default async function AdminInvitesPage() {
  const admin = await getAdminSession();
  if (!admin || !isSuperAdmin(admin)) {
    return (
      <ErrorState
        title="Access denied"
        message="Only the platform owner can invite new admins."
      />
    );
  }

  let invites: AdminInvite[] = [];
  try {
    const rows = await getDb().select().from(adminInvites).orderBy(desc(adminInvites.createdAt));
    invites = rows as AdminInvite[];
  } catch {
    invites = [];
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Invite admins</h1>
        <p className="text-sm text-text-muted">
          Send an invitation link. Invited admins sign up themselves and land on
          the panel with standard admin rights.
        </p>
      </div>
      <InviteManager initialInvites={invites} />
    </div>
  );
}