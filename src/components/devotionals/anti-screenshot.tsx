"use client";

import { useEffect, type ReactNode } from "react";

// Anti-screenshot / asset-protection behavior (admin-configurable). Best-effort
// client-side deterrent: suppresses right-click, copy, print, and common
// devtools shortcuts, and shows a subtle watermark hint. Not DRM — locked
// content itself is protected server-side by /api/devotionals/[slug]/unlock.

interface AntiScreenshotProps {
  enabled: boolean;
  children?: ReactNode;
}

export function AntiScreenshot({ enabled, children }: AntiScreenshotProps) {
  useEffect(() => {
    if (!enabled) return;

    const onContextMenu = (e: MouseEvent) => e.preventDefault();
    const onCopy = (e: ClipboardEvent) => e.preventDefault();
    const onCut = (e: ClipboardEvent) => e.preventDefault();
    const onDragStart = (e: DragEvent) => e.preventDefault();
    const onKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      const modifier = e.ctrlKey || e.metaKey;
      if (e.key === "F12") {
        e.preventDefault();
        return;
      }
      if (modifier && ["s", "p", "c", "u", "a"].includes(key)) {
        e.preventDefault();
      }
    };
    const onPrint = (e: Event) => e.preventDefault();

    document.addEventListener("contextmenu", onContextMenu);
    document.addEventListener("copy", onCopy);
    document.addEventListener("cut", onCut);
    document.addEventListener("dragstart", onDragStart);
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("beforeprint", onPrint);
    return () => {
      document.removeEventListener("contextmenu", onContextMenu);
      document.removeEventListener("copy", onCopy);
      document.removeEventListener("cut", onCut);
      document.removeEventListener("dragstart", onDragStart);
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("beforeprint", onPrint);
    };
  }, [enabled]);

  return (
    <div className="relative">
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