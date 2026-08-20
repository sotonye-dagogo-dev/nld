import type { Metadata } from "next";
import { getAdminSession, isSuperAdmin } from "@/lib/admin-auth";
import { listEmailTemplates } from "@/lib/email-templates";
import { ErrorState } from "@/components/ui/error-state";
import { EmailTemplateEditor } from "@/components/admin/email-template-editor";

export const metadata: Metadata = { title: "Admin — Email templates" };
export const dynamic = "force-dynamic";

export default async function AdminEmailTemplatesPage() {
  const admin = await getAdminSession();
  if (!admin || !isSuperAdmin(admin)) {
    return (
      <ErrorState
        title="Access denied"
        message="Only the platform owner can edit email templates."
      />
    );
  }

  let templates: EmailTemplate[] = [];
  try {
    templates = await listEmailTemplates();
  } catch {
    templates = [];
  }

  if (templates.length === 0) {
    return (
      <ErrorState
        title="No email templates"
        message="Email templates could not be loaded. Check the database connection."
      />
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Email templates</h1>
        <p className="text-sm text-text-muted">
          Edit the emails the platform sends. Use the visual blocks or raw HTML,
          and insert variables with the chips. Changes apply to the next send.
        </p>
      </div>
      <EmailTemplateEditor templates={templates} />
    </div>
  );
}