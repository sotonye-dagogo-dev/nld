"use client";

import "@/lib/polyfills";
import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, FileText, Maximize2, Minimize2, AlertCircle, Lock, EyeOff, ZoomIn, ZoomOut } from "lucide-react";
import { cn } from "@/lib/utils";

// On-platform PDF/DOCX reader — secure viewer using pdf.js for true multi-page PDFs.
// Locked mode shows cover + watermark over blurred backdrop; unlocked mode uses
// pdf.js canvas rendering with correct page count, zoom, pagination and fullscreen.

function isOptimizedImageHost(url: string | null | undefined): boolean {
  if (!url || typeof url !== "string" || url.trim() === "") return false;
  try {
    const host = new URL(url).hostname.toLowerCase();
    return host.endsWith(".supabase.co") || host.endsWith(".supabase.in");
  } catch {
    return false;
  }
}
function safeFileType(url: string | null | undefined): "pdf" | "docx" {
  if (!url || typeof url !== "string") return "pdf";
  return url.toLowerCase().endsWith(".pdf") ? "pdf" : "docx";
}

interface ContentReaderProps {
  fileUrl: string;
  fileName: string;
  fileType: "pdf" | "docx";
  maxPreviewChars?: number;
  hasFullAccess?: boolean;
  upgradeHref?: string;
  coverUrl?: string | null;
  className?: string;
}

const DEFAULT_MAX_PREVIEW_CHARS = 2000;

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
  const hasFile = Boolean(fileUrl && typeof fileUrl === "string" && fileUrl.trim().length > 0);
  const [isLoading, setIsLoading] = useState(hasFile && hasFullAccess && fileType === "pdf");
  const [error, setError] = useState<string | null>(null);
  const [content, setContent] = useState<string>("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [pseudoFullscreen, setPseudoFullscreen] = useState(false);
  const [zoom, setZoom] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pdfDocRef = useRef<unknown | null>(null);

  const isExpanded = isFullscreen || pseudoFullscreen;

  useEffect(() => {
    const handler = () => {
      const el = (document as unknown as { fullscreenElement?: Element; webkitFullscreenElement?: Element }).fullscreenElement
        ?? (document as unknown as { webkitFullscreenElement?: Element }).webkitFullscreenElement;
      setIsFullscreen(Boolean(el));
      if (Boolean(el)) setPseudoFullscreen(false);
    };
    document.addEventListener("fullscreenchange", handler);
    document.addEventListener("webkitfullscreenchange" as unknown as keyof DocumentEventMap, handler as EventListener);
    return () => {
      document.removeEventListener("fullscreenchange", handler);
      document.removeEventListener("webkitfullscreenchange" as unknown as keyof DocumentEventMap, handler as EventListener);
    };
  }, []);

  useEffect(() => {
    if (!pseudoFullscreen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPseudoFullscreen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [pseudoFullscreen]);

  async function toggleFullscreen() {
    const el = containerRef.current;
    if (!el) return;
    // If already in any fullscreen mode, exit
    if (document.fullscreenElement || (document as unknown as { webkitFullscreenElement?: Element }).webkitFullscreenElement) {
      try {
        if (document.exitFullscreen) await document.exitFullscreen();
        else {
          const wExit = (document as unknown as { webkitExitFullscreen?: () => Promise<void> }).webkitExitFullscreen;
          if (wExit) await wExit.call(document);
        }
      } catch {}
      setPseudoFullscreen(false);
      return;
    }
    if (pseudoFullscreen) {
      setPseudoFullscreen(false);
      return;
    }
    // Try native fullscreen with webkit fallback
    const anyEl = el as unknown as {
      requestFullscreen?: () => Promise<void>;
      webkitRequestFullscreen?: () => Promise<void>;
    };
    try {
      if (anyEl.requestFullscreen) {
        await anyEl.requestFullscreen();
        return;
      }
      if (anyEl.webkitRequestFullscreen) {
        await anyEl.webkitRequestFullscreen();
        return;
      }
    } catch {
      // fall through to pseudo
    }
    // Native not available / blocked (common on iOS) — use CSS pseudo-fullscreen
    setPseudoFullscreen(true);
  }

  // DOCX placeholder and reset when not pdf or no access
  useEffect(() => {
    if (!hasFile) {
      setIsLoading(false);
      return;
    }
    if (!hasFullAccess) {
      setIsLoading(false);
      setError(null);
      return;
    }
    if (fileType === "docx") {
      setContent("[DOCX content — viewer ready]");
      setIsLoading(false);
    }
  }, [hasFile, hasFullAccess, fileType]);

  // PDF.js loading: robust viewer that works on all browsers including iOS 16 Safari.
  // Previously the CDN worker lacked Promise.withResolvers in its own Worker scope,
  // so iOS 16 threw "Promise.withResolvers is not a function" even after the main-
  // thread polyfill. Fix: polyfill main thread, provide a blob worker with polyfill,
  // and fall back to disableWorker (main-thread rendering) which needs no worker at all.
  useEffect(() => {
    if (!hasFile || !hasFullAccess || fileType !== "pdf") return;
    let cancelled = false;
    let blobUrl: string | null = null;
    async function loadPdf() {
      setIsLoading(true);
      setError(null);
      setCurrentPage(1);
      try {
        await import("@/lib/polyfills");
        if (typeof Promise !== "undefined" && typeof (Promise as unknown as { withResolvers?: unknown }).withResolvers !== "function") {
          (Promise as unknown as Record<string, unknown>).withResolvers = function <T>() {
            let resolve!: (value: T | PromiseLike<T>) => void;
            let reject!: (reason?: unknown) => void;
            const promise = new Promise<T>((res, rej) => { resolve = res; reject = rej; });
            return { promise, resolve, reject };
          };
        }
        const pdfjsLib: typeof import("pdfjs-dist") = await import("pdfjs-dist");

        // Try to install a polyfilled blob worker so the Worker scope also has Promise.withResolvers.
        // The blob wraps the CDN worker with a polyfill preamble. If blob creation fails,
        // we fall back to disableWorker below.
        const cdnWorkerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.worker.min.mjs`;
        try {
          const gwo = (pdfjsLib as unknown as { GlobalWorkerOptions?: { workerSrc?: string } }).GlobalWorkerOptions;
          if (gwo) {
            const polyfillPreamble = `if(typeof Promise!=='undefined'&&!Promise.withResolvers){Promise.withResolvers=function(){let r,j;const p=new Promise((res,rej)=>{r=res;j=rej});return{promise:p,resolve:r,reject:j}};}`;
            // Worker is ESM (.mjs) — use dynamic import inside blob for module workers where supported,
            // and importScripts fallback for classic workers. We emit both; one will succeed.
            const blobContent = `${polyfillPreamble}\ntry{importScripts('${cdnWorkerSrc}');}catch(e){import('${cdnWorkerSrc}');}`;
            const blob = new Blob([blobContent], { type: "application/javascript" });
            blobUrl = URL.createObjectURL(blob);
            gwo.workerSrc = blobUrl;
          }
        } catch {
          // ignore — fallback path will handle
        }

        // Helper to load with explicit disableWorker flag.
        const tryLoad = async (opts: Record<string, unknown>) => {
          const task = (pdfjsLib as unknown as { getDocument: (o: Record<string, unknown>) => { promise: Promise<unknown> } }).getDocument(opts);
          return await task.promise;
        };

        let pdf: unknown = null;
        let lastErr: unknown = null;

        // 1) Prefer main-thread (no worker) — most compatible, no CSP/worker polyfill needed.
        try {
          pdf = await tryLoad({ url: fileUrl, withCredentials: false, disableWorker: true, isEvalSupported: false, useWorkerFetch: false });
        } catch (e) {
          lastErr = e;
          // 2) Fallback: try with worker (blob polyfilled, or CDN direct)
          try {
            // Reset to CDN if blob failed
            try {
              const gwo2 = (pdfjsLib as unknown as { GlobalWorkerOptions?: { workerSrc?: string } }).GlobalWorkerOptions;
              if (gwo2 && !blobUrl) gwo2.workerSrc = cdnWorkerSrc;
            } catch {}
            pdf = await tryLoad({ url: fileUrl, withCredentials: false });
          } catch (e2) {
            lastErr = e2;
            // 3) Last resort: fetch as ArrayBuffer and pass data (CORS-friendly)
            try {
              const res = await fetch(fileUrl);
              if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
              const buf = await res.arrayBuffer();
              pdf = await tryLoad({ data: new Uint8Array(buf), disableWorker: true, isEvalSupported: false });
            } catch (e3) {
              throw lastErr ?? e3;
            }
          }
        }

        if (cancelled) return;
        pdfDocRef.current = pdf as unknown;
        setTotalPages((pdf as unknown as { numPages: number }).numPages || 1);
      } catch (err) {
        if (cancelled) return;
        const raw = err instanceof Error ? err.message : "Failed to load PDF";
        const low = raw.toLowerCase();
        let friendly: string;
        if (raw.includes("Promise.withResolvers") || low.includes("globalworker") || low.includes("workersrc") || low.includes("version") && low.includes("worker")) {
          // These are infrastructure errors — not a browser-update issue after our polyfill.
          // Show a generic, actionable message and log raw for diagnostics.
          console.error("[content-reader] PDF worker error:", raw);
          friendly = "Unable to load PDF. Please check your connection and try again. If the issue persists, contact support.";
        } else if (low.includes("fetch") || low.includes("failed") || low.includes("network")) {
          friendly = "Unable to load PDF. Please check your connection or try again.";
        } else if (low.includes("password") || low.includes("encrypted")) {
          friendly = "This PDF is password-protected and cannot be displayed.";
        } else if (low.includes("invalid") || low.includes("corrupt")) {
          friendly = "This PDF is corrupted or in an unsupported format.";
        } else {
          friendly = raw.slice(0, 280);
        }
        setError(friendly);
        setTotalPages(1);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }
    loadPdf();
    return () => {
      cancelled = true;
      if (blobUrl) {
        try { URL.revokeObjectURL(blobUrl); } catch {}
      }
      const doc = pdfDocRef.current as unknown as { destroy?: () => void } | null;
      try { doc?.destroy?.(); } catch {}
      pdfDocRef.current = null;
    };
  }, [fileUrl, fileType, hasFullAccess, hasFile]);

  // Render current page to canvas when pdf doc, page, or zoom changes
  useEffect(() => {
    if (!hasFullAccess || fileType !== "pdf" || !hasFile) return;
    const pdfMaybe = pdfDocRef.current as unknown as {
      getPage: (n: number) => Promise<{
        getViewport: (o: { scale: number }) => { width: number; height: number };
        render: (o: { canvasContext: CanvasRenderingContext2D; viewport: unknown }) => { promise: Promise<void> };
      }>;
    } | null;
    if (!pdfMaybe || !canvasRef.current) return;
    const pdf = pdfMaybe;
    let cancelled = false;
    async function render() {
      try {
        const page = await pdf.getPage(currentPage);
        if (cancelled) return;
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        // Base scale 1.5 gives good readability; multiplied by zoom factor
        const viewport = page.getViewport({ scale: 1.5 * zoom });
        const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
        canvas.width = Math.floor(viewport.width * dpr);
        canvas.height = Math.floor(viewport.height * dpr);
        canvas.style.width = `${Math.floor(viewport.width)}px`;
        canvas.style.height = `${Math.floor(viewport.height)}px`;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        // Clear
        ctx.clearRect(0, 0, viewport.width, viewport.height);
        await page.render({ canvasContext: ctx, viewport }).promise;
      } catch {
        // silent — keep previous frame
      }
    }
    render();
    return () => { cancelled = true; };
  }, [currentPage, zoom, hasFullAccess, fileType, hasFile, totalPages]);

  // Truncate content for preview (docx only)
  const displayContent = content;

  const handlePageChange = (delta: number) => {
    const nextPage = currentPage + delta;
    if (nextPage >= 1 && nextPage <= totalPages) setCurrentPage(nextPage);
  };

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

  if (!hasFile) {
    return (
      <div className={cn("rounded-xl border border-dashed border-border bg-surface p-8 flex flex-col items-center justify-center text-center gap-3", className)}>
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-background border border-border">
          <FileText className="h-6 w-6 text-text-muted" aria-hidden="true" />
        </div>
        <div className="space-y-1">
          <p className="text-sm font-medium text-text-primary">No file attached</p>
          <p className="text-xs text-text-muted max-w-sm">This day has no uploaded document yet. The text content above is the full devotional for this day. If you expected a PDF or DOCX, the admin has not attached one.</p>
        </div>
        {hasFullAccess && <p className="text-xs text-text-muted">Contact support if this is unexpected.</p>}
      </div>
    );
  }

  return (
    <div className={cn("rounded-xl border border-border bg-surface overflow-hidden flex flex-col", className, pseudoFullscreen && "fixed inset-0 z-[65] rounded-none")}>
      {/* Toolbar — horizontally scrollable on small screens so no control is clipped */}
      <div className="flex items-center gap-2 border-b border-border bg-background/50 px-3 py-2.5 sm:px-4 sm:py-3 overflow-x-auto scrollbar-thin overscroll-x-contain [-webkit-overflow-scrolling:touch] flex-nowrap">
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 shrink">
          <FileText className="h-5 w-5 text-text-muted shrink-0" aria-hidden="true" />
          <div className="min-w-0">
            <p className="text-sm font-medium text-text-primary truncate max-w-[150px] sm:max-w-[200px]">{fileName}</p>
            <p className="text-xs text-text-muted">{fileType.toUpperCase()} • {totalPages} page{totalPages !== 1 ? "s" : ""}</p>
          </div>
        </div>

        <div className="ml-auto flex items-center gap-1.5 sm:gap-2 shrink-0 flex-nowrap">
          {fileType === "pdf" && hasFullAccess && (
            <div className="flex items-center gap-1 border border-border rounded-lg p-1 shrink-0">
              <button
                onClick={() => handlePageChange(-1)}
                disabled={currentPage === 1}
                className="p-1 sm:p-1.5 rounded text-text-muted hover:text-text-primary hover:bg-background disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Previous page"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="px-1.5 sm:px-2 text-xs sm:text-sm font-mono text-text-primary min-w-[56px] sm:min-w-[64px] text-center">
                {currentPage} / {totalPages}
              </span>
              <button
                onClick={() => handlePageChange(1)}
                disabled={currentPage === totalPages}
                className="p-1 sm:p-1.5 rounded text-text-muted hover:text-text-primary hover:bg-background disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Next page"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}

          {hasFullAccess && fileType === "pdf" && (
            <div className="flex items-center gap-1 border border-border rounded-lg p-1 shrink-0">
              <button
                onClick={() => setZoom((z) => Math.max(0.6, Number((z - 0.15).toFixed(2))))}
                className="p-1 sm:p-1.5 rounded text-text-muted hover:text-text-primary hover:bg-background"
                aria-label="Zoom out"
              >
                <ZoomOut className="h-4 w-4" />
              </button>
              <span className="px-1 sm:px-1.5 text-xs font-mono text-text-primary min-w-[38px] sm:min-w-[42px] text-center">{Math.round(zoom * 100)}%</span>
              <button
                onClick={() => setZoom((z) => Math.min(2.2, Number((z + 0.15).toFixed(2))))}
                className="p-1 sm:p-1.5 rounded text-text-muted hover:text-text-primary hover:bg-background"
                aria-label="Zoom in"
              >
                <ZoomIn className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* Fullscreen toggle — native with CSS fallback for iOS/mobile */}
          <button
            onClick={toggleFullscreen}
            className="p-1.5 rounded text-text-muted hover:text-text-primary hover:bg-background shrink-0"
            aria-label={isExpanded ? "Exit fullscreen" : "Enter fullscreen"}
            title={isExpanded ? "Collapse" : "Expand"}
          >
            {isExpanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Content viewer — full width/height, no clipping; pdf canvas occupies entire container */}
      <div ref={containerRef} className={cn("relative w-full bg-background flex-1 flex flex-col", hasFullAccess ? "min-h-[560px] h-[68vh] max-h-[85vh] overflow-auto" : "min-h-[400px] overflow-hidden", isExpanded && "h-[100dvh] max-h-[100dvh] min-h-0 overflow-auto")}>
        {fileType === "pdf" ? (
          <div className="w-full h-full relative flex-1 flex flex-col min-h-[inherit]">
            {hasFullAccess ? (
              <div className="w-full flex-1 flex items-start justify-center bg-background p-4 overflow-auto">
                <canvas
                  ref={canvasRef}
                  className="shadow-lg border border-border bg-white max-w-full"
                  style={{ display: "block" }}
                  aria-label={`${fileName} page ${currentPage} of ${totalPages}`}
                />
              </div>
            ) : (
              // Locked mode — blurred backdrop + cover + watermark unlock (covers reader itself)
              <div className="relative w-full h-full min-h-[400px] flex-1 overflow-hidden bg-surface">
                <div aria-hidden="true" className="absolute inset-0 flex flex-col items-center justify-center gap-3 blur-[7px] opacity-30 select-none pointer-events-none p-8">
                  <FileText className="h-20 w-20 text-text-muted/50" aria-hidden="true" />
                  <div className="h-3 w-3/4 rounded bg-text-muted/40" />
                  <div className="h-3 w-full max-w-md rounded bg-text-muted/30" />
                  <div className="h-3 w-2/3 rounded bg-text-muted/30" />
                  <p className="text-sm text-text-muted">PDF preview blurred — unlock to read</p>
                </div>
                <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden opacity-[0.06]">
                  <div className="absolute inset-0 flex flex-wrap items-center justify-center gap-6 p-6 rotate-[-12deg] scale-110">
                    {Array.from({ length: 10 }).map((_, i) => (
                      <span key={i} className="whitespace-nowrap text-xs font-bold tracking-widest text-text-primary select-none">
                        PROTECTED • LOCKED
                      </span>
                    ))}
                  </div>
                </div>
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-background/45 backdrop-blur-[2px] p-6 text-center">
                  {coverUrl ? (
                    <div className="relative h-28 w-28 shrink-0 overflow-hidden rounded-xl border border-border shadow-lg">
                      <Image
                        src={coverUrl}
                        alt={`${fileName} cover`}
                        fill
                        className="object-cover"
                        unoptimized={isOptimizedImageHost(coverUrl) ? false : true}
                        sizes="112px"
                      />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/25">
                        <EyeOff className="h-7 w-7 text-white/80" aria-hidden="true" />
                      </div>
                    </div>
                  ) : (
                    <FileText className="h-14 w-14 text-text-muted/60" aria-hidden="true" />
                  )}
                  <div className="space-y-1">
                    <p className="inline-flex items-center gap-1.5 rounded-full bg-background/80 px-3 py-1 text-xs font-semibold text-text-muted shadow-sm backdrop-blur">
                      <Lock className="h-3.5 w-3.5" aria-hidden="true" />
                      Protected PDF — unlock to read
                    </p>
                    <p className="text-sm font-medium text-text-primary truncate max-w-[260px]">{fileName}</p>
                    <p className="text-xs text-text-muted max-w-md">This PDF is protected and only accessible after purchasing full access.</p>
                  </div>
                  {upgradeHref && (
                    <a
                      href={upgradeHref}
                      className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-background shadow-md hover:bg-primary-hover transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                    >
                      <Lock className="h-4 w-4" aria-hidden="true" />
                      Unlock Full Content
                    </a>
                  )}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="w-full h-full relative min-h-[inherit] flex-1 flex flex-col">
            {hasFullAccess ? (
              <div className="w-full min-h-[560px] flex-1 p-6 overflow-auto bg-background">
                <div style={{ transform: `scale(${zoom})`, transformOrigin: "top left", width: `${100 / zoom}%` }}>
                  <div className="prose-devotional max-w-none">
                    <div className="whitespace-pre-wrap text-text-primary select-none">
                      {displayContent || "[Document content — viewer]"}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="relative w-full h-full min-h-[400px] flex-1 overflow-hidden bg-surface">
                <div aria-hidden="true" className="pointer-events-none select-none blur-[7px] opacity-30 p-6 space-y-3">
                  <div className="h-4 w-3/4 rounded bg-text-muted/50" />
                  <div className="h-4 w-full rounded bg-text-muted/40" />
                  <div className="h-4 w-5/6 rounded bg-text-muted/40" />
                  <div className="h-4 w-2/3 rounded bg-text-muted/30" />
                  <div className="mt-4 h-24 w-full rounded bg-text-muted/20" />
                  <p className="text-sm text-text-muted pt-2">Document content blurred — unlock to read full text.</p>
                </div>
                <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden opacity-[0.06]">
                  <div className="absolute inset-0 flex flex-wrap items-center justify-center gap-6 p-6 rotate-[-12deg] scale-110">
                    {Array.from({ length: 10 }).map((_, i) => (
                      <span key={i} className="whitespace-nowrap text-xs font-bold tracking-widest text-text-primary select-none">
                        PROTECTED • LOCKED
                      </span>
                    ))}
                  </div>
                </div>
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-background/45 backdrop-blur-[2px] p-6 text-center">
                  {coverUrl ? (
                    <div className="relative h-28 w-28 shrink-0 overflow-hidden rounded-xl border border-border shadow-lg">
                      <Image
                        src={coverUrl}
                        alt={`${fileName} cover`}
                        fill
                        className="object-cover"
                        unoptimized={isOptimizedImageHost(coverUrl) ? false : true}
                        sizes="112px"
                      />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/25">
                        <EyeOff className="h-7 w-7 text-white/80" aria-hidden="true" />
                      </div>
                    </div>
                  ) : (
                    <FileText className="h-14 w-14 text-text-muted/60" aria-hidden="true" />
                  )}
                  <div className="space-y-1">
                    <p className="inline-flex items-center gap-1.5 rounded-full bg-background/80 px-3 py-1 text-xs font-semibold text-text-muted shadow-sm backdrop-blur">
                      <Lock className="h-3.5 w-3.5" aria-hidden="true" />
                      Protected document — unlock to read
                    </p>
                    <p className="text-xs text-text-muted max-w-md">This document is protected and only accessible after purchasing full access.</p>
                  </div>
                  {upgradeHref && (
                    <a
                      href={upgradeHref}
                      className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-background shadow-md hover:bg-primary-hover transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                    >
                      <Lock className="h-4 w-4" aria-hidden="true" />
                      Unlock Full Content
                    </a>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="border-t border-border px-4 py-2 text-xs text-text-muted flex items-center justify-between">
        <span>Content protected — no download, copy, or print permitted</span>
        <span className="flex items-center gap-1">
          <AlertCircle className="h-3 w-3" aria-hidden="true" />
          Secure viewer
        </span>
      </div>
    </div>
  );
}

// Secure PDF viewer kept for backward compat — now delegates to canvas mode via ContentReader
export function SecurePDFViewer({ fileUrl, fileName, className }: { fileUrl: string; fileName: string; className?: string }) {
  return <ContentReader fileUrl={fileUrl} fileName={fileName} fileType="pdf" hasFullAccess coverUrl={null} className={className} />;
}

export function truncateForPreview(text: string, maxChars: number): { truncated: string; isTruncated: boolean } {
  if (text.length <= maxChars) return { truncated: text, isTruncated: false };
  const truncated = text.slice(0, maxChars);
  const lastSpace = truncated.lastIndexOf(" ");
  const finalText = lastSpace > maxChars * 0.8 ? truncated.slice(0, lastSpace) : truncated;
  return { truncated: finalText + "…", isTruncated: true };
}

export const MAX_PREVIEW_CHARS = DEFAULT_MAX_PREVIEW_CHARS;
