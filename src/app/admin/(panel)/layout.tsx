import type { ReactNode } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSiteSettings } from "@/config/site";
import { getAdminSession, isSuperAdmin } from "@/lib/admin-auth";
import { LogoutButton } from "@/components/admin/logout-button";

// Guarded admin panel shell. Every panel route resolves the admin session
// server-side; unauthenticated or unknown users are bounced to /admin/login.
// Navigation is role-aware (§2 metadata-driven): superadmin-only links
// (invites, email templates) are omitted for standard admins.

const BASE_NAV = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/devotionals", label: "Devotionals" },
  { href: "/admin/records/payments", label: "Payments" },
  { href: "/admin/records/grants", label: "Access grants" },
  { href: "/admin/records/audit", label: "Audit log" },
  { href: "/admin/settings", label: "Settings" },
];

export default async function AdminPanelLayout({ children }: { children: ReactNode }) {
  const admin = await getAdminSession();
  if (!admin) redirect("/admin/login");

  const { value: settings } = await getSiteSettings();
  const superadmin = isSuperAdmin(admin);
  const nav = superadmin
    ? [
        ...BASE_NAV.slice(0, 2),
        { href: "/admin/invites", label: "Invite admins" },
        { href: "/admin/email-templates", label: "Email templates" },
        ...BASE_NAV.slice(2),
      ]
    : BASE_NAV;

  return (
    <div className="mx-auto flex min-h-[70vh] w-full max-w-6xl flex-col gap-6 px-4 py-8 md:flex-row">
      <aside className="shrink-0 md:w-56">
        <nav className="space-y-1 rounded-xl border border-border bg-surface p-2">
          <p className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-text-muted">
            {settings.platformName} — Admin
          </p>
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="block rounded-lg px-3 py-2 text-sm text-text-muted hover:bg-background hover:text-text-primary"
            >
              {item.label}
            </Link>
          ))}
          <div className="border-t border-border pt-2">
            <div className="flex items-center justify-between gap-2 px-3 py-2">
              <span className="min-w-0 truncate text-xs text-text-muted">
                {admin.email}
                {superadmin && (
                  <span className="ml-1 rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                    owner
                  </span>
                )}
              </span>
              <LogoutButton />
            </div>
          </div>
        </nav>
      </aside>
      <section className="min-w-0 flex-1">{children}</section>
    </div>
  );
}