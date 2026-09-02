"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { ChevronDown, Menu, MoreHorizontal, X } from "lucide-react";
import { Logo } from "./logo";
import { ThemeToggle } from "./theme-toggle";
import { cn } from "@/lib/utils";

// Universal Navbar (§13 baseline): responsive topnav with collapsible mobile
// menu (hamburger), a desktop overflow dropdown for links that do not fit, and
// the theme toggle. One component, config-driven — no per-page nav
// implementations. All toggles are independent (non-conflicting).

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
  const [mobileOpen, setMobileOpen] = useState(false);
  const [overflowCount, setOverflowCount] = useState(0);
  const [moreOpen, setMoreOpen] = useState(false);
  const [measured, setMeasured] = useState(false);
  const rowRef = useRef<HTMLDivElement | null>(null);
  const moreRef = useRef<HTMLDivElement | null>(null);
  const measuredRef = useRef(false);

  // Measure how many desktop links fit; the rest move into the "More"
  // dropdown. Post-mount only, so SSR is stable (no hydration mismatch).
  useEffect(() => {
    const row = rowRef.current;
    if (!row) return;
    const measure = () => {
      const gap = 4; // px
      let available = row.clientWidth;
      if (available === 0) return; // Not rendered yet
      const children = Array.from(row.children) as HTMLElement[];
      if (children.length === 0) return;
      let fits = 0;
      for (const child of children) {
        const w = child.offsetWidth + gap;
        if (available - w < 0) break;
        available -= w;
        fits += 1;
      }
      setOverflowCount(Math.max(0, links.length - fits));
      if (!measuredRef.current) {
        measuredRef.current = true;
        setMeasured(true);
      }
    };
    // Defer initial measurement to next frame to ensure layout is stable
    const rafId = requestAnimationFrame(measure);
    const ro = new ResizeObserver(measure);
    ro.observe(row);
    window.addEventListener("resize", measure);
    return () => {
      cancelAnimationFrame(rafId);
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [links.length]);

  // Close the overflow dropdown on outside click or Escape.
  useEffect(() => {
    if (!moreOpen) return;
    const onPointer = (e: PointerEvent) => {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) setMoreOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMoreOpen(false);
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [moreOpen]);

  const inlineCount = Math.max(0, links.length - overflowCount);
  const inlineLinks = links.slice(0, inlineCount);
  const overflowLinks = links.slice(inlineCount);

  const navLinkClass =
    "rounded-lg px-3 py-2 text-sm text-text-muted hover:bg-background hover:text-text-primary";

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/90 backdrop-blur">
      <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
        <Link href="/" aria-label="Home">
          <Logo name={platformName} logoUrl={logoUrl} />
        </Link>

        {/* Desktop links with overflow dropdown. */}
        {links.length > 0 && (
          <div className="hidden items-center gap-1 md:flex">
            <div ref={rowRef} className="flex items-center gap-1">
              {inlineLinks.map((link) => (
                <Link key={link.href} href={link.href} className={navLinkClass}>
                  {link.label}
                </Link>
              ))}
            </div>

            {measured && overflowLinks.length > 0 && (
              <div className="relative" ref={moreRef}>
                <button
                  type="button"
                  aria-haspopup="menu"
                  aria-expanded={moreOpen}
                  aria-label="More navigation"
                  onClick={() => setMoreOpen((o) => !o)}
                  className={cn("inline-flex items-center gap-1 rounded-lg px-3 py-2 text-sm text-text-muted hover:bg-background hover:text-text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary", moreOpen && "bg-background text-text-primary")}
                >
                  <MoreHorizontal aria-hidden className="h-4 w-4" />
                  <ChevronDown aria-hidden className="h-3.5 w-3.5" />
                </button>
                {moreOpen && (
                  <div
                    role="menu"
                    className="absolute right-0 top-full mt-2 w-52 rounded-xl border border-border bg-surface p-1 shadow-lg"
                  >
                    {overflowLinks.map((link) => (
                      <Link
                        key={link.href}
                        href={link.href}
                        role="menuitem"
                        onClick={() => setMoreOpen(false)}
                        className="block rounded-lg px-3 py-2 text-sm text-text-muted hover:bg-background hover:text-text-primary"
                      >
                        {link.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        <div className="flex items-center gap-2">
          <ThemeToggle />
          <div className="hidden md:block">{trailing}</div>
          {links.length > 0 && (
            <button
              type="button"
              aria-label={mobileOpen ? "Close menu" : "Open menu"}
              aria-expanded={mobileOpen}
              onClick={() => setMobileOpen((o) => !o)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-surface text-text-muted hover:bg-background focus:outline-none focus-visible:ring-2 focus-visible:ring-primary md:hidden"
            >
              {mobileOpen ? <X aria-hidden className="h-5 w-5" /> : <Menu aria-hidden className="h-5 w-5" />}
            </button>
          )}
        </div>
      </nav>

      {/* Mobile collapsible menu. */}
      {mobileOpen && links.length > 0 && (
        <div className="border-t border-border bg-background px-4 py-3 md:hidden">
          <div className="flex flex-col gap-1">
            {links.map((link) => (
              <Link key={link.href} href={link.href} onClick={() => setMobileOpen(false)} className={navLinkClass}>
                {link.label}
              </Link>
            ))}
            {trailing && (
              <div className="mt-1 border-t border-border pt-2">{trailing}</div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}