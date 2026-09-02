import type { ReactNode } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSiteSettings } from "@/config/site";
import { getAdminSession, isSuperAdmin } from "@/lib/admin-auth";
import { AdminSidebar, type AdminNavItem } from "@/components/admin/sidebar";
import { AdminErrorBoundary } from "@/components/admin/admin-error-boundary";

// Guarded admin panel shell. Every panel route resolves the admin session
// server-side; unauthenticated or unknown users are bounced to /admin/login.
// Navigation is role-aware (§2 metadata-driven): superadmin-only links
// (invites, email templates) are omitted for standard admins. The sidebar
// itself (mobile drawer + desktop collapse) is a single client component.

const BASE_NAV: AdminNavItem[] = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/analytics", label: "Analytics" },
  { href: "/admin/devotionals", label: "Devotionals" },
];

const SUPERADMIN_NAV: AdminNavItem[] = [
  { href: "/admin/invites", label: "Invite admins" },
  { href: "/admin/email-templates", label: "Email templates" },
];

const RECORDS_NAV: AdminNavItem[] = [
  { href: "/admin/records/payments", label: "Payments" },
  { href: "/admin/records/bank-transfers", label: "Bank transfers" },
  { href: "/admin/records/grants", label: "Access grants" },
  { href: "/admin/records/audit", label: "Audit log" },
];

const ADMIN_NAV: AdminNavItem[] = [{ href: "/admin/settings", label: "Settings" }];

function AdminPanelLayoutInner({
  children,
  settings,
  admin,
  superadmin,
}: {
  children: ReactNode;
  settings: Awaited<ReturnType<typeof getSiteSettings>>["value"];
  admin: NonNullable<Awaited<ReturnType<typeof getAdminSession>>>;
  superadmin: boolean;
}) {
  const nav = superadmin
    ? [...BASE_NAV, ...SUPERADMIN_NAV, ...RECORDS_NAV, ...ADMIN_NAV]
    : [...BASE_NAV, ...RECORDS_NAV, ...ADMIN_NAV];

  return (
    <AdminErrorBoundary>
      <div className="mx-auto flex min-h-[70vh] w-full max-w-6xl flex-col gap-6 px-4 py-8 md:flex-row">
        <AdminSidebar
          platformName={settings.platformName}
          nav={nav}
          email={admin.email}
          superadmin={superadmin}
        />
        <section className="min-w-0 flex-1">{children}</section>
      </div>
    </AdminErrorBoundary>
  );
}

export default async function AdminPanelLayout({ children }: { children: ReactNode }) {
  const admin = await getAdminSession();
  if (!admin) {
    redirect("/admin/login");
  }

  const { value: settings } = await getSiteSettings();
  const superadmin = isSuperAdmin(admin);

  return (
    <AdminPanelLayoutInner settings={settings} admin={admin} superadmin={superadmin}>
      {children}
    </AdminPanelLayoutInner>
  );
}