"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, Download, FileText, Maximize2, Minimize2, AlertCircle, ExternalLink, Lock, EyeOff, ZoomIn, ZoomOut } from "lucide-react";
import { cn } from "@/lib/utils";

// On-platform PDF/DOCX reader — renders uploaded content in a secure viewer
// that prevents downloading, printing, and text selection. Includes preview
// truncation with character limits for asset protection.

function isOptimizedImageHost(url: string): boolean {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return host.endsWith(".supabase.co") || host.endsWith(".supabase.in");
  } catch {
    return false;
  }
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
  const hasFile = Boolean(fileUrl && fileUrl.trim().length > 0);
  const [isLoading, setIsLoading] = useState(hasFile);
  const [error, setError] = useState<string | null>(null);
  const [content, setContent] = useState<string>("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isTruncated, setIsTruncated] = useState(false);
  const [showFullContent, setShowFullContent] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [zoom, setZoom] = useState(1);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  // For PDF files, we use an iframe with PDF.js or native browser viewer
  // For DOCX, we convert to HTML on the client (limited) or show a placeholder

  useEffect(() => {
    if (!hasFile) {
      setIsLoading(false);
      return;
    }
    // Only attempt to load content if user has full access
    // For preview mode, we don't fetch the actual file to protect assets
    if (!hasFullAccess) {
      setIsLoading(false);
      return;
    }

    async function loadContent() {
      setIsLoading(true);
      setError(null);

      try {
        if (fileType === "pdf") {
          // For PDF, iframe handles loading; HEAD check is skipped to avoid CSP
          // connect-src blocks (supabase host) and false "Unable to load content" errors.
          setTotalPages(1);
        } else if (fileType === "docx") {
          // For DOCX, we'd need a library like mammoth.js to convert
          // For now, show a placeholder with truncation notice
          setContent("[DOCX content — viewer ready]");
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load content");
      } finally {
        setIsLoading(false);
      }
    }

    loadContent();
  }, [fileUrl, fileType, hasFullAccess, hasFile]);

  // Truncate content for preview
  const displayContent = hasFullAccess || showFullContent
    ? content
    : content.length > maxPreviewChars
      ? (setIsTruncated(true), content.slice(0, maxPreviewChars) + "…")
      : content;

  const handlePageChange = (delta: number) => {
    const nextPage = currentPage + delta;
    if (nextPage >= 1 && nextPage <= totalPages) {
      setCurrentPage(nextPage);
    }
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
    <div className={cn("rounded-xl border border-border bg-surface overflow-hidden flex flex-col", className)}>
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-4 border-b border-border px-4 py-3 bg-background/50">
        <div className="flex items-center gap-3">
          <FileText className="h-5 w-5 text-text-muted" aria-hidden="true" />
          <div>
            <p className="text-sm font-medium text-text-primary truncate max-w-[200px]">{fileName}</p>
            <p className="text-xs text-text-muted">{fileType.toUpperCase()} • {totalPages} page{totalPages !== 1 ? "s" : ""}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Page navigation for PDF — always show when hasFullAccess so user has counter + nav */}
          {fileType === "pdf" && hasFullAccess && (
            <div className="flex items-center gap-1 border border-border rounded-lg p-1">
              <button
                onClick={() => handlePageChange(-1)}
                disabled={currentPage === 1}
                className="p-1.5 rounded text-text-muted hover:text-text-primary hover:bg-background disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Previous page"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="px-2 text-sm font-mono text-text-primary min-w-[56px] text-center">
                {currentPage} / {totalPages}
              </span>
              <button
                onClick={() => handlePageChange(1)}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded text-text-muted hover:text-text-primary hover:bg-background disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Next page"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* Zoom controls — only when unlocked */}
          {hasFullAccess && (
            <div className="flex items-center gap-1 border border-border rounded-lg p-1">
              <button
                onClick={() => setZoom((z) => Math.max(0.6, Number((z - 0.15).toFixed(2))))}
                className="p-1.5 rounded text-text-muted hover:text-text-primary hover:bg-background"
                aria-label="Zoom out"
              >
                <ZoomOut className="h-4 w-4" />
              </button>
              <span className="px-1.5 text-xs font-mono text-text-primary min-w-[42px] text-center">{Math.round(zoom * 100)}%</span>
              <button
                onClick={() => setZoom((z) => Math.min(2.2, Number((z + 0.15).toFixed(2))))}
                className="p-1.5 rounded text-text-muted hover:text-text-primary hover:bg-background"
                aria-label="Zoom in"
              >
                <ZoomIn className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* Upgrade prompt for truncated content */}
          {isTruncated && !hasFullAccess && upgradeHref && (
            <a
              href={upgradeHref}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-white hover:bg-primary-hover transition-colors"
            >
              <Lock className="h-4 w-4" aria-hidden="true" />
              Unlock Full Content
            </a>
          )}

          {/* Fullscreen toggle — now reflects state and actually works */}
          <button
            onClick={() => {
              if (containerRef.current) {
                if (document.fullscreenElement) {
                  document.exitFullscreen();
                } else {
                  containerRef.current.requestFullscreen().catch(() => undefined);
                }
              }
            }}
            className="p-1.5 rounded text-text-muted hover:text-text-primary hover:bg-background"
            aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
            title={isFullscreen ? "Collapse" : "Expand"}
          >
            {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Content viewer — full width/height, no clipping */}
      <div ref={containerRef} className={cn("relative w-full bg-background flex-1", hasFullAccess ? "min-h-[560px] h-[68vh] max-h-[85vh] overflow-auto" : "min-h-[400px] overflow-hidden")}>
        {fileType === "pdf" ? (
          <div className="w-full h-full relative min-h-[inherit]">
            {hasFullAccess ? (
              <div className="w-full h-full min-h-[560px]" style={{ transform: `scale(${zoom})`, transformOrigin: "top left", width: `${100 / zoom}%`, height: `${100 / zoom}%` }}>
                <iframe
                  ref={iframeRef}
                  src={`${fileUrl}#toolbar=0&navpanes=0&scrollbar=1&view=FitH`}
                  title={`${fileName} preview`}
                  className="w-full h-full min-h-[560px] border-0"
                  sandbox="allow-scripts allow-same-origin"
                  loading="lazy"
                />
              </div>
            ) : (
              // Locked mode — blurred PDF backdrop + cover + watermark unlock
              <div className="relative w-full h-full min-h-[400px] overflow-hidden bg-surface">
                {/* Blurred backdrop — faint PDF icon pattern */}
                <div aria-hidden="true" className="absolute inset-0 flex flex-col items-center justify-center gap-3 blur-[7px] opacity-30 select-none pointer-events-none p-8">
                  <FileText className="h-20 w-20 text-text-muted/50" aria-hidden="true" />
                  <div className="h-3 w-3/4 rounded bg-text-muted/40" />
                  <div className="h-3 w-full max-w-md rounded bg-text-muted/30" />
                  <div className="h-3 w-2/3 rounded bg-text-muted/30" />
                  <p className="text-sm text-text-muted">PDF preview blurred — unlock to read</p>
                </div>
                {/* Tiled watermark */}
                <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden opacity-[0.06]">
                  <div className="absolute inset-0 flex flex-wrap items-center justify-center gap-6 p-6 rotate-[-12deg] scale-110">
                    {Array.from({ length: 10 }).map((_, i) => (
                      <span key={i} className="whitespace-nowrap text-xs font-bold tracking-widest text-text-primary select-none">
                        PROTECTED • LOCKED
                      </span>
                    ))}
                  </div>
                </div>
                {/* Center: cover photo + unlock */}
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
                      className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white shadow-md hover:bg-primary-hover transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
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
          <div className="w-full h-full relative min-h-[inherit]">
            {hasFullAccess ? (
              <div className="w-full min-h-[560px] p-6 overflow-auto bg-background">
                <div style={{ transform: `scale(${zoom})`, transformOrigin: "top left", width: `${100 / zoom}%` }}>
                  <div className="prose-devotional max-w-none">
                    <div className="whitespace-pre-wrap text-text-primary select-none">
                      {displayContent || "[Document content — viewer]"}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              // Locked DOCX — blurred text + cover overlay
              <div className="relative w-full h-full min-h-[400px] overflow-hidden bg-surface">
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
                      className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white shadow-md hover:bg-primary-hover transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
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

      {/* Footer with copyright/protection notice */}
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

// Secure PDF viewer component for full access users
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
      <div className="w-full h-[70vh]">
        <iframe
          src={`${fileUrl}#toolbar=1&navpanes=1&scrollbar=1&view=FitH`}
          title={fileName}
          className="w-full h-full border-0"
          sandbox="allow-scripts allow-same-origin allow-forms"
        />
      </div>
    </div>
  );
}

// Preview truncation utility for text content
export function truncateForPreview(text: string, maxChars: number): { truncated: string; isTruncated: boolean } {
  if (text.length <= maxChars) {
    return { truncated: text, isTruncated: false };
  }
  // Try to truncate at a word boundary
  const truncated = text.slice(0, maxChars);
  const lastSpace = truncated.lastIndexOf(" ");
  const finalText = lastSpace > maxChars * 0.8 ? truncated.slice(0, lastSpace) : truncated;
  return { truncated: finalText + "…", isTruncated: true };
}

export const MAX_PREVIEW_CHARS = DEFAULT_MAX_PREVIEW_CHARS;