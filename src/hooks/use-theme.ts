"use client";

import { useCallback, useEffect, useRef, useState } from "react";

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

function readStored(): Theme {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw === "light" || raw === "dark" || raw === "system" ? raw : "system";
  } catch {
    return "system";
  }
}

function applyTheme(pref: Theme) {
  const root = document.documentElement;
  root.classList.toggle("dark", resolveTheme(pref) === "dark");
  root.style.colorScheme = resolveTheme(pref);
}

/** Theme hook — light / dark / system, persisted in localStorage (§13 baseline).
 * Reads storage only after mount so SSR/hydration never differ on the first
 * paint (avoids the hydration-mismatch trap in repair-system.md). */
export function useTheme() {
  const [preference, setPreference] = useState<Theme>("system");
  const hydratedRef = useRef(false);

  useEffect(() => {
    const stored = readStored();
    hydratedRef.current = true;
    setPreference(stored);
    applyTheme(stored);

    if (stored === "system") {
      const mq = window.matchMedia("(prefers-color-scheme: dark)");
      const onChange = () => applyTheme("system");
      mq.addEventListener("change", onChange);
      return () => mq.removeEventListener("change", onChange);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!hydratedRef.current) return;
    applyTheme(preference);
    try {
      window.localStorage.setItem(STORAGE_KEY, preference);
    } catch {
      // Storage unavailable (private mode) — degrade to in-memory only.
    }

    if (preference === "system") {
      const mq = window.matchMedia("(prefers-color-scheme: dark)");
      const onChange = () => applyTheme("system");
      mq.addEventListener("change", onChange);
      return () => mq.removeEventListener("change", onChange);
    }
  }, [preference]);

  const setTheme = useCallback((next: Theme) => setPreference(next), []);
  return { theme: preference, setTheme };
}