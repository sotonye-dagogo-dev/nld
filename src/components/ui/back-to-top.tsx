"use client";

import { useEffect, useState } from "react";
import { ArrowUp } from "lucide-react";

// Global back-to-top affordance (§13 baseline). Mounted once in the root
// layout; non-blocking — renders nothing until the user scrolls past the
// threshold, then appears as a fixed button. Client-only, zero layout impact.

const SHOW_THRESHOLD = 400;

export function BackToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > SHOW_THRESHOLD);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (!visible) return null;

  return (
    <button
      type="button"
      aria-label="Back to top"
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      className="fixed bottom-4 right-4 z-30 inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-surface text-text-muted shadow-md transition-colors hover:bg-background hover:text-text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
    >
      <ArrowUp aria-hidden className="h-5 w-5" />
    </button>
  );
}