"use client";

import Link from "next/link";
import Image from "next/image";
import { Lock, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";

function isOptimizedImageHost(url: string | null | undefined): boolean {
  if (!url || typeof url !== "string") return false;
  try {
    const host = new URL(url).hostname.toLowerCase();
    return host.endsWith(".supabase.co") || host.endsWith(".supabase.in");
  } catch {
    return false;
  }
}

interface LockedCoverOverlayProps {
  coverUrl?: string | null;
  title?: string;
  subtitle?: string;
  unlockHref?: string;
  unlockLabel?: string;
  variant?: "card" | "fullscreen";
  className?: string;
  blurContent?: boolean;
  children?: React.ReactNode;
}

export function LockedCoverOverlay({
  coverUrl,
  title,
  subtitle,
  unlockHref = "#access-gate",
  unlockLabel = "Unlock to Continue Reading",
  variant = "card",
  className,
  blurContent = true,
  children,
}: LockedCoverOverlayProps) {
  const coverIsExternal = Boolean(coverUrl) && !isOptimizedImageHost(coverUrl!);

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl border border-border bg-surface",
        variant === "fullscreen" ? "min-h-[520px]" : "min-h-[320px]",
        className,
      )}
      aria-label="Locked content — purchase to unlock"
    >
      {/* Blurred content behind — non-interactive, not selectable */}
      {children ? (
        <div
          aria-hidden="true"
          className={cn(
            "pointer-events-none select-none",
            blurContent && "blur-[8px] opacity-40 scale-[1.02]",
          )}
        >
          {children}
        </div>
      ) : (
        <div
          aria-hidden="true"
          className={cn(
            "absolute inset-0",
            blurContent && "blur-[6px] opacity-30",
          )}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-background via-surface to-background" />
          <div className="absolute inset-0 flex flex-col gap-2 p-6 opacity-20">
            <div className="h-4 w-3/4 rounded bg-text-muted" />
            <div className="h-4 w-full rounded bg-text-muted" />
            <div className="h-4 w-5/6 rounded bg-text-muted" />
            <div className="h-4 w-2/3 rounded bg-text-muted" />
            <div className="mt-4 h-32 w-full rounded bg-text-muted/60" />
          </div>
        </div>
      )}

      {/* Tiled watermark — diagonal, repeated */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 overflow-hidden opacity-[0.07]"
      >
        <div className="absolute inset-0 flex flex-wrap items-center justify-center gap-8 p-8 rotate-[-12deg] scale-125">
          {Array.from({ length: 12 }).map((_, i) => (
            <span
              key={i}
              className="whitespace-nowrap text-sm font-bold tracking-widest text-text-primary select-none"
            >
              PROTECTED • LOCKED • PROTECTED
            </span>
          ))}
        </div>
      </div>

      {/* Center overlay — cover photo + watermark unlock */}
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-5 bg-background/45 backdrop-blur-[2px] p-6 text-center">
        {/* Cover photo */}
        {coverUrl ? (
          <div className="relative h-28 w-28 shrink-0 overflow-hidden rounded-xl border border-border shadow-lg sm:h-32 sm:w-32">
            <Image
              src={coverUrl}
              alt={title ? `${title} cover` : "Devotional cover"}
              fill
              className="object-cover"
              unoptimized={coverIsExternal}
              sizes="128px"
            />
            {/* Small watermark badge on cover */}
            <div className="absolute inset-0 flex items-center justify-center bg-black/25">
              <EyeOff className="h-8 w-8 text-white/80" aria-hidden="true" />
            </div>
          </div>
        ) : (
          <div className="flex h-28 w-28 items-center justify-center rounded-xl border border-border bg-surface shadow-lg sm:h-32 sm:w-32">
            <Lock className="h-10 w-10 text-text-muted" aria-hidden="true" />
          </div>
        )}

        <div className="max-w-sm space-y-2">
          <p className="inline-flex items-center gap-2 rounded-full bg-background/80 px-3 py-1 text-xs font-semibold tracking-wide text-text-muted shadow-sm backdrop-blur">
            <Lock className="h-3.5 w-3.5" aria-hidden="true" />
            Locked content
          </p>
          {title && (
            <h3 className="text-base font-semibold leading-tight text-text-primary sm:text-lg">
              {title}
            </h3>
          )}
          {subtitle ? (
            <p className="text-sm text-text-muted">{subtitle}</p>
          ) : (
            <p className="text-sm text-text-muted">Purchase access or enter your access code to continue reading.</p>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3">
          <Link
            href={unlockHref}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-background shadow-md hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 transition-colors"
          >
            <Lock className="h-4 w-4" aria-hidden="true" />
            {unlockLabel}
          </Link>
          {unlockHref !== "#access-gate" && (
            <a
              href="#access-gate"
              className="inline-flex items-center gap-2 rounded-lg border border-border bg-surface px-4 py-2 text-sm font-medium text-text-primary hover:bg-background transition-colors"
            >
              Have a code? Unlock
            </a>
          )}
        </div>

        <p className="flex items-center gap-1.5 text-[11px] text-text-muted">
          <EyeOff className="h-3 w-3" aria-hidden="true" />
          Content is blurred and protected until unlocked
        </p>
      </div>
    </div>
  );
}
