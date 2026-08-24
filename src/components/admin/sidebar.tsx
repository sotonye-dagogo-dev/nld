"use client";

import { useState } from "react";
import Link from "next/link";
import {
  BarChart3,
  BookOpen,
  CreditCard,
  KeyRound,
  LayoutDashboard,
  LogOut,
  Mail,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  ScrollText,
  Settings,
  UserPlus,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface AdminNavItem {
  href: string;
  label: string;
}

interface AdminSidebarProps {
  platformName: string;
  nav: AdminNavItem[];
  email: string;
  superadmin: boolean;
}

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  "/admin": LayoutDashboard,
  "/admin/analytics": BarChart3,
  "/admin/devotionals": BookOpen,
  "/admin/invites": UserPlus,
  "/admin/email-templates": Mail,
  "/admin/records/payments": CreditCard,
  "/admin/records/grants": KeyRound,
  "/admin/records/audit": ScrollText,
  "/admin/settings": Settings,
};

const linkClass =
  "flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-text-muted hover:bg-background hover:text-text-primary";

function NavLinks({
  nav,
  collapsed,
  onNavigate,
}: {
  nav: AdminNavItem[];
  collapsed?: boolean;
  onNavigate?: () => void;
}) {
  return (
    <div className="space-y-1">
      {nav.map((item) => {
        const Icon = ICONS[item.href] ?? LayoutDashboard;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            title={collapsed ? item.label : undefined}
            aria-label={collapsed ? item.label : undefined}
            className={cn(linkClass, collapsed && "justify-center px-2")}
          >
            <Icon aria-hidden className="h-4 w-4 shrink-0" />
            {!collapsed && <span className="min-w-0 truncate">{item.label}</span>}
          </Link>
        );
      })}
    </div>
  );
}

export function AdminSidebar({ platformName, nav, email, superadmin }: AdminSidebarProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  async function logout() {
    setLoggingOut(true);
    try {
      await fetch("/api/admin/auth/logout", { method: "POST" });
    } catch {
    }
    toast("Signed out.", "info");
    router.push("/admin/login");
  }

  return (
    <>
      <div className="mb-4 flex items-center justify-between md:hidden">
        <button
          type="button"
          aria-label={drawerOpen ? "Close menu" : "Open menu"}
          aria-expanded={drawerOpen}
          onClick={() => setDrawerOpen((o) => !o)}
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-surface text-text-muted hover:bg-background focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          {drawerOpen ? <X aria-hidden className="h-5 w-5" /> : <Menu aria-hidden className="h-5 w-5" />}
        </button>
        <span className="text-sm font-semibold text-text-primary">{platformName} — Admin</span>
      </div>

      {drawerOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setDrawerOpen(false)} aria-hidden />
          <div className="relative z-10 flex h-full w-72 flex-col border-r border-border bg-surface p-3 shadow-xl">
            <div className="mb-3 px-3 pt-2 text-sm font-semibold text-text-primary">
              {platformName} — Admin
            </div>
            <NavLinks nav={nav} onNavigate={() => setDrawerOpen(false)} />
            <div className="mt-auto border-t border-border pt-2">
              <div className="flex items-center justify-between gap-2 px-3 py-2">
                <span className="min-w-0 truncate text-xs text-text-muted">
                  {email}
                  {superadmin && (
                    <span className="ml-1 rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                      owner
                    </span>
                  )}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  loading={loggingOut}
                  onClick={logout}
                  aria-label="Sign out"
                >
                  <LogOut aria-hidden className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      <aside
        className={cn(
          "hidden shrink-0 rounded-xl border border-border bg-surface p-2 transition-[width] duration-200 md:block",
          collapsed ? "md:w-14" : "md:w-56",
        )}
      >
        <div className="flex items-center justify-between px-3 py-2">
          {!collapsed && (
            <p className="truncate text-xs font-semibold uppercase tracking-wide text-text-muted">
              {platformName} — Admin
            </p>
          )}
          <button
            type="button"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            onClick={() => setCollapsed((c) => !c)}
            className="rounded-lg p-1 text-text-muted hover:bg-background hover:text-text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            {collapsed ? (
              <PanelLeftOpen aria-hidden className="h-4 w-4" />
            ) : (
              <PanelLeftClose aria-hidden className="h-4 w-4" />
            )}
          </button>
        </div>
        <NavLinks nav={nav} collapsed={collapsed} />
        <div className="mt-2 border-t border-border pt-2">
          {collapsed ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              loading={loggingOut}
              onClick={logout}
              aria-label="Sign out"
              title="Sign out"
              className={cn(linkClass, "w-full justify-center px-2")}
            >
              <LogOut aria-hidden className="h-4 w-4" />
            </Button>
          ) : (
            <div className="flex items-center gap-2 px-3 py-2 min-w-0">
              <span className="min-w-0 flex-1 text-xs text-text-muted break-all">
                {email}
                {superadmin && (
                  <span className="ml-1 rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                    owner
                  </span>
                )}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                loading={loggingOut}
                onClick={logout}
                aria-label="Sign out"
                className="shrink-0"
              >
                <LogOut aria-hidden className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}