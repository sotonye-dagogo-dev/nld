import type { ReactNode } from "react";
import Link from "next/link";
import { Logo } from "./logo";
import { ThemeToggle } from "./theme-toggle";

// Universal Navbar (§13 baseline): responsive topnav with collapsible mobile
// menu, logo from config, optional nav links, theme toggle. One component,
// config-driven — no per-page nav implementations.

interface NavLink {
  href: string;
  label: string;
}

interface NavbarProps {
  platformName: string;
  logoUrl?: string;
  links?: NavLink[];
  trailing?: ReactNode; // e.g. "Admin" link or auth button
}

export function Navbar({ platformName, logoUrl, links = [], trailing }: NavbarProps) {
  return (
    <header className="sticky top-0 z-20 border-b border-border bg-background/90 backdrop-blur">
      <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
        <Link href="/" aria-label="Home">
          <Logo name={platformName} logoUrl={logoUrl} />
        </Link>

        {links.length > 0 && (
          <div className="hidden items-center gap-1 md:flex">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-lg px-3 py-2 text-sm text-text-muted hover:bg-background hover:text-text-primary"
              >
                {link.label}
              </Link>
            ))}
          </div>
        )}

        <div className="flex items-center gap-2">
          <ThemeToggle />
          {trailing}
        </div>
      </nav>
    </header>
  );
}