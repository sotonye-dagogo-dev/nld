"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  FileText,
  Maximize2,
  Minimize2,
  AlertCircle,
  ExternalLink,
  Lock,
  ZoomIn,
  ZoomOut,
  Expand,
  Shrink,
  EyeOff,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ContentReaderProps {
  fileUrl: string;
  fileName: string;
  fileType: "pdf" | "docx";
  maxPreviewChars?: number;
  hasFullAccess?: boolean;
  upgradeHref?: string;
  coverUrl?: string;
  className?: string;
}

const DEFAULT_MAX_PREVIEW_CHARS = 2000;
const DOCX_CHARS_PER_PAGE = 1800;
const MIN_ZOOM = 0.5;
const MAX_ZOOM = 3;
const ZOOM_STEP = 0.15;

function useProtectionBlur(enabled: boolean) {
  const [isBlurred, setIsBlurred] = useState(false);
  const [reason, setReason] = useState<string | null>(null);
  const blurTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const triggerBlur = useCallback((r: string, durationMs?: number) => {
    setIsBlurred(true);
    setReason(r);
    if (durationMs) {
      if (blurTimeoutRef.current) clearTimeout(blurTimeoutRef.current);
      blurTimeoutRef.current = setTimeout(() => {
        setIsBlurred(false);
        setReason(null);
      }, durationMs);
    }
  }, []);

  const clearBlur = useCallback(() => {
    if (blurTimeoutRef.current) {
      clearTimeout(blurTimeoutRef.current);
      blurTimeoutRef.current = null;
    }
    setIsBlurred(false);
    setReason(null);
  }, []);

  useEffect(() => {
    if (!enabled) return;

    const onVisibility = () => {
      if (document.hidden || document.visibilityState !== "visible") {
        triggerBlur("Content hidden — tab inactive");
      } else {
        setTimeout(() => clearBlur(), 600);
      }
    };

    const onBlur = () => {
      triggerBlur("Content hidden — window inactive");
    };
    const onFocus = () => {
      setTimeout(() => clearBlur(), 500);
    };
    const onPageHide = () => triggerBlur("Content hidden");
    const onBeforePrint = (e: Event) => {
      e.preventDefault();
      triggerBlur("Printing is disabled for protected content", 3000);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (
        key === "printscreen" ||
        key === "print_screen" ||
        e.key === "PrintScreen" ||
        (e.ctrlKey && key === "p") ||
        (e.metaKey && key === "p") ||
        (e.ctrlKey && e.shiftKey && key === "s") ||
        (e.metaKey && e.shiftKey && key === "s") ||
        (e.metaKey && e.shiftKey && key === "4") ||
        (e.metaKey && e.shiftKey && key === "3")
      ) {
        e.preventDefault();
        triggerBlur("Screenshot blocked — content protection active", 2500);
      }
      if (e.key === "F12" || (e.ctrlKey && e.shiftKey && ["i", "j", "c"].includes(key))) {
        triggerBlur("Content hidden", 1500);
      }
    };

    let originalGetDisplayMedia: typeof navigator.mediaDevices.getDisplayMedia | undefined;
    if (navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia) {
      originalGetDisplayMedia = navigator.mediaDevices.getDisplayMedia.bind(navigator.mediaDevices);
      // @ts-ignore override
      navigator.mediaDevices.getDisplayMedia = async (...args: Parameters<typeof navigator.mediaDevices.getDisplayMedia>) => {
        triggerBlur("Screen capture blocked — content protection active", 4000);
        throw new Error("Screen capture is disabled for protected content.");
      };
    }

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("blur", onBlur);
    window.addEventListener("focus", onFocus);
    window.addEventListener("pagehide", onPageHide);
    window.addEventListener("beforeprint", onBeforePrint);
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("blur", onBlur);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("pagehide", onPageHide);
      window.removeEventListener("beforeprint", onBeforePrint);
      document.removeEventListener("keydown", onKeyDown);
      if (originalGetDisplayMedia && navigator.mediaDevices) {
        // @ts-ignore restore
        navigator.mediaDevices.getDisplayMedia = originalGetDisplayMedia;
      }
      if (blurTimeoutRef.current) clearTimeout(blurTimeoutRef.current);
    };
  }, [enabled, triggerBlur, clearBlur]);

  return { isBlurred, reason, clearBlur, triggerBlur };
}

export function ContentReader({
  fileUrl,
  fileName,
  fileType,
  maxPreviewChars = DEFAULT_MAX_PREVIEW_CHARS,
  hasFullAccess = false,
  upgradeHref,
  coverUrl,
  className,
}: ContentReaderProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [content, setContent] = useState<string>("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [showFullContent, setShowFullContent] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const contentScrollRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pdfDocRef = useRef<any>(null);

  const { isBlurred, reason } = useProtectionBlur(hasFullAccess);

  // PDF.js loading
  useEffect(() => {
    if (!hasFullAccess) {
      setIsLoading(false);
      setTotalPages(1);
      return;
    }
    let cancelled = false;
    async function loadContent() {
      setIsLoading(true);
      setError(null);
      try {
        if (fileType === "pdf") {
          // Dynamically import pdfjs-dist to avoid SSR bundling issues
          const pdfjs: any = await import("pdfjs-dist");
          // Configure worker — use CDN if not already set; fallback to local import
          try {
            if (!pdfjs.GlobalWorkerOptions.workerSrc) {
              pdfjs.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@4.4.168/build/pdf.worker.min.mjs`;
            }
          } catch {}
          const loadingTask = pdfjs.getDocument({ url: fileUrl, withCredentials: false });
          const pdf = await loadingTask.promise;
          if (cancelled) return;
          pdfDocRef.current = pdf;
          setTotalPages(pdf.numPages);
          setCurrentPage(1);
        } else if (fileType === "docx") {
          const placeholder =
            content ||
            "Document content is protected. This is a preview of the DOCX viewer. When unlocked, the full document renders here with page navigation, zoom, and protection overlay.";
          setContent(placeholder);
          const pages = Math.max(1, Math.ceil(placeholder.length / DOCX_CHARS_PER_PAGE));
          setTotalPages(pages);
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load content");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }
    loadContent();
    return () => {
      cancelled = true;
      // cleanup pdf doc
      if (pdfDocRef.current?.destroy) {
        try { pdfDocRef.current.destroy(); } catch {}
        pdfDocRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fileUrl, fileType, hasFullAccess]);

  // Keep totalPages in sync when text content changes (for DOCX paginated text)
  useEffect(() => {
    if (fileType === "docx" && hasFullAccess && content) {
      setTotalPages(Math.max(1, Math.ceil(content.length / DOCX_CHARS_PER_PAGE)));
    }
  }, [content, fileType, hasFullAccess]);

  useEffect(() => {
    const onFsChange = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, []);

  // Render PDF page to canvas whenever doc, page, or zoom changes
  useEffect(() => {
    if (fileType !== "pdf" || !hasFullAccess || !pdfDocRef.current || !canvasRef.current) return;
    let renderTask: any = null;
    let cancelled = false;
    async function render() {
      try {
        const pdf = pdfDocRef.current;
        if (!pdf) return;
        const page = await pdf.getPage(currentPage);
        if (cancelled) return;
        const viewport = page.getViewport({ scale: 1.35 * zoom });
        const canvas = canvasRef.current!;
        const ctx = canvas.getContext("2d", { alpha: false }) as CanvasRenderingContext2D | null;
        if (!ctx) return;
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        canvas.style.width = `${viewport.width}px`;
        canvas.style.height = `${viewport.height}px`;
        const renderContext = { canvasContext: ctx, viewport };
        renderTask = page.render(renderContext);
        await renderTask.promise;
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to render PDF page");
      }
    }
    render();
    return () => {
      cancelled = true;
      if (renderTask?.cancel) try { renderTask.cancel(); } catch {}
    };
  }, [fileType, hasFullAccess, currentPage, zoom, isLoading]);

  const isTruncated = !hasFullAccess && !showFullContent && content.length > maxPreviewChars;
  const displayContent = hasFullAccess || showFullContent || content.length <= maxPreviewChars
    ? content
    : truncateForPreview(content, maxPreviewChars).truncated;

  // Paginated slice for DOCX text mode
  const paginatedText = (() => {
    if (fileType !== "docx" || !hasFullAccess) return displayContent;
    const start = (currentPage - 1) * DOCX_CHARS_PER_PAGE;
    return displayContent.slice(start, start + DOCX_CHARS_PER_PAGE);
  })();

  function toggleFullscreen() {
    const el = containerRef.current;
    if (!el) return;
    if (document.fullscreenElement) {
      void document.exitFullscreen().catch(() => undefined);
    } else {
      void el.requestFullscreen().catch(() => undefined);
    }
  }

  function toggleExpanded() {
    setIsExpanded((v) => !v);
  }

  const handlePageChange = (delta: number) => {
    setCurrentPage((prev) => {
      const next = Math.min(totalPages, Math.max(1, prev + delta));
      return next;
    });
    contentScrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handlePageInput = (val: string) => {
    const n = parseInt(val, 10);
    if (Number.isNaN(n)) return;
    const clamped = Math.min(totalPages, Math.max(1, n));
    setCurrentPage(clamped);
    contentScrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleZoom = (delta: number) => {
    setZoom((z) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Math.round((z + delta) * 100) / 100)));
  };
  const resetZoom = () => setZoom(1);

  if (error) {
    return (
      <div className={cn("rounded-xl border border-danger/30 bg-danger/5 p-6", className)}>
        <div className="flex items-center gap-3 text-danger">
          <AlertCircle className="h-5 w-5 shrink-0" aria-hidden="true" />
          <div>
            <p className="font-medium">Unable to load content</p>
            <p className="text-sm text-text-muted">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className={cn("rounded-xl border border-border bg-surface p-8 flex items-center justify-center", className)}>
        <div className="flex flex-col items-center gap-3 text-text-muted">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p>Loading {fileType.toUpperCase()} preview…</p>
        </div>
      </div>
    );
  }

  const viewerHeightClass = isFullscreen
    ? "h-screen"
    : isExpanded
      ? "h-[85vh] min-h-[520px]"
      : "h-[520px] lg:h-[600px] min-h-[420px]";

  return (
    <div
      className={cn(
        "flex w-full flex-col rounded-xl border border-border bg-surface overflow-hidden",
        isFullscreen && "fixed inset-0 z-[65] rounded-none border-0",
        className,
      )}
    >
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-3 py-2.5 bg-background/60 backdrop-blur sm:px-4">
        <div className="flex min-w-0 items-center gap-2.5">
          <FileText className="h-5 w-5 text-text-muted shrink-0" aria-hidden="true" />
          <div className="min-w-0">
            <p className="text-sm font-medium text-text-primary truncate max-w-[180px] sm:max-w-[240px]">{fileName}</p>
            <p className="text-xs text-text-muted">
              {fileType.toUpperCase()} • {totalPages} page{totalPages !== 1 ? "s" : ""} {hasFullAccess ? "• Protected" : "• Preview"}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {/* Page navigation */}
          <div className="flex items-center gap-1 rounded-lg border border-border bg-surface p-1">
            <button
              type="button"
              onClick={() => handlePageChange(-1)}
              disabled={currentPage === 1}
              className="p-1.5 rounded text-text-muted hover:text-text-primary hover:bg-background disabled:opacity-40 disabled:cursor-not-allowed"
              aria-label="Previous page"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <label className="flex items-center gap-1 px-1 text-sm font-mono text-text-primary">
              <input
                type="number"
                min={1}
                max={totalPages}
                value={currentPage}
                onChange={(e) => handlePageInput(e.target.value)}
                onBlur={(e) => handlePageInput(e.target.value)}
                className="w-10 rounded border border-border bg-background px-1 py-0.5 text-center text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                aria-label="Current page"
              />
              <span className="text-text-muted">/ {totalPages}</span>
            </label>
            <button
              type="button"
              onClick={() => handlePageChange(1)}
              disabled={currentPage === totalPages}
              className="p-1.5 rounded text-text-muted hover:text-text-primary hover:bg-background disabled:opacity-40 disabled:cursor-not-allowed"
              aria-label="Next page"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {/* Zoom controls — always available when hasFullAccess, faint otherwise */}
          <div className="flex items-center gap-0.5 rounded-lg border border-border bg-surface p-1">
            <button
              type="button"
              onClick={() => handleZoom(-ZOOM_STEP)}
              disabled={zoom <= MIN_ZOOM}
              className="p-1.5 rounded text-text-muted hover:text-text-primary hover:bg-background disabled:opacity-40"
              aria-label="Zoom out"
              title="Zoom out"
            >
              <ZoomOut className="h-4 w-4" />
            </button>
            <span className="min-w-[3.25rem] px-1 text-center text-xs font-mono text-text-muted">{Math.round(zoom * 100)}%</span>
            <button
              type="button"
              onClick={() => handleZoom(ZOOM_STEP)}
              disabled={zoom >= MAX_ZOOM}
              className="p-1.5 rounded text-text-muted hover:text-text-primary hover:bg-background disabled:opacity-40"
              aria-label="Zoom in"
              title="Zoom in"
            >
              <ZoomIn className="h-4 w-4" />
            </button>
            {zoom !== 1 && (
              <button
                type="button"
                onClick={resetZoom}
                className="ml-0.5 rounded px-1.5 py-1 text-[11px] font-medium text-text-muted hover:bg-background hover:text-text-primary"
                aria-label="Reset zoom"
              >
                Reset
              </button>
            )}
          </div>

          {/* Unlock CTA when preview */}
          {isTruncated && !hasFullAccess && upgradeHref && (
            <a
              href={upgradeHref}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-background hover:bg-primary-hover transition-colors"
            >
              <Lock className="h-4 w-4" aria-hidden="true" />
              Unlock
            </a>
          )}

          {/* Expand / collapse — controls viewer height within page (not just text truncation) */}
          <button
            type="button"
            onClick={toggleExpanded}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs font-medium text-text-primary hover:bg-background"
            aria-label={isExpanded ? "Collapse viewer" : "Expand viewer"}
            aria-pressed={isExpanded}
            title={isExpanded ? "Collapse" : "Expand viewer to fill height"}
          >
            {isExpanded ? <Shrink className="h-3.5 w-3.5" /> : <Expand className="h-3.5 w-3.5" />}
            <span className="hidden sm:inline">{isExpanded ? "Collapse" : "Expand"}</span>
          </button>

          {/* Fullscreen */}
          <button
            type="button"
            onClick={toggleFullscreen}
            className="p-1.5 rounded-lg border border-border bg-surface text-text-muted hover:text-text-primary hover:bg-background focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
            aria-pressed={isFullscreen}
            title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
          >
            {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Content viewer — occupies entire width and full height of container */}
      <div
        ref={containerRef}
        className={cn(
          "relative flex w-full flex-1 flex-col bg-surface overflow-hidden",
          viewerHeightClass,
          "transition-[height] duration-200",
        )}
      >
        {fileType === "pdf" ? (
          <div className="relative flex h-full w-full flex-1 flex-col bg-[#f5f5f4] dark:bg-zinc-900 overflow-hidden">
            {hasFullAccess ? (
              <div
                ref={contentScrollRef}
                className="flex h-full w-full flex-1 overflow-auto bg-[#f5f5f4] dark:bg-zinc-900 p-4 justify-center"
                style={{ scrollbarWidth: "thin" }}
                onContextMenu={(e) => e.preventDefault()}
              >
                <canvas
                  ref={canvasRef}
                  className="shadow-lg bg-white select-none max-w-full h-auto"
                  style={{ display: "block" }}
                  aria-label={`${fileName} page ${currentPage}`}
                />
              </div>
            ) : (
              <div className="relative flex h-full w-full flex-1 flex-col items-center justify-center overflow-hidden p-8 text-center">
                {coverUrl ? (
                  <>
                    <div className="absolute inset-0">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={coverUrl}
                        alt=""
                        className="h-full w-full object-cover opacity-50 blur-[1px]"
                        aria-hidden
                      />
                      <div className="absolute inset-0 bg-surface/70 backdrop-blur-[2px]" aria-hidden />
                      <div className="absolute inset-0 bg-gradient-to-t from-surface/80 via-transparent to-surface/40" aria-hidden />
                    </div>
                    <div className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden" aria-hidden>
                      <span className="rotate-[-18deg] select-none whitespace-nowrap text-4xl font-black tracking-widest text-text-primary/[0.12] sm:text-5xl">
                        UNLOCK TO ACCESS
                      </span>
                    </div>
                  </>
                ) : (
                  <div className="absolute inset-0 bg-surface" aria-hidden />
                )}
                <div className="relative z-10 flex flex-col items-center">
                  {coverUrl ? (
                    <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-2xl bg-background/90 shadow-lg ring-1 ring-border backdrop-blur">
                      <Lock className="h-9 w-9 text-primary" aria-hidden="true" />
                    </div>
                  ) : (
                    <FileText className="h-16 w-16 text-text-muted/40 mb-4" aria-hidden="true" />
                  )}
                  <p className="text-lg font-semibold text-text-primary drop-shadow-sm">Unlock to Access</p>
                  <p className="mt-1 max-w-md text-sm text-text-muted">
                    This content is locked. Purchase full access to read this devotional.
                  </p>
                  {upgradeHref && (
                    <a
                      href={upgradeHref}
                      className="mt-6 inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-background shadow-md hover:bg-primary-hover transition-colors"
                    >
                      <Lock className="h-4 w-4" aria-hidden="true" />
                      Purchase to Unlock
                    </a>
                  )}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div
            ref={contentScrollRef}
            className="flex h-full w-full flex-1 flex-col overflow-y-auto overflow-x-hidden bg-surface p-5 sm:p-6"
            onContextMenu={(e) => hasFullAccess && e.preventDefault()}
          >
            {hasFullAccess ? (
              <div
                className="mx-auto w-full max-w-3xl whitespace-pre-wrap text-[15px] leading-7 text-text-primary select-none"
                style={{
                  transform: `scale(${zoom})`,
                  transformOrigin: "top center",
                  width: zoom !== 1 ? `${100 / zoom}%` : "100%",
                }}
              >
                {paginatedText}
                {totalPages > 1 && (
                  <p className="mt-6 border-t border-border pt-3 text-center text-xs text-text-muted">
                    Page {currentPage} of {totalPages}
                  </p>
                )}
              </div>
            ) : (
              <div className="relative flex h-full min-h-[380px] w-full flex-1 flex-col items-center justify-center overflow-hidden rounded-xl text-center p-8">
                {coverUrl ? (
                  <>
                    <div className="absolute inset-0 rounded-xl overflow-hidden">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={coverUrl}
                        alt=""
                        className="h-full w-full object-cover opacity-50 blur-[1px]"
                        aria-hidden
                      />
                      <div className="absolute inset-0 bg-surface/70 backdrop-blur-[2px]" aria-hidden />
                      <div className="absolute inset-0 bg-gradient-to-t from-surface/80 via-transparent to-surface/40" aria-hidden />
                    </div>
                    <div className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden" aria-hidden>
                      <span className="rotate-[-18deg] select-none whitespace-nowrap text-4xl font-black tracking-widest text-text-primary/[0.12] sm:text-5xl">
                        UNLOCK TO ACCESS
                      </span>
                    </div>
                  </>
                ) : null}
                <div className="relative z-10 flex flex-col items-center">
                  {coverUrl ? (
                    <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-2xl bg-background/90 shadow-lg ring-1 ring-border backdrop-blur">
                      <Lock className="h-9 w-9 text-primary" aria-hidden="true" />
                    </div>
                  ) : (
                    <FileText className="h-16 w-16 text-text-muted/40 mb-4" aria-hidden="true" />
                  )}
                  <p className="text-lg font-semibold text-text-primary">Unlock to Access</p>
                  <p className="mt-1 max-w-md text-sm text-text-muted">
                    This document is locked. Purchase full access to unlock the full reader.
                  </p>
                  {upgradeHref && (
                    <a
                      href={upgradeHref}
                      className="mt-6 inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-background shadow-md hover:bg-primary-hover transition-colors"
                    >
                      <Lock className="h-4 w-4" aria-hidden="true" />
                      Purchase to Unlock
                    </a>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Watermark */}
        {hasFullAccess && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden" aria-hidden="true">
            <div className="rotate-[-18deg] select-none whitespace-nowrap text-5xl font-bold tracking-wide text-text-muted/[0.07]">
              PROTECTED
            </div>
          </div>
        )}

        {/* Blank overlay for screenshot / capture / blur protection — covers BOTH normal and fullscreen */}
        {hasFullAccess && isBlurred && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-background/95 backdrop-blur-md p-6 text-center">
            <div className="rounded-full bg-surface border border-border p-4 shadow-sm mb-4">
              <EyeOff className="h-8 w-8 text-text-muted" aria-hidden="true" />
            </div>
            <p className="text-base font-semibold text-text-primary">Content hidden for protection</p>
            <p className="mt-1 max-w-sm text-sm text-text-muted">
              {reason ?? "The viewer is hidden when the window loses focus or a capture is detected."}
            </p>
            <p className="mt-3 text-xs text-text-muted">Return to this window to continue reading.</p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border px-3 py-2 text-xs text-text-muted sm:px-4">
        <span className="flex items-center gap-1.5">
          <Lock className="h-3 w-3" aria-hidden="true" /> Content protected — no download, copy, or print permitted
        </span>
        <span className="flex items-center gap-2">
          <span className="hidden sm:inline">Secure viewer</span>
          <span className="flex items-center gap-1">
            <AlertCircle className="h-3 w-3" aria-hidden="true" />
            {isBlurred ? "Hidden" : "Protected"}
          </span>
        </span>
      </div>
    </div>
  );
}

// Secure PDF viewer for legacy call sites — now delegates to ContentReader styling
interface SecurePDFViewerProps {
  fileUrl: string;
  fileName: string;
  className?: string;
}

export function SecurePDFViewer({ fileUrl, fileName, className }: SecurePDFViewerProps) {
  return (
    <div className={cn("rounded-xl border border-border bg-surface overflow-hidden", className)}>
      <div className="flex items-center justify-between border-b border-border px-4 py-3 bg-background/50">
        <div className="flex items-center gap-3">
          <FileText className="h-5 w-5 text-text-muted" aria-hidden="true" />
          <p className="text-sm font-medium text-text-primary truncate max-w-[300px]">{fileName}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => window.open(fileUrl, "_blank", "noopener,noreferrer")}
            className="p-1.5 rounded text-text-muted hover:text-text-primary hover:bg-background"
            aria-label="Open in new tab"
          >
            <ExternalLink className="h-4 w-4" />
          </button>
        </div>
      </div>
      <div className="w-full h-[70vh] min-h-[420px]">
        <ContentReader fileUrl={fileUrl} fileName={fileName} fileType="pdf" hasFullAccess={true} />
      </div>
    </div>
  );
}

export function truncateForPreview(text: string, maxChars: number): { truncated: string; isTruncated: boolean } {
  if (text.length <= maxChars) return { truncated: text, isTruncated: false };
  const truncated = text.slice(0, maxChars);
  const lastSpace = truncated.lastIndexOf(" ");
  const finalText = lastSpace > maxChars * 0.8 ? truncated.slice(0, lastSpace) : truncated;
  return { truncated: finalText + "…", isTruncated: true };
}

export const MAX_PREVIEW_CHARS = DEFAULT_MAX_PREVIEW_CHARS;
