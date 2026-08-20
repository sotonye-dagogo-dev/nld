import type { Metadata } from "next";
import { getAdminSession } from "@/lib/admin-auth";
import { getSiteSettings } from "@/config/site";
import { ErrorState } from "@/components/ui/error-state";
import { SettingsEditor } from "@/components/admin/settings-editor";

export const metadata: Metadata = { title: "Admin — Settings" };
export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  const admin = await getAdminSession();
  if (!admin) {
    return (
      <ErrorState
        title="Access denied"
        message="Sign in to manage platform settings."
      />
    );
  }

  const { value: settings } = await getSiteSettings();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Settings</h1>
        <p className="text-sm text-text-muted">
          Platform name, branding, pricing defaults, and feature toggles. These
          override the code defaults used everywhere else.
        </p>
      </div>
      <SettingsEditor initial={settings} />
    </div>
  );
}