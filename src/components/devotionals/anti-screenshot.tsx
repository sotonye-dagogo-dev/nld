"use client";

import { useEffect, useState, useCallback, type ReactNode } from "react";
import { EyeOff } from "lucide-react";

// Anti-screenshot / asset-protection behavior (admin-configurable). Best-effort
// client-side deterrent: suppresses right-click, copy, print, and common
// devtools shortcuts, shows blank overlay when window loses focus / capture
// is detected, and shows a subtle watermark hint. Not DRM — locked
// content itself is protected server-side by /api/devotionals/[slug]/unlock.
// Browser-level screenshot (OS PrintScreen, snipping tool) cannot be perfectly
// blocked; we blank the reader on visibilitychange / blur and on capture-key
// combos as a deterrent.

interface AntiScreenshotProps {
  enabled: boolean;
  children?: ReactNode;
}

export function AntiScreenshot({ enabled, children }: AntiScreenshotProps) {
  const [isHidden, setIsHidden] = useState(false);
  const [reason, setReason] = useState<string | null>(null);

  const trigger = useCallback((r: string, ms?: number) => {
    setIsHidden(true);
    setReason(r);
    if (ms) setTimeout(() => { setIsHidden(false); setReason(null); }, ms);
  }, []);
  const clear = useCallback(() => { setIsHidden(false); setReason(null); }, []);

  useEffect(() => {
    if (!enabled) return;

    const onContextMenu = (e: MouseEvent) => e.preventDefault();
    const onCopy = (e: ClipboardEvent) => e.preventDefault();
    const onCut = (e: ClipboardEvent) => e.preventDefault();
    const onDragStart = (e: DragEvent) => e.preventDefault();
    const onKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      const mod = e.ctrlKey || e.metaKey;
      if (e.key === "F12") { e.preventDefault(); return; }
      if (mod && ["s", "p", "c", "u", "a"].includes(key)) e.preventDefault();
      if (
        key === "printscreen" || e.key === "PrintScreen" ||
        (e.ctrlKey && key === "p") || (e.metaKey && key === "p") ||
        (e.metaKey && e.shiftKey && ["3","4","5"].includes(key))
      ) {
        e.preventDefault();
        trigger("Screenshot blocked — protected content", 2500);
      }
    };
    const onPrint = (e: Event) => { e.preventDefault(); trigger("Printing disabled", 2500); };
    const onVisibility = () => {
      if (document.hidden || document.visibilityState !== "visible") {
        trigger("Content hidden — tab inactive");
      } else {
        setTimeout(clear, 500);
      }
    };
    const onBlur = () => trigger("Content hidden — window inactive");
    const onFocus = () => setTimeout(clear, 400);

    let origGetDisplayMedia: typeof navigator.mediaDevices.getDisplayMedia | undefined;
    if (navigator.mediaDevices?.getDisplayMedia) {
      origGetDisplayMedia = navigator.mediaDevices.getDisplayMedia.bind(navigator.mediaDevices);
      // @ts-ignore
      navigator.mediaDevices.getDisplayMedia = async (...a: Parameters<typeof navigator.mediaDevices.getDisplayMedia>) => {
        trigger("Screen capture blocked", 4000);
        throw new Error("Screen capture disabled for protected content.");
      };
    }

    document.addEventListener("contextmenu", onContextMenu);
    document.addEventListener("copy", onCopy);
    document.addEventListener("cut", onCut);
    document.addEventListener("dragstart", onDragStart);
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("beforeprint", onPrint);
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("blur", onBlur);
    window.addEventListener("focus", onFocus);
    return () => {
      document.removeEventListener("contextmenu", onContextMenu);
      document.removeEventListener("copy", onCopy);
      document.removeEventListener("cut", onCut);
      document.removeEventListener("dragstart", onDragStart);
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("beforeprint", onPrint);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("blur", onBlur);
      window.removeEventListener("focus", onFocus);
      if (origGetDisplayMedia && navigator.mediaDevices) {
        // @ts-ignore restore
        navigator.mediaDevices.getDisplayMedia = origGetDisplayMedia;
      }
    };
  }, [enabled, trigger, clear]);

  return (
    <div className="relative">
      {enabled && isHidden && (
        <div className="fixed inset-0 z-[70] flex flex-col items-center justify-center bg-background/95 backdrop-blur-md p-6 text-center" role="alert" aria-live="polite">
          <div className="rounded-full bg-surface border border-border p-4 shadow-sm mb-4">
            <EyeOff className="h-8 w-8 text-text-muted" aria-hidden="true" />
          </div>
          <p className="text-base font-semibold text-text-primary">Content hidden for protection</p>
          <p className="mt-1 max-w-sm text-sm text-text-muted">{reason ?? "Return to this window to continue."}</p>
        </div>
      )}
      {enabled && !isHidden && (
        <span
          aria-hidden
          className="pointer-events-none fixed bottom-3 left-3 z-30 select-none rounded-full bg-surface/80 px-3 py-1 text-[10px] text-text-muted shadow-sm"
        >
          Protected content
        </span>
      )}
      <div className={enabled && isHidden ? "invisible" : undefined}>{children}</div>
    </div>
  );
}
