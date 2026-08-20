import type { Metadata } from "next";
import { eq } from "drizzle-orm";
import { getDb } from "@/data/db";
import { adminInvites } from "@/data/db/schema";
import { getSiteSettings } from "@/config/site";
import { ErrorState } from "@/components/ui/error-state";
import { InviteSignupForm } from "@/components/admin/invite-signup-form";

export const metadata: Metadata = { title: "Admin — Accept invitation" };

export default async function InviteSignupPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  let invite: AdminInvite | null = null;
  let loadError = false;
  try {
    const rows = await getDb()
      .select()
      .from(adminInvites)
      .where(eq(adminInvites.token, token))
      .limit(1);
    invite = rows[0] as AdminInvite | undefined ?? null;
  } catch {
    loadError = true;
  }

  if (loadError) {
    return (
      <div className="page-shell flex justify-center">
        <ErrorState
          title="Could not load the invitation"
          message="The invitation could not be verified right now. Please try again shortly."
        />
      </div>
    );
  }

  if (!invite) {
    return (
      <div className="page-shell flex justify-center">
        <ErrorState
          title="Invitation not found"
          message="This invitation link is invalid. Ask a superadmin to send a new one."
        />
      </div>
    );
  }

  if (invite.status !== "pending") {
    return (
      <div className="page-shell flex justify-center">
        <ErrorState
          title="Invitation already used"
          message="This invitation has already been accepted. Try signing in at /admin/login."
        />
      </div>
    );
  }

  if (invite.expiresAt < new Date()) {
    return (
      <div className="page-shell flex justify-center">
        <ErrorState
          title="Invitation expired"
          message="This invitation link has expired. Ask a superadmin to send a new one."
        />
      </div>
    );
  }

  const { value: settings } = await getSiteSettings();
  return <InviteSignupForm token={token} email={invite.email} platformName={settings.platformName} />;
}