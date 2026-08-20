import type { ReactNode } from "react";
import Link from "next/link";
import { getSiteSettings } from "@/config/site";

// Admin shell — sidebar navigation. Auth guard is wired in Sprint 2 (Supabase
// Auth); this scaffold renders the shell and shows the intended structure.

const NAV = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/devotionals", label: "Devotionals" },
  { href: "/admin/analytics", label: "Analytics" },
];

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const { value: settings } = await getSiteSettings();

  return (
    <div className="mx-auto flex min-h-[70vh] w-full max-w-6xl flex-col gap-6 px-4 py-8 md:flex-row">
      <aside className="shrink-0 md:w-56">
        <nav className="space-y-1 rounded-xl border border-border bg-surface p-2">
          <p className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-text-muted">
            {settings.platformName} — Admin
          </p>
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="block rounded-lg px-3 py-2 text-sm text-text-muted hover:bg-background hover:text-text-primary"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>
      <section className="min-w-0 flex-1">{children}</section>
    </div>
  );
}