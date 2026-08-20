"use client";

import { useCallback, useEffect, useState } from "react";

type Theme = "light" | "dark" | "system";

const STORAGE_KEY = "nld-theme";

function resolveTheme(pref: Theme): "light" | "dark" {
  if (pref === "system") {
    return typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  }
  return pref;
}

/** Theme hook — light / dark / system, persisted in localStorage (§13 baseline). */
export function useTheme() {
  const [preference, setPreference] = useState<Theme>(() => {
    if (typeof window === "undefined") return "system";
    return (localStorage.getItem(STORAGE_KEY) as Theme) ?? "system";
  });

  useEffect(() => {
    const apply = () => {
      const root = document.documentElement;
      root.classList.toggle("dark", resolveTheme(preference) === "dark");
      root.style.colorScheme = resolveTheme(preference);
    };
    apply();
    localStorage.setItem(STORAGE_KEY, preference);

    if (preference === "system") {
      const mq = window.matchMedia("(prefers-color-scheme: dark)");
      mq.addEventListener("change", apply);
      return () => mq.removeEventListener("change", apply);
    }
  }, [preference]);

  const setTheme = useCallback((next: Theme) => setPreference(next), []);
  return { theme: preference, setTheme };
}