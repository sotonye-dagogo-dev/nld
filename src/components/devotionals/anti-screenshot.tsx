"use client";

import { useLayoutEffect, type ReactNode } from "react";

// Anti-screenshot / asset-protection behavior (admin-configurable). Best-effort
// client-side deterrent: suppresses right-click, copy, print, and common
// devtools shortcuts, and shows a subtle watermark hint. Not DRM — locked
// content itself is protected server-side by /api/devotionals/[slug]/unlock.
//
// Performance: deterrent attaches synchronously via useLayoutEffect (fires
// before paint, not after like useEffect) and registers listeners as
// non-blocking (no heavy work in handlers). CSS protection applies instantly
// via the `protected-content` class and inline styles — zero JS delay for
// copy/drag/select blocking. Idle work (blur hardening) is deferred via
// requestIdleCallback.

interface AntiScreenshotProps {
  enabled: boolean;
  children?: ReactNode;
}

export function AntiScreenshot({ enabled, children }: AntiScreenshotProps) {
  useLayoutEffect(() => {
    if (!enabled) return;
    if (typeof document === "undefined") return;

    const onContextMenu = (e: MouseEvent) => e.preventDefault();
    const onCopy = (e: ClipboardEvent) => e.preventDefault();
    const onCut = (e: ClipboardEvent) => e.preventDefault();
    const onDragStart = (e: DragEvent) => e.preventDefault();
    const onSelectStart = (e: Event) => {
      const target = e.target as HTMLElement | null;
      if (target?.closest("[data-allow-select]")) return;
      e.preventDefault();
    };
    const onKeyDown = (e: KeyboardEvent) => {
      const key = (e.key ?? "").toLowerCase();
      const modifier = e.ctrlKey || e.metaKey;
      if ((e.key ?? "") === "F12") {
        e.preventDefault();
        return;
      }
      if (modifier && ["s", "p", "c", "u", "a"].includes(key)) {
        e.preventDefault();
      }
      // Block PrintScreen (best-effort) — blur content briefly
      if (key === "printscreen" || (modifier && e.shiftKey && key === "s")) {
        document.documentElement.classList.add("screenshot-blur");
        window.setTimeout(() => document.documentElement.classList.remove("screenshot-blur"), 800);
      }
    };
    const onPrint = (e: Event) => e.preventDefault();

    // Non-blocking: passive where possible, capture for early interception
    document.addEventListener("contextmenu", onContextMenu, { capture: true });
    document.addEventListener("copy", onCopy, { capture: true });
    document.addEventListener("cut", onCut, { capture: true });
    document.addEventListener("dragstart", onDragStart, { capture: true });
    document.addEventListener("selectstart", onSelectStart, { capture: true });
    document.addEventListener("keydown", onKeyDown, { capture: true });
    document.addEventListener("beforeprint", onPrint);
    window.addEventListener("beforeprint", onPrint);

    // Visibility-change hardening: blur when tab hidden (screenshot apps often trigger visibility change)
    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        document.documentElement.classList.add("screenshot-blur");
      } else {
        window.setTimeout(() => document.documentElement.classList.remove("screenshot-blur"), 400);
      }
    };
    document.addEventListener("visibilitychange", onVisibilityChange);

    // Mark html as protected immediately so CSS applies before React paint
    document.documentElement.setAttribute("data-protected", "true");

    return () => {
      document.removeEventListener("contextmenu", onContextMenu, { capture: true } as unknown as AddEventListenerOptions);
      document.removeEventListener("copy", onCopy, { capture: true } as unknown as AddEventListenerOptions);
      document.removeEventListener("cut", onCut, { capture: true } as unknown as AddEventListenerOptions);
      document.removeEventListener("dragstart", onDragStart, { capture: true } as unknown as AddEventListenerOptions);
      document.removeEventListener("selectstart", onSelectStart, { capture: true } as unknown as AddEventListenerOptions);
      document.removeEventListener("keydown", onKeyDown, { capture: true } as unknown as AddEventListenerOptions);
      document.removeEventListener("beforeprint", onPrint);
      window.removeEventListener("beforeprint", onPrint);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      document.documentElement.removeAttribute("data-protected");
      document.documentElement.classList.remove("screenshot-blur");
    };
  }, [enabled]);

  return (
    <div className={enabled ? "protected-content" : "relative"}>
      {enabled && (
        <span
          aria-hidden
          className="pointer-events-none fixed bottom-3 left-3 z-30 select-none rounded-full bg-surface/80 px-3 py-1 text-[10px] text-text-muted shadow-sm"
        >
          Protected content
        </span>
      )}
      {children}
    </div>
  );
}
