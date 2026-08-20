"use client";

import { useTheme } from "@/hooks/use-theme";

// Universal Theme Toggle (§13 baseline). Light / dark / system cycle.

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  const next = theme === "light" ? "dark" : theme === "dark" ? "system" : "light";
  const label =
    theme === "light" ? "Light" : theme === "dark" ? "Dark" : "System";

  return (
    <button
      type="button"
      aria-label={`Theme: ${label}. Switch to ${next}.`}
      onClick={() => setTheme(next)}
      className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-2.5 py-1.5 text-sm text-text-muted hover:bg-background focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
    >
      <span aria-hidden>{theme === "light" ? "☀" : theme === "dark" ? "☾" : "◐"}</span>
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}